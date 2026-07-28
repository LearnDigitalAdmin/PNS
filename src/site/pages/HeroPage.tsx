import { useEffect, useRef, useState } from 'react';
import { heroSlides as demoSlides } from '../data';
import { useSite } from '../context/SiteContext';
import type { HeroAction } from '../types';
import { FSStory } from '../../lib/firebaseVoting';


// Convert a live FSStory into the hero slide shape
function storyToSlide(s: FSStory) {
  return {
    id: s.id,
    image: s.image || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=1600&q=80',
    badge: s.isVotingWinner ? `${s.category} — Winner` : s.category,
    badgeType: undefined as 'sponsored' | undefined,
    titleLine1: s.title,
    titleLine2: undefined as string | undefined,
    subtitle: s.excerpt ?? '',
    excerpt: s.body ? s.body.slice(0, 160) : '',
    body: s.body,
    images: s.images,
    author: s.author,
    date: s.date,
    ctas: [
      { label: s.isVotingWinner ? 'See Full Story' : 'Read Story', action: { type: 'openStory' as const } },
      { label: 'Vote Now ✦', action: { type: 'goToPage' as const, page: 2 } },
      { label: 'Book A Shoot', action: { type: 'openModal' as const, modal: 'bookModal' } },
    ],
  };
}

type HeroSlideData = ReturnType<typeof storyToSlide> | (typeof demoSlides)[number];

export default function HeroPage() {
  const { liveStories, storiesLoading, goToPage, openModal, openStoryModal } = useSite();
  const [slide, setSlide] = useState(0);
  const barRef = useRef<HTMLDivElement>(null);

  // Build slides from live stories, fall back to demo if none yet
  const slides: HeroSlideData[] = (!storiesLoading && liveStories.length > 0)
    ? liveStories.slice(0, 5).map((s) => storyToSlide(s))
    : demoSlides;

  // Reset to slide 0 when slide list changes (e.g. first load)
  useEffect(() => { setSlide(0); }, [slides.length]);

  const resetBar = () => {
    const bar = barRef.current;
    if (!bar) return;
    bar.style.transition = 'none';
    bar.style.width = '0%';
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        bar.style.transition = 'width 10s linear';
        bar.style.width = '100%';
      });
    });
  };

  useEffect(() => { resetBar(); }, [slide]);

  useEffect(() => {
    const id = setInterval(() => setSlide((s) => (s + 1) % slides.length), 10000);
    return () => clearInterval(id);
  }, [slides.length]);

  function runAction(action: HeroAction, s: HeroSlideData) {
    if (action.type === 'goToPage') goToPage(action.page);
    if (action.type === 'openModal') openModal(action.modal);
    if (action.type === 'openStory') {
      const typed = s as ReturnType<typeof storyToSlide>;
      openStoryModal({
        title: s.titleLine1 + (s.titleLine2 ? ' ' + s.titleLine2 : ''),
        category: s.badge,
        excerpt: s.subtitle,
        body: typed.body,
        image: s.image,
        images: typed.images,
        author: typed.author,
        date: typed.date,
      });
    }
  }

  return (
    <section id="hero">
      {slides.map((s, i) => (
        <div className={`hero-slide ${i === slide ? 'active' : ''}`} key={s.id}>
          <img decoding="async" src={s.image} alt={s.badge} loading={i === 0 ? 'eager' : 'eager'} />
          <div className="hero-overlay" />
          <div className="hero-content max-w-6xl mx-auto">
            <div className="max-w-xl">
              {s.badgeType === 'sponsored' ? (
                <span className="sponsored-badge" style={{ marginBottom: '.7rem', display: 'inline-block' }}>
                  {s.badge}
                </span>
              ) : (
                <span className="category-badge">{s.badge}</span>
              )}
              <h1 className="hero-headline">
                {s.titleLine1}
                {s.titleLine2 && (
                  <>
                    <br />
                    {s.titleLine2}
                  </>
                )}
                <br />
                <em
                  style={{
                    fontFamily: "'Cormorant Garamond',serif",
                    fontWeight: 300,
                    fontSize: s.titleLine2 ? '.5em' : '.6em',
                    color: 'rgba(247,244,239,.65)',
                  }}
                >
                  {s.subtitle}
                </em>
              </h1>
              {s.excerpt && <p className="hero-excerpt">{s.excerpt}</p>}
              <div className="flex flex-wrap gap-3 mt-5">
                {s.ctas.map((cta, idx) => {
                  const isPrimary = idx === 0;
                  const isOutline = cta.label.includes('Vote') || cta.label === 'Book Sponsored Story';
                  const isWhite = cta.label === 'Book A Shoot';
                  const cls = isPrimary
                    ? 'btn-gold'
                    : isOutline
                    ? 'btn-outline-gold'
                    : isWhite
                    ? 'btn-white'
                    : 'btn-dark';
                  return (
                    <button
                      key={cta.label}
                      onClick={() => runAction(cta.action, s)}
                      className={cls}
                      style={cls === 'btn-dark' ? { border: '1px solid rgba(247,244,239,.22)' } : undefined}
                    >
                      {cta.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Masthead */}
      <div
        className="absolute top-2 left-0 right-0 px-6 flex items-center justify-between pointer-events-none"
        style={{ zIndex: 15 }}
      >
        <p style={{ fontSize: '.52rem', letterSpacing: '.28em', color: 'rgba(247,244,239,.35)', textTransform: 'uppercase', fontWeight: 500 }}>
          Issue No. 07 · June 2026
        </p>
        <p
          style={{ fontSize: '.52rem', letterSpacing: '.28em', color: 'rgba(247,244,239,.35)', textTransform: 'uppercase', fontWeight: 500 }}
          className="hidden md:block"
        >
          Fashion · Beauty · Culture
        </p>
      </div>

      {/* Hero dots */}
      <div className="hero-dot-nav" style={{ zIndex: 15 }}>
        {slides.map((s, i) => (
          <div
            key={s.id}
            className={`hero-dot ${i === slide ? 'active' : ''}`}
            onClick={() => setSlide(i)}
          />
        ))}
      </div>
      <div className="hero-progress" ref={barRef} style={{ zIndex: 15 }} />
    </section>
  );
}