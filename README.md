# Kattam Matrimony

A professional, offline-first matrimonial candidate management system built for internal bureau use. Designed to run reliably on low-spec Windows hardware (1.6 GHz, 2 GB RAM).

## Tech Stack

- **Frontend:** React 18 + TypeScript + Vite
- **Desktop Shell:** Electron 28
- **Database:** SQLite 3 (WAL mode, indexed, paginated)
- **Astrology Engine:** astronomy-engine (offline Vedic chart calculation)
- **i18n:** English / Tamil bilingual support
- **PDF Export:** jsPDF + html2canvas

## Features

- 📋 Full candidate data entry — personal, family, physical, astrological, contact details
- 🔭 Auto-calculate Rasi & Amsam horoscope charts from birth data (offline)
- 🔍 Server-side paginated search across 5,000+ profiles with debounced SQL queries
- 🖨️ Print & PDF export of candidate profiles
- 🌐 English / Tamil language toggle (preference persisted)
- 📷 Native OS file picker for photo upload (zero memory overhead)

## System Requirements

| Component | Minimum |
|---|---|
| OS | Windows 10 64-bit |
| CPU | 1.6 GHz Dual-Core |
| RAM | 2 GB |
| Storage | ~300 MB |
| Display | 1024 × 768 |

## Development Setup

```bash
# Install dependencies
npm install

# Start in development mode (Vite + Electron)
npm run electron:dev

# Build for production
npm run electron:build
```

## Performance Architecture

- **SQLite WAL Mode** — non-blocking writes on slow HDDs
- **Paginated Queries** — max 30 rows loaded at a time regardless of DB size
- **Column-Specific SELECT** — card views fetch only 6 columns, not 50+
- **Composite DB Indexes** — `(gender, caste, registrationId)` for fast matrimonial filters
- **Schema Migrations** — `PRAGMA user_version` versioning for safe upgrades
- **V8 Heap Cap** — `--max-old-space-size=256` prevents Windows pagefile thrashing
- **Native File Dialog** — photo upload via `dialog.showOpenDialog`, zero Base64 IPC overhead

## Project Structure

```
Kattam/
├── electron/
│   ├── main.cjs        # Main process: SQLite, IPC handlers, V8 flags
│   └── preload.cjs     # Context bridge: secure renderer ↔ main API
├── src/
│   ├── components/     # KattamGrid (Vedic chart editor)
│   ├── i18n/           # English/Tamil translations + LanguageContext
│   ├── pages/          # DataEntry, CandidateSearch, ProfileView
│   └── utils/          # Vedic astrology calculation engine
├── package.json
└── vite.config.ts
```

## License

Private — Internal use only. All rights reserved.
