import type { Timestamp } from 'firebase/firestore';

/**
 * Converts a Firestore Timestamp (or null, while serverTimestamp() is
 * still resolving locally) into a short relative-time label.
 */
export function formatRelativeTime(ts: Timestamp | null | undefined): string {
  if (!ts) return 'just now';
  const ms = typeof ts.toMillis === 'function' ? ts.toMillis() : Date.now();
  const diff = Date.now() - ms;

  if (diff < 60_000) return 'just now';
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? '' : 's'} ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks} week${weeks === 1 ? '' : 's'} ago`;
  const months = Math.floor(days / 30);
  return `${months} month${months === 1 ? '' : 's'} ago`;
}