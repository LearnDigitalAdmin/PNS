import type { Timestamp } from 'firebase/firestore';

// ── Categories ────────────────────────────────────────────────────────────
// Fixed enum, not free text — see Phase 1 spec for rationale (directory
// filtering breaks with free text). Extend this list as real signups show
// gaps; it's just an array, not a schema change.
export const PHOTOGRAPHER_CATEGORIES = [
  'Portrait',
  'Wedding',
  'Event',
  'Fashion',
  'Product',
  'Family',
  'Graduation',
  'Corporate/Branding',
] as const;

export type PhotographerCategory = (typeof PHOTOGRAPHER_CATEGORIES)[number];

// ── Storage caps ──────────────────────────────────────────────────────────
export const DEFAULT_PHOTOGRAPHER_STORAGE_CAP_BYTES = 1 * 1024 * 1024 * 1024; // 1 GB
export const DEFAULT_READER_STORAGE_CAP_BYTES = 300 * 1024 * 1024; // 300 MB

// ── Core profile ──────────────────────────────────────────────────────────
export interface PhotographerService {
  name: string;
  description: string;
  priceFrom: number;
}

// How a photographer collects payment for a booking. 'pay_later' is
// reserved for a future phase (photographer gets paid outside the app after
// the shoot) and is intentionally not selectable yet — see Settings tab.
// Every photographer is 'pay_on_booking' for now: once they accept a
// request, the reader is prompted to pay the fixed service price by M-Pesa
// before the booking is confirmed.
export type PaymentPolicy = 'pay_on_booking' | 'pay_later';

export interface PhotographerProfile {
  uid: string; // == Firestore doc id under /photographers
  authProvider: 'google' | 'phone';
  businessName: string;
  ownerName: string;
  email?: string;
  phone: string;
  county: string;
  bio: string;
  categories: PhotographerCategory[];
  services: PhotographerService[];
  coverImageUrl?: string;
  status: 'active' | 'suspended';
  verified: boolean; // admin-granted trust badge — never a gate to publishing
  paymentPolicy: PaymentPolicy;
  likesCount: number;
  storageUsedBytes: number;
  storageCapBytes: number;
  profileComplete: boolean;
  // Payout setup — required before a photographer can accept paid bookings.
  // Set via the Settings tab, which calls createPhotographerSubaccount.
  paystackSubaccountCode?: string;
  payoutBankCode?: string;
  payoutAccountNumber?: string;
  payoutSetupComplete: boolean;
  // Safaricom number the shared project's paystackCallback webhook SMSes on
  // a successful booking payment (via HostPinnacle). Stored as "SMSPhone" —
  // matching the Firestore field name the webhook reads directly — rather
  // than camelCase, so the two stay obviously in sync across repos.
  SMSPhone?: string;
  createdAt: Timestamp;
}

// Fields collected during signup, before the profile-completion step
export type PhotographerDraft = Pick<
  PhotographerProfile,
  'uid' | 'authProvider' | 'email'
>;

// ── Gallery (public portfolio) ───────────────────────────────────────────
export interface GalleryImage {
  id: string;
  imageUrl: string; // watermarked display copy — safe to expose publicly
  originalUrl: string; // untouched original — NEVER exposed on public routes
  thumbUrl: string;
  caption: string;
  category: PhotographerCategory | string;
  pinned: boolean;
  pinnedOrder: number;
  sizeBytes: number;
  order: number;
  uploadedAt: Timestamp;
}

// ── Likes ─────────────────────────────────────────────────────────────────
// Existence of photographers/{id}/likes/{userId} == "this user liked this
// photographer". Doc id is the liking user's uid, which is what the
// Firestore rule uses to prevent double-liking.

// ── Sessions (camera-number ↔ client-phone delivery matching) ───────────
export interface ShootSession {
  id: string;
  label: string;
  date: Timestamp;
  location: string;
  status: 'collecting' | 'matched' | 'delivered';
  createdAt: Timestamp;
}

export interface SessionClientEntry {
  id: string;
  clientPhone: string;
  clientName?: string;
  imageRangeStart: number;
  imageRangeEnd: number;
  matchedCount: number;
  deliveryStatus: 'pending' | 'matched' | 'delivered';
}

export interface SessionImage {
  id: string;
  cameraFileName: string;
  cameraNumber: number | null;
  matchedEntryId: string | null;
  matchType: 'auto' | 'manual' | 'unmatched';
  storageUrl: string;
  contentType: 'image' | 'pdf';
  sizeBytes: number;
  uploadedAt: Timestamp;
}

// Small helper so upload UI and delivery review can agree on what counts
// as which — a session can now include a PDF (contract, printable album,
// certificate) alongside the usual JPEGs.
export function inferContentType(fileName: string): 'image' | 'pdf' {
  return fileName.toLowerCase().endsWith('.pdf') ? 'pdf' : 'image';
}

// Parses the numeric run out of a camera filename, e.g. "DSC2051.JPG" -> 2051
// Returns null if no numeric run is found so callers can flag it "unmatched".
export function parseCameraNumber(fileName: string): number | null {
  const match = fileName.match(/(\d+)(?!.*\d)/); // last run of digits before extension
  if (!match) return null;
  return parseInt(match[1], 10);
}

export function matchCameraNumberToEntry(
  cameraNumber: number | null,
  entries: SessionClientEntry[]
): SessionClientEntry | null {
  if (cameraNumber === null) return null;
  return (
    entries.find(
      (e) => cameraNumber >= e.imageRangeStart && cameraNumber <= e.imageRangeEnd
    ) ?? null
  );
}

// ── Reports (trust-first moderation) ─────────────────────────────────────
export interface Report {
  id: string;
  targetType: 'photographer' | 'galleryImage' | 'booking';
  targetId: string;
  photographerId: string; // owning photographer, for admin triage grouping
  // Set for targetType 'booking' so the admin queue can jump straight to
  // the booking record without a photographer-doc lookup.
  bookingId?: string;
  reporterUserId: string | null; // null = anonymous report (booking reports always set this — see firestore.rules)
  reason: string;
  status: 'open' | 'reviewed' | 'actioned';
  createdAt: Timestamp;
  reviewedBy?: string;
}

export const REPORT_REASONS = [
  'Inappropriate content',
  'Copyright / not their work',
  'Misleading profile',
  'Spam',
  'Other',
] as const;

// Reasons a reader can report a PAID booking. Kept distinct from
// REPORT_REASONS above since a booking problem is about service delivery,
// not directory/profile content moderation.
export const BOOKING_REPORT_REASONS = [
  'Not fulfilled',
  'Not as agreed / poor quality',
  'Photographer unresponsive',
  'Other',
] as const;
