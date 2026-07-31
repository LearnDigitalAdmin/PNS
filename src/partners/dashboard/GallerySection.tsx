import { useEffect, useRef, useState } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  deleteDoc,
  updateDoc,
} from 'firebase/firestore';
import { ref, uploadBytes, deleteObject } from 'firebase/storage';
import { db, storage } from '../../lib/firebase';
import { usePhotographerAuth } from '../context/PhotographerAuthContext';
import { PHOTOGRAPHER_CATEGORIES, type GalleryImage } from '../types';
import StorageGauge from './StorageGauge';
import BuyStorageModal from '../../shared/BuyStorageModal';

export default function GallerySection() {
  const { currentUser, profile } = usePhotographerAuth();
  const [images, setImages] = useState<(GalleryImage & { status?: string })[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showBuyStorage, setShowBuyStorage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!currentUser) return;
    const q = query(collection(db, 'photographers', currentUser.uid, 'gallery'), orderBy('uploadedAt', 'desc'));
    return onSnapshot(q, (snap) => {
      setImages(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
    });
  }, [currentUser]);

  const handleFiles = async (files: FileList | null) => {
    if (!files || !currentUser) return;
    setUploadError(null);
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        if (!/^image\/(jpeg|jpg|png)$/.test(file.type)) {
          setUploadError('Only JPEG/PNG images are supported.');
          continue;
        }
        if (file.size > 15 * 1024 * 1024) {
          setUploadError('Each image must be under 15 MB.');
          continue;
        }
        const ext = file.type === 'image/png' ? 'png' : 'jpg';
        const imageDocRef = doc(collection(db, 'photographers', currentUser.uid, 'gallery'));
        const storagePath = `photographer-private/${currentUser.uid}/gallery/${imageDocRef.id}/original.${ext}`;

        // Firestore doc first so the UI can show a "processing" tile
        // immediately; the Cloud Function fills in imageUrl/thumbUrl once
        // the watermarked copies exist.
        await setDoc(imageDocRef, {
          caption: '',
          category: '',
          pinned: false,
          pinnedOrder: 0,
          order: 0,
          sizeBytes: file.size,
          imageUrl: '',
          thumbUrl: '',
          originalUrl: '',
          status: 'processing',
          uploadedAt: serverTimestamp(),
        });

        await uploadBytes(ref(storage, storagePath), file);
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const togglePin = async (img: GalleryImage) => {
    if (!currentUser) return;
    await updateDoc(doc(db, 'photographers', currentUser.uid, 'gallery', img.id), {
      pinned: !img.pinned,
    });
  };

  const updateCategory = async (img: GalleryImage, category: string) => {
    if (!currentUser) return;
    await updateDoc(doc(db, 'photographers', currentUser.uid, 'gallery', img.id), { category });
  };

  const removeImage = async (img: GalleryImage) => {
    if (!currentUser) return;
    if (!confirm('Remove this image from your portfolio?')) return;
    await deleteDoc(doc(db, 'photographers', currentUser.uid, 'gallery', img.id));
    // Best-effort cleanup of the storage objects; Firestore doc deletion is
    // the source of truth for storage accounting (handled server-side).
    for (const p of ['display.jpg', 'thumb.jpg']) {
      deleteObject(ref(storage, `photographers/${currentUser.uid}/gallery/${img.id}/${p}`)).catch(() => {});
    }
  };

  if (!profile) return null;

  return (
    <div className="p-6 max-w-4xl space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Gallery</h1>
      </div>

      <div className="border rounded-lg p-4">
        <StorageGauge
          usedBytes={profile.storageUsedBytes}
          capBytes={profile.storageCapBytes}
          onUpgradeClick={() => setShowBuyStorage(true)}
        />
        {showBuyStorage && (
          <BuyStorageModal accountType="photographer" defaultPhone={profile.phone} onClose={() => setShowBuyStorage(false)} />
        )}
      </div>

      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png"
          multiple
          onChange={(e) => handleFiles(e.target.files)}
          disabled={uploading}
          className="text-sm"
        />
        {uploadError && <p className="text-sm text-red-600 mt-1">{uploadError}</p>}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {images.map((img) => (
          <div key={img.id} className="border rounded-lg overflow-hidden">
            <div className="aspect-square bg-gray-100 flex items-center justify-center">
              {img.status === 'processing' ? (
                <span className="text-xs text-gray-400">Processing…</span>
              ) : img.status === 'rejected-over-cap' ? (
                <span className="text-xs text-red-500 px-2 text-center">Over storage cap — not saved</span>
              ) : img.thumbUrl ? (
                <img src={img.thumbUrl} alt={img.caption} className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs text-gray-400">—</span>
              )}
            </div>
            <div className="p-2 space-y-1.5">
              <select
                value={img.category}
                onChange={(e) => updateCategory(img, e.target.value)}
                className="w-full text-xs border rounded px-1 py-1"
              >
                <option value="">No category</option>
                {PHOTOGRAPHER_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <div className="flex items-center justify-between">
                <button onClick={() => togglePin(img)} className={`text-xs ${img.pinned ? 'text-yellow-600 font-medium' : 'text-gray-400'}`}>
                  {img.pinned ? '★ Pinned' : '☆ Pin'}
                </button>
                <button onClick={() => removeImage(img)} className="text-xs text-red-600">
                  Remove
                </button>
              </div>
            </div>
          </div>
        ))}
        {images.length === 0 && <p className="text-sm text-gray-500 col-span-full">No portfolio images yet — upload some above.</p>}
      </div>
    </div>
  );
}
