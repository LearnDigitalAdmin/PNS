import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import * as logger from 'firebase-functions/logger';
import { formatKenyanPhone } from './phone';

const db = getFirestore();

// Set with: firebase functions:secrets:set PAYSTACK_SECRET_KEY
const PAYSTACK_SECRET_KEY = defineSecret('PAYSTACK_SECRET_KEY');

const PAYSTACK_API = 'https://api.paystack.co';

// Platform's cut of every paid booking — mirrored in src/bookings/types.ts,
// and in handlePNSBookingPayment() in the shared project's paystackCallback.
// Change all three together if this changes.
const PLATFORM_FEE_PERCENT = 10;

// Smallest amount a booking can be for. Mirrored in src/bookings/types.ts —
// also enforced in firestore.rules on booking creation, so this is really
// just a second line of defense for the amount actually charged.
const MIN_BOOKING_FEE_KES = 100;

// Paystack's transaction fee, passed through to the customer rather than
// absorbed by the platform or the photographer. Mirrored in
// src/bookings/types.ts (which only uses it to *display* the total before
// the charge is created — this copy is the actual source of truth for what
// gets charged).
const PAYSTACK_FEE_PERCENT = 2.9;

// Grosses up the agreed booking amount so that, after Paystack deducts its
// percentage fee from the total charged, the full agreed amount remains for
// the platform/photographer split — see the subaccount's percentage_charge
// in createPhotographerSubaccount below. Rounded up since M-Pesa charges
// don't take fractional shillings.
function grossUpForPaystackFee(baseAmountKes: number): number {
  return Math.ceil(baseAmountKes / (1 - PAYSTACK_FEE_PERCENT / 100));
}

// NOTE: there is deliberately no Paystack webhook exported from this file.
// PNS deploys into the same Firebase project as the MyRegister functions,
// and a Paystack account only has one webhook URL — so the single
// `paystackCallback` webhook in that project's index.ts is the only place
// that ever receives charge.success/charge.failed events, for every charge
// type including these two. This file only ever *creates* charges; see
// handlePNSBookingPayment / handlePNSStoragePurchase over there for what
// happens once Paystack confirms them.

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

// ── Bank list lookup (module-scoped cache — banks don't change mid-instance) ─
let banksCache: any[] | null = null;

async function getPaystackBanks(secretKey: string, country = 'kenya'): Promise<any[]> {
  if (banksCache) return banksCache;
  try {
    const result = await paystackFetch(`/bank?country=${country}`, { method: 'GET' }, secretKey);
    banksCache = result.data ?? [];
    return banksCache!;
  } catch (err) {
    logger.error('Failed to fetch Paystack bank list', err);
    return [];
  }
}

/**
 * Resolves whatever the photographer typed (a Paystack bank code, a bank
 * name, or "mpesa"/"airtel") to a real Paystack settlement_bank code, the
 * same way the live MyRegister setupAccount function does it — free-text
 * bank codes typed by hand are the single biggest source of failed
 * subaccount creations, so this is worth doing server-side rather than
 * trusting the client's input verbatim.
 */
async function resolveBankCode(input: string, secretKey: string): Promise<{ code: string; name: string | null }> {
  const banks = await getPaystackBanks(secretKey);
  const needle = input.trim().toLowerCase();

  const exact = banks.find((b) => b.code?.toLowerCase() === needle);
  if (exact) return { code: exact.code, name: exact.name };

  const byName = banks.find((b) => b.name?.toLowerCase().includes(needle));
  if (byName) return { code: byName.code, name: byName.name };

  if (needle === 'mpesa' || needle === 'm-pesa') {
    const mpesa = banks.find((b) => b.name?.toLowerCase().includes('m-pesa'));
    if (mpesa) return { code: mpesa.code, name: mpesa.name };
  }
  if (needle === 'airtel' || needle === 'airtel-ke') {
    const airtel = banks.find((b) => b.name?.toLowerCase().includes('airtel'));
    if (airtel) return { code: airtel.code, name: airtel.name };
  }

  // Nothing matched — fall back to using the input as-is and let Paystack's
  // own validation reject it with a clearer error than we could give here.
  logger.warn(`resolveBankCode: no match for "${input}", passing through unresolved`);
  return { code: input.trim(), name: null };
}

/**
 * Formats a settlement account number the way Paystack expects it for
 * Kenyan mobile money settlement banks: local format (0XXXXXXXXX), not
 * international. Traditional bank account numbers are left untouched.
 */
function formatSettlementAccountNumber(accountNumber: string, bankName: string | null): string {
  const isMobileMoney = !!bankName && /m-pesa|airtel/i.test(bankName);
  if (!isMobileMoney) return accountNumber.replace(/[\s-]/g, '');

  let formatted = accountNumber.replace(/[\s+-]/g, '');
  if (formatted.startsWith('254')) {
    formatted = '0' + formatted.substring(3);
  } else if (!formatted.startsWith('0')) {
    formatted = '0' + formatted;
  }
  return formatted;
}

