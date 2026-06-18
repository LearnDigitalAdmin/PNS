import { partnerCategories, featuredPartners } from '../data';
import { useSite } from '../context/SiteContext';

export default function PartnersPage() {
  const { openModal } = useSite();

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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {featuredPartners.map((p) => (
          <div className="story-card h-52 reveal" key={p.id}>
            <img loading="lazy" decoding="async" src={p.image} className="absolute inset-0" />
            <div className="story-card-overlay" />
            <div className="card-content">
              <span className="category-badge">{p.badge}</span>
              <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: '1rem', fontWeight: 800, color: '#fff', marginTop: '.25rem' }}>{p.name}</h3>
              <button className="btn-outline-gold mt-2" style={{ fontSize: '.56rem', padding: '.3rem .8rem' }}>
                View Partner
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="text-center">
        <button onClick={() => openModal('partnerModal')} className="btn-gold">
          Become A Partner
        </button>
      </div>
    </div>
  );
}
