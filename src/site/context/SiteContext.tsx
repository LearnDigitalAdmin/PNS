import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
  useEffect,
} from 'react';
import type { CartItem } from '../types';
import {
  subscribeToVotingCategories,
  subscribeToLiveStories,
  castVoteInFirestore,
  concludeContest,
  type FSVotingCategory,
  type FSStory,
} from '../../lib/firebaseVoting';
import {
  canPerformAction,
  recordAction,
  type ActionKey,
} from '../../lib/fingerprint';

export const TOTAL_PAGES = 9;

// ─── Voting state per category (client-side overlay) ─────────────────────────

export interface VotingClientState {
  position: number;      // which contestant is shown in the carousel
  voted: boolean;        // voted this session (also checked via fingerprint)
  concluding: boolean;   // true while conclusion is running
}

// ─── Context shape ────────────────────────────────────────────────────────────

interface SiteContextValue {
  // page engine
  currentPage: number;
  goToPage: (n: number) => void;

  // mobile menu
  mobileMenuOpen: boolean;
  toggleMobileMenu: () => void;

  // modals
  isModalOpen: (id: string) => boolean;
  openModal: (id: string) => void;
  closeModal: (id: string) => void;
  anyModalOpen: boolean;

  // cart
  cart: CartItem[];
  cartVisible: boolean;
  addToCart: (name: string, price: number) => void;
  changeQty: (idx: number, delta: number) => void;
  toggleCart: () => void;
  checkoutCart: () => void;
  checkoutSuccess: boolean;

  // lightbox
  lightboxSrc: string | null;
  openLightbox: (src: string) => void;
  closeLightbox: () => void;

  // LIVE: stories from Firestore
  liveStories: FSStory[];
  storiesLoading: boolean;

  // LIVE: voting categories from Firestore
  votingCategories: FSVotingCategory[];
  votingLoading: boolean;
  votingClient: VotingClientState[];
  goToContestant: (catIdx: number, pos: number) => void;
  nextContestant: (catIdx: number) => void;
  prevContestant: (catIdx: number) => void;
  castVote: (catIdx: number) => Promise<void>;
  triggerConclude: (categoryId: string) => Promise<void>;

  // swipe hint
  swipeHintVisible: boolean;
  hideSwipeHint: () => void;
}

