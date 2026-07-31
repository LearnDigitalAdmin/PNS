import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { usePhotographerAuth } from '../context/PhotographerAuthContext';
import type { Booking, BookingStatus } from '../../bookings/types';

const STATUS_LABEL: Record<BookingStatus, string> = {
  requested: 'New request',
  accepted: 'Accepted — awaiting payment',
  declined: 'Declined',
  awaiting_payment: 'Payment in progress',
  payment_failed: 'Payment failed',
  paid: '✓ Paid',
  completed: 'Completed',
  cancelled: 'Cancelled by client',
};

const STATUS_COLOR: Record<BookingStatus, string> = {
  requested: '#2563eb',
  accepted: '#d97706',
  declined: '#6b7280',
  awaiting_payment: '#d97706',
  payment_failed: '#dc2626',
  paid: '#16a34a',
  completed: '#16a34a',
  cancelled: '#6b7280',
};

function BookingRow({ booking, payoutReady }: { booking: Booking; payoutReady: boolean }) {
  const [amount, setAmount] = useState(booking.amount ? String(booking.amount) : '');
  const [busy, setBusy] = useState(false);

  const accept = async () => {
    if (!payoutReady) return; // belt-and-suspenders — button is already disabled in this case
    const amt = Number(amount);
    if (!amt || amt <= 0) return;
    setBusy(true);
    try {
      await updateDoc(doc(db, 'bookings', booking.id), {
        status: 'accepted',
        amount: amt,
        updatedAt: serverTimestamp(),
      });
    } finally {
      setBusy(false);
    }
  };

  const decline = async () => {
    setBusy(true);
    try {
      await updateDoc(doc(db, 'bookings', booking.id), { status: 'declined', updatedAt: serverTimestamp() });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="border rounded-lg p-4 space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">{booking.readerName || booking.readerPhone}</p>
          <p className="text-xs text-gray-500">{booking.serviceName} · wants {booking.proposedDate}</p>
        </div>
        <span className="text-xs font-medium" style={{ color: STATUS_COLOR[booking.status] }}>
          {STATUS_LABEL[booking.status]}
        </span>
      </div>

      {booking.notes && <p className="text-xs text-gray-600">"{booking.notes}"</p>}

      {booking.status === 'requested' && (
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">KSh</span>
            <input
              type="number"
              placeholder="Amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={!payoutReady}
              className="border rounded px-2 py-1 text-sm w-28 disabled:opacity-50"
            />
            <button
              onClick={accept}
              disabled={busy || !amount || !payoutReady}
              title={!payoutReady ? 'Set up payouts in Settings first' : undefined}
              className="bg-black text-white text-xs rounded px-3 py-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Accept
            </button>
            <button onClick={decline} disabled={busy} className="border text-xs rounded px-3 py-1.5 disabled:opacity-50">
              Decline
            </button>
          </div>
          {!payoutReady && (
            <p className="text-xs text-amber-700">
              <Link to="../settings" className="underline">Connect a payout account</Link> before you can accept this.
            </p>
          )}
        </div>
      )}

      {booking.amount > 0 && booking.status !== 'requested' && (
        <p className="text-xs text-gray-500">Agreed amount: KSh {booking.amount.toLocaleString()}</p>
      )}
    </div>
  );
}

export default function BookingsSection() {
  const { currentUser, profile } = usePhotographerAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;
    const q = query(
      collection(db, 'bookings'),
      where('photographerId', '==', currentUser.uid),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setBookings(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Booking)));
      setLoading(false);
    });
    return unsub;
  }, [currentUser]);

  const payoutReady = !!profile?.payoutSetupComplete;

  return (
    <div className="p-6 max-w-2xl space-y-4">
      <h1 className="text-xl font-semibold">Bookings</h1>

      {!payoutReady && (
        <div className="border rounded-lg p-3" style={{ background: '#fffbeb', borderColor: '#fde68a' }}>
          <p className="text-sm text-amber-800">
            Set up payouts in <Link to="../settings" className="underline">Settings</Link> before accepting bookings —
            that's how you get paid when a client pays by M-Pesa. You can still see and decline requests without it.
          </p>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : bookings.length === 0 ? (
        <div className="border rounded-lg p-8 text-center">
          <p className="text-sm text-gray-500">No booking requests yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map((b) => (
            <BookingRow key={b.id} booking={b} payoutReady={payoutReady} />
          ))}
        </div>
      )}
    </div>
  );
}
