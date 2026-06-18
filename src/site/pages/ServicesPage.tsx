import { services, testimonials } from '../data';
import { useSite } from '../context/SiteContext';

export default function ServicesPage() {
  const { openModal } = useSite();
  // duplicate the list once so the CSS marquee animation (translateX -50%) loops seamlessly
  const looped = [...services, ...services];

  return (
    <div className="px-5 md:px-10 py-7">
      <div className="max-w-7xl mx-auto mb-7 reveal flex items-end justify-between">
        <div>
          <p className="section-eyebrow mb-1">What We Offer</p>
          <div className="gold-line mb-3" />
          <h2 className="section-title">Services</h2>
        </div>
        <button onClick={() => openModal('bookModal')} className="btn-gold hidden md:inline-block">
          Book A Service
        </button>
      </div>

      <div style={{ overflow: 'hidden', padding: '.4rem 0' }}>
        <div className="marquee-track">
          {looped.map((s, i) => (
            <div className="flex-shrink-0 story-card h-60" style={{ width: 200 }} key={`${s.id}-${i}`}>
              <img loading="lazy" decoding="async" src={s.image} className="absolute inset-0" />
              <div className="story-card-overlay" />
              <div className="card-content">
                <p style={{ color: 'var(--gold)', fontSize: '.56rem', letterSpacing: '.12em', textTransform: 'uppercase' }}>{s.eyebrow}</p>
                <h3 className="text-white font-display font-bold text-sm mt-1">{s.title}</h3>
                <button onClick={() => openModal('bookModal')} className="btn-outline-gold mt-2" style={{ fontSize: '.56rem', padding: '.27rem .65rem' }}>
                  Book
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 reveal" style={{ paddingBottom: '2rem' }}>
        {testimonials.map((t) => (
          <div className="glass p-5" style={{ borderColor: 'rgba(0,0,0,.08)' }} key={t.id}>
            <div style={{ fontSize: '1.6rem', color: 'var(--gold)' }}>"</div>
            <p className="testimonial-quote text-sm mt-1">{t.quote}</p>
            <div className="mt-3 flex items-center gap-3">
              <img loading="lazy" decoding="async" src={t.image} className="w-9 h-9 rounded-full object-cover" />
              <div>
                <p className="font-bold text-xs">{t.name}</p>
                <p style={{ fontSize: '.58rem', color: 'var(--warm-gray)' }}>{t.role}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
