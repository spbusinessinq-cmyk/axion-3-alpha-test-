# RSR AXION

## Overview
RSR AXION is an Intelligence Synthesis System — a React + TypeScript + Vite single-page application that ingests live RSS news feeds, scores signals by severity and confidence, and generates executive intelligence briefs with threat matrix assessments.

## Architecture
- **Framework**: React 18 + TypeScript
- **Build tool**: Vite 5
- **Styling**: Plain CSS (`src/index.css`)
- **Icons**: lucide-react
- **No backend** — fully client-side, uses localStorage for persistence

## Project Layout
```
/
├── index.html          # HTML entry point
├── vite.config.ts      # Vite config (port 5000, host 0.0.0.0, allowedHosts: true)
├── tsconfig.json
├── package.json
├── src/
│   ├── main.tsx        # React root
│   ├── App.tsx         # Main app component (signal feed, brief generation, archive)
│   ├── index.css       # All styles
│   └── lib/
│       ├── types.ts    # TypeScript type definitions
│       └── utils.ts    # Utility functions (scoring, export, storage helpers)
└── axion-repo/         # Mirror of repo root (unused at runtime)
```

## Key Features
- Live RSS signal ingestion via allorigins.win CORS proxy — 15 feeds across geopolitics, defense, cyber, markets, and domestic policy
- Per-feed 6s AbortController timeout + 9s global Promise.race fallback ensures no stall
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
