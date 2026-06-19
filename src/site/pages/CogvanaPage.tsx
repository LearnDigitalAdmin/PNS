import { useRef, useState } from 'react';
import { useSite } from '../context/SiteContext';

export default function CogvanaPage() {
  const { openLightbox, gallery, galleryLoading } = useSite();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);

  const covers = gallery.filter((g) => g.section === 'cover');
  const masonry = gallery.filter((g) => g.section === 'masonry');

  function scroll(dir: number) {
    const track = trackRef.current;
    const wrap = wrapperRef.current;
    if (!track || !wrap) return;
    const cardW = 280;
    const maxOff = Math.max(0, track.scrollWidth - wrap.clientWidth);
    const next = Math.max(0, Math.min(offset + dir * cardW, maxOff));
    setOffset(next);
    track.style.transform = `translateX(-${next}px)`;
  }

  return (
    <div className="px-5 md:px-10 py-7 max-w-7xl mx-auto">
      <div className="reveal flex items-end justify-between mb-7">
        <div>
          <p className="section-eyebrow mb-1">Visual Storytelling</p>
          <div className="gold-line mb-3" />
          <h2 className="section-title" style={{ color: 'var(--warm-white)' }}>
            Cogvana Visuals
          </h2>
          <p className="mt-2 text-xs max-w-xs" style={{ color: 'var(--warm-gray)' }}>
            Premium photography capturing the essence of people, culture, and beauty across Africa.
          </p>
        </div>
      </div>

      {galleryLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem 0' }}>
          <div style={{ width: 28, height: 28, border: '2px solid rgba(201,168,76,.25)', borderTopColor: 'var(--gold)', borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
        </div>
      ) : (
        <>
          {covers.length > 0 && (
            <>
              <div style={{ overflow: 'hidden' }} className="reveal" ref={wrapperRef}>
                <div className="cog-track" ref={trackRef}>
                  {covers.map((c) => (
                    <div className="story-card flex-shrink-0" style={{ width: 'min(17rem,70vw)', height: 400 }} key={c.id}>
                      <img loading="lazy" decoding="async" src={c.image} alt={c.caption} />
                      <div className="story-card-overlay" />
                      <div className="card-content">
                        <p style={{ fontSize: '.56rem', letterSpacing: '.18em', color: 'var(--gold)', textTransform: 'uppercase' }}>{c.credit}</p>
                        <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.05rem', fontWeight: 700, color: '#fff', marginTop: '.2rem' }}>{c.caption}</h3>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 mt-4 justify-end">
                <button onClick={() => scroll(-1)} className="btn-outline-gold" style={{ padding: '.4rem .85rem', fontSize: '1rem' }}>
                  ←
                </button>
                <button onClick={() => scroll(1)} className="btn-outline-gold" style={{ padding: '.4rem .85rem', fontSize: '1rem' }}>
                  →
                </button>
              </div>
            </>
          )}

          <div className="mt-7 reveal">
            <p className="section-eyebrow mb-3">Editorial Gallery</p>
            {masonry.length === 0 ? (
              <p style={{ fontSize: '.78rem', color: 'var(--warm-gray)' }}>No images yet — check back soon.</p>
            ) : (
              <div className="masonry">
                {masonry.map((m) => (
                  <div className="masonry-item" onClick={() => openLightbox(m.image)} key={m.id}>
                    <img decoding="async" src={m.image} loading="lazy" />
                    <div className="hover-overlay">
                      <svg width="22" height="22" fill="none" stroke="white" strokeWidth="1.5" viewBox="0 0 24 24">
                        <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                      </svg>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}