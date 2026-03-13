# RSR AXION

## Overview
RSR AXION is an Intelligence Synthesis System — a React + TypeScript + Vite single-page application that ingests live RSS news feeds, scores signals by severity and confidence, and generates executive intelligence briefs with threat matrix assessments.

## Architecture
- **Frontend**: React 18 + TypeScript, bundled with Vite 5
- **Backend**: Express.js API server (`server.mjs`) — fetches RSS feeds server-side, no CORS issues
- **Styling**: Plain CSS (`src/index.css`)
- **Icons**: lucide-react
- **Dev**: `concurrently` runs Express API on port 3001 + Vite dev server on port 5000; Vite proxies `/api` → 3001
- **Production**: Express server on port 5000 serves `/api/signals` + built static `dist/` files
- **Persistence**: localStorage only (no database)

## Project Layout
```
/
├── index.html          # HTML entry point
├── server.mjs          # Express API server — /api/signals, static serving in production
├── vite.config.ts      # Vite config (port 5000, /api proxy → 3001)
├── tsconfig.json
├── package.json
├── public/
│   └── rsr-seal.png    # RSR seal image
├── src/
│   ├── main.tsx        # React root
│   ├── App.tsx         # Main app component (calls /api/signals, brief generation, archive)
│   ├── index.css       # All styles
│   └── lib/
│       ├── types.ts    # TypeScript type definitions
│       └── utils.ts    # Utility functions (scoring, export, storage helpers)
└── axion-repo/         # Mirror of repo root (unused at runtime)
```

## Key Features
- **Server-side** RSS signal ingestion via `/api/signals` — Express fetches 15 feeds directly (no CORS issues)
- 15 feeds across geopolitics, defense/security, cyber/infrastructure, markets/energy, domestic policy
- Per-feed 6s AbortController timeout + 10s global Promise.race ceiling ensures no stall
- Deduplication by normalized title prefix (48 chars) keeps queue clean
- Threat matrix scoring (GUARDED / ELEVATED / HIGH / CRITICAL)
- Pinned signals sort to top of queue and are prioritized in brief synthesis
- Brief generation: Quick Brief, Daily AXION Report, Weekly AXION Report
- Signal archive with search, filter (threat/mode), sort, star, rename, analyst notes
- Export: TXT download, Article draft, Bulletin, Print
- RSR seal integrated: boot screen (92px, 22% opacity), header (42px, 32%), archive watermark (190px pseudo-element, 2.8%)
- Boot screen: cinematic sequenced startup with scanlines and fade
- localStorage persistence with -v6 storage keys

## Development
```bash
npm install
npm run dev   # runs on http://0.0.0.0:5000
```

## Deployment
Configured as a **static** site:
- Build: `npm run build`
- Public dir: `dist`
