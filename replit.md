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
- Live RSS signal ingestion via allorigins.win proxy
- Threat matrix scoring (GUARDED / ELEVATED / HIGH / CRITICAL)
- Brief generation (Quick Brief & Full AXION Report)
- Signal archive with search, filter, and sort
- Export to TXT, Article draft, Bulletin, and Print

## Development
```bash
npm install
npm run dev   # runs on http://0.0.0.0:5000
```

## Deployment
Configured as a **static** site:
- Build: `npm run build`
- Public dir: `dist`
