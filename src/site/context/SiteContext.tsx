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
import {
  subscribeToGallery,
  subscribeToServices,
  subscribeToTestimonials,
  subscribeToActivePartners,
  subscribeToPublishedSponsoredStories,
  subscribeToProducts,
  createOrder,
  type FSGalleryImage,
  type FSServiceItem,
  type FSTestimonial,
  type FSPartner,
  type FSSponsoredStory,
  type FSProduct,
} from '../../lib/firebaseContent';
import { subscribeSiteSettings, type SiteSettings, DEFAULT_SITE_SETTINGS } from '../../lib/siteSettings';

export const TOTAL_PAGES = 9;
export const VOTING_PAGE_INDEX = 2;

export interface VotingClientState {
  position: number;
  voted: boolean;
  concluding: boolean;
}

/** Result of parsing a `?vote=catKey:contestantId` shared link. */
export interface SharedVoteTarget {
  catIdx: number;
  pos: number;
  /** Increments each time a new shared link is consumed, so consumers
   *  (VotingPage) can react even if catIdx/pos repeat. */
  nonce: number;
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
  checkoutCart: () => Promise<void>;
  checkoutSuccess: boolean;
  checkoutError: string | null;

  // lightbox
  lightboxSrc: string | null;
  openLightbox: (src: string) => void;
  closeLightbox: () => void;

  // LIVE: stories
  liveStories: FSStory[];
  storiesLoading: boolean;

  // LIVE: voting
  votingCategories: FSVotingCategory[];
  votingLoading: boolean;
  votingClient: VotingClientState[];
  goToContestant: (catIdx: number, pos: number) => void;
  nextContestant: (catIdx: number) => void;
  prevContestant: (catIdx: number) => void;
  castVote: (catIdx: number) => Promise<void>;
  triggerConclude: (categoryId: string) => Promise<void>;

  // shareable voting links
  sharedVoteTarget: SharedVoteTarget | null;
  consumeSharedVoteTarget: () => void;
  buildShareUrl: (catKey: string, contestantId: string) => string;

  // LIVE: gallery / services / testimonials / partners / sponsored / products
  gallery: FSGalleryImage[];
  galleryLoading: boolean;
  services: FSServiceItem[];
  servicesLoading: boolean;
  testimonials: FSTestimonial[];
  testimonialsLoading: boolean;
  partners: FSPartner[];
  partnersLoading: boolean;
  sponsoredStories: FSSponsoredStory[];
  sponsoredLoading: boolean;
  products: FSProduct[];
  productsLoading: boolean;

  // LIVE: site settings (ticker, contact info)
  siteSettings: SiteSettings;

  // swipe hint
  swipeHintVisible: boolean;
  hideSwipeHint: () => void;
}