/**
 * Lists Paystack settlement banks for Kenya so the client can offer a real
 * dropdown instead of asking photographers to type a bank code from
 * memory. Mirrors the live MyRegister listBanks utility.
 */
export const listBanks = onCall({ secrets: [PAYSTACK_SECRET_KEY] }, async () => {
  const banks = await getPaystackBanks(PAYSTACK_SECRET_KEY.value());
  const mobileMoney = banks.filter((b) => /m-pesa|airtel/i.test(b.name ?? ''));
  const traditional = banks.filter((b) => !/m-pesa|airtel/i.test(b.name ?? ''));
  return { banks, categories: { mobileMoney, traditional } };
});

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

    const photographerRef = db.doc(`photographers/${uid}`);
    const photographerSnap = await photographerRef.get();
    if (!photographerSnap.exists) throw new HttpsError('not-found', 'Photographer profile not found.');
    const photographer = photographerSnap.data()!;

    const { code: resolvedBankCode, name: resolvedBankName } = await resolveBankCode(bankCode, secretKey);
    const formattedAccountNumber = formatSettlementAccountNumber(accountNumber, resolvedBankName);
    const contactPhone = formatKenyanPhone(photographer.phone ?? '');

    logger.info(
      `Setting up subaccount for photographer ${uid}: bank "${bankCode}" -> ${resolvedBankName ?? '(unresolved)'} (${resolvedBankCode})`
    );

    const result = await paystackFetch(
      '/subaccount',
      {
        method: 'POST',
        body: JSON.stringify({
          business_name: businessName,
          settlement_bank: resolvedBankCode,
          account_number: formattedAccountNumber,
          percentage_charge: PLATFORM_FEE_PERCENT,
          primary_contact_email: photographer.email || undefined,
          primary_contact_name: businessName,
          primary_contact_phone: contactPhone,
          metadata: { uid, platform: 'pns' },
        }),
      },
      secretKey
    );

    const subaccountCode = result.data.subaccount_code as string;

    await photographerRef.update({
      paystackSubaccountCode: subaccountCode,
      payoutBankCode: resolvedBankCode,
      payoutBankName: resolvedBankName,
      payoutAccountNumber: formattedAccountNumber,
      payoutSetupComplete: true,
      payoutVerified: !!result.data.is_verified,
    });

    return { subaccountCode, bankName: resolvedBankName };
  }
);

/**
 * Initiates an M-Pesa STK push for a booking that's been accepted by the
 * photographer. Only the reader who made the booking can trigger this.
 *
 * This only marks the booking "awaiting_payment". Nothing marks it "paid"
 * except the shared paystackCallback webhook receiving a verified
 * charge.success event — see handlePNSBookingPayment there.
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
    if (booking.amount < MIN_BOOKING_FEE_KES) {
      throw new HttpsError('failed-precondition', `Booking amount is below the KSh ${MIN_BOOKING_FEE_KES} minimum.`);
    }

    const photographerSnap = await db.doc(`photographers/${booking.photographerId}`).get();
    const subaccountCode = photographerSnap.data()?.paystackSubaccountCode;
    if (!subaccountCode) {
      throw new HttpsError('failed-precondition', "This photographer hasn't finished payout setup yet.");
    }

    const secretKey = PAYSTACK_SECRET_KEY.value();
    const readerSnap = await db.doc(`readers/${readerId}`).get();
    const email = readerSnap.data()?.email || `${readerId}@readers.pns.app`; // Paystack requires an email
    const formattedPhone = formatKenyanPhone(phone);

    // The reader pays the agreed booking amount PLUS Paystack's transaction
    // fee, so the full agreed amount is what actually lands for the
    // platform/photographer split after Paystack takes its cut off the top.
    const totalToCharge = grossUpForPaystackFee(booking.amount);

    // BOOK_ prefix lets the shared webhook's determineChargeType route this
    // event by reference alone if metadata ever comes back stripped.
    const reference = `BOOK_${bookingId}_${Date.now()}`;

    const result = await paystackFetch(
      '/charge',
      {
        method: 'POST',
        body: JSON.stringify({
          email,
          amount: Math.round(totalToCharge * 100), // KES → cents
          currency: 'KES',
          mobile_money: { phone: formattedPhone, provider: 'mpesa' },
          subaccount: subaccountCode,
          reference,
          metadata: { chargeType: 'booking_payment', bookingId, baseAmount: booking.amount, totalCharged: totalToCharge },
        }),
      },
      secretKey
    );

    await bookingRef.update({
      status: 'awaiting_payment',
      paystackReference: result.data.reference,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return { reference: result.data.reference, displayText: result.data.display_text ?? null, totalCharged: totalToCharge };
  }
);
