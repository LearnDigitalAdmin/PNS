import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import * as logger from 'firebase-functions/logger';

const db = getFirestore();

export const onReaderReferred = onDocumentCreated('readers/{readerId}', async (event) => {
  const data = event.data?.data();
  const referredBy = data?.referredBy;
  if (!referredBy) return;

  const referrerRef = db.doc(`readers/${referredBy}`);
  const referrerSnap = await referrerRef.get();
  if (!referrerSnap.exists) {
    logger.warn(`Referral code pointed at a non-existent reader: ${referredBy}`);
    return;
  }

  await referrerRef.update({ referralCount: FieldValue.increment(1) });
});
