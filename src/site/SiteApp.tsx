import { useEffect, useRef } from 'react';
import { useSite, TOTAL_PAGES } from './context/SiteContext';
import Nav from './components/Nav';
import MobileMenu from './components/MobileMenu';
import PageNavUI from './components/PageNavUI';
import CartSidebar from './components/CartSidebar';
import Lightbox from './components/Lightbox';
import Modals from './components/Modals';
import HeroPage from './pages/HeroPage';
import StoriesPage from './pages/StoriesPage';
import VotingPage from './pages/VotingPage';
import CogvanaPage from './pages/CogvanaPage';
import ServicesPage from './pages/ServicesPage';
import PartnersPage from './pages/PartnersPage';
import SponsoredPage from './pages/SponsoredPage';
import ShopPage from './pages/ShopPage';
import BookFooterPage from './pages/BookFooterPage';
import StoryModal, { SharedLinkOverlay } from './components/StoryModal';

const PAGE_COMPONENTS = [HeroPage, StoriesPage, VotingPage, CogvanaPage, ServicesPage, PartnersPage, SponsoredPage, ShopPage, BookFooterPage];
// NOTE: index 3 (the photographer directory) is intentionally dark, not
// alternating with its neighbours — CogvanaPage.tsx's cards/text (business
// name, service titles) are styled in warm-white/gold/white assuming a dark
// backdrop. It used to sit on a light background here, which made that text
// render white-on-near-white and unreadable. Keep this in sync with
// CogvanaPage's own color choices if that page's palette ever changes.
const PAGE_BG = ['transparent', 'var(--warm-white)', 'var(--black)', 'var(--black)', 'var(--black)', 'var(--warm-white)', 'var(--black)', 'var(--warm-white)', 'var(--warm-white)'];
const PAGE_LABELS = ['', 'Stories', 'Voting', 'Directory', 'Services', 'Partners', 'Sponsored', 'Shop', 'Book'];

function triggerReveal(page: HTMLDivElement | null) {
  if (!page) return;
  const els = page.querySelectorAll('.reveal:not(.visible)');
  els.forEach((el, i) => setTimeout(() => el.classList.add('visible'), i * 55));
}

/** Ports the original book-style page-turn engine 1:1 (same transforms, timings, easing). */
function usePageTransition(pagesRef: React.MutableRefObject<(HTMLDivElement | null)[]>, currentPage: number) {
  const prevPageRef = useRef(currentPage);
  const mountedRef = useRef(false);

  // initial mount: page 0 visible, rest parked off-screen, then reveal page 0
  useEffect(() => {
    const pages = pagesRef.current;
    pages.forEach((p, i) => {
      if (!p) return;
      p.style.transition = 'none';
      if (i === 0) {
        p.style.transform = 'translateX(0)';
        p.style.opacity = '1';
        p.style.zIndex = '10';
        p.style.pointerEvents = 'all';
        p.style.display = 'block';
      } else {
        p.style.transform = 'translateX(100%)';
        p.style.opacity = '0';
        p.style.zIndex = '1';
        p.style.pointerEvents = 'none';
        p.style.display = 'none';
      }
    });
    setTimeout(() => triggerReveal(pages[0]), 200);
    mountedRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!mountedRef.current) return;
    const prev = prevPageRef.current;
    const n = currentPage;
    if (prev === n) return;

    const pages = pagesRef.current;
    const forward = n > prev;

    const incoming = pages[n];
    const outgoing = pages[prev];
    if (!incoming || !outgoing) return;

    incoming.style.transition = 'none';
    incoming.style.transform = forward ? 'translateX(100%)' : 'translateX(-100%)';
    incoming.style.opacity = '1';
    incoming.style.zIndex = '5';
    incoming.style.pointerEvents = 'none';
    incoming.style.display = 'block';

    // force reflow
    // eslint-disable-next-line no-unused-expressions
    incoming.offsetHeight;

    const trans = 'transform .65s cubic-bezier(.77,0,.175,1), opacity .5s ease';

    outgoing.style.transition = trans;
    outgoing.style.transform = forward ? 'translateX(-22%) rotateY(-8deg) scale(.97)' : 'translateX(22%) rotateY(8deg) scale(.97)';
    outgoing.style.opacity = '0';
    outgoing.style.zIndex = '4';

    incoming.style.transition = trans;
    incoming.style.transform = 'translateX(0) rotateY(0) scale(1)';
    incoming.style.opacity = '1';
    incoming.style.zIndex = '10';

    prevPageRef.current = n;

    const t = setTimeout(() => {
      outgoing.style.transition = 'none';
      outgoing.style.display = 'none';
      outgoing.style.opacity = '0';
      outgoing.style.zIndex = '1';

      incoming.style.pointerEvents = 'all';
      triggerReveal(incoming);
    }, 680);

    return () => clearTimeout(t);
  }, [currentPage, pagesRef]);
}

export default function SiteApp() {
  const { currentPage, goToPage, anyModalOpen, hideSwipeHint } = useSite();
  const pagesRef = useRef<(HTMLDivElement | null)[]>(Array.from({ length: TOTAL_PAGES }, () => null));

  usePageTransition(pagesRef, currentPage);

  const bookRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const bc = bookRef.current;
    if (!bc) return;
    let touchStartX = 0;
    let touchStartY = 0;
    let swipeBlocked = false;

    const onStart = (e: TouchEvent) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      swipeBlocked = false;
    };
    const onMove = (e: TouchEvent) => {
      const dx = Math.abs(e.touches[0].clientX - touchStartX);
      const dy = Math.abs(e.touches[0].clientY - touchStartY);
      if (dy > dx + 8) swipeBlocked = true;
    };
    const onEnd = (e: TouchEvent) => {
      hideSwipeHint();
      if (swipeBlocked || anyModalOpen) return;
      const dx = e.changedTouches[0].clientX - touchStartX;
      const dy = Math.abs(e.changedTouches[0].clientY - touchStartY);
      if (Math.abs(dx) > 50 && Math.abs(dx) > dy) {
        dx < 0 ? goToPage(currentPage + 1) : goToPage(currentPage - 1);
      }
    };

    bc.addEventListener('touchstart', onStart, { passive: true });
    bc.addEventListener('touchmove', onMove, { passive: true });
    bc.addEventListener('touchend', onEnd, { passive: true });
    return () => {
      bc.removeEventListener('touchstart', onStart);
      bc.removeEventListener('touchmove', onMove);
      bc.removeEventListener('touchend', onEnd);
    };
  }, [currentPage, anyModalOpen, goToPage, hideSwipeHint]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (anyModalOpen) return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') goToPage(currentPage + 1);
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') goToPage(currentPage - 1);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [currentPage, anyModalOpen, goToPage]);

  return (
    <>
      <Nav />
      <MobileMenu />
      <div id="book-container" ref={bookRef}>
        {PAGE_COMPONENTS.map((Page, i) => (
          <div
            className="page"
            key={i}
            ref={(el) => {
              pagesRef.current[i] = el;
            }}
            style={{ background: PAGE_BG[i] }}
          >
            {PAGE_LABELS[i] && <span className="page-corner-label">{PAGE_LABELS[i]}</span>}
            <Page />
          </div>
        ))}
      </div>
      <PageNavUI />
      <CartSidebar />
      <Lightbox />
      <Modals />
      <StoryModal />
      <SharedLinkOverlay />
    </>
  );
}
