import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { formatKenyanPhone } from './phone';

const db = getFirestore();

const PAYSTACK_SECRET_KEY = defineSecret('PAYSTACK_SECRET_KEY');
const PAYSTACK_API = 'https://api.paystack.co';

// ⚠️ Business decision, not a technical one — see ADJUSTMENTS.md.
// Price per extra GB of storage, in whole KES.
const KES_PER_GB = 150;

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
 * Starts an M-Pesa STK push to buy additional storage. No Paystack
 * subaccount/split involved — this is a platform product, not a
 * marketplace transaction, so the full amount goes to the platform.
 *
 * Crediting the extra storage happens ONLY from the shared project's
 * paystackCallback webhook (handlePNSStoragePurchase) on a verified
 * charge.success event, keyed off the storagePurchases doc created here —
 * never from this function directly, since this function returning
 * successfully only means "the STK push was sent," not "the customer paid."
 * PNS does not run its own Paystack webhook — see paystack.ts.
 */
export const purchaseStorage = onCall({ secrets: [PAYSTACK_SECRET_KEY] }, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Sign in required.');

  const { accountType, gigabytes, phone } = request.data ?? {};
  if (
    (accountType !== 'photographer' && accountType !== 'reader') ||
    typeof gigabytes !== 'number' ||
    gigabytes <= 0 ||
    typeof phone !== 'string'
  ) {
    throw new HttpsError('invalid-argument', 'accountType, a positive gigabytes number, and phone are required.');
  }

  const collectionName = accountType === 'photographer' ? 'photographers' : 'readers';
  const accountRef = db.doc(`${collectionName}/${uid}`);
  const accountSnap = await accountRef.get();
  if (!accountSnap.exists) throw new HttpsError('not-found', 'Account not found.');

  const amount = Math.round(gigabytes * KES_PER_GB);
  const secretKey = PAYSTACK_SECRET_KEY.value();
  const email = accountSnap.data()?.email || `${uid}@${collectionName}.pns.app`;

  const purchaseRef = db.collection('storagePurchases').doc();
  const formattedPhone = formatKenyanPhone(phone);
  // STORE_ prefix lets the webhook route this event by reference alone if
  // metadata ever comes back missing — see determineChargeType in paystack.ts.
  const reference = `STORE_${purchaseRef.id}_${Date.now()}`;

  await purchaseRef.set({
    uid,
    accountType,
    gigabytes,
    amount,
    status: 'pending',
    createdAt: FieldValue.serverTimestamp(),
  });

  const result = await paystackFetch(
    '/charge',
    {
      method: 'POST',
      body: JSON.stringify({
        email,
        amount: amount * 100, // KES → cents
        currency: 'KES',
        mobile_money: { phone: formattedPhone, provider: 'mpesa' },
        reference,
        metadata: { chargeType: 'storage_purchase', purchaseId: purchaseRef.id },
      }),
    },
    secretKey
  );

  await purchaseRef.update({ paystackReference: result.data.reference });

  return { purchaseId: purchaseRef.id, reference: result.data.reference, amount };
});
