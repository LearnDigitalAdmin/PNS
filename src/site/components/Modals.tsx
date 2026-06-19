import React, { useRef, useState, useEffect } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../lib/firebase';
import { useSite } from '../context/SiteContext';
import {
  canPerformAction,
  recordAction,
  msUntilReset,
  formatCountdown,
  validateKenyanPhone,
  type ActionKey,
} from '../../lib/fingerprint';

// ─── Constants ────────────────────────────────────────────────────────────────
const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];

// ─── Shared UI atoms ──────────────────────────────────────────────────────────

function ModalShell({
  id,
  dark,
  maxWidth,
  children,
}: {
  id: string;
  dark?: boolean;
  maxWidth?: number;
  children: React.ReactNode;
}) {
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
          style={{
            position: 'absolute',
            top: '.8rem',
            right: '.8rem',
            fontSize: '1.4rem',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#aaa',
          }}
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
      <p style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700, color: 'var(--gold)' }}>
        {message}
      </p>
      {sub && <p className="text-xs mt-1 text-gray-500">{sub}</p>}
    </div>
  );
}

function RateLimitNote({ ms }: { ms: number }) {
  return (
    <div
      style={{
        background: '#fef3cd',
        border: '1px solid #ffc107',
        borderRadius: 2,
        padding: '.65rem .9rem',
        fontSize: '.78rem',
        color: '#856404',
        textAlign: 'center',
        marginBottom: '.5rem',
      }}
    >
      ⏳ You've already submitted this request type. You can submit again in{' '}
      <strong>{formatCountdown(ms)}</strong>.
    </div>
  );
}

function PhoneField({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (v: string) => void;
  error: string | null;
}) {
  return (
    <div>
      <label className="field-label">
        Phone / WhatsApp <span style={{ color: 'var(--danger)' }}>*</span>
      </label>
      <input
        type="tel"
        className="form-input"
        placeholder="0712 345 678 or 0112 345 678"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
      />
      {error && (
        <p style={{ fontSize: '.68rem', color: 'var(--danger)', marginTop: '.25rem' }}>{error}</p>
      )}
      <p style={{ fontSize: '.6rem', color: 'var(--warm-gray)', marginTop: '.15rem' }}>
        Safaricom (07…) or Airtel (01…). Used for WhatsApp communication only.
      </p>
    </div>
  );
}

// ─── Image upload field ───────────────────────────────────────────────────────

interface ImageUploadResult {
  url: string;
  path: string;
}

