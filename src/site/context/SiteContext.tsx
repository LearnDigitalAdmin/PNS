import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import { votingCategories } from '../data';
import type { CartItem } from '../types';

export const TOTAL_PAGES = 9;

interface VotingState {
  position: number;
  voted: boolean;
  votes: number;
  barWidth: number;
}

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

  // voting
  voting: VotingState[];
  goToContestant: (catIdx: number, pos: number) => void;
  nextContestant: (catIdx: number) => void;
  prevContestant: (catIdx: number) => void;
  castVote: (catIdx: number) => void;

  // swipe hint
  swipeHintVisible: boolean;
  hideSwipeHint: () => void;
}

const SiteContext = createContext<SiteContextValue | null>(null);

export function SiteProvider({ children }: { children: React.ReactNode }) {
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
      setTimeout(() => {
        animatingRef.current = false;
      }, 700);
      return next;
    });
  }, []);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const toggleMobileMenu = useCallback(() => setMobileMenuOpen((v) => !v), []);

  const [modals, setModals] = useState<Record<string, boolean>>({});
  const isModalOpen = useCallback((id: string) => !!modals[id], [modals]);
  const openModal = useCallback((id: string) => setModals((m) => ({ ...m, [id]: true })), []);
  const closeModal = useCallback((id: string) => setModals((m) => ({ ...m, [id]: false })), []);
  const anyModalOpen = Object.values(modals).some(Boolean);

  // Escape key closes all modals (matches original global keydown handler)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setModals({});
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // body scroll lock while any modal is active
  useEffect(() => {
    document.body.style.overflow = anyModalOpen ? 'hidden' : '';
  }, [anyModalOpen]);

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
    setTimeout(() => {
      setCart([]);
      setCheckoutSuccess(true);
    }, 800);
  }, []);

  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const openLightbox = useCallback((src: string) => setLightboxSrc(src), []);
  const closeLightbox = useCallback(() => setLightboxSrc(null), []);

  const [voting, setVoting] = useState<VotingState[]>(
    votingCategories.map((c) => ({ position: 0, voted: false, votes: c.initialVotes, barWidth: c.initialBarWidth }))
  );

  const goToContestant = useCallback((catIdx: number, pos: number) => {
    setVoting((prev) => {
      const next = [...prev];
      next[catIdx] = { ...next[catIdx], position: pos };
      return next;
    });
  }, []);

  const nextContestant = useCallback(
    (catIdx: number) => {
      const total = votingCategories[catIdx].contestants.length;
      setVoting((prev) => {
        const next = [...prev];
        next[catIdx] = { ...next[catIdx], position: (next[catIdx].position + 1) % total };
        return next;
      });
    },
    []
  );

  const prevContestant = useCallback(
    (catIdx: number) => {
      const total = votingCategories[catIdx].contestants.length;
      setVoting((prev) => {
        const next = [...prev];
        next[catIdx] = { ...next[catIdx], position: (next[catIdx].position - 1 + total) % total };
        return next;
      });
    },
    []
  );

  const castVote = useCallback((catIdx: number) => {
    setVoting((prev) => {
      if (prev[catIdx].voted) return prev;
      const next = [...prev];
      next[catIdx] = {
        ...next[catIdx],
        voted: true,
        votes: next[catIdx].votes + 1,
        barWidth: Math.min(next[catIdx].barWidth + 4, 98),
      };
      return next;
    });
  }, []);

  const [swipeHintVisible, setSwipeHintVisible] = useState(true);
  const hideSwipeHint = useCallback(() => setSwipeHintVisible(false), []);
  useEffect(() => {
    const t = setTimeout(() => setSwipeHintVisible(false), 5500);
    const onFirstInteract = () => hideSwipeHint();
    document.addEventListener('click', onFirstInteract, { once: true });
    return () => {
      clearTimeout(t);
      document.removeEventListener('click', onFirstInteract);
    };
  }, [hideSwipeHint]);

  const value: SiteContextValue = {
    currentPage,
    goToPage,
    mobileMenuOpen,
    toggleMobileMenu,
    isModalOpen,
    openModal,
    closeModal,
    anyModalOpen,
    cart,
    cartVisible,
    addToCart,
    changeQty,
    toggleCart,
    checkoutCart,
    checkoutSuccess,
    lightboxSrc,
    openLightbox,
    closeLightbox,
    voting,
    goToContestant,
    nextContestant,
    prevContestant,
    castVote,
    swipeHintVisible,
    hideSwipeHint,
  };

  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>;
}

export function useSite() {
  const ctx = useContext(SiteContext);
  if (!ctx) throw new Error('useSite must be used within a SiteProvider');
  return ctx;
}
