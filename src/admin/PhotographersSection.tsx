import { useEffect, useState } from 'react';
import { collection, doc, onSnapshot, orderBy, query, updateDoc } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { httpsCallable } from 'firebase/functions';
import { db, storage, functions } from '../lib/firebase';
import { useAdminData } from './context/AdminDataContext';

const suspendPhotographerFn = httpsCallable<{ photographerId: string }, { ok: true }>(
  functions,
  'suspendPhotographer'
);
const reactivatePhotographerFn = httpsCallable<{ photographerId: string }, { ok: true }>(
  functions,
  'reactivatePhotographer'
);
const expelPhotographerFn = httpsCallable<{ photographerId: string }, { ok: true }>(
  functions,
  'expelPhotographer'
);

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
  coverImageUrl?: string;
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

  const removeCoverPhoto = (row: Row) => {
    openConfirm(
      'Remove this profile photo?',
      `This clears ${row.businessName || 'this photographer'}'s cover photo/logo from the directory and their portfolio. They can upload a new one at any time.`,
      async () => {
        await updateDoc(doc(db, 'photographers', row.id), { coverImageUrl: '' });
        for (const ext of ['jpg', 'png']) {
          deleteObject(ref(storage, `photographers/${row.id}/cover/cover.${ext}`)).catch(() => {});
        }
        showToast('Profile photo removed', 'danger');
      }
    );
  };

  const toggleSuspended = (row: Row) => {
    const suspending = row.status === 'active';
    openConfirm(
      suspending ? 'Suspend this photographer?' : 'Reactivate this photographer?',
      suspending
        ? `${row.businessName} will be hidden from the public directory and unable to sign in. Their stored data (profile, gallery, sessions) is not touched.`
        : `${row.businessName} will become visible on the public directory again and be able to sign in.`,
      async () => {
        // Suspend/reactivate now also flips the photographer's Firebase
        // Auth `disabled` flag, not just the Firestore status field, so
        // this has to go through a callable — see functions/src/moderation.ts.
        if (suspending) {
          await suspendPhotographerFn({ photographerId: row.id });
        } else {
          await reactivatePhotographerFn({ photographerId: row.id });
        }
        showToast(suspending ? 'Photographer suspended' : 'Photographer reactivated', suspending ? 'danger' : 'success');
      }
    );
  };

  const expelPhotographer = (row: Row) => {
    openConfirm(
      `Expel ${row.businessName || 'this photographer'}? This cannot be undone.`,
      'This permanently deletes their profile, gallery, and session data, and disables their account. Past bookings and reader records are not affected.',
      async () => {
        await expelPhotographerFn({ photographerId: row.id });
        showToast('Photographer expelled', 'danger');
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
              <th className="p-3">Photo</th>
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
                  <div
                    style={{
                      width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
                      background: 'rgba(0,0,0,.06)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    {r.coverImageUrl ? (
                      <img src={r.coverImageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ fontSize: '.7rem', color: 'var(--warm-gray)' }}>—</span>
                    )}
                  </div>
                </td>
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
                  {r.coverImageUrl && (
                    <button onClick={() => removeCoverPhoto(r)} className="btn-danger-admin" style={{ fontSize: '.68rem', padding: '.3rem .6rem' }}>
                      Remove photo
                    </button>
                  )}
                  <button
                    onClick={() => toggleSuspended(r)}
                    className={r.status === 'active' ? 'btn-danger-admin' : 'btn-outline-admin'}
                    style={{ fontSize: '.68rem', padding: '.3rem .6rem' }}
                  >
                    {r.status === 'active' ? 'Suspend' : 'Reactivate'}
                  </button>
                  <button
                    onClick={() => expelPhotographer(r)}
                    className="btn-danger-admin"
                    style={{ fontSize: '.68rem', padding: '.3rem .6rem' }}
                  >
                    Expel
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td className="p-4 text-center" colSpan={8} style={{ color: 'var(--warm-gray)' }}>
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