function ImageUploadField({
  label,
  value,
  onChange,
  folder,
  required: isRequired,
}: {
  label: string;
  value: ImageUploadResult | null;
  onChange: (result: ImageUploadResult | null) => void;
  folder: string;
  required?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Only JPG, JPEG, or PNG images are allowed.');
      if (inputRef.current) inputRef.current.value = '';
      return;
    }

    // Validate size
    if (file.size > MAX_IMAGE_BYTES) {
      setError('Image must be 10 MB or smaller.');
      if (inputRef.current) inputRef.current.value = '';
      return;
    }

    setError(null);
    setUploading(true);
    setProgress(0);

    const ext = file.name.split('.').pop();
    const storagePath = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const storageRef = ref(storage, storagePath);

    const task = uploadBytesResumable(storageRef, file);
    task.on(
      'state_changed',
      (snap) => setProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
      (err) => {
        setError('Upload failed: ' + err.message);
        setUploading(false);
      },
      async () => {
        const url = await getDownloadURL(task.snapshot.ref);
        onChange({ url, path: storagePath });
        setUploading(false);
        setProgress(100);
      }
    );

    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <div>
      <label className="field-label">
        {label} <span style={{ color: 'var(--danger)' }}>{isRequired ? '*' : ''}</span>
      </label>
      <input
        ref={inputRef}
        type="file"
        accept=".jpg,.jpeg,.png,image/jpeg,image/png"
        style={{ display: 'none' }}
        onChange={handleFile}
      />
      <button
        type="button"
        className="btn-outline-gold w-full"
        style={{
          fontSize: '.72rem',
          marginBottom: '.4rem',
          justifyContent: 'flex-start',
          gap: '.6rem',
          padding: '.55rem .9rem',
          textAlign: 'left',
        }}
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
      >
        {uploading ? (
          <>
            <span
              style={{
                width: 13,
                height: 13,
                border: '2px solid rgba(0,0,0,.15)',
                borderTopColor: 'var(--gold)',
                borderRadius: '50%',
                animation: 'spin .8s linear infinite',
                display: 'inline-block',
                flexShrink: 0,
              }}
            />
            Uploading… {progress}%
          </>
        ) : (
          <>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            {value ? 'Replace Image' : 'Upload Image'}
          </>
        )}
      </button>

      {uploading && (
        <div style={{ height: 3, background: '#e8e0d4', marginBottom: '.4rem' }}>
          <div
            style={{
              height: 3,
              width: `${progress}%`,
              background: 'var(--gold)',
              transition: 'width .2s',
            }}
          />
        </div>
      )}

      {error && (
        <p style={{ fontSize: '.68rem', color: 'var(--danger)', marginBottom: '.3rem' }}>{error}</p>
      )}

      {!error && (
        <p style={{ fontSize: '.6rem', color: 'var(--warm-gray)', marginBottom: '.3rem' }}>
          JPG or PNG · Max 10 MB · 1 image only
        </p>
      )}

      {value && (
        <div style={{ position: 'relative' }}>
          <img
            src={value.url}
            alt="preview"
            style={{
              width: '100%',
              height: 130,
              objectFit: 'cover',
              display: 'block',
              border: '1px solid var(--line, #e3ded5)',
            }}
          />
          <button
            type="button"
            onClick={() => onChange(null)}
            style={{
              position: 'absolute',
              top: '.3rem',
              right: '.3rem',
              background: 'rgba(0,0,0,.6)',
              color: '#fff',
              border: 'none',
              borderRadius: 2,
              padding: '.15rem .4rem',
              fontSize: '.62rem',
              cursor: 'pointer',
            }}
          >
            Remove
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Hook: rate-limit guard ───────────────────────────────────────────────────

function useRateLimit(action: ActionKey) {
  const [allowed, setAllowed] = useState<boolean | null>(null); // null = loading
  const [remainingMs, setRemainingMs] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ok = await canPerformAction(action);
      const ms = ok ? 0 : await msUntilReset(action);
      if (!cancelled) {
        setAllowed(ok);
        setRemainingMs(ms);
      }
    })();
    return () => { cancelled = true; };
  }, [action]);

  async function refresh() {
    const ok = await canPerformAction(action);
    const ms = ok ? 0 : await msUntilReset(action);
    setAllowed(ok);
    setRemainingMs(ms);
  }

  return { allowed, remainingMs, refresh };
}

// ─── BOOK A SHOOT ─────────────────────────────────────────────────────────────

export function BookModal() {
  const { isModalOpen, closeModal } = useSite();
  const { allowed, remainingMs } = useRateLimit('req_booking');

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [service, setService] = useState('Photography – Editorial');
  const [prefDate, setPrefDate] = useState('');
  const [message, setMessage] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [serverError, setServerError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const phoneErr = validateKenyanPhone(phone);
    if (phoneErr) { setPhoneError(phoneErr); return; }
    setPhoneError(null);
    setStatus('sending');
    setServerError(null);
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
      setStatus('sent');
    } catch (err: any) {
      setServerError('Submission failed. Please try again.');
      setStatus('idle');
    }
  }

  const open = isModalOpen('bookModal');
  if (!open) return null;

  return (
    <ModalShell id="bookModal">
      <p className="section-eyebrow mb-1">Reserve Your Session</p>
      <div className="gold-line mb-3" />
      <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.4rem', fontWeight: 800, marginBottom: '1rem' }}>
        Book A Shoot
      </h2>

      {allowed === false && <RateLimitNote ms={remainingMs} />}

      {status === 'sent' ? (
        <SuccessNote message="✦ Booking Requested!" sub="We'll contact you via WhatsApp within 24 hours." />
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="field-label">Name <span style={{ color: 'var(--danger)' }}>*</span></label>
              <input type="text" className="form-input" required value={name} onChange={e => setName(e.target.value)} />
            </div>
            <PhoneField value={phone} onChange={setPhone} error={phoneError} />
          </div>
          <div>
            <label className="field-label">Email <span style={{ color: 'var(--danger)' }}>*</span></label>
            <input type="email" className="form-input" required value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="field-label">Service</label>
            <select className="form-input" style={{ appearance: 'none' }} value={service} onChange={e => setService(e.target.value)}>
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
            <input type="date" className="form-input" value={prefDate} onChange={e => setPrefDate(e.target.value)} />
          </div>
          <div>
            <label className="field-label">Message</label>
            <textarea className="form-input" rows={2} placeholder="Tell us your vision..." value={message} onChange={e => setMessage(e.target.value)} />
          </div>
          {serverError && <p style={{ fontSize: '.72rem', color: 'var(--danger)' }}>{serverError}</p>}
          <button
            type="submit"
            className="btn-gold w-full"
            disabled={allowed === false || status === 'sending'}
          >
            {status === 'sending' ? 'Sending…' : 'Send Booking Request'}
          </button>
        </form>
      )}
    </ModalShell>
  );
}

