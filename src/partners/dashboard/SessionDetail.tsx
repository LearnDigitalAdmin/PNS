import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { httpsCallable } from 'firebase/functions';
import { db, storage, functions } from '../../lib/firebase';
import { usePhotographerAuth } from '../context/PhotographerAuthContext';
import {
  matchCameraNumberToEntry,
  parseCameraNumber,
  inferContentType,
  type SessionClientEntry,
  type SessionImage,
} from '../types';

type DeliverResult =
  | { status: 'delivered'; delivered: number; skippedOverCap: number }
  | { status: 'no-account-yet' }
  | { status: 'no-images' };

const deliverSessionToReaderFn = httpsCallable<
  { sessionId: string; clientEntryId: string },
  DeliverResult
>(functions, 'deliverSessionToReader');

function LazyThumb({ storagePath, contentType }: { storagePath: string; contentType?: 'image' | 'pdf' }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    getDownloadURL(ref(storage, storagePath))
      .then((u) => !cancelled && setUrl(u))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [storagePath]);

  if (!url) {
    return <div className="w-full h-full bg-gray-100 flex items-center justify-center text-[10px] text-gray-400">…</div>;
  }
  if (contentType === 'pdf') {
    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="w-full h-full bg-gray-100 flex flex-col items-center justify-center gap-0.5 text-gray-500"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <path d="M14 2v6h6" />
        </svg>
        <span className="text-[9px]">PDF</span>
      </a>
    );
  }
  return <img src={url} className="w-full h-full object-cover" />;
}