const SiteContext = createContext<SiteContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function SiteProvider({ children }: { children: React.ReactNode }) {
  // ── Page engine ──────────────────────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState(0);
  const animatingRef = useRef(false);

  const goToPage = useCallback((n: number) => {
    if (animatingRef.current) return;
    let next = n;
    if (next < 0) next = TOTAL_PAGES - 1;
    if (next >= TOTAL_PAGES) next = 0;
    setCurrentPage((cur) => {
      if (next === cur) return cur;
      animatingRef.current = true;
      setTimeout(() => { animatingRef.current = false; }, 700);
      return next;
    });
  }, []);

  // ── Mobile menu ──────────────────────────────────────────────────────────
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const toggleMobileMenu = useCallback(() => setMobileMenuOpen((v) => !v), []);

  // ── Modals ───────────────────────────────────────────────────────────────
  const [modals, setModals] = useState<Record<string, boolean>>({});
  const isModalOpen = useCallback((id: string) => !!modals[id], [modals]);
  const openModal = useCallback((id: string) => setModals((m) => ({ ...m, [id]: true })), []);
  const closeModal = useCallback((id: string) => setModals((m) => ({ ...m, [id]: false })), []);
  const anyModalOpen = Object.values(modals).some(Boolean);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setModals({}); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    document.body.style.overflow = anyModalOpen ? 'hidden' : '';
  }, [anyModalOpen]);

  // ── Cart ─────────────────────────────────────────────────────────────────
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartVisible, setCartVisible] = useState(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);

  const addToCart = useCallback((name: string, price: number) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.name === name);
      if (existing) return prev.map((i) => (i.name === name ? { ...i, qty: i.qty + 1 } : i));
      return [...prev, { name, price, qty: 1 }];
    });
    setCartVisible(true);
  }, []);

  const changeQty = useCallback((idx: number, delta: number) => {
    setCart((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], qty: next[idx].qty + delta };
      return next.filter((i) => i.qty > 0);
    });
  }, []);

  const toggleCart = useCallback(() => {
    setCartVisible((v) => !v);
    setCheckoutSuccess(false);
  }, []);

  const checkoutCart = useCallback(() => {
    setTimeout(() => { setCart([]); setCheckoutSuccess(true); }, 800);
  }, []);

  // ── Lightbox ─────────────────────────────────────────────────────────────
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const openLightbox = useCallback((src: string) => setLightboxSrc(src), []);
  const closeLightbox = useCallback(() => setLightboxSrc(null), []);

  // ── LIVE: stories ────────────────────────────────────────────────────────
  const [liveStories, setLiveStories] = useState<FSStory[]>([]);
  const [storiesLoading, setStoriesLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeToLiveStories((stories) => {
      setLiveStories(stories);
      setStoriesLoading(false);
    });
    return unsub;
  }, []);

  // ── LIVE: voting categories ───────────────────────────────────────────────
  const [votingCategories, setVotingCategories] = useState<FSVotingCategory[]>([]);
  const [votingLoading, setVotingLoading] = useState(true);
  const [votingClient, setVotingClient] = useState<VotingClientState[]>([]);
  const concludingRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const unsub = subscribeToVotingCategories((cats) => {
      setVotingCategories(cats);
      setVotingLoading(false);

      // Initialise client state for new categories
      setVotingClient((prev) => {
        const next = cats.map((cat, i) => prev[i] ?? {
          position: 0,
          voted: false,
          concluding: false,
        });
        return next;
      });

      // Auto-conclude any overdue open categories
      const now = Date.now();
      cats.forEach((cat) => {
        if (
          cat.status === 'open' &&
          !cat.concluded &&
          cat.closes &&
          cat.closes.toMillis() <= now &&
          !concludingRef.current.has(cat.id)
        ) {
          concludingRef.current.add(cat.id);
          concludeContest(cat.id).finally(() => {
            concludingRef.current.delete(cat.id);
          });
        }
      });
    });
    return unsub;
  }, []);

  // ── Voting client actions ─────────────────────────────────────────────────
  const goToContestant = useCallback((catIdx: number, pos: number) => {
    setVotingClient((prev) => {
      const next = [...prev];
      if (next[catIdx]) next[catIdx] = { ...next[catIdx], position: pos };
      return next;
    });
  }, []);

  const nextContestant = useCallback((catIdx: number) => {
    setVotingClient((prev) => {
      const next = [...prev];
      const cat = votingCategories[catIdx];
      if (!cat || !next[catIdx]) return prev;
      const total = cat.contestants.length;
      next[catIdx] = { ...next[catIdx], position: (next[catIdx].position + 1) % total };
      return next;
    });
  }, [votingCategories]);

  const prevContestant = useCallback((catIdx: number) => {
    setVotingClient((prev) => {
      const next = [...prev];
      const cat = votingCategories[catIdx];
      if (!cat || !next[catIdx]) return prev;
      const total = cat.contestants.length;
      next[catIdx] = { ...next[catIdx], position: (next[catIdx].position - 1 + total) % total };
      return next;
    });
  }, [votingCategories]);

  const castVote = useCallback(async (catIdx: number) => {
    const cat = votingCategories[catIdx];
    const client = votingClient[catIdx];
    if (!cat || !client || client.voted) return;
    if (cat.status !== 'open') return;

    const actionKey = `vote_${cat.key}` as ActionKey;
    const allowed = await canPerformAction(actionKey);
    if (!allowed) return;

    const current = cat.contestants[client.position];
    if (!current) return;

    try {
      await castVoteInFirestore(cat.id, current.id);
      await recordAction(actionKey);
      setVotingClient((prev) => {
        const next = [...prev];
        if (next[catIdx]) next[catIdx] = { ...next[catIdx], voted: true };
        return next;
      });
    } catch (err) {
      console.error('Vote failed:', err);
    }
  }, [votingCategories, votingClient]);

  const triggerConclude = useCallback(async (categoryId: string) => {
    if (concludingRef.current.has(categoryId)) return;
    concludingRef.current.add(categoryId);
    try {
      await concludeContest(categoryId);
    } finally {
      concludingRef.current.delete(categoryId);
    }
  }, []);

  // ── Swipe hint ───────────────────────────────────────────────────────────
  const [swipeHintVisible, setSwipeHintVisible] = useState(true);
  const hideSwipeHint = useCallback(() => setSwipeHintVisible(false), []);

  useEffect(() => {
    const t = setTimeout(() => setSwipeHintVisible(false), 5500);
    const onFirst = () => hideSwipeHint();
    document.addEventListener('click', onFirst, { once: true });
    return () => { clearTimeout(t); document.removeEventListener('click', onFirst); };
  }, [hideSwipeHint]);

  // ── Value ────────────────────────────────────────────────────────────────
  const value: SiteContextValue = {
    currentPage, goToPage,
    mobileMenuOpen, toggleMobileMenu,
    isModalOpen, openModal, closeModal, anyModalOpen,
    cart, cartVisible, addToCart, changeQty, toggleCart, checkoutCart, checkoutSuccess,
    lightboxSrc, openLightbox, closeLightbox,
    liveStories, storiesLoading,
    votingCategories, votingLoading, votingClient,
    goToContestant, nextContestant, prevContestant, castVote, triggerConclude,
    swipeHintVisible, hideSwipeHint,
  };

  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>;
}

export function useSite() {
  const ctx = useContext(SiteContext);
  if (!ctx) throw new Error('useSite must be used within a SiteProvider');
  return ctx;
}