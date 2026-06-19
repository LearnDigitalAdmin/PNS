import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { formatRelativeTime } from '../../lib/formatTime';


import { nextId } from '../data';
import type {
  AdminStory,
  RequestsState,
  RequestType,
  RequestStatus,
  SponsoredDeal,
  Partner,
  Product,
  GalleryImage,
  ActivityLogEntry,
  LoginAttempt,
} from '../types';
import { addTickerMessage, removeTickerMessageAt, subscribeSiteSettings } from '../../lib/siteSettings';

export type ToastType = 'info' | 'success' | 'danger';
export interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

export interface ConfirmState {
  title: string;
  message: string;
  onConfirm: () => void;
}

const REQ_TYPES: RequestType[] = ['featured', 'booking', 'sponsored', 'partnership', 'mediaKit'];

interface AdminDataValue {
  stories: AdminStory[];
  addStory: (payload: Omit<AdminStory, 'id'>) => void;
  updateStory: (id: number, payload: Omit<AdminStory, 'id'>) => void;
  deleteStory: (id: number) => void;
  publishStory: (id: number) => void;

  // Read-only live mirrors (CRUD for these lives in BusinessSection /
  // votingTab, which subscribe to Firestore directly).
  requests: RequestsState;
  partners: Partner[];
  sponsoredDeals: SponsoredDeal[];

  products: Product[];
  addProduct: (payload: Omit<Product, 'id'>) => void;
  updateProduct: (id: number, payload: Omit<Product, 'id'>) => void;
  deleteProduct: (id: number) => void;

  gallery: GalleryImage[];
  addGalleryImage: (payload: Omit<GalleryImage, 'id' | 'order'>) => void;
  moveGalleryImage: (id: number, dir: -1 | 1) => void;
  deleteGalleryImage: (id: number) => void;

  activityLog: ActivityLogEntry[];
  logActivity: (text: string, type?: ActivityLogEntry['type']) => void;

  loginAttempts: LoginAttempt[];
  logLoginAttempt: (email: string, status: LoginAttempt['status'], device: string) => void;

  tickerMessages: string[];
  addTickerMsg: (msg: string) => void;
  removeTickerMsg: (idx: number) => void;

  toasts: Toast[];
  showToast: (message: string, type?: ToastType) => void;

  confirmState: ConfirmState | null;
  openConfirm: (title: string, message: string, onConfirm: () => void) => void;
  closeConfirm: () => void;
}

const AdminDataContext = createContext<AdminDataValue | null>(null);

const emptyRequests = (): RequestsState => ({
  featured: [],
  booking: [],
  sponsored: [],
  partnership: [],
  mediaKit: [],
});

