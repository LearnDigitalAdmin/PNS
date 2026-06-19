import { partnerCategories } from '../data';
import { useSite } from '../context/SiteContext';

export default function PartnersPage() {
  const { openModal, partners, partnersLoading } = useSite();

  return (
    <div className="px-5 md:px-10 py-7 max-w-7xl mx-auto">
      <div className="reveal flex items-end justify-between mb-7">
        <div>
          <p className="section-eyebrow mb-1">Our Ecosystem</p>
          <div className="gold-line mb-3" />
          <h2 className="section-title">Featured Partners</h2>
        </div>
        <button onClick={() => openModal('partnerModal')} className="btn-gold hidden md:inline-block">
          Become A Partner
        </button>
      </div>

      <div className="grid grid-cols-3 md:grid-cols-5 gap-3 mb-7">
        {partnerCategories.map((c) => (
          <div
            className="glass reveal p-3 text-center cursor-pointer hover:border-yellow-600 transition-all"
            style={{ border: '1px solid rgba(10,10,10,.08)' }}
            key={c.id}
          >
            <div className="text-xl mb-1">{c.emoji}</div>
            <p style={{ fontSize: '.58rem', textTransform: 'uppercase', fontWeight: 600 }}>{c.label}</p>
          </div>
        ))}
      </div>

      {partnersLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem 0' }}>
          <div style={{ width: 26, height: 26, border: '2px solid rgba(0,0,0,.1)', borderTopColor: 'var(--gold)', borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
        </div>
      ) : partners.length === 0 ? (
        <p className="text-xs mb-6" style={{ color: 'var(--mid-gray)' }}>
          We're onboarding new partners — check back soon, or be the first to apply below.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {partners.map((p) => (
            <div className="story-card h-52 reveal" key={p.id}>
              {p.image ? (
                <img loading="lazy" decoding="async" src={p.image} className="absolute inset-0" />
              ) : (
                <div className="absolute inset-0" style={{ background: 'var(--charcoal)' }} />
              )}
              <div className="story-card-overlay" />
              <div className="card-content">
                <span className="category-badge">{p.category}</span>
                <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: '1rem', fontWeight: 800, color: '#fff', marginTop: '.25rem' }}>{p.name}</h3>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="text-center">
        <button onClick={() => openModal('partnerModal')} className="btn-gold">
          Become A Partner
        </button>
      </div>
    </div>
  );
}