// ─── APPLY TO FEATURE ─────────────────────────────────────────────────────────

export function ApplyModal() {
  const { isModalOpen } = useSite();
  const { allowed, remainingMs } = useRateLimit('req_featured');

  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [category, setCategory] = useState('Woman of the Week');
  const [instagram, setInstagram] = useState('');
  const [detail, setDetail] = useState('');
  const [image, setImage] = useState<ImageUploadResult | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [serverError, setServerError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const phoneErr = validateKenyanPhone(phone);
    if (phoneErr) { setPhoneError(phoneErr); return; }
    setPhoneError(null);
    if (!image) { setImageError('Please upload a photo of yourself.'); return; }
    setImageError(null);
    setStatus('sending');
    setServerError(null);
    try {
      await addDoc(collection(db, 'requests', 'featured', 'items'), {
        name,
        age: age ? Number(age) : null,
        phone: phone.replace(/\D/g, ''),
        email,
        category,
        instagram,
        detail,
        image: image.url,
        imagePath: image.path,
        status: 'pending',
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        createdAt: serverTimestamp(),
      });
      await recordAction('req_featured');
      setStatus('sent');
    } catch (err: any) {
      setServerError('Submission failed. Please try again.');
      setStatus('idle');
    }
  }

  const open = isModalOpen('applyModal');
  if (!open) return null;

  return (
    <ModalShell id="applyModal">
      <p className="section-eyebrow mb-1">Your Story Matters</p>
      <div className="gold-line mb-3" />
      <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.4rem', fontWeight: 800, marginBottom: '.4rem' }}>
        Apply To Be Featured
      </h2>
      <p className="text-xs mb-4" style={{ color: 'var(--mid-gray)' }}>
        Every week we select individuals, couples, and artists to feature across our platforms.
      </p>

      {allowed === false && <RateLimitNote ms={remainingMs} />}

      {status === 'sent' ? (
        <SuccessNote message="✦ Application Received!" sub="We review all applications every Monday. We'll reach you on WhatsApp." />
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="field-label">Full Name <span style={{ color: 'var(--danger)' }}>*</span></label>
              <input type="text" className="form-input" required value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div>
              <label className="field-label">Age</label>
              <input type="number" className="form-input" min={16} value={age} onChange={e => setAge(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="field-label">Email <span style={{ color: 'var(--danger)' }}>*</span></label>
              <input type="email" className="form-input" required value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <PhoneField value={phone} onChange={setPhone} error={phoneError} />
          </div>

          <div>
            <label className="field-label">Category</label>
            <select className="form-input" style={{ appearance: 'none' }} value={category} onChange={e => setCategory(e.target.value)}>
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
            <input type="text" className="form-input" placeholder="@yourhandle" value={instagram} onChange={e => setInstagram(e.target.value)} />
          </div>

          <ImageUploadField
            label="Your Photo (required for feature consideration)"
            value={image}
            onChange={setImage}
            folder="applications/featured"
            required
          />
          {imageError && <p style={{ fontSize: '.68rem', color: 'var(--danger)', marginTop: '-.5rem' }}>{imageError}</p>}

          <div>
            <label className="field-label">Your Story <span style={{ color: 'var(--danger)' }}>*</span></label>
            <textarea
              className="form-input"
              rows={3}
              required
              placeholder="Tell us who you are and why you should be featured..."
              value={detail}
              onChange={e => setDetail(e.target.value)}
            />
          </div>
          {serverError && <p style={{ fontSize: '.72rem', color: 'var(--danger)' }}>{serverError}</p>}
          <button
            type="submit"
            className="btn-gold w-full"
            disabled={allowed === false || status === 'sending'}
          >
            {status === 'sending' ? 'Sending…' : 'Submit Application'}
          </button>
        </form>
      )}
    </ModalShell>
  );
}

// ─── SPONSORED STORY ─────────────────────────────────────────────────────────

export function SponsoredModal() {
  const { isModalOpen } = useSite();
  const { allowed, remainingMs } = useRateLimit('req_sponsored');

  const [business, setBusiness] = useState('');
  const [contact, setContact] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [industry, setIndustry] = useState('Beauty & Wellness');
  const [goals, setGoals] = useState('');
  const [budget, setBudget] = useState('KES 15,000 – 30,000');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [serverError, setServerError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const phoneErr = validateKenyanPhone(phone);
    if (phoneErr) { setPhoneError(phoneErr); return; }
    setPhoneError(null);
    setStatus('sending');
    setServerError(null);
    try {
      await addDoc(collection(db, 'requests', 'sponsored', 'items'), {
        business,
        contact,
        phone: phone.replace(/\D/g, ''),
        email,
        industry,
        goals,
        budget,
        status: 'pending',
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        createdAt: serverTimestamp(),
      });
      await recordAction('req_sponsored');
      setStatus('sent');
    } catch (err: any) {
      setServerError('Submission failed. Please try again.');
      setStatus('idle');
    }
  }

  const open = isModalOpen('sponsoredModal');
  if (!open) return null;

  return (
    <ModalShell id="sponsoredModal">
      <p className="section-eyebrow mb-1">Brand Partnership</p>
      <div className="gold-line mb-3" />
      <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.4rem', fontWeight: 800, marginBottom: '.4rem' }}>
        Book A Sponsored Story
      </h2>

      {allowed === false && <RateLimitNote ms={remainingMs} />}

      {status === 'sent' ? (
        <SuccessNote message="✦ We'll be in touch within 48 hours!" sub="Expect a WhatsApp message from our team." />
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="field-label">Business Name <span style={{ color: 'var(--danger)' }}>*</span></label>
            <input type="text" className="form-input" required value={business} onChange={e => setBusiness(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="field-label">Contact Person <span style={{ color: 'var(--danger)' }}>*</span></label>
              <input type="text" className="form-input" required value={contact} onChange={e => setContact(e.target.value)} />
            </div>
            <PhoneField value={phone} onChange={setPhone} error={phoneError} />
          </div>
          <div>
            <label className="field-label">Email <span style={{ color: 'var(--danger)' }}>*</span></label>
            <input type="email" className="form-input" required value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="field-label">Industry</label>
            <select className="form-input" style={{ appearance: 'none' }} value={industry} onChange={e => setIndustry(e.target.value)}>
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
            <textarea className="form-input" rows={2} placeholder="What do you want readers to know?" value={goals} onChange={e => setGoals(e.target.value)} />
          </div>
          <div>
            <label className="field-label">Budget Range</label>
            <select className="form-input" style={{ appearance: 'none' }} value={budget} onChange={e => setBudget(e.target.value)}>
              <option>KES 15,000 – 30,000</option>
              <option>KES 30,000 – 60,000</option>
              <option>KES 60,000 – 100,000</option>
              <option>Above KES 100,000</option>
            </select>
          </div>
          {serverError && <p style={{ fontSize: '.72rem', color: 'var(--danger)' }}>{serverError}</p>}
          <button
            type="submit"
            className="btn-gold w-full"
            disabled={allowed === false || status === 'sending'}
          >
            {status === 'sending' ? 'Sending…' : 'Submit Interest'}
          </button>
        </form>
      )}
    </ModalShell>
  );
}

// ─── BECOME A PARTNER ─────────────────────────────────────────────────────────

export function PartnerModal() {
  const { isModalOpen } = useSite();
  const { allowed, remainingMs } = useRateLimit('req_partnership');

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [categ, setCateg] = useState('Salon');
  const [about, setAbout] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [serverError, setServerError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const phoneErr = validateKenyanPhone(phone);
    if (phoneErr) { setPhoneError(phoneErr); return; }
    setPhoneError(null);
    setStatus('sending');
    setServerError(null);
    try {
      await addDoc(collection(db, 'requests', 'partnership', 'items'), {
        business: name,
        phone: phone.replace(/\D/g, ''),
        email,
        category: categ,
        about,
        status: 'pending',
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        createdAt: serverTimestamp(),
      });
      await recordAction('req_partnership');
      setStatus('sent');
    } catch (err: any) {
      setServerError('Submission failed. Please try again.');
      setStatus('idle');
    }
  }

  const open = isModalOpen('partnerModal');
  if (!open) return null;

  return (
    <ModalShell id="partnerModal">
      <p className="section-eyebrow mb-1">Join The Ecosystem</p>
      <div className="gold-line mb-3" />
      <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.4rem', fontWeight: 800, marginBottom: '.4rem' }}>
        Become A Partner
      </h2>

      {allowed === false && <RateLimitNote ms={remainingMs} />}

      {status === 'sent' ? (
        <SuccessNote message="✦ Application Received!" sub="Our partnership team will WhatsApp you shortly." />
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="field-label">Business Name <span style={{ color: 'var(--danger)' }}>*</span></label>
            <input type="text" className="form-input" required value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="field-label">Email <span style={{ color: 'var(--danger)' }}>*</span></label>
              <input type="email" className="form-input" required value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <PhoneField value={phone} onChange={setPhone} error={phoneError} />
          </div>
          <div>
            <label className="field-label">Category</label>
            <select className="form-input" style={{ appearance: 'none' }} value={categ} onChange={e => setCateg(e.target.value)}>
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
            <textarea className="form-input" rows={2} value={about} onChange={e => setAbout(e.target.value)} />
          </div>
          {serverError && <p style={{ fontSize: '.72rem', color: 'var(--danger)' }}>{serverError}</p>}
          <button
            type="submit"
            className="btn-gold w-full"
            disabled={allowed === false || status === 'sending'}
          >
            {status === 'sending' ? 'Sending…' : 'Apply For Partnership'}
          </button>
        </form>
      )}
    </ModalShell>
  );
}

// ─── MEDIA KIT ───────────────────────────────────────────────────────────────

export function MediaModal() {
  const { isModalOpen } = useSite();
  const { allowed, remainingMs } = useRateLimit('req_mediaKit');

  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [serverError, setServerError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const phoneErr = validateKenyanPhone(phone);
    if (phoneErr) { setPhoneError(phoneErr); return; }
    setPhoneError(null);
    setStatus('sending');
    setServerError(null);
    try {
      await addDoc(collection(db, 'requests', 'mediaKit', 'items'), {
        email,
        company,
        phone: phone.replace(/\D/g, ''),
        status: 'pending',
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        createdAt: serverTimestamp(),
      });
      await recordAction('req_mediaKit');
      setStatus('sent');
    } catch (err: any) {
      setServerError('Submission failed. Please try again.');
      setStatus('idle');
    }
  }

  const open = isModalOpen('mediaModal');
  if (!open) return null;

  return (
    <ModalShell id="mediaModal" maxWidth={380}>
      <p className="section-eyebrow mb-1">Media Kit</p>
      <div className="gold-line mb-3" />
      <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.2rem', fontWeight: 800, marginBottom: '.4rem' }}>
        Request Media Kit
      </h2>

      {allowed === false && <RateLimitNote ms={remainingMs} />}

      {status === 'sent' ? (
        <SuccessNote message="✦ Media kit on its way!" sub="We'll send it via WhatsApp & email." />
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="field-label">Email <span style={{ color: 'var(--danger)' }}>*</span></label>
            <input type="email" className="form-input" required value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="field-label">Company</label>
            <input type="text" className="form-input" value={company} onChange={e => setCompany(e.target.value)} />
          </div>
          <PhoneField value={phone} onChange={setPhone} error={phoneError} />
          {serverError && <p style={{ fontSize: '.72rem', color: 'var(--danger)' }}>{serverError}</p>}
          <button
            type="submit"
            className="btn-gold w-full"
            disabled={allowed === false || status === 'sending'}
          >
            {status === 'sending' ? 'Sending…' : 'Send Media Kit'}
          </button>
        </form>
      )}
    </ModalShell>
  );
}

// ─── Root export (renders all modals) ────────────────────────────────────────

export default function Modals() {
  return (
    <>
      <BookModal />
      <ApplyModal />
      <SponsoredModal />
      <PartnerModal />
      <MediaModal />
    </>
  );
}