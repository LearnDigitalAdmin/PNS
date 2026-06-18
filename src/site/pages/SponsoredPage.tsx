import { sponsoredStoryCards } from '../data';
import { useSite } from '../context/SiteContext';

export default function SponsoredPage() {
  const { openModal } = useSite();

  return (
    <div className="px-5 md:px-10 py-7 max-w-7xl mx-auto">
      <div className="reveal text-center mb-7">
        <p className="section-eyebrow mb-1">Brand Partnerships</p>
        <div className="gold-line mx-auto mb-3" />
        <h2 className="section-title" style={{ color: 'var(--warm-white)' }}>
          Sponsored Stories
        </h2>
        <p className="mt-1 text-xs max-w-sm mx-auto" style={{ color: 'var(--warm-gray)' }}>
          Premium editorial advertising that tells your brand's story through authentic narratives.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-7">
        {sponsoredStoryCards.map((s) => (
          <div className="story-card h-72 reveal" key={s.id}>
            <img loading="lazy" decoding="async" src={s.image} className="absolute inset-0" />
            <div className="story-card-overlay" />
            <div className="card-content">
              <div className="sponsored-badge mb-2">Sponsored</div>
              <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: '.95rem', fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>{s.title}</h3>
              <button className="btn-gold mt-3" style={{ fontSize: '.56rem', padding: '.32rem .85rem' }}>
                Read Story
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="reveal glass-dark p-7 md:p-10 text-center">
        <p className="section-eyebrow mb-2">Reach Your Audience</p>
        <h2 className="section-title mb-2" style={{ color: 'var(--warm-white)' }}>
          Promote Your Brand
          <br />
          Through Storytelling
        </h2>
        <p className="max-w-md mx-auto text-xs mb-5" style={{ color: 'var(--warm-gray)' }}>
          Sponsored Stories reach thousands of engaged readers every week — people who trust the P&S editorial voice.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <button onClick={() => openModal('sponsoredModal')} className="btn-gold">
            Book Sponsored Story
          </button>
          <button onClick={() => openModal('partnerModal')} className="btn-outline-gold">
            Apply For Partnership
          </button>
          <button onClick={() => openModal('mediaModal')} className="btn-white">
            Request Media Kit
          </button>
        </div>
      </div>
    </div>
  );
}
