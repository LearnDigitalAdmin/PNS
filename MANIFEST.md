# Updated files — mirrors the repo's directory structure

Drop these into the same relative paths in `LearnDigitalAdmin/PNS` (or apply
`changes.diff` with `git apply`). Grouped below by which of the 7 reported
issues each file addresses.

## 1. Booking flow (fixed pricing, min fee, payment policy, Paystack fee pass-through)
- `src/bookings/types.ts` — `MIN_BOOKING_FEE_KES`, `PAYSTACK_FEE_PERCENT`, `grossUpForPaystackFee()`
- `src/partners/types.ts` — new `PaymentPolicy` type + `paymentPolicy` field
- `src/partners/context/PhotographerAuthContext.tsx` — defaults new photographers to `pay_on_booking`
- `src/partners/dashboard/ProfileSection.tsx` — enforces the KSh 100 minimum on service prices
- `src/partners/dashboard/SettingsSection.tsx` — "Payment collection" control (pay-on-booking active, pay-later disabled)
- `src/partners/dashboard/BookingsSection.tsx` — removed the editable amount input from Accept
- `src/site/components/BookingRequestModal.tsx` — reader can only book a priced service; amount fixed at request time; shows fee-inclusive total
- `src/readers/dashboard/BookingsSection.tsx` — Pay button shows/charges the fee-inclusive total
- `functions/src/paystack.ts` — `initiateBookingPayment` grosses up the M-Pesa charge by the Paystack fee; validates the minimum
- `firestore.rules` — enforces the minimum on create and blocks amount changes on the accept transition

## 2. Navigation dead-end
- `src/readers/dashboard/ReaderShell.tsx`
- `src/partners/dashboard/PhotographerShell.tsx`

## 3. Reader/photographer account mixup
- `src/readers/context/ReaderAuthContext.tsx`
- `src/partners/context/PhotographerAuthContext.tsx`
- `src/readers/ReadersApp.tsx`
- `src/partners/PartnersApp.tsx`
- `src/readers/onboarding/ReaderLogin.tsx`
- `src/partners/onboarding/PhotographerLogin.tsx`

## 4. "Cogvana" directory naming
- `src/site/components/Nav.tsx`
- `src/site/components/MobileMenu.tsx`
- `src/site/components/PageNavUI.tsx`
- `src/site/SiteApp.tsx`
- `src/readers/dashboard/BookingsSection.tsx` (copy reference only)

## 5. Unreadable white text in the directory
- `src/site/SiteApp.tsx` (page background fix)
- `src/site/pages/CogvanaPage.tsx` (also carries the cover-photo + report changes below)

## 6. Reported photo not visible to admins
- `src/site/components/ReportModal.tsx`
- `src/site/pages/CogvanaPage.tsx`
- `src/admin/ReportsSection.tsx`

## 7. Photographer cover photo / logo
- `src/partners/types.ts` (existing `coverImageUrl` field, now actually used)
- `src/partners/dashboard/ProfileSection.tsx` (upload UI)
- `src/site/pages/CogvanaPage.tsx` (display in directory + portfolio)
- `src/admin/PhotographersSection.tsx` (admin "Remove photo")
- `storage.rules` (new `photographers/{id}/cover/**` path)

---

Full unified diff against the original repo is in `changes.diff` in this
same folder, if you'd rather review it that way.
