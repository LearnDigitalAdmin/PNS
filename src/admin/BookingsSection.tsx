import { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Booking, BookingStatus } from '../bookings/types';

const STATUS_LABEL: Record<BookingStatus, string> = {
  requested: 'Requested',
  accepted: 'Accepted (unpaid)',
  declined: 'Declined',
  awaiting_payment: 'Awaiting payment',
  payment_failed: 'Payment failed',
  paid: 'Paid',
  completed: 'Completed',
  cancelled: 'Cancelled',
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

const FILTERS: Array<{ label: string; value: BookingStatus | 'all' }> = [
  { label: 'All', value: 'all' },
  { label: 'Needs attention', value: 'payment_failed' },
  { label: 'Paid', value: 'paid' },
  { label: 'Completed', value: 'completed' },
];

function BookingCard({ booking }: { booking: Booking }) {
  const [busy, setBusy] = useState(false);

  const markCompleted = async () => {
    setBusy(true);
    try {
      await updateDoc(doc(db, 'bookings', booking.id), { status: 'completed', updatedAt: serverTimestamp() });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="border rounded-lg p-4 space-y-1.5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">
          {booking.readerName || booking.readerPhone} → {booking.photographerBusinessName}
        </p>
        <span className="text-xs font-medium" style={{ color: STATUS_COLOR[booking.status] }}>
          {STATUS_LABEL[booking.status]}
        </span>
      </div>
      <p className="text-xs text-gray-500">
        {booking.serviceName} · {booking.proposedDate}
        {booking.amount > 0 && ` · KSh ${booking.amount.toLocaleString()}`}
      </p>
      {booking.paystackReference && (
        <p className="text-xs text-gray-400 font-mono">ref: {booking.paystackReference}</p>
      )}
      {booking.notes && <p className="text-xs text-gray-600">"{booking.notes}"</p>}

      {booking.status === 'paid' && (
        <button
          onClick={markCompleted}
          disabled={busy}
          className="text-xs bg-black text-white rounded px-3 py-1.5 mt-1 disabled:opacity-50"
        >
          Mark completed
        </button>
      )}
    </div>
  );
}

export default function BookingsSection() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<BookingStatus | 'all'>('all');

  useEffect(() => {
    const q = query(collection(db, 'bookings'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setBookings(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Booking)));
      setLoading(false);
    });
    return unsub;
  }, []);

  const filtered = filter === 'all' ? bookings : bookings.filter((b) => b.status === filter);

  const paidCount = bookings.filter((b) => b.status === 'paid').length;
  const failedCount = bookings.filter((b) => b.status === 'payment_failed').length;
  const totalPaidAmount = bookings
    .filter((b) => b.status === 'paid' || b.status === 'completed')
    .reduce((sum, b) => sum + (b.amount || 0), 0);

  return (
    <div className="p-6 max-w-3xl space-y-5">
      <div>
        <h1 className="text-xl font-semibold">Bookings</h1>
        <p className="text-sm text-gray-500 mt-1">
          {bookings.length} total · {paidCount} paid, awaiting completion · {failedCount} failed payment ·
          KSh {totalPaidAmount.toLocaleString()} in confirmed bookings
        </p>
      </div>

      <div className="flex gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`text-xs rounded-full px-3 py-1.5 border ${
              filter === f.value ? 'bg-black text-white border-black' : 'text-gray-600 border-gray-300'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : filtered.length === 0 ? (
        <div className="border rounded-lg p-8 text-center">
          <p className="text-sm text-gray-500">Nothing here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((b) => (
            <BookingCard key={b.id} booking={b} />
          ))}
        </div>
      )}
    </div>
  );
}
