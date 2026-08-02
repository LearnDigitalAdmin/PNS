import { useEffect, useState } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { usePhotographerAuth } from '../context/PhotographerAuthContext';
import type { Booking } from '../../bookings/types';

// A booking settled via the shared paystackCallback webhook, which writes
// these fields onto the booking doc once a payment is confirmed (see
// handlePNSBookingPayment in the shared project's index.ts). They're
// optional on the shared Booking type since older/unpaid bookings won't
// have them yet.
interface PaidBooking extends Booking {
  baseAmount?: number;
  platformFeeAmount?: number;
  photographerNetAmount?: number;
  paymentChannel?: string;
  paidAt?: any;
}

interface WeekBucket {
  weekKey: string; // ISO year-week, e.g. "2026-W05"
  weekLabel: string; // human-readable range
  weekStart: Date;
  bookings: PaidBooking[];
  totalNet: number;
  totalPlatformFee: number;
  byChannel: Record<string, { count: number; net: number }>;
}

// ISO week (Mon–Sun) key + the Monday that starts it, so weeks sort and
// group consistently regardless of which day of the week "today" falls on.
function isoWeekInfo(date: Date): { key: string; start: Date } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7; // Mon=1 ... Sun=7
  d.setUTCDate(d.getUTCDate() - day + 1); // back up to Monday
  const start = new Date(d);

  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);

  return { key: `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`, start };
}

function formatWeekLabel(start: Date): string {
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const fmt = (d: Date) => d.toLocaleDateString('en-KE', { day: 'numeric', month: 'short' });
  return `${fmt(start)} – ${fmt(end)}`;
}

function channelLabel(channel: string | undefined): string {
  if (!channel) return 'Unknown';
  if (channel.toLowerCase().includes('mobile_money') || channel.toLowerCase().includes('mpesa')) return 'M-Pesa';
  if (channel.toLowerCase().includes('card')) return 'Card (Paystack)';
  return channel;
}

export default function IncomeSection() {
  const { currentUser } = usePhotographerAuth();
  const [bookings, setBookings] = useState<PaidBooking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;
    // status 'completed' is included alongside 'paid' — marking a booking
    // fulfilled doesn't undo the fact that it was paid for and earned.
    const q = query(
      collection(db, 'bookings'),
      where('photographerId', '==', currentUser.uid),
      where('status', 'in', ['paid', 'completed']),
      orderBy('paidAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setBookings(snap.docs.map((d) => ({ id: d.id, ...d.data() } as PaidBooking)));
      setLoading(false);
    });
    return unsub;
  }, [currentUser]);

  const weeks: WeekBucket[] = [];
  const weekIndex = new Map<string, WeekBucket>();

  for (const b of bookings) {
    const paidAtDate: Date | null = b.paidAt?.toDate ? b.paidAt.toDate() : null;
    if (!paidAtDate) continue; // shouldn't happen for paid/completed bookings, but don't crash the tab if it does

    const { key, start } = isoWeekInfo(paidAtDate);
    let bucket = weekIndex.get(key);
    if (!bucket) {
      bucket = {
        weekKey: key,
        weekLabel: formatWeekLabel(start),
        weekStart: start,
        bookings: [],
        totalNet: 0,
        totalPlatformFee: 0,
        byChannel: {},
      };
      weekIndex.set(key, bucket);
      weeks.push(bucket);
    }

    const net = b.photographerNetAmount ?? 0;
    const fee = b.platformFeeAmount ?? 0;
    const channel = channelLabel(b.paymentChannel);

    bucket.bookings.push(b);
    bucket.totalNet += net;
    bucket.totalPlatformFee += fee;
    bucket.byChannel[channel] = bucket.byChannel[channel] || { count: 0, net: 0 };
    bucket.byChannel[channel].count += 1;
    bucket.byChannel[channel].net += net;
  }

  weeks.sort((a, b) => b.weekStart.getTime() - a.weekStart.getTime());

  const grandTotalNet = weeks.reduce((sum, w) => sum + w.totalNet, 0);

  return (
    <div className="p-6 max-w-3xl space-y-5">
      <div>
        <h1 className="text-xl font-semibold">Income</h1>
        <p className="text-sm text-gray-500 mt-1">
          Paid bookings grouped by week. KSh {grandTotalNet.toLocaleString()} earned across {bookings.length} paid
          booking{bookings.length === 1 ? '' : 's'}.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : weeks.length === 0 ? (
        <div className="border rounded-lg p-8 text-center">
          <p className="text-sm text-gray-500">No paid bookings yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {weeks.map((w) => (
            <div key={w.weekKey} className="border rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <p className="text-sm font-medium">{w.weekLabel}</p>
                <p className="text-sm font-semibold">KSh {w.totalNet.toLocaleString()}</p>
              </div>
              <p className="text-xs text-gray-500">
                {w.bookings.length} booking{w.bookings.length === 1 ? '' : 's'} · platform fee KSh{' '}
                {w.totalPlatformFee.toLocaleString()}
              </p>
              <div className="flex flex-wrap gap-3 pt-1">
                {Object.entries(w.byChannel).map(([channel, stats]) => (
                  <span key={channel} className="text-xs text-gray-600 bg-gray-50 border rounded-full px-2.5 py-1">
                    {channel}: {stats.count} · KSh {stats.net.toLocaleString()}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
