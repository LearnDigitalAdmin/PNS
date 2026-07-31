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
