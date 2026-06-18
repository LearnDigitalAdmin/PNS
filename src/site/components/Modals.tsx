import React from 'react';
import { useSite } from '../context/SiteContext';
import { useSimulatedSubmit } from '../../lib/useSimulatedSubmit';

function ModalShell({ id, dark, maxWidth, children }: { id: string; dark?: boolean; maxWidth?: number; children: React.ReactNode }) {
  const { isModalOpen, closeModal } = useSite();
  const open = isModalOpen(id);
  return (
    <div className={`modal ${open ? 'active' : ''}`}>
      <div className="modal-backdrop" onClick={() => closeModal(id)} />
      <div
        className={`modal-box ${dark ? 'modal-box-dark' : ''} p-6 md:p-9`}
        style={maxWidth ? { maxWidth } : undefined}
      >
        <button
          onClick={() => closeModal(id)}
          style={{ position: 'absolute', top: '.8rem', right: '.8rem', fontSize: '1.4rem', background: 'none', border: 'none', cursor: 'pointer', color: '#aaa' }}
        >
          &times;
        </button>
        {children}
      </div>
    </div>
  );
}

function SuccessNote({ message, sub }: { message: string; sub?: string }) {
  return (
    <div className="text-center py-3 fade-in-up">
      <p style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700, color: 'var(--gold)' }}>{message}</p>
      {sub && <p className="text-xs mt-1 text-gray-500">{sub}</p>}
    </div>
  );
}

function SubmitButton({ status, label }: { status: 'idle' | 'sending' | 'sent'; label: string }) {
  return (
    <button type="submit" className="btn-gold w-full" disabled={status === 'sending'}>
      {status === 'sending' ? 'Sending…' : status === 'sent' ? '✦ Sent!' : label}
    </button>
  );
}

