import { useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useSite } from '../context/SiteContext';
import {
  canPerformAction,
  recordAction,
  msUntilReset,
  formatCountdown,
  validateKenyanPhone,
} from '../../lib/fingerprint';
import { subscribeToNewsletter } from '../../lib/firebaseContent';


function useBookingRateLimit() {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [remainingMs, setRemainingMs] = useState(0);

  async function refresh() {
    const ok = await canPerformAction('req_booking');
    const ms = ok ? 0 : await msUntilReset('req_booking');
    setAllowed(ok);
    setRemainingMs(ms);
  }

  return { allowed, remainingMs, refresh };
}

export default function BookFooterPage() {
  const { goToPage, openModal, siteSettings } = useSite();

  // ── Booking form state ──
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [service, setService] = useState('');
  const [prefDate, setPrefDate] = useState('');
  const [message, setMessage] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [bookingStatus, setBookingStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [bookingError, setBookingError] = useState<string | null>(null);
  const bookingGate = useBookingRateLimit();

  async function handleBooking(e: React.FormEvent) {
    e.preventDefault();
    const phoneErr = validateKenyanPhone(phone);
    if (phoneErr) { setPhoneError(phoneErr); return; }
    setPhoneError(null);

    const ok = await canPerformAction('req_booking');
    if (!ok) {
      await bookingGate.refresh();
      return;
    }

    setBookingStatus('sending');
    setBookingError(null);
    try {
      await addDoc(collection(db, 'requests', 'booking', 'items'), {
        name,
        phone: phone.replace(/\D/g, ''),
        email,
        service,
        prefDate,
        message,
        status: 'pending',
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        createdAt: serverTimestamp(),
      });
      await recordAction('req_booking');
      setBookingStatus('sent');
    } catch {
      setBookingError('Submission failed. Please try again.');
      setBookingStatus('idle');
    }
  }

  // ── Newsletter form state ──
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterStatus, setNewsletterStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [newsletterError, setNewsletterError] = useState<string | null>(null);

  async function handleNewsletter(e: React.FormEvent) {
    e.preventDefault();
    setNewsletterStatus('sending');
    setNewsletterError(null);
    try {
      await subscribeToNewsletter(newsletterEmail);
      setNewsletterStatus('sent');
      setNewsletterEmail('');
    } catch {
      setNewsletterError('Could not subscribe right now. Please try again.');
      setNewsletterStatus('idle');
    }
  }

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

          {bookingGate.allowed === false && (
            <div
              style={{
                background: '#fef3cd',
                border: '1px solid #ffc107',
                padding: '.65rem .9rem',
                fontSize: '.78rem',
                color: '#856404',
                textAlign: 'center',
                marginBottom: '.8rem',
              }}
            >
              ⏳ You've already submitted a booking request. You can submit again in{' '}
              <strong>{formatCountdown(bookingGate.remainingMs)}</strong>.
            </div>
          )}

          {bookingStatus === 'sent' ? (
            <div className="text-center py-3 fade-in-up">
              <p style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700, fontSize: '1.05rem', color: 'var(--gold)' }}>✦ Request Received!</p>
              <p className="text-xs mt-1" style={{ color: 'var(--mid-gray)' }}>
                We'll be in touch within 24 hours.
              </p>
            </div>
          ) : (
            <form onSubmit={handleBooking} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="field-label">Name</label>
                  <input type="text" className="form-input" required value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div>
                  <label className="field-label">Phone</label>
                  <input type="tel" className="form-input" placeholder="0712 345 678" value={phone} onChange={(e) => setPhone(e.target.value)} required />
                  {phoneError && <p style={{ fontSize: '.66rem', color: 'var(--danger)', marginTop: '.2rem' }}>{phoneError}</p>}
                </div>
              </div>
              <div>
                <label className="field-label">Email</label>
                <input type="email" className="form-input" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div>
                <label className="field-label">Service</label>
                <select className="form-input" style={{ appearance: 'none' }} required value={service} onChange={(e) => setService(e.target.value)}>
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
                <input type="date" className="form-input" value={prefDate} onChange={(e) => setPrefDate(e.target.value)} />
              </div>
              <div>
                <label className="field-label">Message</label>
                <textarea placeholder="Tell us your vision..." className="form-input" rows={2} value={message} onChange={(e) => setMessage(e.target.value)} />
              </div>
              {bookingError && <p style={{ fontSize: '.72rem', color: 'var(--danger)' }}>{bookingError}</p>}
              <button type="submit" className="btn-gold w-full" disabled={bookingGate.allowed === false || bookingStatus === 'sending'}>
                {bookingStatus === 'sending' ? 'Sending…' : 'Confirm Booking Request'}
              </button>
            </form>
          )}
        </div>

        <div className="reveal">
          <p className="section-eyebrow mb-1">Get In Touch</p>
          <div className="gold-line mb-4" />
          <h2 className="section-title mb-4">Contact P&amp;S</h2>
          <div className="space-y-3 mb-5">
            <div>
              <p style={{ fontSize: '.56rem', letterSpacing: '.18em', textTransform: 'uppercase', fontWeight: 600, color: 'var(--gold)' }}>Email</p>
              <p className="text-sm mt-1">{siteSettings.contactEmail}</p>
            </div>
            <div>
              <p style={{ fontSize: '.56rem', letterSpacing: '.18em', textTransform: 'uppercase', fontWeight: 600, color: 'var(--gold)' }}>Phone / WhatsApp</p>
              <p className="text-sm mt-1">{siteSettings.contactPhone}</p>
            </div>
            <div>
              <p style={{ fontSize: '.56rem', letterSpacing: '.18em', textTransform: 'uppercase', fontWeight: 600, color: 'var(--gold)' }}>Location</p>
              <p className="text-sm mt-1">{siteSettings.contactLocation}</p>
            </div>
            <div>
              <p style={{ fontSize: '.56rem', letterSpacing: '.18em', textTransform: 'uppercase', fontWeight: 600, color: 'var(--gold)' }}>Follow Us</p>
              <div className="flex gap-4 mt-1">
                {siteSettings.socialLinks.map((s) => (
                  <a href={s.url} key={s.label} className="text-sm font-medium hover:text-yellow-600 transition-colors">
                    {s.label}
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
              onSubmit={handleNewsletter}
              className="flex gap-2"
              style={newsletterStatus === 'sent' ? { opacity: 0.4, pointerEvents: 'none' } : undefined}
            >
              <input
                type="email"
                placeholder="your@email.com"
                className="form-input dark flex-1"
                required
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
              />
              <button type="submit" className="btn-gold flex-shrink-0" style={{ fontSize: '.6rem', padding: '.58rem .9rem' }}>
                {newsletterStatus === 'sending' ? '…' : 'Subscribe'}
              </button>
            </form>
            {newsletterError && <p style={{ fontSize: '.66rem', color: '#e88', marginTop: '.4rem' }}>{newsletterError}</p>}
            {newsletterStatus === 'sent' && (
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
            <Link to="/partners" className="text-xs cursor-pointer" style={{ color: 'rgba(201,168,76,.55)' }}>
              Photographer Login
            </Link>
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