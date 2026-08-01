import { useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useReaderAuth } from '../../readers/context/ReaderAuthContext';
import type { PhotographerService } from '../../partners/types';
import { MIN_BOOKING_FEE_KES, PAYSTACK_FEE_PERCENT, grossUpForPaystackFee } from '../../bookings/types';

export default function BookingRequestModal({
  photographerId,
  photographerBusinessName,
  services,
  onClose,
}: {
  photographerId: string;
  photographerBusinessName: string;
  services: PhotographerService[];
  onClose: () => void;
}) {
  const { currentUser: reader, profile: readerProfile } = useReaderAuth();
  // Only services the photographer has actually priced are bookable — the
  // amount is fixed at request time and never edited afterwards, so an
  // unpriced service has nothing to charge.
  const bookableServices = services.filter((s) => s.priceFrom >= MIN_BOOKING_FEE_KES);
  const [serviceName, setServiceName] = useState(bookableServices[0]?.name ?? '');
  const selectedService = bookableServices.find((s) => s.name === serviceName) ?? null;
  const [proposedDate, setProposedDate] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async () => {
    if (!reader || !readerProfile) return;
    setError(null);
    if (!selectedService || !proposedDate.trim()) {
      setError('Pick a service and a preferred date.');
      return;
    }
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'bookings'), {
        photographerId,
        photographerBusinessName,
        readerId: reader.uid,
        readerName: readerProfile.displayName,
        readerPhone: readerProfile.phone,
        serviceName: selectedService.name,
        proposedDate: proposedDate.trim(),
        notes: notes.trim(),
        // Fixed at request time from the photographer's own price list —
        // never edited by the photographer or the reader afterwards.
        amount: selectedService.priceFrom,
        status: 'requested',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setDone(true);
    } catch (err: any) {
      setError(err.message ?? 'Could not send your request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={onClose}
    >
      <div
        className="glass-dark p-5"
        style={{ width: '92%', maxWidth: 420 }}
        onClick={(e) => e.stopPropagation()}
      >
        {!reader ? (
          <div className="text-center space-y-3 py-2">
            <p style={{ fontSize: '.85rem', color: 'var(--warm-white)' }}>Sign in to request a booking.</p>
            <Link to="/account" className="btn-gold text-xs inline-block" style={{ padding: '.5rem 1.2rem' }}>
              Sign in
            </Link>
          </div>
        ) : done ? (
          <div className="text-center space-y-2 py-2">
            <p style={{ fontSize: '1rem', color: 'var(--gold)', fontWeight: 700 }}>Request sent ✦</p>
            <p style={{ fontSize: '.75rem', color: 'var(--warm-gray)' }}>
              {photographerBusinessName} will respond soon. Track it from your account under My Bookings.
            </p>
            <button onClick={onClose} className="btn-outline-gold text-xs mt-2" style={{ padding: '.45rem 1rem' }}>
              Close
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p style={{ fontSize: '.9rem', color: 'var(--warm-white)', fontWeight: 700 }}>
              Book {photographerBusinessName}
            </p>

            {bookableServices.length === 0 ? (
              <p style={{ fontSize: '.78rem', color: 'var(--warm-gray)' }}>
                {photographerBusinessName} hasn't set up bookable pricing yet — try the phone number on their profile
                instead.
              </p>
            ) : (
              <>
                <select
                  value={serviceName}
                  onChange={(e) => setServiceName(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-sm"
                  style={{ background: '#fff', color: '#000' }}
                >
                  {bookableServices.map((s) => (
                    <option key={s.name} value={s.name}>
                      {s.name} — KSh {s.priceFrom.toLocaleString()}
                    </option>
                  ))}
                </select>

                {selectedService && (
                  <p className="text-[.68rem]" style={{ color: 'var(--warm-gray)' }}>
                    Fixed price: KSh {selectedService.priceFrom.toLocaleString()}. You'll pay KSh{' '}
                    {grossUpForPaystackFee(selectedService.priceFrom).toLocaleString()} by M-Pesa once accepted
                    (includes a {PAYSTACK_FEE_PERCENT}% payment processing fee).
                  </p>
                )}

                <input
                  placeholder="Preferred date (e.g. 14 Aug, or 'flexible')"
                  value={proposedDate}
                  onChange={(e) => setProposedDate(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-sm"
                  style={{ background: '#fff', color: '#000' }}
                />

                <textarea
                  placeholder="Anything else the photographer should know? (optional)"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full border rounded px-3 py-2 text-sm"
                  style={{ background: '#fff', color: '#000' }}
                />

                {error && <p className="text-xs" style={{ color: '#f87171' }}>{error}</p>}

                <div className="flex gap-2">
                  <button onClick={onClose} className="flex-1 btn-outline-gold text-xs" style={{ padding: '.55rem' }}>
                    Cancel
                  </button>
                  <button onClick={submit} disabled={submitting} className="flex-1 btn-gold text-xs disabled:opacity-50" style={{ padding: '.55rem' }}>
                    {submitting ? 'Sending…' : 'Send request'}
                  </button>
                </div>
                <p className="text-[.62rem]" style={{ color: 'var(--warm-gray)' }}>
                  The price is fixed by the photographer for this service — it won't change after you send this
                  request.
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