export default function Modals() {
  const book = useSimulatedSubmit();
  const apply = useSimulatedSubmit();
  const sponsored = useSimulatedSubmit();
  const partner = useSimulatedSubmit();
  const media = useSimulatedSubmit();

  return (
    <>
      {/* BOOK A SHOOT */}
      <ModalShell id="bookModal">
        <p className="section-eyebrow mb-1">Reserve Your Session</p>
        <div className="gold-line mb-3" />
        <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.4rem', fontWeight: 800, marginBottom: '1rem' }}>Book A Shoot</h2>
        <form onSubmit={book.handleSubmit} className="space-y-3">
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
            <select className="form-input" style={{ appearance: 'none' }}>
              <option>Photography – Editorial</option>
              <option>Photography – Portraits</option>
              <option>Couple Shoot</option>
              <option>Fashion Styling</option>
              <option>Beauty – Makeup</option>
              <option>Branding Package</option>
            </select>
          </div>
          <div>
            <label className="field-label">Preferred Date</label>
            <input type="date" className="form-input" />
          </div>
          <div>
            <label className="field-label">Message</label>
            <textarea className="form-input" rows={2} placeholder="Tell us your vision..." />
          </div>
          <SubmitButton status={book.status} label="Send Booking Request" />
          {book.status === 'sent' && <SuccessNote message="✦ Booking Requested!" sub="We'll contact you within 24 hours." />}
        </form>
      </ModalShell>

      {/* APPLY TO FEATURE */}
      <ModalShell id="applyModal">
        <p className="section-eyebrow mb-1">Your Story Matters</p>
        <div className="gold-line mb-3" />
        <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.4rem', fontWeight: 800, marginBottom: '.4rem' }}>Apply To Be Featured</h2>
        <p className="text-xs mb-4" style={{ color: 'var(--mid-gray)' }}>
          Every week we select individuals, couples, and artists to feature across our platforms.
        </p>
        <form onSubmit={apply.handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="field-label">Full Name</label>
              <input type="text" className="form-input" required />
            </div>
            <div>
              <label className="field-label">Age</label>
              <input type="number" className="form-input" min={16} />
            </div>
          </div>
          <div>
            <label className="field-label">Email</label>
            <input type="email" className="form-input" required />
          </div>
          <div>
            <label className="field-label">Category</label>
            <select className="form-input" style={{ appearance: 'none' }}>
              <option>Woman of the Week</option>
              <option>Man of the Week</option>
              <option>Couple of the Week</option>
              <option>Artist Spotlight</option>
              <option>Entrepreneur Feature</option>
              <option>Fashion Feature</option>
            </select>
          </div>
          <div>
            <label className="field-label">Instagram Handle</label>
            <input type="text" className="form-input" placeholder="@yourhandle" />
          </div>
          <div>
            <label className="field-label">Your Story (3 sentences)</label>
            <textarea className="form-input" rows={3} required placeholder="Tell us who you are and why you should be featured..." />
          </div>
          <SubmitButton status={apply.status} label="Submit Application" />
          {apply.status === 'sent' && <SuccessNote message="✦ Application Received!" sub="We review all applications every Monday." />}
        </form>
      </ModalShell>

      {/* SPONSORED STORY */}
      <ModalShell id="sponsoredModal">
        <p className="section-eyebrow mb-1">Brand Partnership</p>
        <div className="gold-line mb-3" />
        <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.4rem', fontWeight: 800, marginBottom: '.4rem' }}>Book A Sponsored Story</h2>
        <form onSubmit={sponsored.handleSubmit} className="space-y-3">
          <div>
            <label className="field-label">Business Name</label>
            <input type="text" className="form-input" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="field-label">Contact Person</label>
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
            <label className="field-label">Industry</label>
            <select className="form-input" style={{ appearance: 'none' }}>
              <option>Beauty & Wellness</option>
              <option>Fashion & Apparel</option>
              <option>Food & Lifestyle</option>
              <option>Hotels & Hospitality</option>
              <option>Events & Entertainment</option>
              <option>Other</option>
            </select>
          </div>
          <div>
            <label className="field-label">Story Goals</label>
            <textarea className="form-input" rows={2} placeholder="What do you want readers to know?" />
          </div>
          <div>
            <label className="field-label">Budget Range</label>
            <select className="form-input" style={{ appearance: 'none' }}>
              <option>KES 15,000 – 30,000</option>
              <option>KES 30,000 – 60,000</option>
              <option>KES 60,000 – 100,000</option>
              <option>Above KES 100,000</option>
            </select>
          </div>
          <SubmitButton status={sponsored.status} label="Submit Interest" />
          {sponsored.status === 'sent' && <SuccessNote message="✦ We'll be in touch within 48 hours!" />}
        </form>
      </ModalShell>

      {/* BECOME A PARTNER */}
      <ModalShell id="partnerModal">
        <p className="section-eyebrow mb-1">Join The Ecosystem</p>
        <div className="gold-line mb-3" />
        <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.4rem', fontWeight: 800, marginBottom: '.4rem' }}>Become A Partner</h2>
        <form onSubmit={partner.handleSubmit} className="space-y-3">
          <div>
            <label className="field-label">Business Name</label>
            <input type="text" className="form-input" required />
          </div>
          <div>
            <label className="field-label">Email</label>
            <input type="email" className="form-input" required />
          </div>
          <div>
            <label className="field-label">Category</label>
            <select className="form-input" style={{ appearance: 'none' }}>
              <option>Salon</option>
              <option>Barber</option>
              <option>Fashion Designer</option>
              <option>Makeup Artist</option>
              <option>Tailor</option>
              <option>Hotel</option>
              <option>Wedding Planner</option>
              <option>Gym / Fitness</option>
              <option>Beauty Shop</option>
              <option>Print Shop</option>
              <option>Other</option>
            </select>
          </div>
          <div>
            <label className="field-label">About Your Business</label>
            <textarea className="form-input" rows={2} />
          </div>
          <SubmitButton status={partner.status} label="Apply For Partnership" />
          {partner.status === 'sent' && <SuccessNote message="✦ Application Received!" />}
        </form>
      </ModalShell>

      {/* MEDIA KIT */}
      <ModalShell id="mediaModal" maxWidth={380}>
        <p className="section-eyebrow mb-1">Media Kit</p>
        <div className="gold-line mb-3" />
        <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.2rem', fontWeight: 800, marginBottom: '.4rem' }}>Request Media Kit</h2>
        <form onSubmit={media.handleSubmit} className="space-y-3">
          <div>
            <label className="field-label">Email</label>
            <input type="email" className="form-input" required />
          </div>
          <div>
            <label className="field-label">Company</label>
            <input type="text" className="form-input" />
          </div>
          <SubmitButton status={media.status} label="Send Media Kit" />
          {media.status === 'sent' && <SuccessNote message="✦ Media kit on its way!" />}
        </form>
      </ModalShell>
    </>
  );
}