const SiteContext = createContext<SiteContextValue | null>(null);

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
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

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
    setCheckoutError(null);
  }, []);

  const checkoutCart = useCallback(async () => {
    if (cart.length === 0) return;
    setCheckoutError(null);
    try {
      await createOrder(cart);
      setCart([]);
      setCheckoutSuccess(true);
    } catch (err) {
      console.error('Checkout failed:', err);
      setCheckoutError('Something went wrong placing your order. Please try again.');
    }
  }, [cart]);

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

      setVotingClient((prev) => {
        const next = cats.map((cat, i) => prev[i] ?? {
          position: 0,
          voted: false,
          concluding: false,
        });
        return next;
      });

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

  // ── Shareable voting links ──────────────────────────────────────────────
  // URL shape: https://yourdomain/?vote=<categoryKey>:<contestantId>
  // Parsed once voting categories have loaded, since we need contestant
  // lists to resolve the position. Safe to ignore if malformed/missing —
  // falls through to normal app behavior with no errors.
  const [sharedVoteTarget, setSharedVoteTarget] = useState<SharedVoteTarget | null>(null);
  const sharedLinkConsumedRef = useRef(false);

  useEffect(() => {
    if (sharedLinkConsumedRef.current) return;
    if (votingLoading || votingCategories.length === 0) return;

    let params: URLSearchParams;
    try {
      params = new URLSearchParams(window.location.search);
    } catch {
      return;
    }

    const voteParam = params.get('vote');
    if (!voteParam) {
      sharedLinkConsumedRef.current = true;
      return;
    }

    const sepIdx = voteParam.indexOf(':');
    if (sepIdx === -1) {
      sharedLinkConsumedRef.current = true;
      return;
    }

    const catKey = voteParam.slice(0, sepIdx);
    const contestantId = voteParam.slice(sepIdx + 1);

    const catIdx = votingCategories.findIndex((c) => c.key === catKey);
    if (catIdx === -1) {
      sharedLinkConsumedRef.current = true;
      return;
    }

    const pos = votingCategories[catIdx].contestants.findIndex((c) => c.id === contestantId);
    if (pos === -1) {
      // Category resolved but contestant not found yet (contestants may
      // still be hydrating asynchronously) — don't mark consumed, retry
      // on next categories update.
      return;
    }

    sharedLinkConsumedRef.current = true;

    goToPage(VOTING_PAGE_INDEX);
    goToContestant(catIdx, pos);
    setSharedVoteTarget((prev) => ({
      catIdx,
      pos,
      nonce: (prev?.nonce ?? 0) + 1,
    }));

    // Clean the URL so refreshes/re-shares of the resulting link don't
    // re-trigger navigation unexpectedly, while leaving history intact.
    try {
      window.history.replaceState({}, '', window.location.pathname);
    } catch {
      // ignore — non-fatal if history API is unavailable
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [votingLoading, votingCategories, goToPage, goToContestant]);

  const consumeSharedVoteTarget = useCallback(() => {
    setSharedVoteTarget(null);
  }, []);

  const buildShareUrl = useCallback((catKey: string, contestantId: string) => {
    const base = `${window.location.origin}${window.location.pathname}`;
    return `${base}?vote=${encodeURIComponent(catKey)}:${encodeURIComponent(contestantId)}`;
  }, []);

  // ── LIVE: gallery / services / testimonials / partners / sponsored / products ──
  const [gallery, setGallery] = useState<FSGalleryImage[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(true);
  useEffect(() => {
    return subscribeToGallery((items) => { setGallery(items); setGalleryLoading(false); });
  }, []);

  const [services, setServices] = useState<FSServiceItem[]>([]);
  const [servicesLoading, setServicesLoading] = useState(true);
  useEffect(() => {
    return subscribeToServices((items) => { setServices(items); setServicesLoading(false); });
  }, []);

  const [testimonials, setTestimonials] = useState<FSTestimonial[]>([]);
  const [testimonialsLoading, setTestimonialsLoading] = useState(true);
  useEffect(() => {
    return subscribeToTestimonials((items) => { setTestimonials(items); setTestimonialsLoading(false); });
  }, []);

  const [partners, setPartners] = useState<FSPartner[]>([]);
  const [partnersLoading, setPartnersLoading] = useState(true);
  useEffect(() => {
    return subscribeToActivePartners((items) => { setPartners(items); setPartnersLoading(false); });
  }, []);

  const [sponsoredStories, setSponsoredStories] = useState<FSSponsoredStory[]>([]);
  const [sponsoredLoading, setSponsoredLoading] = useState(true);
  useEffect(() => {
    return subscribeToPublishedSponsoredStories((items) => { setSponsoredStories(items); setSponsoredLoading(false); });
  }, []);

  const [products, setProducts] = useState<FSProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  useEffect(() => {
    return subscribeToProducts((items) => { setProducts(items); setProductsLoading(false); });
  }, []);

  // ── LIVE: site settings ─────────────────────────────────────────────────
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS);
  useEffect(() => subscribeSiteSettings(setSiteSettings), []);

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
    cart, cartVisible, addToCart, changeQty, toggleCart, checkoutCart, checkoutSuccess, checkoutError,
    lightboxSrc, openLightbox, closeLightbox,
    liveStories, storiesLoading,
    votingCategories, votingLoading, votingClient,
    goToContestant, nextContestant, prevContestant, castVote, triggerConclude,
    sharedVoteTarget, consumeSharedVoteTarget, buildShareUrl,
    gallery, galleryLoading,
    services, servicesLoading,
    testimonials, testimonialsLoading,
    partners, partnersLoading,
    sponsoredStories, sponsoredLoading,
    products, productsLoading,
    siteSettings,
    swipeHintVisible, hideSwipeHint,
  };

  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>;
}

export function useSite() {
  const ctx = useContext(SiteContext);
  if (!ctx) throw new Error('useSite must be used within a SiteProvider');
  return ctx;
}