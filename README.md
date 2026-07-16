# IncendiumPhi — Culinary Chaos Decoded.

Professional Back-of-House kitchen operations platform built for high-end culinary environments. Designed and built by a Certified Executive Chef.

**Philosophy:** Prep-Heavy, Service-Light. Every feature must pass the test: would a chef in the middle of a Friday dinner service use this, exactly as built, without frustration?

**Master Pantry Mandate:** All ingredient data is static and human-verified. No invoice scanning, no live syncing, no external data feeds. Ever.

## Stack

- **Frontend:** React 19, TypeScript, Tailwind CSS v4, Vite 6
- **Backend:** Express 4 (serves SPA + API routes)
- **Database:** Firebase Firestore (live `onSnapshot` listeners)
- **AI:** Anthropic API (`claude-sonnet-4-6`) — called directly from the browser in Test Kitchen
- **Animation:** Motion (Framer Motion v12)

## Setup

**Prerequisites:** Node.js 18+, pnpm

```bash
pnpm install
cp .env.example .env   # fill in values below
npm run dev            # http://localhost:3001
```

**.env keys required:**

```
NODE_ENV=development
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
ANTHROPIC_API_KEY
```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Development server with HMR on port 3001 |
| `npm run build` | Production build to `./dist` |
| `npm start` | Serve production build |

## Project context

`CLAUDE.md` is the authoritative reference for architecture, Firestore collections, design system, approved feature map, and build order. Read it before making changes.
