import { onObjectFinalized } from 'firebase-functions/v2/storage';
import { onDocumentCreated, onDocumentDeleted } from 'firebase-functions/v2/firestore';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import sharp from 'sharp';
import * as logger from 'firebase-functions/logger';

const db = getFirestore();

// photographer-private/{photographerId}/gallery/{imageId}/original.<ext>
const GALLERY_PATH_RE =
  /^photographer-private\/([^/]+)\/gallery\/([^/]+)\/original\.(jpg|jpeg|png)$/i;

// photographers/{photographerId}/sessions/{sessionId}/{imageId}/original.<ext>
// NOTE: storage.rules' isValidImageUpload() currently only accepts
// image/jpeg and image/png — RAW formats (CR2/NEF/etc.) are NOT supported
// in v1 even though a photographer's camera may shoot RAW. Delivered
// client photos are expected to be exported/converted to JPEG first. If
// RAW delivery becomes a real requirement, both this regex and the
// Storage rule's content-type check need to be loosened together.
const SESSION_PATH_RE =
  /^photographers\/([^/]+)\/sessions\/([^/]+)\/([^/]+)\/original\.(jpg|jpeg|png)$/i;

function publicUrl(bucketName: string, path: string): string {
  // Works without a download token because storage.rules explicitly allows
  // public read on this exact prefix (photographers/{id}/gallery/**).
  return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(
    path
  )}?alt=media`;
}

/**
 * Atomically checks a photographer's storage cap and reserves `bytes` if
 * there's room. Returns false (and reserves nothing) if it would exceed
 * storageCapBytes. This is the actual source of truth for the cap — client
 * and Storage-rule checks are UX only.
 */
async function reserveStorage(photographerId: string, bytes: number): Promise<boolean> {
  const ref = db.doc(`photographers/${photographerId}`);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return false;
    const data = snap.data()!;
    const used = data.storageUsedBytes ?? 0;
    const cap = data.storageCapBytes ?? 0;
    if (used + bytes > cap) return false;
    tx.update(ref, { storageUsedBytes: FieldValue.increment(bytes) });
    return true;
  });
}

function watermarkSvg(width: number): Buffer {
  const h = Math.round(width * 0.34);
  return Buffer.from(
    `<svg width="${width}" height="${h}" xmlns="http://www.w3.org/2000/svg">
       <rect width="100%" height="100%" rx="5" fill="black" fill-opacity="0.28"/>
       <text x="50%" y="66%" text-anchor="middle" font-family="sans-serif"
             font-size="${Math.round(width * 0.24)}" fill="white" fill-opacity="0.9">P&amp;S</text>
     </svg>`
  );
}

/**
 * Trigger: a photographer uploads a full-res original to the PRIVATE
 * prefix. This generates a small, non-obstructive watermarked "display"
 * copy and a thumbnail, writes both to the PUBLIC prefix, and updates the
 * Firestore gallery doc. The original never leaves the private prefix.
 */
export const onGalleryImageUpload = onObjectFinalized({ cpu: 1 }, async (event) => {
  const filePath = event.data.name;
  const match = filePath.match(GALLERY_PATH_RE);
  if (!match) return;
  const [, photographerId, imageId] = match;

  const bucketName = event.data.bucket;
  const bucket = getStorage().bucket(bucketName);
  const file = bucket.file(filePath);
  const size = Number(event.data.size ?? 0);
  const docRef = db.doc(`photographers/${photographerId}/gallery/${imageId}`);

  const ok = await reserveStorage(photographerId, size);
  if (!ok) {
    await file.delete({ ignoreNotFound: true });
    await docRef.set({ status: 'rejected-over-cap' }, { merge: true });
    logger.warn(`Gallery upload rejected (storage cap): ${photographerId}/${imageId}`);
    return;
  }

  try {
    const [buf] = await file.download();
    const image = sharp(buf).rotate();
    const meta = await image.metadata();
    const displayWidth = Math.min(meta.width ?? 1600, 1600);
    const markWidth = Math.round(displayWidth * 0.16);

    const displayBuf = await image
      .clone()
      .resize({ width: displayWidth })
      .composite([{ input: watermarkSvg(markWidth), gravity: 'southeast' }])
      .jpeg({ quality: 82 })
      .toBuffer();

    const thumbBuf = await image.clone().resize({ width: 480 }).jpeg({ quality: 75 }).toBuffer();

    const displayPath = `photographers/${photographerId}/gallery/${imageId}/display.jpg`;
    const thumbPath = `photographers/${photographerId}/gallery/${imageId}/thumb.jpg`;

    await bucket.file(displayPath).save(displayBuf, { contentType: 'image/jpeg' });
    await bucket.file(thumbPath).save(thumbBuf, { contentType: 'image/jpeg' });

    await docRef.set(
      {
        imageUrl: publicUrl(bucketName, displayPath),
        thumbUrl: publicUrl(bucketName, thumbPath),
        originalUrl: filePath, // private Storage PATH, not a public URL — see storage.rules
        sizeBytes: size,
        status: 'ready',
      },
      { merge: true }
    );
  } catch (err) {
    logger.error('Watermark processing failed', err);
    // Storage was already reserved — leave it reserved and flag for retry/
    // manual review rather than silently losing track of the used bytes.
    await docRef.set({ status: 'processing-failed' }, { merge: true });
  }
});

/**
 * Trigger: a photographer bulk-uploads a shoot session's photos (private,
 * for client delivery matching — no watermarking, full quality). Just
 * enforces the cap and records the final Storage path on the doc; the
 * camera-number-to-client matching itself happens client-side at upload
 * time since it's pure computation with no cross-tenant trust boundary.
 */
export const onSessionImageUpload = onObjectFinalized({ cpu: 1 }, async (event) => {
  const filePath = event.data.name;
  const match = filePath.match(SESSION_PATH_RE);
  if (!match) return;
  const [, photographerId, sessionId, imageId] = match;

  const bucket = getStorage().bucket(event.data.bucket);
  const file = bucket.file(filePath);
  const size = Number(event.data.size ?? 0);
  const docRef = db.doc(
    `photographers/${photographerId}/sessions/${sessionId}/images/${imageId}`
  );

  const ok = await reserveStorage(photographerId, size);
  if (!ok) {
    await file.delete({ ignoreNotFound: true });
    await docRef.set({ status: 'rejected-over-cap' }, { merge: true });
    logger.warn(`Session upload rejected (storage cap): ${photographerId}/${sessionId}/${imageId}`);
    return;
  }

  await docRef.set(
    {
      storageUrl: filePath,
      contentType: event.data.contentType === 'application/pdf' ? 'pdf' : 'image',
      sizeBytes: size,
      status: 'ready',
    },
    { merge: true }
  );
});

/**
 * Storage accounting must not be gameable by a client under-reporting a
 * delete, so the decrement happens here (server-side, driven off the
 * Firestore doc's own recorded sizeBytes) rather than trusting a client
 * call to decrement storageUsedBytes directly.
 */
export const onGalleryImageDeleted = onDocumentDeleted(
  'photographers/{photographerId}/gallery/{imageId}',
  async (event) => {
    const bytes = event.data?.data()?.sizeBytes ?? 0;
    if (!bytes) return;
    await db
      .doc(`photographers/${event.params.photographerId}`)
      .update({ storageUsedBytes: FieldValue.increment(-bytes) });
  }
);

export const onSessionImageDeleted = onDocumentDeleted(
  'photographers/{photographerId}/sessions/{sessionId}/images/{imageId}',
  async (event) => {
    const bytes = event.data?.data()?.sizeBytes ?? 0;
    if (!bytes) return;
    await db
      .doc(`photographers/${event.params.photographerId}`)
      .update({ storageUsedBytes: FieldValue.increment(-bytes) });
  }
);

/**
 * likesCount is denormalized onto the photographer doc for cheap reads on
 * the directory grid, but clients only ever write their own
 * likes/{uid} doc (see firestore.rules) — never the counter itself. That
 * keeps a malicious client from setting likesCount to an arbitrary value;
 * these triggers are the only thing that ever touches it.
 */
export const onPhotographerLiked = onDocumentCreated(
  'photographers/{photographerId}/likes/{userId}',
  async (event) => {
    await db
      .doc(`photographers/${event.params.photographerId}`)
      .update({ likesCount: FieldValue.increment(1) });
  }
);

export const onPhotographerUnliked = onDocumentDeleted(
  'photographers/{photographerId}/likes/{userId}',
  async (event) => {
    await db
      .doc(`photographers/${event.params.photographerId}`)
      .update({ likesCount: FieldValue.increment(-1) });
  }
);
