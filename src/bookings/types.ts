import type { Timestamp } from 'firebase/firestore';

export type BookingStatus =
  | 'requested'        // reader submitted, awaiting photographer response
  | 'declined'         // photographer declined
  | 'accepted'         // photographer accepted + set amount, awaiting payment
  | 'awaiting_payment' // STK push sent, waiting on Paystack webhook
  | 'payment_failed'   // charge failed or was cancelled on the phone
  | 'paid'             // confirmed via Paystack webhook
  | 'completed'        // photographer marked the shoot done (manual, post-MVP-ish)
  | 'cancelled';        // reader cancelled before payment

export interface Booking {
  id: string;
  photographerId: string;
  photographerBusinessName: string;
  readerId: string;
  readerName: string;
  readerPhone: string;
  serviceName: string;
  proposedDate: string; // free-text/ISO date the reader would like — not a hard slot system
  notes: string;
  amount: number; // KES, whole units (not cents) — set by photographer on accept
  status: BookingStatus;
  paystackReference?: string;
  paidAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Platform's cut of every paid booking. Mirrored in
// functions/src/paystack.ts — change both together if this changes.
export const PLATFORM_FEE_PERCENT = 10;

// Smallest amount a photographer may set for a bookable service / a reader
// may be charged for a booking. Mirrored in functions/src/paystack.ts —
// change both together if this changes.
export const MIN_BOOKING_FEE_KES = 100;

// Paystack's transaction fee, passed through to the customer rather than
// absorbed by the platform or the photographer — the reader pays this on
// top of the agreed booking amount. Mirrored in functions/src/paystack.ts,
// which is the actual source of truth for what gets charged; this copy is
// only used to *display* the total before the charge is created.
export const PAYSTACK_FEE_PERCENT = 2.9;

// Grosses up a base amount so that, after Paystack deducts its percentage
// fee from the total charged, the full base amount remains for the
// platform/photographer split. Rounded up to the nearest whole KES since
// M-Pesa charges don't take fractional shillings.
export function grossUpForPaystackFee(baseAmountKes: number): number {
  return Math.ceil(baseAmountKes / (1 - PAYSTACK_FEE_PERCENT / 100));
}
