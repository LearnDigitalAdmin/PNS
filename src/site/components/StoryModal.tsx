import { useState, useEffect, useCallback } from 'react';
import { useSite } from '../context/SiteContext';
import { renderMarkdown } from '../../lib/markdown';
import { openWhatsApp } from '../../lib/fingerprint';

// ─── Image gallery with dots ──────────────────────────────────────────────────

function ImageGallery({
  image,
  images,
  title,
  onZoom,
}: {
  image: string;
  images?: string[];
  title: string;
  onZoom: (src: string) => void;
}) {
  const allImages = (() => {
    if (images && images.length > 0) return images;
    if (image) return [image];
    return [];
  })();

  const [activeIdx, setActiveIdx] = useState(0);
  const current = allImages[activeIdx] ?? '';

  useEffect(() => { setActiveIdx(0); }, [image]);

  if (allImages.length === 0) return null;

  return (
    <div style={{ position: 'relative' }}>
      {/* Main image */}
      <div
        className="story-modal-hero"
        onClick={() => onZoom(current)}
        title="View full image"
        style={{ cursor: 'zoom-in' }}
      >
        <img
          key={current}
          src={current}
          alt={title}
          loading="lazy"
          decoding="async"
          style={{ transition: 'opacity .25s' }}
        />
        <div className="story-modal-hero-overlay" />

        {/* Prev / next arrows (only if multiple images) */}
        {allImages.length > 1 && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); setActiveIdx((i) => (i - 1 + allImages.length) % allImages.length); }}
              style={{
                position: 'absolute', left: '.7rem', top: '50%', transform: 'translateY(-50%)',
                background: 'rgba(0,0,0,.55)', border: 'none', color: '#fff',
                width: 32, height: 32, cursor: 'pointer', fontSize: '1rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
              aria-label="Previous image"
            >
              ←
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setActiveIdx((i) => (i + 1) % allImages.length); }}
              style={{
                position: 'absolute', right: '.7rem', top: '50%', transform: 'translateY(-50%)',
                background: 'rgba(0,0,0,.55)', border: 'none', color: '#fff',
                width: 32, height: 32, cursor: 'pointer', fontSize: '1rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
              aria-label="Next image"
            >
              →
            </button>
          </>
        )}

        {/* Image counter badge */}
        {allImages.length > 1 && (
          <div style={{
            position: 'absolute', bottom: '.7rem', right: '.7rem',
            background: 'rgba(0,0,0,.6)', color: '#fff',
            fontSize: '.58rem', fontWeight: 700, letterSpacing: '.08em',
            padding: '.22rem .55rem',
          }}>
            {activeIdx + 1} / {allImages.length}
          </div>
        )}
      </div>

      {/* Dot nav */}
      {allImages.length > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '.35rem', padding: '.55rem 0 0' }}>
          {allImages.map((_, i) => (
            <button
              key={i}
              onClick={() => setActiveIdx(i)}
              aria-label={`Image ${i + 1}`}
              style={{
                width: i === activeIdx ? 18 : 6,
                height: 6,
                borderRadius: i === activeIdx ? 3 : '50%',
                background: i === activeIdx ? 'var(--gold)' : 'rgba(247,244,239,.3)',
                border: 'none', cursor: 'pointer', padding: 0,
                transition: 'all .22s',
              }}
            />
          ))}
        </div>
      )}

      {/* Thumbnail strip (> 2 images) */}
      {allImages.length > 2 && (
        <div style={{
          display: 'flex', gap: '.4rem', padding: '.55rem 1.8rem 0',
          overflowX: 'auto',
        }}>
          {allImages.map((src, i) => (
            <img
              key={src}
              src={src}
              alt={`Image ${i + 1}`}
              onClick={() => setActiveIdx(i)}
              style={{
                width: 52, height: 38, objectFit: 'cover', flexShrink: 0,
                cursor: 'pointer', opacity: i === activeIdx ? 1 : 0.5,
                outline: i === activeIdx ? '2px solid var(--gold)' : 'none',
                transition: 'opacity .2s, outline .2s',
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Sponsored CTA block ──────────────────────────────────────────────────────

function SponsoredCTABlock({
  contactPhone,
  contactEmail,
  contactWhatsApp,
  ctaLabel,
  ctaUrl,
  businessName,
}: {
  contactPhone?: string;
  contactEmail?: string;
  contactWhatsApp?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  businessName: string;
}) {
  const hasAnyCta = contactPhone || contactEmail || contactWhatsApp || ctaUrl;
  if (!hasAnyCta) return null;

  function handleWhatsApp() {
    const phone = contactWhatsApp || contactPhone || '';
    const msg = `Hi! I saw your story on P&S Magazine and would like to know more about ${businessName}.`;
    openWhatsApp(phone, msg);
  }

  return (
    <div
      style={{
        margin: '1.4rem 0 0',
        background: 'rgba(201,168,76,.08)',
        border: '1px solid rgba(201,168,76,.22)',
        padding: '1.1rem 1.4rem',
      }}
    >
      <p style={{
        fontSize: '.56rem', fontWeight: 700, letterSpacing: '.18em',
        textTransform: 'uppercase', color: 'var(--gold)', marginBottom: '.7rem',
      }}>
        Get In Touch with {businessName}
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.65rem' }}>
        {(contactWhatsApp || contactPhone) && (
          <button
            onClick={handleWhatsApp}
            style={{
              display: 'flex', alignItems: 'center', gap: '.45rem',
              background: '#25D366', color: '#fff', border: 'none',
              padding: '.58rem 1.1rem', cursor: 'pointer',
              fontSize: '.68rem', fontWeight: 700, letterSpacing: '.06em',
              textTransform: 'uppercase',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            WhatsApp
          </button>
        )}
        {contactEmail && (
          <a
            href={`mailto:${contactEmail}`}
            style={{
              display: 'flex', alignItems: 'center', gap: '.45rem',
              background: 'transparent',
              border: '1px solid var(--gold)',
              color: 'var(--gold)',
              padding: '.56rem 1.1rem',
              fontSize: '.68rem', fontWeight: 700, letterSpacing: '.06em',
              textTransform: 'uppercase', textDecoration: 'none',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M4 4h16v16H4Z" /><path d="m4 6 8 7 8-7" />
            </svg>
            Email
          </a>
        )}
        {ctaUrl && (
          <a
            href={ctaUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex', alignItems: 'center', gap: '.45rem',
              background: 'var(--gold)', color: '#0a0a0a',
              padding: '.56rem 1.1rem',
              fontSize: '.68rem', fontWeight: 700, letterSpacing: '.06em',
              textTransform: 'uppercase', textDecoration: 'none',
            }}
          >
            {ctaLabel || 'Visit Website'} →
          </a>
        )}
        {contactPhone && !contactWhatsApp && (
          <a
            href={`tel:${contactPhone}`}
            style={{
              display: 'flex', alignItems: 'center', gap: '.45rem',
              background: 'transparent',
              border: '1px solid rgba(247,244,239,.2)',
              color: 'rgba(247,244,239,.75)',
              padding: '.56rem 1.1rem',
              fontSize: '.68rem', fontWeight: 700, letterSpacing: '.06em',
              textTransform: 'uppercase', textDecoration: 'none',
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
            </svg>
            Call
          </a>
        )}
      </div>
    </div>
  );
}

// ─── Share button ─────────────────────────────────────────────────────────────

function ShareButton({ storyId, title }: { storyId?: string; title: string }) {
  const { buildStoryShareUrl } = useSite();
  const [copied, setCopied] = useState(false);

  const handleShare = useCallback(async () => {
    if (!storyId) return;
    const url = buildStoryShareUrl(storyId);
    const shareText = `Read "${title}" on P&S Magazine`;

    if (typeof navigator !== 'undefined' && (navigator as any).share) {
      try {
        await (navigator as any).share({ title: shareText, text: shareText, url });
        return;
      } catch { /* user cancelled */ }
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2400);
    } catch {
      window.prompt('Copy this link to share:', url);
    }
  }, [buildStoryShareUrl, storyId, title]);

  if (!storyId) return null;

  return (
    <button
      onClick={handleShare}
      title="Share this story"
      style={{
        display: 'flex', alignItems: 'center', gap: '.4rem',
        background: 'rgba(247,244,239,.08)',
        border: '1px solid rgba(247,244,239,.15)',
        color: copied ? 'var(--gold)' : 'rgba(247,244,239,.6)',
        padding: '.4rem .85rem', cursor: 'pointer',
        fontSize: '.62rem', fontWeight: 600, letterSpacing: '.07em',
        textTransform: 'uppercase',
        transition: 'all .2s',
      }}
    >
      {copied ? (
        <>✓ Link Copied!</>
      ) : (
        <>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
          Share
        </>
      )}
    </button>
  );
}

// ─── Shared link loading overlay ──────────────────────────────────────────────

export function SharedLinkOverlay() {
  const { sharedLinkLoading, sharedLinkError, clearSharedLinkError } = useSite();

  if (!sharedLinkLoading && !sharedLinkError) return null;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 2500,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(10,10,10,.88)', backdropFilter: 'blur(4px)',
        padding: '1rem',
      }}
    >
      {sharedLinkLoading ? (
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 36, height: 36,
            border: '2px solid rgba(201,168,76,.25)',
            borderTopColor: 'var(--gold)',
            borderRadius: '50%',
            animation: 'spin .8s linear infinite',
            margin: '0 auto 1rem',
          }} />
          <p style={{
            fontFamily: "'Playfair Display',serif", fontWeight: 700,
            fontSize: '1rem', color: '#fff',
          }}>
            Loading story…
          </p>
          <p style={{ fontSize: '.7rem', color: 'rgba(247,244,239,.45)', marginTop: '.35rem' }}>
            Following your shared link
          </p>
        </div>
      ) : (
        <div style={{
          background: 'var(--deep)', border: '1px solid rgba(201,168,76,.18)',
          padding: '2rem', maxWidth: 380, textAlign: 'center',
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '.8rem' }}>✦</div>
          <p style={{
            fontFamily: "'Playfair Display',serif", fontWeight: 800,
            fontSize: '1.1rem', color: '#fff', marginBottom: '.5rem',
          }}>
            Story Not Found
          </p>
          <p style={{ fontSize: '.78rem', color: 'rgba(247,244,239,.5)', marginBottom: '1.3rem', lineHeight: 1.5 }}>
            {sharedLinkError}
          </p>
          <button
            onClick={clearSharedLinkError}
            style={{
              background: 'var(--gold)', color: '#0a0a0a', border: 'none',
              padding: '.6rem 1.4rem', fontSize: '.68rem', fontWeight: 700,
              letterSpacing: '.1em', textTransform: 'uppercase', cursor: 'pointer',
            }}
          >
            Browse Stories
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main StoryModal ──────────────────────────────────────────────────────────

export default function StoryModal() {
  const { storyModalData, closeStoryModal, openLightbox } = useSite();
  const story = storyModalData;

  if (!story) return null;

  const businessName = story.title || 'this business';

  return (
    <div className="modal active">
      <div className="modal-backdrop" onClick={closeStoryModal} />
      <div className="modal-box modal-box-dark story-modal-box">
        <button onClick={closeStoryModal} className="story-modal-close" aria-label="Close">
          &times;
        </button>

        {/* Sponsored badge at very top */}
        {story.isSponsored && (
          <div style={{
            background: 'var(--gold)', color: '#0a0a0a',
            fontSize: '.54rem', fontWeight: 700, letterSpacing: '.18em',
            textTransform: 'uppercase', padding: '.3rem 1rem',
            textAlign: 'center',
          }}>
            ✦ Sponsored Story
          </div>
        )}

        {/* Image gallery */}
        <ImageGallery
          image={story.image}
          images={story.images}
          title={story.title}
          onZoom={openLightbox}
        />

        <div className="story-modal-content">
          {/* Category + meta row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '.5rem' }}>
            <span className="category-badge" style={{ marginBottom: 0 }}>{story.category}</span>
            <ShareButton storyId={story.storyId} title={story.title} />
          </div>

          <h2 className="story-modal-title">{story.title}</h2>

          {(story.author || story.date) && (
            <p className="story-modal-meta">
              {story.author}
              {story.author && story.date ? ' · ' : ''}
              {story.date}
            </p>
          )}

          {story.excerpt && <p className="story-modal-excerpt">{story.excerpt}</p>}

          {story.body ? (
            <div
              className="md-content story-modal-body"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(story.body) }}
            />
          ) : (
            <p className="story-modal-body-fallback">Full story coming soon.</p>
          )}

          {story.instagram && (
            <p className="story-modal-instagram">📷 {story.instagram}</p>
          )}

          {/* Sponsored CTA block */}
          {story.isSponsored && (
            <SponsoredCTABlock
              contactPhone={story.contactPhone}
              contactEmail={story.contactEmail}
              contactWhatsApp={story.contactWhatsApp}
              ctaLabel={story.ctaLabel}
              ctaUrl={story.ctaUrl}
              businessName={businessName}
            />
          )}

          {/* Share again at the bottom */}
          {story.storyId && (
            <div style={{
              marginTop: '1.4rem', paddingTop: '1rem',
              borderTop: '1px solid rgba(247,244,239,.08)',
              display: 'flex', alignItems: 'center', gap: '.8rem',
            }}>
              <p style={{ fontSize: '.62rem', color: 'rgba(247,244,239,.4)', flex: 1 }}>
                Enjoyed this story? Share it with someone.
              </p>
              <ShareButton storyId={story.storyId} title={story.title} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}