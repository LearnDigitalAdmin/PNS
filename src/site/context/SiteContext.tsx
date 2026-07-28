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

export interface SharedVoteTarget {
  catIdx: number;
  pos: number;
  nonce: number;
}

export interface StoryModalData {
  title: string;
  category: string;
  excerpt?: string;
  body?: string;
  image: string;
  images?: string[];
  author?: string;
  date?: string;
  instagram?: string;
  // Sponsored-specific
  isSponsored?: boolean;
  contactPhone?: string;
  contactEmail?: string;
  contactWhatsApp?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  // Share ID (Firestore story doc id, if applicable)
  storyId?: string;
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

  // shareable story links
  buildStoryShareUrl: (storyId: string) => string;
  sharedLinkLoading: boolean;
  sharedLinkError: string | null;
  clearSharedLinkError: () => void;

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

  // LIVE: site settings
  siteSettings: SiteSettings;

  // swipe hint
  swipeHintVisible: boolean;
  hideSwipeHint: () => void;

  // story modal
  storyModalData: StoryModalData | null;
  openStoryModal: (story: StoryModalData) => void;
  closeStoryModal: () => void;
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

  const [storyModalData, setStoryModalData] = useState<StoryModalData | null>(null);
  const openStoryModal = useCallback((story: StoryModalData) => setStoryModalData(story), []);
  const closeStoryModal = useCallback(() => setStoryModalData(null), []);

  const anyModalOpen = Object.values(modals).some(Boolean) || !!storyModalData;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setModals({});
        setStoryModalData(null);
      }
    };
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
  const [sharedVoteTarget, setSharedVoteTarget] = useState<SharedVoteTarget | null>(null);
  const sharedLinkConsumedRef = useRef(false);

  // ── Shared link loading / error state (covers both vote and story links) ─
  const [sharedLinkLoading, setSharedLinkLoading] = useState(false);
  const [sharedLinkError, setSharedLinkError] = useState<string | null>(null);
  const clearSharedLinkError = useCallback(() => setSharedLinkError(null), []);

  // Parse ?vote= link
  useEffect(() => {
    if (sharedLinkConsumedRef.current) return;
    if (votingLoading || votingCategories.length === 0) return;

    let params: URLSearchParams;
    try { params = new URLSearchParams(window.location.search); } catch { return; }

    const voteParam = params.get('vote');
    if (!voteParam) return;

    const sepIdx = voteParam.indexOf(':');
    if (sepIdx === -1) { sharedLinkConsumedRef.current = true; return; }

    const catKey = voteParam.slice(0, sepIdx);
    const contestantId = voteParam.slice(sepIdx + 1);
    const catIdx = votingCategories.findIndex((c) => c.key === catKey);
    if (catIdx === -1) { sharedLinkConsumedRef.current = true; return; }

    const pos = votingCategories[catIdx].contestants.findIndex((c) => c.id === contestantId);
    if (pos === -1) return; // contestants still hydrating — retry next tick

    sharedLinkConsumedRef.current = true;
    goToPage(VOTING_PAGE_INDEX);
    goToContestant(catIdx, pos);
    setSharedVoteTarget((prev) => ({ catIdx, pos, nonce: (prev?.nonce ?? 0) + 1 }));

    try { window.history.replaceState({}, '', window.location.pathname); } catch { }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [votingLoading, votingCategories, goToPage, goToContestant]);

  const consumeSharedVoteTarget = useCallback(() => setSharedVoteTarget(null), []);

  const buildShareUrl = useCallback((catKey: string, contestantId: string) => {
    const base = `${window.location.origin}${window.location.pathname}`;
    return `${base}?vote=${encodeURIComponent(catKey)}:${encodeURIComponent(contestantId)}`;
  }, []);

  // ── Shareable story links (?story=<id>) ─────────────────────────────────
  const storyLinkConsumedRef = useRef(false);
  // We need access to sponsoredStories below — hoist the state declarations
  // before this effect runs, so we reference the correct refs.

  const buildStoryShareUrl = useCallback((storyId: string) => {
    const base = `${window.location.origin}${window.location.pathname}`;
    return `${base}?story=${encodeURIComponent(storyId)}`;
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

  // ── Parse ?story= link (runs once live data is ready) ──────────────────
  useEffect(() => {
    if (storyLinkConsumedRef.current) return;
    // Wait until at least one of the two story collections has loaded
    if (storiesLoading && sponsoredLoading) return;

    let params: URLSearchParams;
    try { params = new URLSearchParams(window.location.search); } catch { return; }

    const storyId = params.get('story');
    if (!storyId) { storyLinkConsumedRef.current = true; return; }

    // Show loading indicator while data may still be arriving
    setSharedLinkLoading(true);

    // Try featured stories first
    const featured = liveStories.find((s) => s.id === storyId);
    if (featured) {
      storyLinkConsumedRef.current = true;
      setSharedLinkLoading(false);
      openStoryModal({
        storyId: featured.id,
        title: featured.title,
        category: featured.category,
        excerpt: featured.excerpt,
        body: featured.body,
        image: featured.image,
        images: featured.images,
        author: featured.author,
        date: featured.date,
        instagram: featured.instagram,
      });
      try { window.history.replaceState({}, '', window.location.pathname); } catch { }
      return;
    }

    // Try sponsored stories
    const sponsored = sponsoredStories.find((s) => s.id === storyId);
    if (sponsored) {
      storyLinkConsumedRef.current = true;
      setSharedLinkLoading(false);
      openStoryModal({
        storyId: sponsored.id,
        title: sponsored.title || sponsored.business,
        category: 'Sponsored Story',
        excerpt: sponsored.excerpt,
        body: sponsored.body,
        image: sponsored.image || '',
        images: sponsored.images,
        isSponsored: true,
        contactPhone: sponsored.contactPhone,
        contactEmail: sponsored.contactEmail,
        contactWhatsApp: sponsored.contactWhatsApp,
        ctaLabel: sponsored.ctaLabel,
        ctaUrl: sponsored.ctaUrl,
      });
      try { window.history.replaceState({}, '', window.location.pathname); } catch { }
      return;
    }

    // If both collections are done loading and we still didn't find it — show error
    if (!storiesLoading && !sponsoredLoading) {
      storyLinkConsumedRef.current = true;
      setSharedLinkLoading(false);
      setSharedLinkError('This story could not be found. It may have been removed or the link is invalid.');
      try { window.history.replaceState({}, '', window.location.pathname); } catch { }
    }
    // Otherwise keep waiting (effect will re-run as collections update)
  }, [storiesLoading, sponsoredLoading, liveStories, sponsoredStories, openStoryModal]);

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
    buildStoryShareUrl,
    sharedLinkLoading,
    sharedLinkError,
    clearSharedLinkError,
    gallery, galleryLoading,
    services, servicesLoading,
    testimonials, testimonialsLoading,
    partners, partnersLoading,
    sponsoredStories, sponsoredLoading,
    products, productsLoading,
    siteSettings,
    swipeHintVisible, hideSwipeHint,
    storyModalData, openStoryModal, closeStoryModal,
  };

  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>;
}

export function useSite() {
  const ctx = useContext(SiteContext);
  if (!ctx) throw new Error('useSite must be used within a SiteProvider');
  return ctx;
}