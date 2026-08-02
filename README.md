# P&S Magazine

A digital lifestyle & culture magazine for the Kenyan market, built as a single web app that combines editorial content, a reader engagement layer (contests/voting), a self-serve photographer marketplace ("Cogvana"), brand partnerships, and a merchandise shop — all under one roof, with its own admin back office to run the business day to day.

This document explains what the platform actually *does*, how money moves through it, and how the pieces fit together — written to be shareable with someone who has never seen the code.

---

## Table of contents

- [What this is](#what-this-is)
- [Who uses it](#who-uses-it)
- [The core product: Cogvana, the photographer marketplace](#the-core-product-cogvana-the-photographer-marketplace)
- [The magazine layer](#the-magazine-layer)
- [The admin back office](#the-admin-back-office)
- [Business model — how the platform makes money](#business-model--how-the-platform-makes-money)
- [Trust & safety](#trust--safety)
- [Technical architecture](#technical-architecture)
- [Key business constants](#key-business-constants)
- [Project structure](#project-structure)
- [Getting started (development)](#getting-started-development)
- [What's deliberately out of scope](#whats-deliberately-out-of-scope)

---

## What this is

P&S Magazine presents itself to the public as a "book" — a page-turning digital magazine experience — with sections for editorial stories, a reader contest/voting arena, a shop, brand-sponsored content, a curated partner ecosystem, and **Cogvana**: a directory where anyone can find, book, and pay a photographer directly through the site.

Underneath that single front-facing experience are effectively three separate account systems, each with its own login and dashboard:

| Account type | Route | Who they are |
|---|---|---|
| **Reader** | `/account` | Anyone browsing the magazine — votes in contests, books and pays photographers, receives delivered photos |
| **Photographer (Partner)** | `/partners` | A self-registered photographer offering paid shoots through the directory |
| **Admin / Editor** | `/admin` | P&S staff running the magazine, marketplace, and moderation queue |

Everything is real-money, real-data — this isn't a demo. Payments are collected via M-Pesa (through Paystack), photos are stored and watermarked in the cloud, and every booking, payment, and report is a real Firestore record.

## Who uses it

- **Readers** — the general public. They read stories, vote for contestants, browse the shop, and — the platform's core transaction — find and pay a photographer for a shoot.
- **Photographers** — independent photographers who sign up, build a public profile and portfolio, price their services, and accept paid bookings without ever needing their own website or payment integration.
- **P&S admin/editorial staff** — manage all magazine content, review business inquiries (partnership/sponsorship/featured requests), and moderate the photographer marketplace (verify, suspend, or remove photographers; handle customer complaints).

---

## The core product: Cogvana, the photographer marketplace

This is the platform's actual transactional engine — everything else on the site is either content or a funnel toward it.

### The booking flow

1. **Discovery** — a reader browses the Cogvana directory (searchable by name/location, filterable by category — Portrait, Wedding, Event, Fashion, Product, Family, Graduation, Corporate/Branding), and opens a photographer's public portfolio.
2. **Request** — the reader picks one of the photographer's fixed-price services and submits a booking request with a proposed date and notes. The price is locked in at this point — neither side can change it later.
3. **Accept / Decline** — the photographer sees the request in their dashboard and accepts or declines it. They can only accept if they've already connected a payout account (see below) — the platform won't let a photographer accept money it has no way to ever pay out.
4. **Payment** — once accepted, the reader is prompted for their M-Pesa number and pays by STK push. The reader pays the agreed price **plus** Paystack's own transaction fee (so the photographer's price is never eaten into by processing costs).
5. **Confirmation** — Paystack confirms the payment via webhook. The booking flips to **Paid**, the platform's cut and the photographer's payout are calculated and recorded, and the photographer gets an instant SMS confirming the amount and expected payout day.
6. **Fulfillment** — the shoot happens. Once done, the photographer marks the booking **Fulfilled** from their own dashboard.
7. **Delivery** — for bulk shoots (weddings, events), the photographer uploads the full shoot as a "session," and the platform automatically matches camera filenames to each client's phone number (via a numbered range the photographer sets per client), delivering each client only their own photos into their private reader inbox.
8. **Recourse** — if something goes wrong, the reader can file a report on any paid booking (e.g. "not fulfilled," "not as agreed"), which lands in the admin moderation queue.

### Getting paid: how the split works

Every booking payment is split automatically at the moment of payment — nobody manually calculates or transfers anything:

- The **reader** pays the photographer's listed price *plus* a pass-through Paystack processing fee (currently ~2.9%), so the fee is never deducted from what the photographer or platform actually receives.
- Of the remaining (fee-excluded) amount, **10% settles to the platform** and **90% settles directly to the photographer's own bank/M-Pesa account** — via a Paystack "subaccount split," so the money physically lands in two places simultaneously; the platform never has to hold and manually forward the photographer's share.
- The photographer's SMS and the platform's own income dashboard both report figures on this fee-excluded base, so "what I was told I'd get" always matches "what actually lands."

### Payout setup

Before a photographer can accept any paid booking, they connect a payout account (bank or M-Pesa Paybill/Till, via Paystack's settlement bank list) in their Settings tab. This is a one-time step; every subsequent booking pays out to the same account automatically.

### Photographer notifications

Photographers don't have to check the dashboard to know they've been paid. On every successful booking payment, the platform sends a short SMS (via a dedicated Safaricom sender ID, delivered through HostPinnacle's Bulk SMS service) containing:

- Booking date
- Amount paid (base price, excluding the processing fee)
- Platform's cut
- Their net payout
- Expected payout day (Paystack settles on a **T+2 business-day** cycle — weekends don't count)

### Photographer income visibility

Photographers have a dedicated **Income** tab showing every paid booking grouped by week, with totals split by how the customer paid (M-Pesa vs. card) — so a photographer can see at a glance what a given week earned and reconcile it against what actually hit their account.

### Storage & galleries

- Every photographer gets a free portfolio storage allowance (1 GB by default); every reader gets a free photo-delivery inbox allowance (300 MB by default).
- Portfolio images a photographer uploads are automatically **watermarked** and thumbnailed server-side before appearing publicly — the original, unwatermarked file is never exposed on any public route.
- Both photographers and readers can buy additional storage on demand via M-Pesa (currently KSh 150/GB) if they outgrow the free tier.

---

## The magazine layer

Everything else on the public site exists to build an audience around the marketplace and to carry its own advertising/content revenue:

- **Stories** — editorial articles.
- **Voting Arena** — themed contests with multiple contestants per category; a signed-in reader gets exactly one vote per category per calendar day (enforced server-side, not just in the browser), with a day-streak tracked per reader to encourage return visits.
- **Services** — a general "book a service" call-to-action distinct from the photographer marketplace, feeding into the admin's request queue.
- **Sponsored Stories** — brand-sponsored native editorial content, run through an internal deal pipeline (inquiry → production → published) before it goes live.
- **Featured Partners** — a curated directory of business partners/ecosystem players (separate from the self-serve photographer marketplace — this is admin-curated, application-based via a "Become a Partner" request).
- **Shop** — merchandise, both physical and digital products.

## The admin back office

Staff (gated to `@cogvana.co.ke` email accounts) run the entire business from `/admin`:

- **Overview** — top-line activity.
- **Content** — Stories, Voting Arena, the Cogvana gallery, Shop products.
- **Business** — an inbox for every inbound request (featured-partner applications, service bookings, sponsorship inquiries, etc.), with one-click WhatsApp follow-up messaging built in, plus the sponsored-deal pipeline and partner directory management.
- **Photographers** — the full photographer roster: verify (trust badge), suspend, or permanently expel a photographer.
- **Bookings** — every marketplace booking across all photographers, with payment status and totals.
- **Reports** — the moderation queue for photographer-profile reports, portfolio-image reports, and now booking-service reports, each actionable directly from the queue.
- **System** — activity/security logs and platform settings.

---

## Business model — how the platform makes money

| Revenue stream | Mechanism |
|---|---|
| **Marketplace commission** | 10% of every paid photographer booking, taken automatically via Paystack's split-payment system — the platform's core, recurring revenue line, scaling directly with marketplace transaction volume. |
| **Storage upsell** | KSh 150 per extra GB, sold to photographers (bigger portfolios/sessions) and readers (bigger photo inboxes) once they exceed their free allowance. |
| **Sponsored content** | Brands pay for native "Sponsored Stories" placements within the magazine. |
| **Partner ecosystem** | Businesses apply to be featured in the curated Partners directory — a separate, application-gated placement from the self-serve photographer marketplace. |
| **Shop** | Direct sales of physical and digital merchandise. |
| **Direct service bookings** | The general "Services" booking flow funnels leads into the admin's request queue for follow-up outside the automated marketplace flow. |

The photographer marketplace is deliberately frictionless on the supply side — any photographer can sign up and start accepting bookings without a sales conversation — while the other four streams (sponsorship, partners, shop, direct services) are relationship/inbox-driven and run through the admin team.

---

## Trust & safety

- **Reports** — readers can report a photographer's profile, a specific portfolio image, or (new) a paid booking that went wrong. Profile/photo reports can be filed anonymously from the public site; booking reports require a signed-in reader account, since they're tied to a real transaction.
- **Suspend** — an admin can suspend a photographer: they disappear from the public directory and can no longer sign in, but nothing about their stored data (profile, portfolio, past bookings) is touched. Fully reversible.
- **Expel** — for serious cases, an admin can permanently delete a photographer's profile and portfolio data and disable their account for good. Not reversible. Past bookings and the reader's own records are deliberately left intact — they belong to the customer's payment/photo history, not the photographer's.
- **Delivery matching** is phone-number-based, not facial recognition — biometric matching was deliberately left out of scope pending legal review under Kenya's Data Protection Act.

---

## Technical architecture

**Frontend:** React 18 + TypeScript + Vite + Tailwind CSS + React Router v6 — a single app serving all four experiences (public site, reader dashboard, photographer dashboard, admin dashboard) via route-based gating.

**Backend:** Firebase — Firestore (data), Firebase Auth (Google + phone sign-in for readers and photographers, email/password + 2FA for admin), Cloud Storage (portfolio images, session photos), and Cloud Functions (v2) for anything that needs to run with elevated trust: payment initiation, Paystack webhook handling, watermarking, storage-cap enforcement, vote integrity, delivery matching, and photographer moderation (suspend/expel).

**Payments:** Paystack, using M-Pesa STK push for the actual charge and Paystack's subaccount **split-payment** feature to route the photographer's share directly to their own account at the moment of payment — no manual payout step, no float held by the platform.

**SMS:** HostPinnacle Bulk SMS, sent from a dedicated Safaricom sender ID, used for the one thing that has to reach a photographer even if they're not looking at the dashboard: payment confirmations.

**Security model:** Firestore security rules are the primary access-control layer for client reads/writes (e.g., a photographer can only ever edit their own profile; a reader can only ever see their own bookings). Anything that needs to bypass those rules on purpose — disabling a photographer's login, a recursive account deletion, crediting a vote, matching delivered photos — runs server-side in a Cloud Function with its own explicit authorization check, never trusted to the client.

**Payment webhook note:** the Paystack webhook that actually confirms payments lives in a separate, shared Firebase project (alongside other Cogvana-family products), because a single Paystack account only supports one webhook URL. This codebase only ever *creates* charges; confirmation and money-split bookkeeping happen in that shared webhook handler.

---

## Key business constants

These are business decisions encoded as constants, not fixed technical limits — all are adjustable:

| What | Current value |
|---|---|
| Platform's cut of every paid booking | 10% |
| Paystack processing fee (passed through to the reader) | ~2.9% |
| Minimum booking amount | KSh 100 |
| Storage price | KSh 150 / GB |
| Free photographer portfolio storage | 1 GB |
| Free reader photo-inbox storage | 300 MB |
| Photographer payout timing | Paystack's standard T+2 business days |

---

## Project structure

```
src/
  site/         the public magazine (stories, voting, Cogvana directory, shop, sponsored, partners)
  partners/     photographer-facing app (/partners) — onboarding + dashboard
  readers/      reader-facing app (/account) — onboarding + dashboard
  admin/        staff back office (/admin)
  bookings/     shared booking types/constants used across site, partners, and readers
  lib/          shared Firebase setup + small utility hooks

functions/src/
  paystack.ts       subaccount creation, booking payment initiation
  storage-purchases.ts  buy extra storage via M-Pesa
  photographers.ts  watermarking, storage-cap enforcement, likes counters
  delivery.ts       matched-photo delivery to a reader's inbox
  voting.ts         vote integrity (one per category per day)
  referrals.ts      reader referral counting
  moderation.ts     admin-only suspend / reactivate / expel
```

## Getting started (development)

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-checks then builds to dist/
npm run preview  # serve the production build locally
```

Deploying Cloud Functions requires a Paystack secret key (`firebase functions:secrets:set PAYSTACK_SECRET_KEY`) and HostPinnacle SMS credentials configured as environment/functions config — nothing charges real money or sends a real SMS without these set.

## What's deliberately out of scope

- **Facial-recognition photo matching** — delivery matching is phone-number/range-based on purpose; biometric auto-matching is deferred pending legal review.
- **A separate "editor" permission tier** — admin and editor are currently treated as a single access tier (any `@cogvana.co.ke` account). A finer-grained role split can be added later without restructuring anything.
- **"Pay later" bookings** — photographers can only currently collect payment up front, at acceptance. A pay-after-the-shoot option is scaffolded in the data model but not yet enabled.