export function AdminDataProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = nextId();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 2800);
  }, []);

  const openConfirm = useCallback((title: string, message: string, onConfirm: () => void) => {
    setConfirmState({ title, message, onConfirm });
  }, []);
  const closeConfirm = useCallback(() => setConfirmState(null), []);

  // ---------- activity log (Firestore-backed audit trail) ----------
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([]);
  useEffect(() => {
    const q = query(collection(db, 'activityLog'), orderBy('createdAt', 'desc'), limit(100));
    return onSnapshot(q, (snap) => {
      setActivityLog(
        snap.docs.map((d) => {
          const data = d.data();
          return {
            text: data.text as string,
            type: (data.type as ActivityLogEntry['type']) ?? 'admin',
            time: formatRelativeTime(data.createdAt),
          };
        })
      );
    });
  }, []);

  const logActivity = useCallback((text: string, type: ActivityLogEntry['type'] = 'admin') => {
    addDoc(collection(db, 'activityLog'), { text, type, createdAt: serverTimestamp() }).catch((e) =>
      console.error('logActivity failed:', e)
    );
  }, []);

  // ---------- login attempts (Firestore-backed audit trail) ----------
  const [loginAttempts, setLoginAttempts] = useState<LoginAttempt[]>([]);
  useEffect(() => {
    const q = query(collection(db, 'loginAttempts'), orderBy('createdAt', 'desc'), limit(12));
    return onSnapshot(q, (snap) => {
      setLoginAttempts(
        snap.docs.map((d) => {
          const data = d.data();
          return {
            email: data.email as string,
            status: data.status as LoginAttempt['status'],
            location: data.location as string,
            device: data.device as string,
            time: formatRelativeTime(data.createdAt),
          };
        })
      );
    });
  }, []);

  const logLoginAttempt = useCallback(
    (email: string, status: LoginAttempt['status'], device: string) => {
      addDoc(collection(db, 'loginAttempts'), {
        email,
        status,
        device,
        location: status === 'success' ? 'Nairobi, KE' : 'Unknown location',
        createdAt: serverTimestamp(),
      }).catch((e) => console.error('logLoginAttempt failed:', e));
    },
    []
  );

  // ---------- site settings: ticker ----------
  const [tickerMessages, setTickerMessages] = useState<string[]>([]);
  useEffect(() => subscribeSiteSettings((s) => setTickerMessages(s.tickerMessages)), []);

  const addTickerMsg = useCallback(
    (msg: string) => {
      if (!msg.trim()) return;
      addTickerMessage(msg.trim())
        .then(() => {
          logActivity('Amara Editor added a new site ticker message');
          showToast('Ticker message added', 'success');
        })
        .catch(() => showToast('Failed to add ticker message', 'danger'));
    },
    [logActivity, showToast]
  );

  const removeTickerMsg = useCallback(
    (idx: number) => {
      removeTickerMessageAt(idx, tickerMessages)
        .then(() => showToast('Ticker message removed', 'danger'))
        .catch(() => showToast('Failed to remove ticker message', 'danger'));
    },
    [tickerMessages, showToast]
  );

  // ---------- stories ----------
  const [stories, setStories] = useState<AdminStory[]>([]);
  useEffect(() => {
    const q = query(collection(db, 'stories'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
      setStories(
        snap.docs.map((d) => ({ id: nextId(), ...d.data(), _fsId: d.id } as unknown as AdminStory))
      );
    });
  }, []);

  const addStory = useCallback(
    async (payload: Omit<AdminStory, 'id'>) => {
      await addDoc(collection(db, 'stories'), { ...payload, createdAt: serverTimestamp() });
      logActivity(`Amara Editor created a new story "${payload.title}"`);
      showToast('Story added', 'success');
    },
    [logActivity, showToast]
  );
  const updateStory = useCallback(
    async (id: number, payload: Omit<AdminStory, 'id'>) => {
      const target = stories.find((s) => s.id === id) as any;
      if (target?._fsId) await updateDoc(doc(db, 'stories', target._fsId), { ...payload });
      logActivity(`Amara Editor updated story "${payload.title}"`);
      showToast('Story updated', 'success');
    },
    [stories, logActivity, showToast]
  );
  const deleteStory = useCallback(
    async (id: number) => {
      const target = stories.find((s) => s.id === id) as any;
      if (target?._fsId) await deleteDoc(doc(db, 'stories', target._fsId));
      if (target) logActivity(`Amara Editor deleted story "${target.title}"`);
      showToast('Story deleted', 'danger');
    },
    [stories, logActivity, showToast]
  );
  const publishStory = useCallback(
    async (id: number) => {
      const target = stories.find((s) => s.id === id) as any;
      if (!target?._fsId) return;
      const date = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      await updateDoc(doc(db, 'stories', target._fsId), { status: 'live', date });
      logActivity(`Amara Editor published "${target.title}"`);
      showToast(`"${target.title}" is now live`, 'success');
    },
    [stories, logActivity, showToast]
  );

  // ---------- requests (read mirror — CRUD lives in BusinessSection) ----------
  const [requests, setRequests] = useState<RequestsState>(emptyRequests);
  useEffect(() => {
    const unsubs = REQ_TYPES.map((type) => {
      const q = query(collection(db, 'requests', type, 'items'), orderBy('createdAt', 'desc'));
      return onSnapshot(q, (snap) => {
        const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setRequests((prev) => ({ ...prev, [type]: docs as any }));
      });
    });
    return () => unsubs.forEach((u) => u());
  }, []);

  // ---------- sponsoredDeals (read mirror — CRUD lives in BusinessSection) ----------
  const [sponsoredDeals, setSponsoredDeals] = useState<SponsoredDeal[]>([]);
  useEffect(() => {
    const q = query(collection(db, 'sponsoredDeals'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
      setSponsoredDeals(
        snap.docs.map((d) => ({ id: nextId(), ...d.data(), _fsId: d.id } as unknown as SponsoredDeal))
      );
    });
  }, []);

  // ---------- partners (read mirror — CRUD lives in BusinessSection) ----------
  const [partners, setPartners] = useState<Partner[]>([]);
  useEffect(() => {
    const q = query(collection(db, 'partners'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
      setPartners(
        snap.docs.map((d) => ({ id: nextId(), ...d.data(), _fsId: d.id } as unknown as Partner))
      );
    });
  }, []);

  // ---------- products ----------
  const [products, setProducts] = useState<Product[]>([]);
  useEffect(() => {
    const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
      setProducts(
        snap.docs.map((d) => ({ id: nextId(), ...d.data(), _fsId: d.id } as unknown as Product))
      );
    });
  }, []);

  const addProduct = useCallback(
    async (payload: Omit<Product, 'id'>) => {
      await addDoc(collection(db, 'products'), { ...payload, createdAt: serverTimestamp() });
      logActivity(`Amara Editor added product "${payload.name}"`);
      showToast('Product added', 'success');
    },
    [logActivity, showToast]
  );
  const updateProduct = useCallback(
    async (id: number, payload: Omit<Product, 'id'>) => {
      const target = products.find((p) => p.id === id) as any;
      if (target?._fsId) await updateDoc(doc(db, 'products', target._fsId), { ...payload });
      logActivity(`Amara Editor updated product "${payload.name}"`);
      showToast('Product updated', 'success');
    },
    [products, logActivity, showToast]
  );
  const deleteProduct = useCallback(
    async (id: number) => {
      const target = products.find((p) => p.id === id) as any;
      if (target?._fsId) await deleteDoc(doc(db, 'products', target._fsId));
      if (target) logActivity(`Amara Editor deleted product "${target.name}"`);
      showToast('Product deleted', 'danger');
    },
    [products, logActivity, showToast]
  );

  // ---------- gallery ----------
  const [gallery, setGallery] = useState<GalleryImage[]>([]);
  useEffect(() => {
    const q = query(collection(db, 'gallery'), orderBy('order', 'asc'));
    return onSnapshot(q, (snap) => {
      setGallery(
        snap.docs.map((d) => ({ id: nextId(), ...d.data(), _fsId: d.id } as unknown as GalleryImage))
      );
    });
  }, []);

  const addGalleryImage = useCallback(
    async (payload: Omit<GalleryImage, 'id' | 'order'>) => {
      const maxOrder = gallery.reduce((m, g) => Math.max(m, g.order ?? 0), 0);
      await addDoc(collection(db, 'gallery'), {
        ...payload,
        order: maxOrder + 1,
        createdAt: serverTimestamp(),
      });
      logActivity('Amara Editor added a new image to the Cogvana gallery');
      showToast('Image added', 'success');
    },
    [gallery, logActivity, showToast]
  );

  const moveGalleryImage = useCallback(
    async (id: number, dir: -1 | 1) => {
      const sorted = [...gallery].sort((a, b) => a.order - b.order);
      const i = sorted.findIndex((g) => g.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= sorted.length) return;
      const a = sorted[i] as any;
      const b = sorted[j] as any;
      await Promise.all([
        updateDoc(doc(db, 'gallery', a._fsId), { order: b.order }),
        updateDoc(doc(db, 'gallery', b._fsId), { order: a.order }),
      ]);
    },
    [gallery]
  );

  const deleteGalleryImage = useCallback(
    async (id: number) => {
      const target = gallery.find((g) => g.id === id) as any;
      if (target?._fsId) await deleteDoc(doc(db, 'gallery', target._fsId));
      showToast('Image removed', 'danger');
      logActivity('Amara Editor removed an image from the Cogvana gallery');
    },
    [gallery, logActivity, showToast]
  );

  const value: AdminDataValue = {
    stories,
    addStory,
    updateStory,
    deleteStory,
    publishStory,
    requests,
    partners,
    sponsoredDeals,
    products,
    addProduct,
    updateProduct,
    deleteProduct,
    gallery,
    addGalleryImage,
    moveGalleryImage,
    deleteGalleryImage,
    activityLog,
    logActivity,
    loginAttempts,
    logLoginAttempt,
    tickerMessages,
    addTickerMsg,
    removeTickerMsg,
    toasts,
    showToast,
    confirmState,
    openConfirm,
    closeConfirm,
  };

  return <AdminDataContext.Provider value={value}>{children}</AdminDataContext.Provider>;
}

export function useAdminData() {
  const ctx = useContext(AdminDataContext);
  if (!ctx) throw new Error('useAdminData must be used within AdminDataProvider');
  return ctx;
}