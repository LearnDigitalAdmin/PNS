import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  addDoc,
  setDoc,
  serverTimestamp,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import {
  createInitialVotingCategories,
  createInitialProducts,
  createInitialGallery,
  createInitialActivityLog,
  createInitialLoginAttempts,
  createInitialTickerMessages,
  REQUEST_TYPE_LABELS,
  nextId,
} from '../data';
import type {
  AdminStory,
  VotingCategory,
  RequestsState,
  RequestType,
  RequestStatus,
  SponsoredDeal,
  DealStage,
  Partner,
  PartnerStatus,
  Product,
  GalleryImage,
  ActivityLogEntry,
  LoginAttempt,
} from '../types';

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

  votingCategories: VotingCategory[];
  saveCategorySchedule: (catId: number, opens: string, closes: string, status: VotingCategory['status']) => void;
  addContestant: (catId: number, payload: { name: string; tagline: string; image: string; reward: string; votes: number }) => void;
  updateContestant: (catId: number, contId: number, payload: { name: string; tagline: string; image: string; reward: string; votes: number }) => void;
  deleteContestant: (catId: number, contId: number) => void;
  crownWinner: (catId: number, contId: number) => void;
  resetCategoryVotes: (catId: number) => void;
  resetAllVotes: () => void;

  // NOTE: requests/partners/sponsoredDeals are now Firestore-backed and
  // read-only here (BusinessSection manages live CRUD on its own
  // subscriptions). These mirrors exist purely so Overview/System can
  // display accurate, real-time counts without duplicating logic.
  requests: RequestsState;
  partners: Partner[];
  sponsoredDeals: SponsoredDeal[];

  products: Product[];
  addProduct: (payload: Omit<Product, 'id'>) => void;
  updateProduct: (id: number, payload: Omit<Product, 'id'>) => void;
  deleteProduct: (id: number) => void;

  gallery: GalleryImage[];
  addGalleryImage: (payload: Omit<GalleryImage, 'id'>) => void;
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

  resetDemoData: () => void;
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
  // ---------- Firestore-backed: stories ----------
  const [stories, setStories] = useState<AdminStory[]>([]);
  useEffect(() => {
    const q = query(collection(db, 'stories'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
      setStories(
        snap.docs.map((d) => {
          const data = d.data();
          return { id: nextId(), ...data, _fsId: d.id } as unknown as AdminStory;
        })
      );
    });
  }, []);

  // ---------- Local-only: voting (kept in-memory, demo-seeded) ----------
  const [votingCategories, setVotingCategories] = useState<VotingCategory[]>(createInitialVotingCategories);

  // ---------- Firestore-backed: requests (read mirror for Overview/System) ----------
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

  // ---------- Firestore-backed: sponsoredDeals ----------
  const [sponsoredDeals, setSponsoredDeals] = useState<SponsoredDeal[]>([]);
  useEffect(() => {
    const q = query(collection(db, 'sponsoredDeals'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
      setSponsoredDeals(snap.docs.map((d) => ({ id: nextId(), ...d.data(), _fsId: d.id } as unknown as SponsoredDeal)));
    });
  }, []);

  // ---------- Firestore-backed: partners ----------
  const [partners, setPartners] = useState<Partner[]>([]);
  useEffect(() => {
    const q = query(collection(db, 'partners'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
      setPartners(snap.docs.map((d) => ({ id: nextId(), ...d.data(), _fsId: d.id } as unknown as Partner)));
    });
  }, []);

  // ---------- Local-only demo data: products / gallery / activity / login / ticker ----------
  const [products, setProducts] = useState<Product[]>(createInitialProducts);
  const [gallery, setGallery] = useState<GalleryImage[]>(createInitialGallery);
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>(createInitialActivityLog);
  const [loginAttempts, setLoginAttempts] = useState<LoginAttempt[]>(createInitialLoginAttempts);
  const [tickerMessages, setTickerMessages] = useState<string[]>(createInitialTickerMessages);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);

  const logActivity = useCallback((text: string, type: ActivityLogEntry['type'] = 'admin') => {
    setActivityLog((prev) => [{ text, time: 'just now', type }, ...prev]);
  }, []);

  const logLoginAttempt = useCallback((email: string, status: LoginAttempt['status'], device: string) => {
    setLoginAttempts((prev) =>
      [
        { email, status, location: status === 'success' ? 'Nairobi, KE' : 'Unknown location', device, time: 'just now' },
        ...prev,
      ].slice(0, 12)
    );
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = nextId();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 2800);
  }, []);

  const openConfirm = useCallback((title: string, message: string, onConfirm: () => void) => {
    setConfirmState({ title, message, onConfirm });
  }, []);
  const closeConfirm = useCallback(() => setConfirmState(null), []);

  // ---------- stories (Firestore writes) ----------
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
      if (target?._fsId) {
        await updateDoc(doc(db, 'stories', target._fsId), { ...payload });
      }
      logActivity(`Amara Editor updated story "${payload.title}"`);
      showToast('Story updated', 'success');
    },
    [stories, logActivity, showToast]
  );
  const deleteStory = useCallback(
    async (id: number) => {
      const target = stories.find((s) => s.id === id) as any;
      if (target?._fsId) {
        await deleteDoc(doc(db, 'stories', target._fsId));
      }
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

  // ---------- voting (local demo state — unchanged behavior) ----------
  const saveCategorySchedule = useCallback(
    (catId: number, opens: string, closes: string, status: VotingCategory['status']) => {
      setVotingCategories((prev) => prev.map((c) => (c.id === catId ? { ...c, opens, closes, status } : c)));
      const cat = votingCategories.find((c) => c.id === catId);
      if (cat) {
        logActivity(`Amara Editor updated voting schedule for ${cat.name}`);
        showToast('Voting schedule saved', 'success');
      }
    },
    [votingCategories, logActivity, showToast]
  );
  const addContestant = useCallback(
    (catId: number, payload: { name: string; tagline: string; image: string; reward: string; votes: number }) => {
      setVotingCategories((prev) =>
        prev.map((c) => (c.id === catId ? { ...c, contestants: [...c.contestants, { id: nextId(), winner: false, ...payload }] } : c))
      );
      const cat = votingCategories.find((c) => c.id === catId);
      logActivity(`Amara Editor added contestant "${payload.name}" to ${cat?.name ?? ''}`);
      showToast('Contestant added', 'success');
    },
    [votingCategories, logActivity, showToast]
  );
  const updateContestant = useCallback(
    (catId: number, contId: number, payload: { name: string; tagline: string; image: string; reward: string; votes: number }) => {
      setVotingCategories((prev) =>
        prev.map((c) =>
          c.id === catId ? { ...c, contestants: c.contestants.map((p) => (p.id === contId ? { ...p, ...payload } : p)) } : c
        )
      );
      logActivity(`Amara Editor updated contestant "${payload.name}"`);
      showToast('Contestant updated', 'success');
    },
    [logActivity, showToast]
  );
  const deleteContestant = useCallback(
    (catId: number, contId: number) => {
      const cat = votingCategories.find((c) => c.id === catId);
      const person = cat?.contestants.find((p) => p.id === contId);
      setVotingCategories((prev) =>
        prev.map((c) => (c.id === catId ? { ...c, contestants: c.contestants.filter((p) => p.id !== contId) } : c))
      );
      if (person && cat) logActivity(`Amara Editor removed contestant "${person.name}" from ${cat.name}`);
      showToast('Contestant removed', 'danger');
    },
    [votingCategories, logActivity, showToast]
  );
  const crownWinner = useCallback(
    (catId: number, contId: number) => {
      setVotingCategories((prev) =>
        prev.map((c) => (c.id === catId ? { ...c, contestants: c.contestants.map((p) => ({ ...p, winner: p.id === contId })) } : c))
      );
      const cat = votingCategories.find((c) => c.id === catId);
      const person = cat?.contestants.find((p) => p.id === contId);
      if (person && cat) {
        showToast(`${person.name} crowned winner of ${cat.name}`, 'success');
        logActivity(`Amara Editor crowned ${person.name} as winner of ${cat.name}`);
      }
    },
    [votingCategories, logActivity, showToast]
  );
  const resetCategoryVotes = useCallback(
    (catId: number) => {
      setVotingCategories((prev) =>
        prev.map((c) => (c.id === catId ? { ...c, contestants: c.contestants.map((p) => ({ ...p, votes: 0 })) } : c))
      );
      const cat = votingCategories.find((c) => c.id === catId);
      if (cat) {
        showToast(`${cat.name} votes reset`, 'danger');
        logActivity(`Amara Editor reset all votes in ${cat.name}`);
      }
    },
    [votingCategories, logActivity, showToast]
  );
  const resetAllVotes = useCallback(() => {
    setVotingCategories((prev) => prev.map((c) => ({ ...c, contestants: c.contestants.map((p) => ({ ...p, votes: 0 })) })));
    showToast('All votes reset', 'danger');
    logActivity('Amara Editor reset votes across all voting categories');
  }, [logActivity, showToast]);

  // ---------- products (local demo state — unchanged) ----------
  const addProduct = useCallback(
    (payload: Omit<Product, 'id'>) => {
      setProducts((prev) => [{ id: nextId(), ...payload }, ...prev]);
      logActivity(`Amara Editor added product "${payload.name}"`);
      showToast('Product added', 'success');
    },
    [logActivity, showToast]
  );
  const updateProduct = useCallback(
    (id: number, payload: Omit<Product, 'id'>) => {
      setProducts((prev) => prev.map((p) => (p.id === id ? { id, ...payload } : p)));
      logActivity(`Amara Editor updated product "${payload.name}"`);
      showToast('Product updated', 'success');
    },
    [logActivity, showToast]
  );
  const deleteProduct = useCallback(
    (id: number) => {
      const p = products.find((x) => x.id === id);
      setProducts((prev) => prev.filter((x) => x.id !== id));
      if (p) logActivity(`Amara Editor deleted product "${p.name}"`);
      showToast('Product deleted', 'danger');
    },
    [products, logActivity, showToast]
  );

  // ---------- gallery (local demo state — unchanged) ----------
  const addGalleryImage = useCallback(
    (payload: Omit<GalleryImage, 'id'>) => {
      setGallery((prev) => [...prev, { id: nextId(), ...payload }]);
      logActivity('Amara Editor added a new image to the Cogvana gallery');
      showToast('Image added', 'success');
    },
    [logActivity, showToast]
  );
  const moveGalleryImage = useCallback((id: number, dir: -1 | 1) => {
    setGallery((prev) => {
      const i = prev.findIndex((g) => g.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }, []);
  const deleteGalleryImage = useCallback(
    (id: number) => {
      setGallery((prev) => prev.filter((g) => g.id !== id));
      showToast('Image removed', 'danger');
      logActivity('Amara Editor removed an image from the Cogvana gallery');
    },
    [logActivity, showToast]
  );

  // ---------- ticker (local demo state — unchanged) ----------
  const addTickerMsg = useCallback(
    (msg: string) => {
      if (!msg.trim()) return;
      setTickerMessages((prev) => [...prev, msg.trim()]);
      logActivity('Amara Editor added a new site ticker message');
      showToast('Ticker message added', 'success');
    },
    [logActivity, showToast]
  );
  const removeTickerMsg = useCallback(
    (idx: number) => {
      setTickerMessages((prev) => prev.filter((_, i) => i !== idx));
      showToast('Ticker message removed', 'danger');
    },
    [showToast]
  );

  const resetDemoData = useCallback(() => {
    setVotingCategories(createInitialVotingCategories());
    setProducts(createInitialProducts());
    setGallery(createInitialGallery());
    setActivityLog(createInitialActivityLog());
    setLoginAttempts(createInitialLoginAttempts());
    setTickerMessages(createInitialTickerMessages());
    // Note: stories/requests/partners/sponsoredDeals live in Firestore now
    // and are intentionally NOT reset here to avoid wiping production data.
  }, []);

  const value: AdminDataValue = {
    stories,
    addStory,
    updateStory,
    deleteStory,
    publishStory,
    votingCategories,
    saveCategorySchedule,
    addContestant,
    updateContestant,
    deleteContestant,
    crownWinner,
    resetCategoryVotes,
    resetAllVotes,
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
    resetDemoData,
  };

  return <AdminDataContext.Provider value={value}>{children}</AdminDataContext.Provider>;
}

export function useAdminData() {
  const ctx = useContext(AdminDataContext);
  if (!ctx) throw new Error('useAdminData must be used within AdminDataProvider');
  return ctx;
}