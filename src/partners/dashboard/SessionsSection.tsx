import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, doc, onSnapshot, orderBy, query, serverTimestamp, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { usePhotographerAuth } from '../context/PhotographerAuthContext';
import type { ShootSession } from '../types';

export default function SessionsSection() {
  const { currentUser } = usePhotographerAuth();
  const [sessions, setSessions] = useState<ShootSession[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | ShootSession['status']>('all');
  const [dateFilter, setDateFilter] = useState('');

  const [showCreate, setShowCreate] = useState(false);
  const [label, setLabel] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [location, setLocation] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    const q = query(collection(db, 'photographers', currentUser.uid, 'sessions'), orderBy('date', 'desc'));
    return onSnapshot(q, (snap) => setSessions(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))));
  }, [currentUser]);

  const filtered = sessions.filter((s) => {
    if (statusFilter !== 'all' && s.status !== statusFilter) return false;
    if (dateFilter) {
      const d = (s.date as any as Timestamp)?.toDate?.() ?? new Date(s.date as any);
      if (d.toISOString().slice(0, 10) !== dateFilter) return false;
    }
    return true;
  });

  const createSession = async () => {
    if (!currentUser || !date) return;
    setCreating(true);
    try {
      const ref = doc(collection(db, 'photographers', currentUser.uid, 'sessions'));
      await setDoc(ref, {
        label: label.trim() || 'Untitled shoot',
        date: Timestamp.fromDate(new Date(date)),
        location: location.trim(),
        status: 'collecting',
        createdAt: serverTimestamp(),
      });
      setLabel('');
      setLocation('');
      setShowCreate(false);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Sessions</h1>
        <button onClick={() => setShowCreate((v) => !v)} className="bg-black text-white text-sm rounded px-4 py-2">
          {showCreate ? 'Cancel' : '+ New session'}
        </button>
      </div>

      <p className="text-sm text-gray-600">
        Log a client's phone number against their camera image number range for a shoot, and images upload here
        will auto-match to the right client by filename.
      </p>

      {showCreate && (
        <div className="border rounded-lg p-4 space-y-3">
          <input placeholder="Label (e.g. Sarah's Bridal Shoot)" value={label} onChange={(e) => setLabel(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" />
          <div className="flex gap-3">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="flex-1 border rounded px-3 py-2 text-sm" />
            <input placeholder="Location" value={location} onChange={(e) => setLocation(e.target.value)} className="flex-1 border rounded px-3 py-2 text-sm" />
          </div>
          <button onClick={createSession} disabled={creating} className="bg-black text-white text-sm rounded px-4 py-2 disabled:opacity-50">
            {creating ? 'Creating…' : 'Create session'}
          </button>
        </div>
      )}

      <div className="flex gap-3 items-center">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} className="border rounded px-2 py-1.5 text-sm">
          <option value="all">All statuses</option>
          <option value="collecting">Collecting</option>
          <option value="matched">Matched</option>
          <option value="delivered">Delivered</option>
        </select>
        <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="border rounded px-2 py-1.5 text-sm" />
        {dateFilter && (
          <button onClick={() => setDateFilter('')} className="text-xs text-gray-500">
            Clear date
          </button>
        )}
      </div>

      <div className="divide-y border rounded-lg">
        {filtered.map((s) => {
          const d = (s.date as any as Timestamp)?.toDate?.() ?? new Date(s.date as any);
          return (
            <Link key={s.id} to={s.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
              <div>
                <p className="text-sm font-medium">{s.label}</p>
                <p className="text-xs text-gray-500">
                  {d.toLocaleDateString()} {s.location && `· ${s.location}`}
                </p>
              </div>
              <span
                className={`text-xs px-2 py-1 rounded-full ${
                  s.status === 'delivered' ? 'bg-green-100 text-green-700' : s.status === 'matched' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                }`}
              >
                {s.status}
              </span>
            </Link>
          );
        })}
        {filtered.length === 0 && <p className="text-sm text-gray-500 px-4 py-6">No sessions match this filter.</p>}
      </div>
    </div>
  );
}
