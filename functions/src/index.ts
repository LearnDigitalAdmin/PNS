/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import { initializeApp } from "firebase-admin/app";
import { setGlobalOptions } from "firebase-functions";

// Admin SDK must be initialized before any other module (e.g. photographers.ts)
// calls getFirestore()/getStorage() at import time.
initializeApp();

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function's options, e.g.
// `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
// NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// functions should each use functions.runWith({ maxInstances: 10 }) instead.
// In the v1 API, each function can only serve one request per container, so
// this will be the maximum concurrent request count.
setGlobalOptions({ maxInstances: 10 });

// export const helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

// ── Photographer marketplace: storage-cap enforcement + watermarking ──────
export {
  onGalleryImageUpload,
  onSessionImageUpload,
  onGalleryImageDeleted,
  onSessionImageDeleted,
  onPhotographerLiked,
  onPhotographerUnliked,
} from "./photographers";

// ── Voting integrity: one vote per category per day, tied to accounts ─────
export { castVote } from "./voting";

// ── Reader delivery: session photos → matched reader's inbox by phone ─────
export { deliverSessionToReader } from "./delivery";

// ── Bookings + Paystack: subaccounts, M-Pesa STK push, webhook ────────────
export { createPhotographerSubaccount, initiateBookingPayment, paystackWebhook } from "./paystack";

// ── Storage purchases: buy more capacity via M-Pesa ────────────────────────
export { purchaseStorage } from "./storage-purchases";

// ── Growth: referral counting ──────────────────────────────────────────────
export { onReaderReferred } from "./referrals";
