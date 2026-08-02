import { useEffect, useState } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../../lib/firebase';
import { useReaderAuth } from '../context/ReaderAuthContext';
import type { Booking, BookingStatus } from '../../bookings/types';
import { grossUpForPaystackFee } from '../../bookings/types';
import BookingReportModal from '../components/BookingReportModal';

const initiatePaymentFn = httpsCallable<
  { bookingId: string; phone: string },
  { reference: string; displayText: string | null; totalCharged?: number }
>(functions, 'initiateBookingPayment');

const STATUS_LABEL: Record<BookingStatus, string> = {
  requested: 'Waiting for photographer',
  accepted: 'Accepted — ready to pay',
  declined: 'Declined',
  awaiting_payment: 'Check your phone for the M-Pesa prompt…',
  payment_failed: 'Payment failed — try again',
  paid: '✓ Paid',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

function PayBox({ booking }: { booking: Booking }) {
  const [phone, setPhone] = useState(booking.readerPhone || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const total = grossUpForPaystackFee(booking.amount);
  const fee = total - booking.amount;

  const pay = async () => {
    setError(null);
    if (!phone.trim()) {
      setError('Enter the M-Pesa number to pay from.');
      return;
    }
    setBusy(true);
    try {
      await initiatePaymentFn({ bookingId: booking.id, phone: phone.trim() });
    } catch (err: any) {
      setError(err.message ?? 'Could not start payment. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-1 pt-1">
      <p className="text-[.68rem] text-gray-500">
        KSh {booking.amount.toLocaleString()} + KSh {fee.toLocaleString()} processing fee = KSh {total.toLocaleString()}
      </p>
      <div className="flex items-center gap-2">
        <input
          placeholder="+2547XXXXXXXX"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="border rounded px-2 py-1.5 text-sm w-40"
        />
        <button onClick={pay} disabled={busy} className="bg-black text-white text-xs rounded px-3 py-1.5 disabled:opacity-50">
          {busy ? 'Sending prompt…' : `Pay KSh ${total.toLocaleString()}`}
        </button>
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>
    </div>
  );
}

function BookingRow({ booking, reporterUserId }: { booking: Booking; reporterUserId: string }) {
  const [showReport, setShowReport] = useState(false);
  const canReport = booking.status === 'paid' || booking.status === 'completed';

  return (
    <div className="border rounded-lg p-4 space-y-1.5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{booking.photographerBusinessName}</p>
        <span className="text-xs text-gray-500">{STATUS_LABEL[booking.status]}</span>
      </div>
      <p className="text-xs text-gray-500">{booking.serviceName} · {booking.proposedDate}</p>
      {booking.amount > 0 && (
        <p className="text-xs text-gray-600">
          Price: KSh {booking.amount.toLocaleString()}
          {(booking.status === 'accepted' || booking.status === 'payment_failed') && (
            <> (KSh {grossUpForPaystackFee(booking.amount).toLocaleString()} incl. processing fee)</>
          )}
        </p>
      )}
      {(booking.status === 'accepted' || booking.status === 'payment_failed') && <PayBox booking={booking} />}

      {canReport && (
        <button onClick={() => setShowReport(true)} className="text-xs text-gray-500 underline pt-1">
          Report a problem with this booking
        </button>
      )}
      {showReport && (
        <BookingReportModal
          bookingId={booking.id}
          photographerId={booking.photographerId}
          reporterUserId={reporterUserId}
          onClose={() => setShowReport(false)}
        />
      )}
    </div>
  );
}

export default function BookingsSection() {
  const { currentUser } = useReaderAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;
    const q = query(collection(db, 'bookings'), where('readerId', '==', currentUser.uid), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setBookings(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Booking)));
      setLoading(false);
    });
    return unsub;
  }, [currentUser]);

  return (
    <div className="p-6 max-w-2xl space-y-4">
      <h1 className="text-xl font-semibold">My Bookings</h1>
      {loading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : bookings.length === 0 ? (
        <div className="border rounded-lg p-8 text-center">
          <p className="text-sm text-gray-500">
            No bookings yet — request one from a photographer's portfolio in the Directory section.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map((b) => (
            <BookingRow key={b.id} booking={b} reporterUserId={currentUser!.uid} />
          ))}
        </div>
      )}
    </div>
  );
}
