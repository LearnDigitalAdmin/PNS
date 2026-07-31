# Adjustments needed before launch

Everything below is either a business decision I made a reasonable default
for (not a technical judgment call I'm qualified to make final), or a manual
operational step that has to happen outside the codebase. Nothing here is
broken — it's what needs your eyes before real money or real data flows
through it.

## 1. Money — needs your decision

| What | Where | Current default |
|---|---|---|
| Platform's cut of booking payments | `functions/src/paystack.ts` → `PLATFORM_FEE_PERCENT` | 10% |
| Price per GB of extra storage | `functions/src/storage-purchases.ts` → `KES_PER_GB` **and** `src/shared/BuyStorageModal.tsx` → `KES_PER_GB` | KSh 150/GB |
| Photographer free storage | `src/partners/types.ts` → `DEFAULT_PHOTOGRAPHER_STORAGE_CAP_BYTES` | 1 GB (your number) |
| Reader free storage | `src/readers/types.ts` → `DEFAULT_READER_STORAGE_CAP_BYTES` | 300 MB (your number) |

**The `KES_PER_GB` constant is duplicated** in two places — the Cloud
Function (which is the actual source of truth for what gets charged) and
the modal (which only uses it to *display* a price before the charge is
created). If you change the price, change both, or the modal will show a
stale number even though the real charge is correct.

## 2. Paystack — needs verification against a live transaction, not just docs

`createPhotographerSubaccount` sets `percentage_charge` on the subaccount,
which (per Paystack's documented split model) is the percentage that
settles to *your* platform account, with the remainder settling to the
photographer's subaccount. I built this based on documentation, not a live
test — **run one real end-to-end booking payment before launch and confirm
the money actually lands where you expect on both sides.** Split-payment
semantics are exactly the kind of thing that's worth 20 minutes of manual
verification before it touches a stranger's M-Pesa balance.

## 3. Manual setup steps (nothing works until these are done)

1. **Set the Paystack secret**: `firebase functions:secrets:set PAYSTACK_SECRET_KEY`
2. **Register the webhook URL** in your Paystack dashboard, pointing at the
   deployed `paystackWebhook` function's URL. Nothing marks a booking or
   storage purchase as paid without this — `initiateBookingPayment` and
   `purchaseStorage` only ever mark things "pending"/"awaiting payment."
3. **Enable Google and Phone sign-in providers** in the Firebase Auth
   console — both photographer and reader auth depend on these being
   turned on.
4. **Confirm your Paystack Kenya account is fully verified for mobile
   money (M-Pesa) charges** before relying on this in production — a
   sandbox/unverified account will fail real STK pushes.
5. **Deploy `functions/package.json`'s new `sharp` dependency** — it's a
   native binary; the first deploy after adding it may take longer than
   you're used to.

## 4. Left as free text / simple defaults on purpose

- **Photographer bank code** (Settings → Payouts) is a plain text field,
  not a dropdown. I didn't fabricate a list of Paystack bank codes I
  couldn't verify — have photographers pull their bank's code from your
  Paystack dashboard, or build a real dropdown once you've pulled
  Paystack's current bank list yourself.
- **Photographer categories** (`PHOTOGRAPHER_CATEGORIES` in
  `src/partners/types.ts`) is a starter list of 8. Cheap to extend — revisit
  after your first real signups show gaps.
- **Report reasons** (`REPORT_REASONS` in `src/partners/types.ts`) — same
  deal, adjust freely.
- **Reader email fallback**: readers who sign up by phone have no email,
  but Paystack's charge API requires one. I generate a synthetic
  `{uid}@readers.pns.app` placeholder for this — it's never actually
  emailed, just satisfies the API field. Fine as-is, but worth knowing it's
  there if you ever see it in a Paystack transaction log.

## 5. Deliberately out of scope (not gaps — decisions)

- **Facial recognition / auto-matching** for bulk delivery: still deferred,
  as discussed — this touches biometric data law (Kenya's Data Protection
  Act treats it as sensitive personal data) and needs legal review before
  any code gets written, not after.
- **Booking "completed" status**: currently only admin can set it manually
  (Admin → Bookings → "Mark completed" on a paid booking). There's no
  automatic trigger — nothing currently *needs* one, but if you want
  photographers to self-mark shoots complete, that's a small addition to
  `partners/dashboard/BookingsSection.tsx` plus a matching Firestore rule.
