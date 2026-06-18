import React, { createContext, useContext, useState, useCallback } from 'react';
import {
  createInitialStories,
  createInitialVotingCategories,
  createInitialRequests,
  createInitialSponsoredDeals,
  createInitialPartners,
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

  requests: RequestsState;
  setRequestStatus: (type: RequestType, id: number, status: RequestStatus) => void;
  deleteRequest: (type: RequestType, id: number) => void;

  sponsoredDeals: SponsoredDeal[];
  addSponsoredDeal: (payload: Omit<SponsoredDeal, 'id'>) => void;
  moveDealStage: (id: number) => void;
  deleteDeal: (id: number) => void;

  partners: Partner[];
  addPartner: (payload: Omit<Partner, 'id'>) => void;
  updatePartner: (id: number, payload: Omit<Partner, 'id'>) => void;
  deletePartner: (id: number) => void;
  setPartnerStatus: (id: number, status: PartnerStatus) => void;

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

export function AdminDataProvider({ children }: { children: React.ReactNode }) {
  const [stories, setStories] = useState<AdminStory[]>(createInitialStories);
  const [votingCategories, setVotingCategories] = useState<VotingCategory[]>(createInitialVotingCategories);
  const [requests, setRequests] = useState<RequestsState>(createInitialRequests);
  const [sponsoredDeals, setSponsoredDeals] = useState<SponsoredDeal[]>(createInitialSponsoredDeals);
  const [partners, setPartners] = useState<Partner[]>(createInitialPartners);
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
    setLoginAttempts((prev) => [
      { email, status, location: status === 'success' ? 'Nairobi, KE' : 'Unknown location', device, time: 'just now' },
      ...prev,
    ].slice(0, 12));
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

  // ---------- stories ----------
  const addStory = useCallback(
    (payload: Omit<AdminStory, 'id'>) => {
      setStories((prev) => [{ id: nextId(), ...payload }, ...prev]);
      logActivity(`Amara Editor created a new story "${payload.title}"`);
      showToast('Story added', 'success');
    },
    [logActivity, showToast]
  );
  const updateStory = useCallback(
    (id: number, payload: Omit<AdminStory, 'id'>) => {
      setStories((prev) => prev.map((s) => (s.id === id ? { id, ...payload } : s)));
      logActivity(`Amara Editor updated story "${payload.title}"`);
      showToast('Story updated', 'success');
    },
    [logActivity, showToast]
  );
  const deleteStory = useCallback(
    (id: number) => {
      setStories((prev) => {
        const target = prev.find((s) => s.id === id);
        if (target) logActivity(`Amara Editor deleted story "${target.title}"`);
        return prev.filter((s) => s.id !== id);
      });
      showToast('Story deleted', 'danger');
    },
    [logActivity, showToast]
  );
  const publishStory = useCallback(
    (id: number) => {
      setStories((prev) =>
        prev.map((s) =>
          s.id === id
            ? { ...s, status: 'live', date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }
            : s
        )
      );
      const target = stories.find((s) => s.id === id);
      if (target) {
        logActivity(`Amara Editor published "${target.title}"`);
        showToast(`"${target.title}" is now live`, 'success');
      }
    },
    [stories, logActivity, showToast]
  );

  // ---------- voting ----------
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

  // ---------- requests ----------
  const setRequestStatus = useCallback(
    (type: RequestType, id: number, status: RequestStatus) => {
      setRequests((prev) => ({
        ...prev,
        [type]: (prev[type] as any[]).map((r) => (r.id === id ? { ...r, status } : r)),
      }));
      const item = (requests[type] as any[]).find((r) => r.id === id);
      const name = item ? item.name ?? item.business ?? item.company ?? '—' : '—';
      logActivity(`Amara Editor marked ${name}'s ${REQUEST_TYPE_LABELS[type].toLowerCase()} as ${status}`);
      showToast(`${name} marked as ${status}`, status === 'rejected' ? 'danger' : 'success');
    },
    [requests, logActivity, showToast]
  );
  const deleteRequest = useCallback(
    (type: RequestType, id: number) => {
      setRequests((prev) => ({ ...prev, [type]: (prev[type] as any[]).filter((r) => r.id !== id) }));
      showToast('Request deleted', 'danger');
      logActivity(`Amara Editor deleted a ${REQUEST_TYPE_LABELS[type].toLowerCase()} entry`);
    },
    [logActivity, showToast]
  );

  // ---------- sponsored deals ----------
  const addSponsoredDeal = useCallback(
    (payload: Omit<SponsoredDeal, 'id'>) => {
      setSponsoredDeals((prev) => [...prev, { id: nextId(), ...payload }]);
      logActivity(`Amara Editor added sponsored deal "${payload.business}"`);
      showToast('Sponsored deal added', 'success');
    },
    [logActivity, showToast]
  );
  const STAGE_ORDER: DealStage[] = ['inquiry', 'production', 'live', 'completed'];
  const moveDealStage = useCallback(
    (id: number) => {
      const deal = sponsoredDeals.find((d) => d.id === id);
      if (!deal) return;
      const idx = STAGE_ORDER.indexOf(deal.stage);
      if (idx >= STAGE_ORDER.length - 1) return;
      const nextStage = STAGE_ORDER[idx + 1];
      setSponsoredDeals((prev) => prev.map((d) => (d.id === id ? { ...d, stage: nextStage } : d)));
      logActivity(`"${deal.business}" moved to ${nextStage}`);
      showToast(`Moved to ${nextStage}`, 'success');
    },
    [sponsoredDeals, logActivity, showToast]
  );
  const deleteDeal = useCallback(
    (id: number) => {
      const deal = sponsoredDeals.find((d) => d.id === id);
      setSponsoredDeals((prev) => prev.filter((d) => d.id !== id));
      if (deal) logActivity(`Amara Editor removed sponsored deal "${deal.business}"`);
      showToast('Deal removed', 'danger');
    },
    [sponsoredDeals, logActivity, showToast]
  );

  // ---------- partners ----------
  const addPartner = useCallback(
    (payload: Omit<Partner, 'id'>) => {
      setPartners((prev) => [{ id: nextId(), ...payload }, ...prev]);
      logActivity(`Amara Editor added new partner: ${payload.name}`);
      showToast('Partner added', 'success');
    },
    [logActivity, showToast]
  );
  const updatePartner = useCallback(
    (id: number, payload: Omit<Partner, 'id'>) => {
      setPartners((prev) => prev.map((p) => (p.id === id ? { id, ...payload } : p)));
      logActivity(`Amara Editor updated partner "${payload.name}"`);
      showToast('Partner updated', 'success');
    },
    [logActivity, showToast]
  );
  const deletePartner = useCallback(
    (id: number) => {
      const p = partners.find((x) => x.id === id);
      setPartners((prev) => prev.filter((x) => x.id !== id));
      if (p) logActivity(`Amara Editor removed partner "${p.name}"`);
      showToast('Partner removed', 'danger');
    },
    [partners, logActivity, showToast]
  );
  const setPartnerStatus = useCallback(
    (id: number, status: PartnerStatus) => {
      setPartners((prev) => prev.map((p) => (p.id === id ? { ...p, status } : p)));
      const p = partners.find((x) => x.id === id);
      if (p) {
        showToast(`${p.name} ${status === 'active' ? 'reactivated' : 'suspended'}`, status === 'active' ? 'success' : 'danger');
        logActivity(`Amara Editor ${status === 'active' ? 'reactivated' : 'suspended'} partner "${p.name}"`);
      }
    },
    [partners, logActivity, showToast]
  );

  // ---------- products ----------
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

  // ---------- gallery ----------
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

  // ---------- ticker ----------
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
    setStories(createInitialStories());
    setVotingCategories(createInitialVotingCategories());
    setRequests(createInitialRequests());
    setSponsoredDeals(createInitialSponsoredDeals());
    setPartners(createInitialPartners());
    setProducts(createInitialProducts());
    setGallery(createInitialGallery());
    setActivityLog(createInitialActivityLog());
    setLoginAttempts(createInitialLoginAttempts());
    setTickerMessages(createInitialTickerMessages());
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
    setRequestStatus,
    deleteRequest,
    sponsoredDeals,
    addSponsoredDeal,
    moveDealStage,
    deleteDeal,
    partners,
    addPartner,
    updatePartner,
    deletePartner,
    setPartnerStatus,
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