export default function SessionDetail() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { currentUser } = usePhotographerAuth();

  const [entries, setEntries] = useState<SessionClientEntry[]>([]);
  const [images, setImages] = useState<SessionImage[]>([]);
  const [sessionStatus, setSessionStatus] = useState<string>('collecting');

  const [entryPhone, setEntryPhone] = useState('');
  const [entryName, setEntryName] = useState('');
  const [rangeStart, setRangeStart] = useState('');
  const [rangeEnd, setRangeEnd] = useState('');
  const [addingEntry, setAddingEntry] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');

  const [deliveringId, setDeliveringId] = useState<string | null>(null);
  const [deliveryMessages, setDeliveryMessages] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!currentUser || !sessionId) return;
    const unsubs = [
      onSnapshot(doc(db, 'photographers', currentUser.uid, 'sessions', sessionId), (snap) => {
        setSessionStatus((snap.data() as any)?.status ?? 'collecting');
      }),
      onSnapshot(
        query(collection(db, 'photographers', currentUser.uid, 'sessions', sessionId, 'clientEntries'), orderBy('imageRangeStart')),
        (snap) => setEntries(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })))
      ),
      onSnapshot(
        query(collection(db, 'photographers', currentUser.uid, 'sessions', sessionId, 'images'), orderBy('cameraFileName')),
        (snap) => setImages(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })))
      ),
    ];
    return () => unsubs.forEach((u) => u());
  }, [currentUser, sessionId]);

  const addEntry = async () => {
    if (!currentUser || !sessionId) return;
    const start = parseInt(rangeStart, 10);
    const end = parseInt(rangeEnd, 10);
    if (!entryPhone.trim() || isNaN(start) || isNaN(end) || end < start) return;
    setAddingEntry(true);
    try {
      const ref_ = doc(collection(db, 'photographers', currentUser.uid, 'sessions', sessionId, 'clientEntries'));
      await setDoc(ref_, {
        clientPhone: entryPhone.trim(),
        clientName: entryName.trim(),
        imageRangeStart: start,
        imageRangeEnd: end,
        deliveryStatus: 'pending',
      });
      setEntryPhone('');
      setEntryName('');
      setRangeStart('');
      setRangeEnd('');
    } finally {
      setAddingEntry(false);
    }
  };

  const handleBulkUpload = async (files: FileList | null) => {
    if (!files || !currentUser || !sessionId) return;
    setUploading(true);
    try {
      const list = Array.from(files);
      for (let i = 0; i < list.length; i++) {
        const file = list[i];
        setUploadProgress(`${i + 1} / ${list.length}`);
        const cameraNumber = parseCameraNumber(file.name);
        const matchedEntry = matchCameraNumberToEntry(cameraNumber, entries);
        const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';

        const imageDocRef = doc(collection(db, 'photographers', currentUser.uid, 'sessions', sessionId, 'images'));
        const storagePath = `photographers/${currentUser.uid}/sessions/${sessionId}/${imageDocRef.id}/original.${ext}`;

        await setDoc(imageDocRef, {
          cameraFileName: file.name,
          cameraNumber,
          matchedEntryId: matchedEntry?.id ?? null,
          matchType: matchedEntry ? 'auto' : 'unmatched',
          contentType: inferContentType(file.name),
          sizeBytes: file.size,
          storageUrl: '',
          status: 'uploading',
          uploadedAt: serverTimestamp(),
        });

        await uploadBytes(ref(storage, storagePath), file);
      }
      if (sessionId) {
        await updateDoc(doc(db, 'photographers', currentUser.uid, 'sessions', sessionId), { status: 'matched' });
      }
    } finally {
      setUploading(false);
      setUploadProgress('');
    }
  };

  const reassign = async (imageId: string, entryId: string | null) => {
    if (!currentUser || !sessionId) return;
    await updateDoc(doc(db, 'photographers', currentUser.uid, 'sessions', sessionId, 'images', imageId), {
      matchedEntryId: entryId,
      matchType: entryId ? 'manual' : 'unmatched',
    });
  };

  const markReadyForDelivery = async () => {
    if (!currentUser || !sessionId) return;
    await updateDoc(doc(db, 'photographers', currentUser.uid, 'sessions', sessionId), { status: 'matched' });
  };

  const deliverToEntry = async (entryId: string) => {
    if (!sessionId) return;
    setDeliveringId(entryId);
    setDeliveryMessages((prev) => ({ ...prev, [entryId]: '' }));
    try {
      const result = await deliverSessionToReaderFn({ sessionId, clientEntryId: entryId });
      const data = result.data;
      if (data.status === 'no-account-yet') {
        setDeliveryMessages((prev) => ({
          ...prev,
          [entryId]: "This client doesn't have a P&S account yet with this phone number — they can create one to receive their photos.",
        }));
      } else if (data.status === 'no-images') {
        setDeliveryMessages((prev) => ({ ...prev, [entryId]: 'No matched photos to deliver.' }));
      } else {
        const extra = data.skippedOverCap > 0 ? ` (${data.skippedOverCap} skipped — client is out of storage)` : '';
        setDeliveryMessages((prev) => ({ ...prev, [entryId]: `Delivered ${data.delivered} photo${data.delivered !== 1 ? 's' : ''}.${extra}` }));
      }
    } catch (err: any) {
      setDeliveryMessages((prev) => ({ ...prev, [entryId]: err.message ?? 'Delivery failed. Please try again.' }));
    } finally {
      setDeliveringId(null);
    }
  };

  const grouped = useMemo(() => {
    const byEntry = new Map<string, SessionImage[]>();
    const unmatched: SessionImage[] = [];
    for (const img of images) {
      if (img.matchedEntryId) {
        const arr = byEntry.get(img.matchedEntryId) ?? [];
        arr.push(img);
        byEntry.set(img.matchedEntryId, arr);
      } else {
        unmatched.push(img);
      }
    }
    return { byEntry, unmatched };
  }, [images]);

  return (
    <div className="p-6 max-w-4xl space-y-6">
      <h1 className="text-xl font-semibold">Session detail</h1>

      <div className="border rounded-lg p-4 space-y-3">
        <p className="text-sm font-medium">Client entries (phone ↔ camera image range)</p>
        <div className="flex flex-wrap gap-2">
          <input placeholder="+2547XXXXXXXX" value={entryPhone} onChange={(e) => setEntryPhone(e.target.value)} className="border rounded px-2 py-1.5 text-sm w-40" />
          <input placeholder="Name (optional)" value={entryName} onChange={(e) => setEntryName(e.target.value)} className="border rounded px-2 py-1.5 text-sm w-40" />
          <input placeholder="From #" type="number" value={rangeStart} onChange={(e) => setRangeStart(e.target.value)} className="border rounded px-2 py-1.5 text-sm w-24" />
          <input placeholder="To #" type="number" value={rangeEnd} onChange={(e) => setRangeEnd(e.target.value)} className="border rounded px-2 py-1.5 text-sm w-24" />
          <button onClick={addEntry} disabled={addingEntry} className="bg-black text-white text-sm rounded px-3 py-1.5 disabled:opacity-50">
            Add
          </button>
        </div>
        <div className="divide-y">
          {entries.map((e) => (
            <div key={e.id} className="flex items-center justify-between py-2 text-sm">
              <span>
                {e.clientName ? `${e.clientName} · ` : ''}
                {e.clientPhone}
              </span>
              <span className="text-gray-500">
                #{e.imageRangeStart}–{e.imageRangeEnd} · {grouped.byEntry.get(e.id)?.length ?? 0} matched
              </span>
            </div>
          ))}
          {entries.length === 0 && <p className="text-sm text-gray-500 py-2">No client entries yet — add one before uploading photos.</p>}
        </div>
      </div>

      <div className="border rounded-lg p-4 space-y-2">
        <p className="text-sm font-medium">Bulk upload photos</p>
        <p className="text-xs text-gray-500">
          Filenames are matched by their camera number (e.g. DSC2051.JPG → 2051) against the ranges above.
        </p>
        <input type="file" accept="image/jpeg,image/png,application/pdf" multiple onChange={(e) => handleBulkUpload(e.target.files)} disabled={uploading} className="text-sm" />
        {uploading && <p className="text-xs text-gray-500">Uploading {uploadProgress}…</p>}
      </div>

      {images.length > 0 && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Review ({images.length} photos)</p>
            <button onClick={markReadyForDelivery} className="text-sm bg-black text-white rounded px-3 py-1.5">
              Mark matching complete
            </button>
          </div>

          {entries.map((e) => {
            const imgs = grouped.byEntry.get(e.id) ?? [];
            if (imgs.length === 0) return null;
            return (
              <div key={e.id}>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-xs font-medium text-gray-600">
                    {e.clientName || e.clientPhone} — {imgs.length} photo{imgs.length !== 1 ? 's' : ''}
                    {e.deliveryStatus === 'delivered' && <span className="text-green-600 ml-1.5">✓ Delivered</span>}
                  </p>
                  <button
                    onClick={() => deliverToEntry(e.id)}
                    disabled={deliveringId === e.id}
                    className="text-xs border rounded px-2.5 py-1 disabled:opacity-50"
                  >
                    {deliveringId === e.id ? 'Delivering…' : e.deliveryStatus === 'delivered' ? 'Re-deliver' : 'Deliver to client'}
                  </button>
                </div>
                {deliveryMessages[e.id] && (
                  <p className="text-xs text-gray-500 mb-1.5">{deliveryMessages[e.id]}</p>
                )}
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {imgs.map((img) => (
                    <div key={img.id} className="aspect-square rounded overflow-hidden border">
                      <LazyThumb storagePath={img.storageUrl || ''} contentType={img.contentType} />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {grouped.unmatched.length > 0 && (
            <div>
              <p className="text-xs font-medium text-red-600 mb-1.5">Unmatched — assign manually</p>
              <div className="space-y-2">
                {grouped.unmatched.map((img) => (
                  <div key={img.id} className="flex items-center gap-3 border rounded p-2">
                    <div className="w-14 h-14 rounded overflow-hidden border flex-shrink-0">
                      <LazyThumb storagePath={img.storageUrl || ''} contentType={img.contentType} />
                    </div>
                    <span className="text-xs text-gray-600 flex-1">{img.cameraFileName}</span>
                    <select onChange={(e) => reassign(img.id, e.target.value || null)} defaultValue="" className="text-xs border rounded px-2 py-1">
                      <option value="">Assign to…</option>
                      {entries.map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.clientName || e.clientPhone}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
