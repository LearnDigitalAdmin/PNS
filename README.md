# P&S Magazine — React + TypeScript + Tailwind

A full React port of the P&S Magazine site and its editor admin dashboard. Same colors, fonts, layout, images, and navigation logic as the original HTML builds — now as a proper component-based app with real routing.

## Stack

React 18 · TypeScript · Vite · Tailwind CSS · React Router v6

## Getting started

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-checks then builds to dist/
npm run preview  # serve the production build locally
```

## Routes

- `/` — the public magazine (9-page "book" experience)
- `/admin` — the editor dashboard (gated by the login flow)
  - `/admin/overview`
  - `/admin/content` (Stories, Voting Arena, Cogvana Gallery, Shop Products)
  - `/admin/business` (Requests, Sponsored Stories, Partners)
  - `/admin/system` (Activity & Security, Settings)

Routing is defined centrally in `src/router.tsx`. `src/App.tsx` mounts the router and the global image-fallback behavior.

**Admin demo credentials** (shown on the login screen itself):
Email `editor@pnsmagazine.com` · Password `PnSEditor#2026` · 2FA code `482913`

## Structure

```
src/
  App.tsx              entry composition (router + global image fallback)
  router.tsx            all route definitions
  main.tsx              ReactDOM root
  index.css              Tailwind directives + every ported custom class/animation

  lib/                   small shared hooks (image fallback, simulated form submit)

  site/                  the public magazine — 9 page components
    types.ts, data.ts      content model + all seed content (stories, contestants, products…)
    context/SiteContext.tsx   page navigation, modals, cart, lightbox, voting state
    components/             Nav, MobileMenu, PageNavUI, CartSidebar, Lightbox, Modals
    SiteApp.tsx              assembles chrome + the page-turn engine (ported 1:1)
    pages/
      HeroPage.tsx
      StoriesPage.tsx
      VotingPage.tsx
      CogvanaPage.tsx
      ServicesPage.tsx
      PartnersPage.tsx
      SponsoredPage.tsx
      ShopPage.tsx
      BookFooterPage.tsx

  admin/                 the editor dashboard — 6 files
    types.ts, data.ts, icons.tsx
    context/AdminDataContext.tsx   all CRUD + toasts + confirm dialog
    context/AdminAuthContext.tsx   login flow, lockout, session timeout
    AdminApp.tsx                   gate: AdminLogin vs AdminShell
    AdminLogin.tsx                 1/6 — two-step login (password → 2FA)
    AdminShell.tsx                 2/6 — sidebar/topbar/session modal/toasts
    OverviewSection.tsx            3/6
    ContentSection.tsx             4/6 — Stories + Voting + Gallery + Shop tabs
    BusinessSection.tsx            5/6 — Requests + Sponsored + Partners tabs
    SystemSection.tsx              6/6 — Activity & Security + Settings tabs
```

## Notes

- All data is in-memory (seeded from `data.ts` files) — there's no backend. Each admin CRUD action has an equivalent Firestore call documented as a comment in `AdminDataContext.tsx` for when this gets wired to a real Firebase project.
- The page-turn (book) animation, hero auto-rotation, voting carousel, and reveal-on-enter effects are ported with the same transforms/timings as the original vanilla build, just driven through refs + effects instead of raw DOM scripting.
- The footer's "Editor Login" link now routes to `/admin` (a real dashboard) instead of the placeholder modal from the static demo.
