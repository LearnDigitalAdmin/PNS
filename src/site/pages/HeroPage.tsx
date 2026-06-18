import { useEffect, useRef, useState } from 'react';
import { heroSlides } from '../data';
import { useSite } from '../context/SiteContext';
import type { HeroAction } from '../types';

export default function HeroPage() {
  const [slide, setSlide] = useState(0);
  const barRef = useRef<HTMLDivElement>(null);
  const { goToPage, openModal } = useSite();

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

  useEffect(() => {
    resetBar();
  }, [slide]);

  useEffect(() => {
    const id = setInterval(() => setSlide((s) => (s + 1) % heroSlides.length), 10000);
    return () => clearInterval(id);
  }, []);

  function runAction(action: HeroAction) {
    if (action.type === 'goToPage') goToPage(action.page);
    if (action.type === 'openModal') openModal(action.modal);
  }

  return (
    <section id="hero">
      {heroSlides.map((s, i) => (
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
                <em style={{ fontFamily: "'Cormorant Garamond',serif", fontWeight: 300, fontSize: s.titleLine2 ? '.5em' : '.6em', color: 'rgba(247,244,239,.65)' }}>
                  {s.subtitle}
                </em>
              </h1>
              <p className="hero-excerpt">{s.excerpt}</p>
              <div className="flex flex-wrap gap-3 mt-5">
                {s.ctas.map((cta, idx) => {
                  const isPrimary = idx === 0;
                  const isOutline = cta.label.includes('Vote') || cta.label === 'Book Sponsored Story';
                  const isWhite = cta.label === 'Book A Shoot';
                  const cls = isPrimary ? 'btn-gold' : isOutline ? 'btn-outline-gold' : isWhite ? 'btn-white' : 'btn-dark';
                  return (
                    <button
                      key={cta.label}
                      onClick={() => runAction(cta.action)}
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
      <div className="absolute top-2 left-0 right-0 px-6 flex items-center justify-between pointer-events-none" style={{ zIndex: 15 }}>
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
        {heroSlides.map((s, i) => (
          <div key={s.id} className={`hero-dot ${i === slide ? 'active' : ''}`} onClick={() => setSlide(i)} />
        ))}
      </div>
      <div className="hero-progress" ref={barRef} style={{ zIndex: 15 }} />
    </section>
  );
}
