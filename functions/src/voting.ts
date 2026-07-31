import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const db = getFirestore();

function todayNairobi(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Nairobi' }); // YYYY-MM-DD
}

/**
 * Casts one vote for a contestant, gated to one vote per category per
 * (Nairobi) calendar day per signed-in reader account.
 *
 * This is the actual source of truth for vote integrity — the client's
 * browser-fingerprint check (lib/fingerprint.ts) is still used for instant
 * UI feedback, but it's easily bypassed (incognito, cleared storage) and is
 * NOT what stops a determined user from voting twice. This function is.
 *
 * firestore.rules only allows admin writes on the contestants subcollection
 * directly — every real vote goes through here, using the Admin SDK, which
 * bypasses those rules entirely.
 */
export const castVote = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'Sign in to vote.');
  }

  const { categoryId, contestantId } = request.data ?? {};
  if (typeof categoryId !== 'string' || typeof contestantId !== 'string') {
    throw new HttpsError('invalid-argument', 'categoryId and contestantId are required.');
  }

  const catRef = db.doc(`votingCategories/${categoryId}`);
  const contestantRef = db.doc(`votingCategories/${categoryId}/contestants/${contestantId}`);
  const voterRef = db.doc(`votingCategories/${categoryId}/voters/${uid}`);
  const readerRef = db.doc(`readers/${uid}`);
  const today = todayNairobi();
  const yesterday = new Date(Date.now() - 86400000).toLocaleDateString('en-CA', {
    timeZone: 'Africa/Nairobi',
  });

  await db.runTransaction(async (tx) => {
    const [catSnap, contestantSnap, voterSnap, readerSnap] = await Promise.all([
      tx.get(catRef),
      tx.get(contestantRef),
      tx.get(voterRef),
      tx.get(readerRef),
    ]);

    if (!catSnap.exists) throw new HttpsError('not-found', 'Category not found.');
    if (catSnap.data()?.status !== 'open') {
      throw new HttpsError('failed-precondition', 'Voting is not open for this category.');
    }
    if (!contestantSnap.exists) throw new HttpsError('not-found', 'Contestant not found.');

    if (voterSnap.exists && voterSnap.data()?.lastVoteDate === today) {
      throw new HttpsError('already-exists', 'You already voted in this category today.');
    }

    tx.update(contestantRef, { votes: FieldValue.increment(1) });
    tx.set(voterRef, {
      lastVoteDate: today,
      votedContestantId: contestantId,
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Streak: one increment per calendar day regardless of how many
    // categories a reader votes in that day. lastAnyVoteDate is what
    // dedupes that — a second category vote on the same day touches the
    // streak fields but doesn't change the count.
    if (readerSnap.exists) {
      const lastAnyVoteDate = readerSnap.data()?.lastAnyVoteDate;
      if (lastAnyVoteDate !== today) {
        const currentStreak = readerSnap.data()?.voteStreak ?? 0;
        const newStreak = lastAnyVoteDate === yesterday ? currentStreak + 1 : 1;
        tx.update(readerRef, { voteStreak: newStreak, lastAnyVoteDate: today });
      }
    }
  });

  return { success: true };
});
