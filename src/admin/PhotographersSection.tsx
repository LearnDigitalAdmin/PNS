import { useEffect, useState } from 'react';
import { collection, doc, onSnapshot, orderBy, query, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAdminData } from './context/AdminDataContext';

interface Row {
  id: string;
  businessName: string;
  ownerName: string;
  phone: string;
  county: string;
  categories: string[];
  status: 'active' | 'suspended';
  verified: boolean;
  storageUsedBytes: number;
  storageCapBytes: number;
}

function fmtBytes(b: number) {
  if (!b) return '0 MB';
  const mb = b / (1024 * 1024);
  return mb >= 1024 ? `${(mb / 1024).toFixed(2)} GB` : `${mb.toFixed(0)} MB`;
}

export default function PhotographersSection() {
  const { showToast, openConfirm } = useAdminData();
  const [rows, setRows] = useState<Row[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'photographers'), orderBy('businessName'));
    return onSnapshot(q, (snap) => setRows(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))));
  }, []);

  const filtered = rows.filter((r) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return `${r.businessName} ${r.ownerName} ${r.phone} ${r.county}`.toLowerCase().includes(s);
  });

  const toggleVerified = async (row: Row) => {
    await updateDoc(doc(db, 'photographers', row.id), { verified: !row.verified });
    showToast(row.verified ? 'Verified badge removed' : 'Photographer verified', 'success');
  };

  const toggleSuspended = (row: Row) => {
    const next = row.status === 'active' ? 'suspended' : 'active';
    openConfirm(
      next === 'suspended' ? 'Suspend this photographer?' : 'Reactivate this photographer?',
      next === 'suspended'
        ? `${row.businessName} will be hidden from the public directory immediately.`
        : `${row.businessName} will become visible on the public directory again.`,
      async () => {
        await updateDoc(doc(db, 'photographers', row.id), { status: next });
        showToast(next === 'suspended' ? 'Photographer suspended' : 'Photographer reactivated', next === 'suspended' ? 'danger' : 'success');
      }
    );
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-display" style={{ fontSize: '1.3rem', fontWeight: 800 }}>
          Photographers
        </h1>
        <input
          placeholder="Search by name, phone, county…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="text-sm px-3 py-2 rounded"
          style={{ border: '1px solid var(--line)', minWidth: 220 }}
        />
      </div>

      <div className="overflow-x-auto" style={{ border: '1px solid var(--line)', borderRadius: 8 }}>
        <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'rgba(0,0,0,.03)', textAlign: 'left' }}>
              <th className="p-3">Business</th>
              <th className="p-3">Location</th>
              <th className="p-3">Categories</th>
              <th className="p-3">Storage</th>
              <th className="p-3">Status</th>
              <th className="p-3">Verified</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} style={{ borderTop: '1px solid var(--line)' }}>
                <td className="p-3">
                  <p style={{ fontWeight: 600 }}>{r.businessName || '(unnamed)'}</p>
                  <p style={{ fontSize: '.72rem', color: 'var(--warm-gray)' }}>{r.ownerName} · {r.phone}</p>
                </td>
                <td className="p-3">{r.county}</td>
                <td className="p-3" style={{ fontSize: '.75rem' }}>{r.categories?.join(', ')}</td>
                <td className="p-3" style={{ fontSize: '.75rem' }}>
                  {fmtBytes(r.storageUsedBytes)} / {fmtBytes(r.storageCapBytes)}
                </td>
                <td className="p-3">
                  <span style={{ color: r.status === 'active' ? 'var(--success, green)' : 'var(--danger)' }}>{r.status}</span>
                </td>
                <td className="p-3">{r.verified ? '✓' : '—'}</td>
                <td className="p-3 space-x-2 whitespace-nowrap">
                  <button onClick={() => toggleVerified(r)} className="btn-outline-admin" style={{ fontSize: '.68rem', padding: '.3rem .6rem' }}>
                    {r.verified ? 'Unverify' : 'Verify'}
                  </button>
                  <button
                    onClick={() => toggleSuspended(r)}
                    className={r.status === 'active' ? 'btn-danger-admin' : 'btn-outline-admin'}
                    style={{ fontSize: '.68rem', padding: '.3rem .6rem' }}
                  >
                    {r.status === 'active' ? 'Suspend' : 'Reactivate'}
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td className="p-4 text-center" colSpan={7} style={{ color: 'var(--warm-gray)' }}>
                  No photographers found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
