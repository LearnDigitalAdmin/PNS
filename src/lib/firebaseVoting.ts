/**
 * firestoreVoting.ts
 * All Firestore read/write logic for the live voting system.
 * Can be called from the site (auto-conclude on deadline) or admin (manual trigger).
 * Uses a Firestore transaction on the category doc so only one client wins the race.
 */

import {
  collection,
  doc,
  onSnapshot,
  query,
  orderBy,
  runTransaction,
  addDoc,
  updateDoc,
  serverTimestamp,
  getDocs,
  writeBatch,
  Timestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import { httpsCallable, FunctionsError } from 'firebase/functions';
import { db, functions } from './firebase';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FSContestant {
  id: string;         // Firestore doc id
  name: string;
  tagline: string;
  image: string;
  reward: string;
  votes: number;
  winner: boolean;
}

export type FSCategoryStatus = 'scheduled' | 'open' | 'closed';

export interface FSVotingCategory {
  id: string;         // Firestore doc id
  key: string;        // e.g. 'lady', 'man'
  name: string;       // display name
  icon: string;
  status: FSCategoryStatus;
  opens: Timestamp | null;
  closes: Timestamp | null;
  winnerId: string | null;
  winnerStoryId: string | null;  // auto-created story doc id
  concluded: boolean;
  contestants: FSContestant[];   // hydrated from subcollection
}

// ─── Subscribe to all categories + their contestants ─────────────────────────

export function subscribeToVotingCategories(
  onChange: (cats: FSVotingCategory[]) => void
): Unsubscribe {
  const catsRef = collection(db, 'votingCategories');
  const catsQ = query(catsRef, orderBy('order', 'asc'));

  // Hold latest contestant snapshots per category
  const contestantUnsubs: Map<string, Unsubscribe> = new Map();
  const categoryDocs: Map<string, Omit<FSVotingCategory, 'contestants'>> = new Map();
  const contestantData: Map<string, FSContestant[]> = new Map();

  function emit() {
    const cats: FSVotingCategory[] = [];
    categoryDocs.forEach((cat) => {
      cats.push({ ...cat, contestants: contestantData.get(cat.id) ?? [] });
    });
    // Sort by order field preserved in categoryDocs
    onChange(cats);
  }

  const catUnsub = onSnapshot(catsQ, (snap) => {
    const newIds = new Set(snap.docs.map((d) => d.id));

    // Unsubscribe from removed categories
    contestantUnsubs.forEach((unsub, id) => {
      if (!newIds.has(id)) {
        unsub();
        contestantUnsubs.delete(id);
        categoryDocs.delete(id);
        contestantData.delete(id);
      }
    });

    snap.docs.forEach((catDoc) => {
      const data = catDoc.data();
      categoryDocs.set(catDoc.id, {
        id: catDoc.id,
        key: data.key ?? catDoc.id,
        name: data.name ?? '',
        icon: data.icon ?? '🗳',
        status: data.status ?? 'scheduled',
        opens: data.opens ?? null,
        closes: data.closes ?? null,
        winnerId: data.winnerId ?? null,
        winnerStoryId: data.winnerStoryId ?? null,
        concluded: data.concluded ?? false,
      });

      // Subscribe to contestants subcollection if not already
      if (!contestantUnsubs.has(catDoc.id)) {
        const contQ = query(
          collection(db, 'votingCategories', catDoc.id, 'contestants'),
          orderBy('votes', 'desc')
        );
        const unsub = onSnapshot(contQ, (contSnap) => {
          contestantData.set(
            catDoc.id,
            contSnap.docs.map((d) => ({ id: d.id, ...d.data() } as FSContestant))
          );
          emit();
        });
        contestantUnsubs.set(catDoc.id, unsub);
      }
    });

    emit();
  });

  return () => {
    catUnsub();
    contestantUnsubs.forEach((u) => u());
  };
}

// ─── Cast a vote ─────────────────────────────────────────────────────────────

/**
 * Thrown by castVoteInFirestore so callers can distinguish "already voted
 * today" from other failures without parsing error strings.
 */
export class AlreadyVotedError extends Error {
  constructor() {
    super('You already voted in this category today.');
    this.name = 'AlreadyVotedError';
  }
}

/**
 * Casts a vote via the castVote Cloud Function. This used to write directly
 * to Firestore from the client, but that was only ever reachable through an
 * open-catch-all rule that has since been closed (see firestore.rules) —
 * direct writes to the contestants subcollection are admin-only now.
 * Real vote integrity (one per category per day) is enforced server-side,
 * tied to the signed-in reader's account. Requires the caller to be
 * signed in — SiteContext/VotingPage gate the UI on that before calling
 * this at all, but this will also reject cleanly if that gate is bypassed.
 */
export async function castVoteInFirestore(
  categoryId: string,
  contestantId: string
): Promise<void> {
  const castVote = httpsCallable(functions, 'castVote');
  try {
    await castVote({ categoryId, contestantId });
  } catch (err) {
    if (err instanceof FunctionsError && err.code === 'already-exists') {
      throw new AlreadyVotedError();
    }
    throw err;
  }
}

// ─── Conclude a contest ───────────────────────────────────────────────────────
/**
 * Determines winner, marks category concluded, writes auto story to Firestore.
 * Uses a transaction on the category doc so only ONE client concludes (race-safe).
 * Returns true if this client ran the conclusion, false if already concluded.
 */
// Typed container so TypeScript knows what we're passing out of the transaction
interface ConcludeResult {
  alreadyDone: boolean;
  winnerId: string | null;
  winnerData: FSContestant | null;
}

export async function concludeContest(categoryId: string): Promise<boolean> {
  const catRef = doc(db, 'votingCategories', categoryId);

  // Use a plain object so assignments inside the async callback are visible
  // to TypeScript outside it — avoids the `let x: T | null` → `never` narrowing bug.
  const result: ConcludeResult = {
    alreadyDone: false,
    winnerId: null,
    winnerData: null,
  };

  await runTransaction(db, async (tx) => {
    const catSnap = await tx.get(catRef);
    if (!catSnap.exists()) throw new Error('Category not found');
    if (catSnap.data().concluded) {
      result.alreadyDone = true;
      return;
    }

    // Fetch contestants inside transaction
    const contQ = await getDocs(
      collection(db, 'votingCategories', categoryId, 'contestants')
    );
    const contestants = contQ.docs.map((d) => ({ id: d.id, ...d.data() } as FSContestant));

    if (contestants.length === 0) {
      // No contestants — just close
      tx.update(catRef, { status: 'closed', concluded: true });
      return;
    }

    // Find max votes
    const maxVotes = Math.max(...contestants.map((c) => c.votes));
    const tied = contestants.filter((c) => c.votes === maxVotes);

    // Pick winner (random among tied)
    const winner = tied[Math.floor(Math.random() * tied.length)];
    result.winnerId = winner.id;
    result.winnerData = winner;

    // Mark category concluded
    tx.update(catRef, {
      status: 'closed',
      concluded: true,
      winnerId: winner.id,
      closedAt: serverTimestamp(),
    });
  });

  if (result.alreadyDone) return false;

  // Destructure so we get properly-typed locals for use below
  const { winnerId, winnerData } = result;

  // Outside transaction: mark winning contestant + create story
  if (winnerId !== null && winnerData !== null) {
    const batch = writeBatch(db);

    // Mark winner on contestant doc
    const winnerContRef = doc(db, 'votingCategories', categoryId, 'contestants', winnerId);
    batch.update(winnerContRef, { winner: true });

    await batch.commit();

    // Fetch category name for story metadata (single doc, not full collection scan)
    const catSnap = await import('firebase/firestore').then(({ getDoc }) =>
      getDoc(catRef)
    );
    const catName: string = catSnap.exists()
      ? (catSnap.data() as { name?: string }).name ?? 'Voting Winner'
      : 'Voting Winner';
    const catIcon: string = catSnap.exists()
      ? (catSnap.data() as { icon?: string }).icon ?? ''
      : '';

    const storyRef = await addDoc(collection(db, 'stories'), {
      title: `${winnerData.name}: ${catName} — Reader's Choice`,
      category: catName,
      excerpt: winnerData.tagline ?? '',
      body: `${winnerData.name} was voted ${catName} by P&S readers this week. ${winnerData.tagline ?? ''}`,
      image: winnerData.image ?? '',
      status: 'live',
      author: 'Editorial Team',
      date: new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      sourceVotingCategoryId: categoryId,
      sourceContestantId: winnerId,
      isVotingWinner: true,
      votingIcon: catIcon,
      createdAt: serverTimestamp(),
    });

    // Store story ref back on category
    await updateDoc(catRef, { winnerStoryId: storyRef.id });
  }

  return true;
}

// ─── Subscribe to live stories ────────────────────────────────────────────────

export interface FSStory {
  id: string;
  title: string;
  category: string;
  excerpt: string;
  body: string;
  image: string;
  images?: string[];
  status: 'draft' | 'scheduled' | 'live';
  author: string;
  date: string;
  isVotingWinner?: boolean;
  instagram?: string;
}

export function subscribeToLiveStories(
  onChange: (stories: FSStory[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'stories'),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(q, (snap) => {
    const live = snap.docs
      .map((d) => ({ id: d.id, ...d.data() } as FSStory))
      .filter((s) => s.status === 'live');
    onChange(live);
  });
}

// ─── Admin helpers ────────────────────────────────────────────────────────────

/** Save or update a voting category (without contestants). */
export async function saveVotingCategory(
  id: string | null,
  data: {
    key: string;
    name: string;
    icon: string;
    status: FSCategoryStatus;
    opens: Date | null;
    closes: Date | null;
    order: number;
  }
): Promise<string> {
  const payload = {
    ...data,
    opens: data.opens ? Timestamp.fromDate(data.opens) : null,
    closes: data.closes ? Timestamp.fromDate(data.closes) : null,
    concluded: false,
    winnerId: null,
    winnerStoryId: null,
  };
  if (id) {
    await updateDoc(doc(db, 'votingCategories', id), payload);
    return id;
  }
  const ref = await addDoc(collection(db, 'votingCategories'), {
    ...payload,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

/** Add or update a contestant in a category. */
export async function saveContestant(
  categoryId: string,
  contestantId: string | null,
  data: { name: string; tagline: string; image: string; reward: string; votes: number }
): Promise<void> {
  if (contestantId) {
    await updateDoc(
      doc(db, 'votingCategories', categoryId, 'contestants', contestantId),
      data
    );
  } else {
    await addDoc(collection(db, 'votingCategories', categoryId, 'contestants'), {
      ...data,
      winner: false,
      createdAt: serverTimestamp(),
    });
  }
}

/** Delete a contestant. */
export async function deleteContestantFS(
  categoryId: string,
  contestantId: string
): Promise<void> {
  const { deleteDoc } = await import('firebase/firestore');
  await deleteDoc(doc(db, 'votingCategories', categoryId, 'contestants', contestantId));
}

/** Open a category for voting. */
export async function openCategory(categoryId: string): Promise<void> {
  await updateDoc(doc(db, 'votingCategories', categoryId), { status: 'open' });
}
