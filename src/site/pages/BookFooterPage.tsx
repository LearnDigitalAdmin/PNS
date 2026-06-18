import { Link } from 'react-router-dom';
import { useSite } from '../context/SiteContext';
import { useSimulatedSubmit } from '../../lib/useSimulatedSubmit';

export default function BookFooterPage() {
  const { goToPage, openModal } = useSite();
  const booking = useSimulatedSubmit();
  const newsletter = useSimulatedSubmit(1000);

  return (
    <div className="px-5 md:px-10 py-7 max-w-5xl mx-auto">
      <div className="grid md:grid-cols-2 gap-8 items-start">
        <div className="reveal">
          <p className="section-eyebrow mb-1">Reserve Your Session</p>
          <div className="gold-line mb-4" />
          <h2 className="section-title mb-3">Book A Service</h2>
          <p className="text-xs leading-relaxed mb-5" style={{ color: 'var(--mid-gray)' }}>
            Whether you're ready for your first editorial shoot, a beauty transformation, or a brand strategy session — we have a team ready for you.
          </p>
          <form onSubmit={booking.handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="field-label">Name</label>
                <input type="text" className="form-input" required />
              </div>
              <div>
                <label className="field-label">Phone</label>
                <input type="tel" className="form-input" />
              </div>
            </div>
            <div>
              <label className="field-label">Email</label>
              <input type="email" className="form-input" required />
            </div>
            <div>
              <label className="field-label">Service</label>
              <select className="form-input" style={{ appearance: 'none' }} required defaultValue="">
                <option value="" disabled>
                  Select a service
                </option>
                <option>Photography – Editorial</option>
                <option>Photography – Portraits</option>
                <option>Couple Shoot</option>
                <option>Beauty – Makeup</option>
                <option>Fashion Styling</option>
                <option>Branding Package</option>
                <option>Event Coverage</option>
              </select>
            </div>
            <div>
              <label className="field-label">Preferred Date</label>
              <input type="date" className="form-input" />
            </div>
            <div>
              <label className="field-label">Message</label>
              <textarea placeholder="Tell us your vision..." className="form-input" rows={2} />
            </div>
            <button type="submit" className="btn-gold w-full" disabled={booking.status === 'sending'}>
              {booking.status === 'sending' ? 'Sending…' : 'Confirm Booking Request'}
            </button>
            {booking.status === 'sent' && (
              <div className="text-center py-3 fade-in-up">
                <p style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700, fontSize: '1.05rem', color: 'var(--gold)' }}>✦ Request Received!</p>
                <p className="text-xs mt-1" style={{ color: 'var(--mid-gray)' }}>
                  We'll be in touch within 24 hours.
                </p>
              </div>
            )}
          </form>
        </div>

        <div className="reveal">
          <p className="section-eyebrow mb-1">Get In Touch</p>
          <div className="gold-line mb-4" />
          <h2 className="section-title mb-4">Contact P&amp;S</h2>
          <div className="space-y-3 mb-5">
            <div>
              <p style={{ fontSize: '.56rem', letterSpacing: '.18em', textTransform: 'uppercase', fontWeight: 600, color: 'var(--gold)' }}>Email</p>
              <p className="text-sm mt-1">hello@pandsmag.co.ke</p>
            </div>
            <div>
              <p style={{ fontSize: '.56rem', letterSpacing: '.18em', textTransform: 'uppercase', fontWeight: 600, color: 'var(--gold)' }}>Phone / WhatsApp</p>
              <p className="text-sm mt-1">+254 700 000 000</p>
            </div>
            <div>
              <p style={{ fontSize: '.56rem', letterSpacing: '.18em', textTransform: 'uppercase', fontWeight: 600, color: 'var(--gold)' }}>Location</p>
              <p className="text-sm mt-1">Westlands, Nairobi, Kenya</p>
            </div>
            <div>
              <p style={{ fontSize: '.56rem', letterSpacing: '.18em', textTransform: 'uppercase', fontWeight: 600, color: 'var(--gold)' }}>Follow Us</p>
              <div className="flex gap-4 mt-1">
                {['Instagram', 'TikTok', 'Facebook', 'X'].map((s) => (
                  <a href="#" key={s} className="text-sm font-medium hover:text-yellow-600 transition-colors">
                    {s}
                  </a>
                ))}
              </div>
            </div>
          </div>
          <div style={{ background: 'var(--charcoal)', padding: '1.4rem' }}>
            <p style={{ fontSize: '.58rem', fontWeight: 600, letterSpacing: '.15em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: '.4rem' }}>
              Join The P&amp;S Community
            </p>
            <p className="text-xs mb-3" style={{ color: 'var(--warm-gray)' }}>
              New stories every week. No noise — only beauty.
            </p>
            <form
              onSubmit={newsletter.handleSubmit}
              className="flex gap-2"
              style={newsletter.status === 'sent' ? { opacity: 0.4, pointerEvents: 'none' } : undefined}
            >
              <input type="email" placeholder="your@email.com" className="form-input dark flex-1" required />
              <button type="submit" className="btn-gold flex-shrink-0" style={{ fontSize: '.6rem', padding: '.58rem .9rem' }}>
                {newsletter.status === 'sending' ? '…' : 'Subscribe'}
              </button>
            </form>
            {newsletter.status === 'sent' && (
              <div className="mt-3 fade-in-up">
                <p style={{ fontFamily: "'Playfair Display',serif", color: 'var(--gold)', fontWeight: 700 }}>✦ Welcome to the community.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-8 pt-5" style={{ borderTop: '1px solid rgba(0,0,0,.08)' }}>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <p style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.8rem', fontWeight: 900, letterSpacing: '-.02em' }}>P&amp;S</p>
            <p style={{ fontSize: '.42rem', letterSpacing: '.28em', color: 'var(--gold)', textTransform: 'uppercase', fontWeight: 500 }}>
              Every Face Has A Story
            </p>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-1">
            <span className="text-xs cursor-pointer hover:text-yellow-600 transition-colors" onClick={() => goToPage(1)}>
              Stories
            </span>
            <span className="text-xs cursor-pointer hover:text-yellow-600 transition-colors" onClick={() => goToPage(2)}>
              Voting
            </span>
            <span className="text-xs cursor-pointer hover:text-yellow-600 transition-colors" onClick={() => goToPage(5)}>
              Partners
            </span>
            <span className="text-xs cursor-pointer hover:text-yellow-600 transition-colors" onClick={() => goToPage(7)}>
              Shop
            </span>
            <span className="text-xs cursor-pointer hover:text-yellow-600 transition-colors" onClick={() => openModal('applyModal')}>
              Apply
            </span>
            <Link to="/admin" className="text-xs cursor-pointer" style={{ color: 'rgba(201,168,76,.55)' }}>
              Editor Login
            </Link>
          </div>
          <p style={{ fontSize: '.58rem', color: 'var(--warm-gray)' }}>© 2026 P&amp;S Magazine · Nairobi, Kenya</p>
        </div>
      </div>
    </div>
  );
}
