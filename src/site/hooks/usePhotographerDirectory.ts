import { useEffect, useState } from 'react';
import {
  collection,
  doc,
  deleteDoc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  serverTimestamp,
  where,
} from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import type { GalleryImage, PhotographerProfile } from '../../partners/types';

export function usePhotographerDirectory() {
  const [photographers, setPhotographers] = useState<(PhotographerProfile & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'photographers'), where('status', '==', 'active'));
    const unsub = onSnapshot(q, (snap) => {
      setPhotographers(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
      setLoading(false);
    });
    return unsub;
  }, []);

  return { photographers, loading };
}

export function usePhotographerPortfolio(photographerId: string | null) {
  const [profile, setProfile] = useState<(PhotographerProfile & { id: string }) | null>(null);
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!photographerId) {
      setProfile(null);
      setImages([]);
      return;
    }
    setLoading(true);
    const unsubProfile = onSnapshot(doc(db, 'photographers', photographerId), (snap) => {
      setProfile(snap.exists() ? ({ id: snap.id, ...(snap.data() as any) }) : null);
      setLoading(false);
    });
    const unsubGallery = onSnapshot(
      query(collection(db, 'photographers', photographerId, 'gallery'), orderBy('uploadedAt', 'desc')),
      (snap) => {
        const items = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as any) }))
          .filter((img: any) => img.status === 'ready'); // hide processing/rejected from public view
        // pinned first, preserving upload-desc order within each group
        items.sort((a: any, b: any) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
        setImages(items);
      }
    );
    return () => {
      unsubProfile();
      unsubGallery();
    };
  }, [photographerId]);

  return { profile, images, loading };
}

/**
 * Only ever writes the caller's own likes/{uid} doc — see firestore.rules.
 * likesCount on the photographer doc itself is maintained by the
 * onPhotographerLiked/Unliked Cloud Functions, never by this client write,
 * so a user can't inflate it beyond their own single like.
 */
export async function toggleLike(photographerId: string, liked: boolean) {
  const uid = auth.currentUser?.uid;
  if (!uid) return; // reader accounts land in Phase 2 — no-op for anonymous visitors until then
  const likeRef = doc(db, 'photographers', photographerId, 'likes', uid);
  if (liked) {
    await deleteDoc(likeRef);
  } else {
    await setDoc(likeRef, { createdAt: serverTimestamp() });
  }
}

export function useHasLiked(photographerId: string | null) {
  const [liked, setLiked] = useState(false);
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!photographerId || !uid) {
      setLiked(false);
      return;
    }
    return onSnapshot(doc(db, 'photographers', photographerId, 'likes', uid), (snap) => setLiked(snap.exists()));
  }, [photographerId]);
  return liked;
}
