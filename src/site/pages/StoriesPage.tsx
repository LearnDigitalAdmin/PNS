import { stories } from '../data';

export default function StoriesPage() {
  const large = stories.find((s) => s.size === 'large')!;
  const mediums = stories.filter((s) => s.size === 'medium');
  const smalls = stories.filter((s) => s.size === 'small');

  return (
    <div className="px-5 md:px-10 py-7 max-w-7xl mx-auto">
      <div className="reveal flex items-end justify-between mb-7">
        <div>
          <p className="section-eyebrow mb-1">This Week's Edition</p>
          <div className="gold-line mb-3" />
          <h2 className="section-title">Featured Stories</h2>
        </div>
        <a href="#" className="btn-outline-gold hidden md:inline-block" style={{ fontSize: '.6rem' }}>
          View All Stories
        </a>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        <div className="story-card md:col-span-7 h-80 md:h-[440px] reveal">
          <img loading="lazy" decoding="async" src={large.image} alt={large.category} className="absolute inset-0" />
          <div className="story-card-overlay" />
          <div className="card-content">
            <span className="category-badge">{large.category}</span>
            <h3
              style={{ fontFamily: "'Playfair Display',serif", fontSize: 'clamp(1.2rem,3vw,1.9rem)', fontWeight: 800, color: '#fff', lineHeight: 1.1, marginTop: '.35rem' }}
            >
              {large.title}
            </h3>
            <p className="text-xs mt-1" style={{ color: 'rgba(247,244,239,.7)' }}>
              {large.excerpt}
            </p>
            <button className="btn-gold mt-3">{large.cta}</button>
          </div>
        </div>

        <div className="md:col-span-5 flex flex-col gap-3">
          {mediums.map((s) => (
            <div className="story-card h-48 md:flex-1 reveal" key={s.id}>
              <img loading="lazy" decoding="async" src={s.image} alt={s.category} />
              <div className="story-card-overlay" />
              <div className="card-content">
                <span className="category-badge">{s.category}</span>
                <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.05rem', fontWeight: 800, color: '#fff', marginTop: '.25rem' }}>{s.title}</h3>
                <button className="btn-outline-gold mt-2" style={{ fontSize: '.56rem', padding: '.3rem .8rem' }}>
                  {s.cta}
                </button>
              </div>
            </div>
          ))}
        </div>

        {smalls.map((s) => (
          <div className="story-card md:col-span-4 h-48 reveal" key={s.id}>
            <img loading="lazy" decoding="async" src={s.image} alt={s.category} className="absolute inset-0" />
            <div className="story-card-overlay" />
            <div className="card-content">
              <span className="category-badge">{s.category}</span>
              <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: '.95rem', fontWeight: 800, color: '#fff', marginTop: '.25rem' }}>{s.title}</h3>
              <button className="btn-outline-gold mt-2" style={{ fontSize: '.56rem', padding: '.3rem .8rem' }}>
                {s.cta}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
