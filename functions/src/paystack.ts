import { onCall, onRequest, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import * as crypto from 'crypto';
import * as logger from 'firebase-functions/logger';

const db = getFirestore();

// Set with: firebase functions:secrets:set PAYSTACK_SECRET_KEY
const PAYSTACK_SECRET_KEY = defineSecret('PAYSTACK_SECRET_KEY');

const PAYSTACK_API = 'https://api.paystack.co';

// Platform's cut of every paid booking — mirrored in src/bookings/types.ts.
// This is passed to Paystack as the subaccount's percentage_charge, which
// (per Paystack's split model) is the percentage that settles to the
// PLATFORM's main account; the remainder settles to the photographer's
// subaccount. Double-check this against Paystack's current docs before
// going live — split-payment semantics are the kind of thing worth
// confirming against a live test transaction, not just documentation.
const PLATFORM_FEE_PERCENT = 10;

async function paystackFetch(path: string, options: RequestInit, secretKey: string) {
  const res = await fetch(`${PAYSTACK_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  });
  const json = await res.json();
  if (!res.ok || json.status === false) {
    throw new Error(json.message ?? `Paystack request failed (${res.status})`);
  }
  return json;
}

/**
 * Creates a Paystack subaccount for a photographer so their booking
 * payments can be split automatically: PLATFORM_FEE_PERCENT settles to the
 * platform, the remainder settles directly to the photographer's own bank
 * account via their subaccount. Called from the Settings tab payout form.
 */
export const createPhotographerSubaccount = onCall(
  { secrets: [PAYSTACK_SECRET_KEY] },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError('unauthenticated', 'Sign in required.');

    const { businessName, bankCode, accountNumber } = request.data ?? {};
    if (!businessName || !bankCode || !accountNumber) {
      throw new HttpsError('invalid-argument', 'businessName, bankCode, and accountNumber are required.');
    }

    const secretKey = PAYSTACK_SECRET_KEY.value();

    const result = await paystackFetch(
      '/subaccount',
      {
        method: 'POST',
        body: JSON.stringify({
          business_name: businessName,
          settlement_bank: bankCode,
          account_number: accountNumber,
          percentage_charge: PLATFORM_FEE_PERCENT,
        }),
      },
      secretKey
    );

    const subaccountCode = result.data.subaccount_code as string;

    await db.doc(`photographers/${uid}`).update({
      paystackSubaccountCode: subaccountCode,
      payoutBankCode: bankCode,
      payoutAccountNumber: accountNumber,
      payoutSetupComplete: true,
    });

    return { subaccountCode };
  }
);

/**
 * Initiates an M-Pesa STK push for a booking that's been accepted by the
 * photographer. Only the reader who made the booking can trigger this.
 */
export const initiateBookingPayment = onCall(
  { secrets: [PAYSTACK_SECRET_KEY] },
  async (request) => {
    const readerId = request.auth?.uid;
    if (!readerId) throw new HttpsError('unauthenticated', 'Sign in required.');

    const { bookingId, phone } = request.data ?? {};
    if (typeof bookingId !== 'string' || typeof phone !== 'string') {
      throw new HttpsError('invalid-argument', 'bookingId and phone are required.');
    }

    const bookingRef = db.doc(`bookings/${bookingId}`);
    const bookingSnap = await bookingRef.get();
    if (!bookingSnap.exists) throw new HttpsError('not-found', 'Booking not found.');
    const booking = bookingSnap.data()!;

    if (booking.readerId !== readerId) {
      throw new HttpsError('permission-denied', 'This is not your booking.');
    }
    if (!['accepted', 'payment_failed'].includes(booking.status)) {
      throw new HttpsError('failed-precondition', 'This booking is not ready for payment.');
    }
    if (!booking.amount || booking.amount <= 0) {
      throw new HttpsError('failed-precondition', 'No amount has been set for this booking yet.');
    }

    const photographerSnap = await db.doc(`photographers/${booking.photographerId}`).get();
    const subaccountCode = photographerSnap.data()?.paystackSubaccountCode;
    if (!subaccountCode) {
      throw new HttpsError('failed-precondition', "This photographer hasn't finished payout setup yet.");
    }

    const secretKey = PAYSTACK_SECRET_KEY.value();
    const readerSnap = await db.doc(`readers/${readerId}`).get();
    const email = readerSnap.data()?.email || `${readerId}@readers.pns.app`; // Paystack requires an email

    const result = await paystackFetch(
      '/charge',
      {
        method: 'POST',
        body: JSON.stringify({
          email,
          amount: Math.round(booking.amount * 100), // KES → cents
          currency: 'KES',
          mobile_money: { phone, provider: 'mpesa' },
          subaccount: subaccountCode,
          metadata: { bookingId },
        }),
      },
      secretKey
    );

    await bookingRef.update({
      status: 'awaiting_payment',
      paystackReference: result.data.reference,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return { reference: result.data.reference, displayText: result.data.display_text ?? null };
  }
);

/**
 * Paystack webhook — the actual source of truth for payment confirmation.
 * initiateBookingPayment only marks a booking "awaiting_payment"; nothing
 * marks it "paid" except this handler receiving a verified charge.success
 * event. Never trust a client to report its own payment succeeded.
 */
export const paystackWebhook = onRequest(
  { secrets: [PAYSTACK_SECRET_KEY] },
  async (req, res) => {
    const secretKey = PAYSTACK_SECRET_KEY.value();
    const signature = req.headers['x-paystack-signature'] as string | undefined;

    if (!signature || !req.rawBody) {
      res.status(400).send('Missing signature or body');
      return;
    }

    const expected = crypto.createHmac('sha512', secretKey).update(req.rawBody).digest('hex');
    if (expected !== signature) {
      logger.warn('Paystack webhook signature mismatch');
      res.status(401).send('Invalid signature');
      return;
    }

    const event = req.body;
    const metadata = event?.data?.metadata ?? {};

    try {
      if (metadata.type === 'storage_purchase') {
        await handleStoragePurchaseEvent(event, metadata.purchaseId);
      } else if (metadata.bookingId) {
        await handleBookingEvent(event, metadata.bookingId);
      }
      // Anything else (not one of ours, or malformed) is acknowledged and ignored.
    } catch (err) {
      logger.error('Webhook handling failed', err);
    }

    res.status(200).send('ok');
  }
);

async function handleBookingEvent(event: any, bookingId: string) {
  const bookingRef = db.doc(`bookings/${bookingId}`);
  if (event.event === 'charge.success') {
    await bookingRef.update({
      status: 'paid',
      paidAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  } else if (event.event === 'charge.failed') {
    await bookingRef.update({ status: 'payment_failed', updatedAt: FieldValue.serverTimestamp() });
  }
}

async function handleStoragePurchaseEvent(event: any, purchaseId: string | undefined) {
  if (!purchaseId) return;
  const purchaseRef = db.doc(`storagePurchases/${purchaseId}`);

  if (event.event === 'charge.success') {
    // Idempotency guard: Paystack can retry webhook delivery, and this must
    // never credit storage twice for the same purchase.
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(purchaseRef);
      if (!snap.exists || snap.data()?.status === 'paid') return;

      const { uid, accountType, gigabytes } = snap.data()!;
      const collectionName = accountType === 'photographer' ? 'photographers' : 'readers';
      const accountRef = db.doc(`${collectionName}/${uid}`);
      const extraBytes = Math.round(gigabytes * (1024 * 1024 * 1024));

      tx.update(accountRef, { storageCapBytes: FieldValue.increment(extraBytes) });
      tx.update(purchaseRef, { status: 'paid', paidAt: FieldValue.serverTimestamp() });
    });
  } else if (event.event === 'charge.failed') {
    await purchaseRef.update({ status: 'failed' });
  }
}
