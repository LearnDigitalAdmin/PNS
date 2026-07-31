import type { Timestamp } from 'firebase/firestore';

export const DEFAULT_READER_STORAGE_CAP_BYTES = 300 * 1024 * 1024; // 300 MB

export interface ReaderProfile {
  uid: string; // == Firestore doc id under /readers
  authProvider: 'google' | 'phone';
  displayName: string;
  email?: string;
  phone: string; // load-bearing: this is what photographers match session client entries against
  storageUsedBytes: number;
  storageCapBytes: number;
  profileComplete: boolean;
  // Growth (Phase 4)
  voteStreak: number; // consecutive days with at least one vote cast
  lastAnyVoteDate?: string; // 'YYYY-MM-DD' Africa/Nairobi — dedupe multiple categories same day
  referredBy?: string; // uid of the reader whose referral link they signed up through
  referralCount: number; // how many readers signed up via this reader's link
  createdAt: Timestamp;
}

// readers/{readerId}/deliveries/{deliveryId}
// One doc per photo delivered from a photographer's shoot session.
export interface ReaderDelivery {
  id: string;
  photographerId: string;
  photographerBusinessName: string;
  sessionId: string;
  sessionLabel: string;
  storageUrl: string; // path under readers/{readerId}/inbox/** — private, download-only
  contentType: 'image' | 'pdf';
  sizeBytes: number;
  deliveredAt: Timestamp;
}

// votingCategories/{catId}/voters/{readerId}
// Existence + lastVoteDate is what the castVote Cloud Function checks to
// enforce one vote per category per (Nairobi) day. Never written by the
// client directly — see functions/src/voting.ts.
export interface VoterRecord {
  lastVoteDate: string; // 'YYYY-MM-DD' in Africa/Nairobi
  votedContestantId: string;
  updatedAt: Timestamp;
}
