import {
  collection,
  doc,
  onSnapshot,
  query,
  orderBy,
  where,
  addDoc,
  serverTimestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';

// ─── Gallery (Cogvana Visuals) ────────────────────────────────────────────────

export interface FSGalleryImage {
  id: string;
  image: string;
  caption: string;
  credit: string;
  section: 'cover' | 'masonry';
  order: number;
}

export function subscribeToGallery(onChange: (items: FSGalleryImage[]) => void): Unsubscribe {
  const q = query(collection(db, 'gallery'), orderBy('order', 'asc'));
  return onSnapshot(q, (snap) => {
    onChange(snap.docs.map((d) => ({ id: d.id, ...d.data() } as FSGalleryImage)));
  });
}

// ─── Services ──────────────────────────────────────────────────────────────

export interface FSServiceItem {
  id: string;
  image: string;
  eyebrow: string;
  title: string;
  order: number;
}

export function subscribeToServices(onChange: (items: FSServiceItem[]) => void): Unsubscribe {
  const q = query(collection(db, 'services'), orderBy('order', 'asc'));
  return onSnapshot(q, (snap) => {
    onChange(snap.docs.map((d) => ({ id: d.id, ...d.data() } as FSServiceItem)));
  });
}

// ─── Testimonials ──────────────────────────────────────────────────────────

export interface FSTestimonial {
  id: string;
  quote: string;
  image: string;
  name: string;
  role: string;
  order: number;
}

export function subscribeToTestimonials(onChange: (items: FSTestimonial[]) => void): Unsubscribe {
  const q = query(collection(db, 'testimonials'), orderBy('order', 'asc'));
  return onSnapshot(q, (snap) => {
    onChange(snap.docs.map((d) => ({ id: d.id, ...d.data() } as FSTestimonial)));
  });
}

// ─── Partners ──────────────────────────────────────────────────────────────

export interface FSPartner {
  id: string;
  name: string;
  category: string;
  status: 'active' | 'pending' | 'suspended';
  email: string;
  phone?: string;
  image?: string;
}

/** Only active partners, ordered most-recent-first. */
export function subscribeToActivePartners(onChange: (items: FSPartner[]) => void): Unsubscribe {
  const q = query(
    collection(db, 'partners'),
    where('status', '==', 'active'),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(q, (snap) => {
    onChange(snap.docs.map((d) => ({ id: d.id, ...d.data() } as FSPartner)));
  });
}

// ─── Sponsored Stories (public-facing, published deals only) ─────────────────

export interface FSSponsoredStory {
  id: string;
  business: string;
  title?: string;
  excerpt?: string;
  image?: string;
  stage: 'inquiry' | 'production' | 'live' | 'completed';
  published?: boolean;
}

export function subscribeToPublishedSponsoredStories(
  onChange: (items: FSSponsoredStory[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'sponsoredDeals'),
    where('published', '==', true),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(q, (snap) => {
    onChange(snap.docs.map((d) => ({ id: d.id, ...d.data() } as FSSponsoredStory)));
  });
}

// ─── Products (Shop) ───────────────────────────────────────────────────────

export interface FSProduct {
  id: string;
  name: string;
  price: number;
  stock: number;
  category: string;
  image: string;
  wide?: boolean;
  digital?: boolean;
}

export function subscribeToProducts(onChange: (items: FSProduct[]) => void): Unsubscribe {
  const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snap) => {
    onChange(snap.docs.map((d) => ({ id: d.id, ...d.data() } as FSProduct)));
  });
}

// ─── Newsletter ────────────────────────────────────────────────────────────

export async function subscribeToNewsletter(email: string): Promise<void> {
  await addDoc(collection(db, 'newsletter'), {
    email: email.trim().toLowerCase(),
    createdAt: serverTimestamp(),
  });
}

// ─── Orders (cart checkout capture) ───────────────────────────────────────────
// Note: this records the order for fulfillment/follow-up. It does NOT process
// payment — there is no payment gateway wired up. Treat orders as "pending
// payment" until a real payment integration is added.

export interface OrderLineItem {
  name: string;
  price: number;
  qty: number;
}

export async function createOrder(items: OrderLineItem[]): Promise<string> {
  const total = items.reduce((s, i) => s + i.price * i.qty, 0);
  const ref = await addDoc(collection(db, 'orders'), {
    items,
    total,
    status: 'pending_payment',
    createdAt: serverTimestamp(),
  });
  return ref.id;
}