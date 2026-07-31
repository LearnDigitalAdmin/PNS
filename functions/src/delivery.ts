import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import * as logger from 'firebase-functions/logger';

const db = getFirestore();

/**
 * Delivers every session image matched to one client entry into that
 * client's reader account inbox — matched by phone number, which is why
 * both photographer and reader onboarding treat phone as load-bearing.
 *
 * Deliberately does NOT take photographerId as an input: the caller's own
 * uid IS the photographer id for every path touched, so a caller can only
 * ever trigger delivery for their own sessions no matter what sessionId /
 * clientEntryId they pass in.
 */
export const deliverSessionToReader = onCall(async (request) => {
  const photographerId = request.auth?.uid;
  if (!photographerId) throw new HttpsError('unauthenticated', 'Sign in required.');

  const { sessionId, clientEntryId } = request.data ?? {};
  if (typeof sessionId !== 'string' || typeof clientEntryId !== 'string') {
    throw new HttpsError('invalid-argument', 'sessionId and clientEntryId are required.');
  }

  const entryRef = db.doc(
    `photographers/${photographerId}/sessions/${sessionId}/clientEntries/${clientEntryId}`
  );
  const entrySnap = await entryRef.get();
  if (!entrySnap.exists) throw new HttpsError('not-found', 'Client entry not found.');
  const entry = entrySnap.data()!;

  const [photographerSnap, sessionSnap] = await Promise.all([
    db.doc(`photographers/${photographerId}`).get(),
    db.doc(`photographers/${photographerId}/sessions/${sessionId}`).get(),
  ]);
  const businessName = photographerSnap.data()?.businessName ?? 'Your photographer';
  const sessionLabel = sessionSnap.data()?.label ?? '';

  // Match by phone — this is the whole point of collecting it at onboarding.
  const readerQuery = await db
    .collection('readers')
    .where('phone', '==', entry.clientPhone)
    .limit(1)
    .get();

  if (readerQuery.empty) {
    return { status: 'no-account-yet' as const };
  }
  const readerDoc = readerQuery.docs[0];
  const readerId = readerDoc.id;

  const imagesSnap = await db
    .collection(`photographers/${photographerId}/sessions/${sessionId}/images`)
    .where('matchedEntryId', '==', clientEntryId)
    .get();

  if (imagesSnap.empty) {
    return { status: 'no-images' as const };
  }

  const bucket = getStorage().bucket();
  let delivered = 0;
  let skippedOverCap = 0;

  for (const imgDoc of imagesSnap.docs) {
    const img = imgDoc.data();
    if (!img.storageUrl) continue;
    const size: number = img.sizeBytes ?? 0;

    // Same atomic reserve-or-reject pattern as photographer uploads —
    // the reader's 300 MB cap is enforced here, not trusted to the client.
    const reserved = await db.runTransaction(async (tx) => {
      const readerRef = db.doc(`readers/${readerId}`);
      const snap = await tx.get(readerRef);
      if (!snap.exists) return false;
      const used = snap.data()!.storageUsedBytes ?? 0;
      const cap = snap.data()!.storageCapBytes ?? 0;
      if (used + size > cap) return false;
      tx.update(readerRef, { storageUsedBytes: FieldValue.increment(size) });
      return true;
    });

    if (!reserved) {
      skippedOverCap++;
      continue;
    }

    const deliveryId = db.collection(`readers/${readerId}/deliveries`).doc().id;
    const ext = (img.cameraFileName as string | undefined)?.split('.').pop()?.toLowerCase() || 'jpg';
    const contentType: 'image' | 'pdf' = img.contentType === 'pdf' ? 'pdf' : 'image';
    const destPath = `readers/${readerId}/inbox/${deliveryId}/file.${ext}`;

    try {
      await bucket.file(img.storageUrl).copy(bucket.file(destPath));
    } catch (err) {
      logger.error(`Failed to copy delivery for reader ${readerId}`, err);
      // Undo the reservation so a failed copy doesn't eat their cap.
      await db.doc(`readers/${readerId}`).update({ storageUsedBytes: FieldValue.increment(-size) });
      continue;
    }

    await db.doc(`readers/${readerId}/deliveries/${deliveryId}`).set({
      photographerId,
      photographerBusinessName: businessName,
      sessionId,
      sessionLabel,
      storageUrl: destPath,
      contentType,
      sizeBytes: size,
      deliveredAt: FieldValue.serverTimestamp(),
    });

    delivered++;
  }

  await entryRef.update({ deliveryStatus: 'delivered' });

  return { status: 'delivered' as const, delivered, skippedOverCap };
});
