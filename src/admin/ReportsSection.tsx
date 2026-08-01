import { useEffect, useState } from 'react';
import { collection, deleteDoc, doc, getDoc, onSnapshot, orderBy, query, updateDoc, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAdminData } from './context/AdminDataContext';

// Reports filed before imageUrl started being captured on the report doc
// itself fall back to a live lookup of the gallery image, so old reports
// still render a thumbnail rather than just going blank.
function ReportThumbnail({ r }: { r: ReportRow }) {
  const [fallbackUrl, setFallbackUrl] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    if (r.imageUrl || r.targetType !== 'galleryImage') return;
    let cancelled = false;
    getDoc(doc(db, 'photographers', r.photographerId, 'gallery', r.targetId))
      .then((snap) => {
        if (!cancelled) setFallbackUrl(snap.exists() ? (snap.data().imageUrl ?? null) : null);
      })
      .catch(() => {
        if (!cancelled) setFallbackUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [r.imageUrl, r.targetType, r.photographerId, r.targetId]);

  if (r.targetType !== 'galleryImage' && !r.imageUrl) return null;

  const src = r.imageUrl ?? fallbackUrl;
  if (src === undefined) {
    return <div style={{ width: 72, height: 72, borderRadius: 6, background: '#f3f3f3', flexShrink: 0 }} />;
  }
  if (!src) {
    return (
      <div
        style={{ width: 72, height: 72, borderRadius: 6, background: '#f3f3f3', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <span style={{ fontSize: '.55rem', color: 'var(--warm-gray)', textAlign: 'center', padding: 4 }}>Image no longer available</span>
      </div>
    );
  }
  return (
    <a href={src} target="_blank" rel="noreferrer" style={{ flexShrink: 0 }}>
      <img src={src} alt="Reported content" style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 6 }} />
    </a>
  );
}

interface ReportRow {
  id: string;
  targetType: 'photographer' | 'galleryImage';
  targetId: string;
  photographerId: string;
  imageUrl?: string | null;
  reason: string;
  status: 'open' | 'reviewed' | 'actioned';
  createdAt: any;
}

export default function ReportsSection() {
  const { showToast, openConfirm } = useAdminData();
  const [statusFilter, setStatusFilter] = useState<'open' | 'reviewed' | 'actioned' | 'all'>('open');
  const [reports, setReports] = useState<ReportRow[]>([]);

  useEffect(() => {
    const base = collection(db, 'reports');
    const q = statusFilter === 'all' ? query(base, orderBy('createdAt', 'desc')) : query(base, where('status', '==', statusFilter), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => setReports(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))));
  }, [statusFilter]);

  const markReviewed = async (r: ReportRow) => {
    await updateDoc(doc(db, 'reports', r.id), { status: 'reviewed' });
    showToast('Marked reviewed', 'success');
  };

  const takeAction = (r: ReportRow) => {
    const isImage = r.targetType === 'galleryImage';
    openConfirm(
      isImage ? 'Remove this image?' : 'Suspend this photographer?',
      isImage
        ? 'This will permanently remove the reported portfolio image.'
        : 'This will hide the photographer from the public directory.',
      async () => {
        if (isImage) {
          await deleteDoc(doc(db, 'photographers', r.photographerId, 'gallery', r.targetId));
        } else {
          await updateDoc(doc(db, 'photographers', r.photographerId), { status: 'suspended' });
        }
        await updateDoc(doc(db, 'reports', r.id), { status: 'actioned' });
        showToast(isImage ? 'Image removed' : 'Photographer suspended', 'danger');
      }
    );
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-display" style={{ fontSize: '1.3rem', fontWeight: 800 }}>
          Reports
        </h1>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} className="text-sm px-3 py-2 rounded" style={{ border: '1px solid var(--line)' }}>
          <option value="open">Open</option>
          <option value="reviewed">Reviewed</option>
          <option value="actioned">Actioned</option>
          <option value="all">All</option>
        </select>
      </div>

      <div className="space-y-2">
        {reports.map((r) => (
          <div key={r.id} className="p-3" style={{ border: '1px solid var(--line)', borderRadius: 8 }}>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <ReportThumbnail r={r} />
                <div>
                  <p style={{ fontSize: '.8rem', fontWeight: 600 }}>
                    {r.targetType === 'photographer' ? 'Profile report' : 'Photo report'}
                  </p>
                  <p style={{ fontSize: '.72rem', color: 'var(--warm-gray)' }}>{r.reason}</p>
                  <p style={{ fontSize: '.65rem', color: 'var(--warm-gray)' }}>Photographer ID: {r.photographerId}</p>
                </div>
              </div>
              {r.status === 'open' && (
                <div className="space-x-2 whitespace-nowrap">
                  <button onClick={() => markReviewed(r)} className="btn-outline-admin" style={{ fontSize: '.68rem', padding: '.3rem .6rem' }}>
                    Mark reviewed
                  </button>
                  <button onClick={() => takeAction(r)} className="btn-danger-admin" style={{ fontSize: '.68rem', padding: '.3rem .6rem' }}>
                    {r.targetType === 'galleryImage' ? 'Remove image' : 'Suspend'}
                  </button>
                </div>
              )}
              {r.status !== 'open' && (
                <span style={{ fontSize: '.7rem', color: r.status === 'actioned' ? 'var(--danger)' : 'var(--warm-gray)' }}>{r.status}</span>
              )}
            </div>
          </div>
        ))}
        {reports.length === 0 && <p style={{ color: 'var(--warm-gray)', fontSize: '.8rem' }}>No reports in this view.</p>}
      </div>
    </div>
  );
}
