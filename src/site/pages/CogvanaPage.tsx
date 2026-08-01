import { useMemo, useState } from 'react';
import { useSite } from '../context/SiteContext';
import { usePhotographerDirectory, usePhotographerPortfolio, toggleLike, useHasLiked } from '../hooks/usePhotographerDirectory';
import ProtectedImage from '../components/ProtectedImage';
import ReportModal from '../components/ReportModal';
import BookingRequestModal from '../components/BookingRequestModal';
import { PHOTOGRAPHER_CATEGORIES } from '../../partners/types';

// This page used to be a single admin-curated "Cogvana Visuals" gallery.
// It's now the photographer marketplace: browse/search photographers here,
// click one to load their portfolio. Cogvana's own studio intentionally
// does not appear in this directory — see Phase 1 spec.
export default function CogvanaPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return selectedId ? (
    <PortfolioView photographerId={selectedId} onBack={() => setSelectedId(null)} />
  ) : (
    <DirectoryView onSelect={setSelectedId} />
  );
}

function DirectoryView({ onSelect }: { onSelect: (id: string) => void }) {
  const { photographers, loading } = usePhotographerDirectory();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');

  const filtered = useMemo(() => {
    return photographers.filter((p) => {
      if (category && !p.categories?.includes(category as any)) return false;
      if (search) {
        const s = search.toLowerCase();
        const hay = `${p.businessName} ${p.county} ${p.categories?.join(' ')}`.toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
  }, [photographers, search, category]);

  return (
    <div className="px-5 md:px-10 py-7 max-w-7xl mx-auto">
      <div className="reveal flex items-end justify-between mb-7 flex-wrap gap-4">
        <div>
          <p className="section-eyebrow mb-1">Find A Photographer</p>
          <div className="gold-line mb-3" />
          <h2 className="section-title" style={{ color: 'var(--warm-white)' }}>
            Photographer Partners
          </h2>
          <p className="mt-2 text-xs max-w-xs" style={{ color: 'var(--warm-gray)' }}>
            Browse independent photographers across Kenya and book directly through their portfolio.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-6 reveal">
        <input
          placeholder="Search by name, location, category…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[200px] text-xs px-3 py-2 rounded"
          style={{ background: 'rgba(255,255,255,.06)', border: '1px solid rgba(201,168,76,.25)', color: 'var(--warm-white)' }}
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="text-xs px-3 py-2 rounded"
          style={{ background: 'rgba(255,255,255,.06)', border: '1px solid rgba(201,168,76,.25)', color: 'var(--warm-white)' }}
        >
          <option value="">All categories</option>
          {PHOTOGRAPHER_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem 0' }}>
          <div style={{ width: 28, height: 28, border: '2px solid rgba(201,168,76,.25)', borderTopColor: 'var(--gold)', borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
        </div>
      ) : filtered.length === 0 ? (
        <p style={{ fontSize: '.78rem', color: 'var(--warm-gray)' }}>No photographers match yet — check back soon.</p>
      ) : (
        <div className="masonry">
          {filtered.map((p) => (
            <div
              key={p.id}
              className="masonry-item"
              onClick={() => onSelect(p.id)}
              style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(201,168,76,.15)', borderRadius: 8, padding: '1rem', cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 40, height: 40, borderRadius: '50%', flexShrink: 0, overflow: 'hidden',
                    background: 'rgba(201,168,76,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  {p.coverImageUrl ? (
                    <img src={p.coverImageUrl} alt={p.businessName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ color: 'var(--gold)', fontSize: '.85rem', fontWeight: 700 }}>
                      {p.businessName?.[0]?.toUpperCase() ?? '?'}
                    </span>
                  )}
                </div>
                <p style={{ fontFamily: "'Playfair Display',serif", fontSize: '1rem', fontWeight: 700, color: '#fff' }}>
                  {p.businessName}
                  {p.verified && <span style={{ color: 'var(--gold)', fontSize: '.7rem', marginLeft: 6 }}>✓ Verified</span>}
                </p>
              </div>
              <p style={{ fontSize: '.68rem', color: 'var(--warm-gray)', marginTop: 6 }}>{p.county}</p>
              <p style={{ fontSize: '.62rem', color: 'var(--gold)', marginTop: 6 }}>{p.categories?.join(' · ')}</p>
              <p style={{ fontSize: '.62rem', color: 'var(--warm-gray)', marginTop: 6 }}>♥ {p.likesCount ?? 0}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PortfolioView({ photographerId, onBack }: { photographerId: string; onBack: () => void }) {
  const { profile, images, loading } = usePhotographerPortfolio(photographerId);
  const { openLightbox } = useSite();
  const liked = useHasLiked(photographerId);
  const [showReport, setShowReport] = useState<{ type: 'photographer' | 'galleryImage'; id: string; imageUrl?: string | null } | null>(null);
  const [showBooking, setShowBooking] = useState(false);

  if (loading || !profile) {
    return (
      <div className="px-5 md:px-10 py-7 max-w-7xl mx-auto">
        <button onClick={onBack} className="btn-outline-gold text-xs mb-4" style={{ padding: '.4rem .85rem' }}>
          ← Back to directory
        </button>
        <p style={{ fontSize: '.78rem', color: 'var(--warm-gray)' }}>Loading…</p>
      </div>
    );
  }

  return (
    <div className="px-5 md:px-10 py-7 max-w-7xl mx-auto">
      <button onClick={onBack} className="btn-outline-gold text-xs mb-5" style={{ padding: '.4rem .85rem' }}>
        ← Back to directory
      </button>

      <div className="reveal flex items-start justify-between flex-wrap gap-4 mb-6">
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
          <div
            style={{
              width: 72, height: 72, borderRadius: '50%', flexShrink: 0, overflow: 'hidden',
              background: 'rgba(201,168,76,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            {profile.coverImageUrl ? (
              <img src={profile.coverImageUrl} alt={profile.businessName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ color: 'var(--gold)', fontSize: '1.6rem', fontWeight: 700 }}>
                {profile.businessName?.[0]?.toUpperCase() ?? '?'}
              </span>
            )}
          </div>
          <div>
            <h2 className="section-title" style={{ color: 'var(--warm-white)' }}>
              {profile.businessName}
              {profile.verified && <span style={{ color: 'var(--gold)', fontSize: '.7rem', marginLeft: 8 }}>✓ Verified</span>}
            </h2>
            <p style={{ fontSize: '.72rem', color: 'var(--warm-gray)', marginTop: 4 }}>{profile.county}</p>
            <p style={{ fontSize: '.62rem', color: 'var(--gold)', marginTop: 6 }}>{profile.categories?.join(' · ')}</p>
            <p style={{ fontSize: '.78rem', color: 'var(--warm-white)', marginTop: 10, maxWidth: 480 }}>{profile.bio}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <button
            onClick={async () => {
              await toggleLike(photographerId, liked);
            }}
            className="text-xs"
            style={{ color: liked ? 'var(--gold)' : 'var(--warm-gray)' }}
          >
            {liked ? '♥ Liked' : '♡ Like'} ({profile.likesCount ?? 0})
          </button>
          <button onClick={() => setShowBooking(true)} className="btn-outline-gold text-xs" style={{ padding: '.5rem 1rem' }}>
            Book this photographer
          </button>
          <a href={`tel:${profile.phone}`} className="text-xs" style={{ color: 'var(--warm-gray)' }}>
            {profile.phone}
          </a>
          <button onClick={() => setShowReport({ type: 'photographer', id: photographerId, imageUrl: profile.coverImageUrl })} className="text-[.65rem]" style={{ color: 'var(--warm-gray)' }}>
            Report profile
          </button>
        </div>
      </div>

      {showBooking && (
        <BookingRequestModal
          photographerId={photographerId}
          photographerBusinessName={profile.businessName}
          services={profile.services ?? []}
          onClose={() => setShowBooking(false)}
        />
      )}

      {profile.services?.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-3">
          {profile.services.map((s, i) => (
            <div key={i} style={{ border: '1px solid rgba(201,168,76,.2)', borderRadius: 8, padding: '.6rem .9rem' }}>
              <p style={{ fontSize: '.75rem', color: '#fff', fontWeight: 600 }}>{s.name}</p>
              <p style={{ fontSize: '.65rem', color: 'var(--warm-gray)' }}>{s.description}</p>
              {s.priceFrom > 0 && <p style={{ fontSize: '.65rem', color: 'var(--gold)' }}>From KSh {s.priceFrom.toLocaleString()}</p>}
            </div>
          ))}
        </div>
      )}

      {images.length === 0 ? (
        <p style={{ fontSize: '.78rem', color: 'var(--warm-gray)' }}>No portfolio images yet.</p>
      ) : (
        <div className="masonry">
          {images.map((img) => (
            <div className="masonry-item" key={img.id} style={{ position: 'relative' }}>
              <ProtectedImage src={img.imageUrl} alt={img.caption} onClick={() => openLightbox(img.imageUrl)} />
              <div className="hover-overlay">
                <svg width="22" height="22" fill="none" stroke="white" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                </svg>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowReport({ type: 'galleryImage', id: img.id, imageUrl: img.imageUrl });
                }}
                style={{ position: 'absolute', bottom: 4, right: 4, fontSize: '.55rem', color: 'rgba(255,255,255,.7)', background: 'rgba(0,0,0,.4)', borderRadius: 4, padding: '2px 5px' }}
              >
                Report
              </button>
            </div>
          ))}
        </div>
      )}

      {showReport && (
        <ReportModal
          targetType={showReport.type}
          targetId={showReport.id}
          photographerId={photographerId}
          imageUrl={showReport.imageUrl}
          onClose={() => setShowReport(null)}
        />
      )}
    </div>
  );
}
