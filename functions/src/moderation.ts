import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import * as logger from 'firebase-functions/logger';

const db = getFirestore();
const auth = getAuth();

const ADMIN_DOMAIN = 'cogvana.co.ke';

// Mirrors isAdmin() in firestore.rules. Needed here separately because
// these callables touch Firebase Auth (disabling/enabling sign-in,
// recursive Firestore deletes via the Admin SDK) — operations that bypass
// firestore.rules entirely, so client-side/rules-based gating alone
// wouldn't cover them. Treat admin and editor as a single tier for now,
// same as the rest of the app.
function assertIsAdmin(email: string | undefined | null): void {
  if (!email || email.split('@')[1] !== ADMIN_DOMAIN) {
    throw new HttpsError('permission-denied', 'Admin access required.');
  }
}

/**
 * Suspends a photographer: hides them from the public directory (Firestore
 * `status: 'suspended'`) AND disables their Firebase Auth account so they
 * can't sign in. Their Firestore data (profile, gallery, sessions) is left
 * completely untouched — this is reversible via reactivatePhotographer.
 */
export const suspendPhotographer = onCall(async (request) => {
  assertIsAdmin(request.auth?.token?.email as string | undefined);

  const { photographerId } = request.data ?? {};
  if (typeof photographerId !== 'string' || !photographerId) {
    throw new HttpsError('invalid-argument', 'photographerId is required.');
  }

  const ref = db.doc(`photographers/${photographerId}`);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError('not-found', 'Photographer not found.');

  await ref.update({ status: 'suspended' });
  await auth.updateUser(photographerId, { disabled: true }).catch((err) => {
    // Firestore side already succeeded — log but don't fail the whole call
    // just because, say, the Auth user was already deleted independently.
    logger.error(`suspendPhotographer: failed to disable Auth for ${photographerId}`, err);
  });

  logger.info(`Photographer suspended by ${request.auth?.token?.email}: ${photographerId}`);
  return { ok: true as const };
});

/**
 * Reverses suspendPhotographer: Firestore status back to 'active', Auth
 * account re-enabled.
 */
export const reactivatePhotographer = onCall(async (request) => {
  assertIsAdmin(request.auth?.token?.email as string | undefined);

  const { photographerId } = request.data ?? {};
  if (typeof photographerId !== 'string' || !photographerId) {
    throw new HttpsError('invalid-argument', 'photographerId is required.');
  }

  const ref = db.doc(`photographers/${photographerId}`);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError('not-found', 'Photographer not found.');

  await ref.update({ status: 'active' });
  await auth.updateUser(photographerId, { disabled: false }).catch((err) => {
    logger.error(`reactivatePhotographer: failed to re-enable Auth for ${photographerId}`, err);
  });

  logger.info(`Photographer reactivated by ${request.auth?.token?.email}: ${photographerId}`);
  return { ok: true as const };
});

/**
 * Expels a photographer: permanently deletes their Firestore data
 * (profile doc + gallery/sessions/likes subcollections) and disables their
 * Firebase Auth account — the account itself is disabled, not deleted, so
 * there's still an audit trail and the uid can never be reissued to
 * someone else. This is NOT reversible for the Firestore data (unlike
 * suspend). Past bookings and reader records are deliberately left alone —
 * they belong to the reader's payment/photo history, not the
 * photographer's own data, and a report/refund trail needs them to still
 * exist even after the photographer is gone.
 */
export const expelPhotographer = onCall(async (request) => {
  assertIsAdmin(request.auth?.token?.email as string | undefined);

  const { photographerId } = request.data ?? {};
  if (typeof photographerId !== 'string' || !photographerId) {
    throw new HttpsError('invalid-argument', 'photographerId is required.');
  }

  const ref = db.doc(`photographers/${photographerId}`);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError('not-found', 'Photographer not found.');

  // recursiveDelete removes the doc and every subcollection under it
  // (gallery, sessions incl. clientEntries/images, likes) in one go.
  await db.recursiveDelete(ref);

  await auth.updateUser(photographerId, { disabled: true }).catch((err) => {
    logger.error(`expelPhotographer: failed to disable Auth for ${photographerId}`, err);
  });

  logger.info(`Photographer expelled by ${request.auth?.token?.email}: ${photographerId}`);
  return { ok: true as const };
});
