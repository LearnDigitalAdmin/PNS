import { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useReaderAuth } from '../context/ReaderAuthContext';

interface CategoryRow {
  id: string;
  name: string;
  icon: string;
  status: string;
  votedToday: boolean;
  votedContestantId?: string;
}

function todayNairobi(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Nairobi' }); // YYYY-MM-DD
}

export default function VotesSection() {
  const { currentUser } = useReaderAuth();
  const [rows, setRows] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;
    const q = query(collection(db, 'votingCategories'), orderBy('order', 'asc'));
    const unsub = onSnapshot(q, async (snap) => {
      const today = todayNairobi();
      const results = await Promise.all(
        snap.docs.map(async (catDoc) => {
          const data = catDoc.data();
          const voterSnap = await getDoc(doc(db, 'votingCategories', catDoc.id, 'voters', currentUser.uid));
          const voterData = voterSnap.exists() ? voterSnap.data() : null;
          return {
            id: catDoc.id,
            name: data.name ?? '',
            icon: data.icon ?? '🗳',
            status: data.status ?? 'scheduled',
            votedToday: voterData?.lastVoteDate === today,
            votedContestantId: voterData?.votedContestantId,
          } as CategoryRow;
        })
      );
      setRows(results);
      setLoading(false);
    });
    return unsub;
  }, [currentUser]);

  return (
    <div className="p-6 max-w-2xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold">My Votes</h1>
        <p className="text-sm text-gray-500 mt-1">One vote per category, every day.</p>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.id} className="border rounded-lg p-3 flex items-center justify-between">
              <span className="text-sm">
                {r.icon} {r.name}
              </span>
              {r.status !== 'open' ? (
                <span className="text-xs text-gray-400">Not open</span>
              ) : r.votedToday ? (
                <span className="text-xs text-green-600">✓ Voted today</span>
              ) : (
                <span className="text-xs text-gray-500">Not voted today</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
