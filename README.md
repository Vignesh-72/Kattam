<div align="center">
  <img src="public/images/logo_transparent.png" alt="Kattam Matrimony Logo" height="120" />
  <h1>Kattam Matrimony</h1>
  <p><strong>A professional, offline-first matrimonial candidate management system</strong><br/>Built for internal bureau use. Engineered to run reliably on low-spec hardware.</p>

  ![Electron](https://img.shields.io/badge/Electron-28-47848F?logo=electron&logoColor=white)
  ![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
  ![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript&logoColor=white)
  ![SQLite](https://img.shields.io/badge/SQLite-3-003B57?logo=sqlite&logoColor=white)
  ![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)
  ![License](https://img.shields.io/badge/License-MIT-green)
  [![GitHub](https://img.shields.io/badge/GitHub-Vignesh--72%2FKattam-181717?logo=github)](https://github.com/Vignesh-72/Kattam)
</div>

---

<img width="2026" height="662" alt="asset1_trans" src="https://github.com/user-attachments/assets/f9aaa16d-f64b-4a5a-983d-4be9f5359716" />

## 📖 Overview

**Kattam Matrimony** is a full-featured, desktop-native matrimonial bureau management application. It handles the complete lifecycle of a matrimonial candidate — from data entry and horoscope chart generation to profile search, viewing, and PDF export — all without any internet connection.

The app is designed to operate on the modest hardware common in Tamil Nadu matrimonial offices: single-core 1.6 GHz CPUs and 2 GB RAM systems running Windows 10. Every architectural decision from the SQLite WAL mode to the V8 heap cap reflects this constraint.

It supports dual-company branding, letting bureaus operating under two names (e.g., **Kattam Matrimony** and **Thirumanam Matrimony**) generate PDFs and profiles under either brand with a single click.

---

## ✨ Features

### 🗂️ Candidate Management
- **Complete profile data entry** covering personal, family, physical, astrological, education, occupation, and contact details
- **Auto-generated Registration IDs** (e.g., `TMM-001`) with sequential numbering
- **Draft auto-save** — form data is persisted to `localStorage` every 1.5 seconds, recovering gracefully after power loss or accidental tab close
- **Photo upload** via native OS file picker dialog (zero Base64 IPC overhead)
- **Full CRUD** — create, view, edit, and hard-delete candidates (including disk removal of associated photos)

### 🔭 Offline Vedic Astrology
- **100% offline Rasi & Amsam chart calculation** using the [`astronomy-engine`](https://github.com/cosinekitty/astronomy) library
- Implements **Lahiri Ayanamsa** correction for accurate sidereal positions
- Calculates planetary positions for **Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn**
- Interactive **KattamGrid editor** for manual chart adjustments
- **English / Tamil planet names** auto-switched based on selected language

### 🔍 Advanced Search & Filter
- **Standard search** — full-text query across Name, ID, Phone, Caste, Raasi, Star, DOB, and more
- **Advanced filter panel** — multi-dimensional filtering across:
  - Demographics: Gender, Age range, Religion, Mother Tongue, Nativity, Marital Status
  - Community: Caste, Sub-Caste, Gothram, Star, Raasi, Laknam
  - Career: Qualification, Occupation, Work Location
- **Server-side SQLite pagination** — 12 profiles per page, handles 5,000+ records without performance degradation
- **Module-level search cache** — instant page switching without re-querying the database

### 🖨️ Print & PDF Export
- **Single-page PDF export** with professional layout using `html2canvas` + `jsPDF`
- **Dual-company branding** — toggle between Kattam and Thirumanam logos/titles before export
- **Print-ready layout** with solid black text optimised for B&W laser printers
- Includes candidate photo, horoscope charts (Rasi & Amsam Kattam), and all profile details on one A4 page

### 🌐 Bilingual Support (English / Tamil)
- Full UI translation with a persistent language toggle
- Tamil script support via `@fontsource/noto-sans-tamil` and `@fontsource/noto-serif-tamil`
- Planet names, astrological terms, and all UI labels available in both languages

### 🛡️ Data Durability & Safety
- **SQLite WAL mode** — atomic writes, zero corruption risk on sudden power-off
- **`PRAGMA synchronous = FULL`** — mandatory `fsync()` on every commit
- **7-day rolling daily backup** — automatic `.db` backup on every app startup, pruned after 7 days
- **Schema migration system** — safe, versioned upgrades via `PRAGMA user_version`
- **DB self-healing** — `PRAGMA quick_check` on startup with automatic `PRAGMA reindex` if issues are found

---

## 🏗️ Tech Stack

| Layer | Technology | Version |
|---|---|---|
| UI Framework | React | 18.3 |
| Language | TypeScript | ~5.6 |
| Desktop Shell | Electron | 28 |
| Build Tool | Vite | 5 |
| Database | SQLite 3 (WAL) | 6.0 |
| Astrology Engine | astronomy-engine | 2.1 |
| PDF Export | jsPDF + html2canvas | 4.2 / 1.4 |
| Icons | lucide-react | 1.28 |
| Fonts | Fontsource (Inter, Lora, Noto Tamil) | 5.3 |
| Routing | React Router DOM | 7 |

---

## 🖥️ System Requirements

| Component | Minimum | Recommended |
|---|---|---|
| **OS** | Windows 10 64-bit | Windows 10/11 64-bit |
| **CPU** | 1.6 GHz Dual-Core | 2.0 GHz+ |
| **RAM** | 2 GB | 4 GB |
| **Storage** | ~300 MB | ~500 MB |
| **Display** | 1024 × 768 | 1280 × 800+ |

> Also runs on Linux (tested on Ubuntu/Debian). Build targets: `.AppImage`, `.deb` (Linux), `.exe` / NSIS installer (Windows).

---

## 🚀 Development Setup

### Prerequisites
- **Node.js** 18+ (LTS recommended)
- **npm** 9+

### Install & Run

```bash
# Clone the repository
git clone <repo-url>
cd Kattam

# Install all dependencies
npm install

# Start in development mode (Vite dev server + Electron)
npm run electron:dev

# Run frontend only (browser dev mode, no Electron)
npm run dev

# Run tests
npm test
```

### Production Build

```bash
# Build and package the Electron app
npm run electron:build

# Output will be in ./dist-electron/
# Linux: .AppImage and .deb packages
# Windows: NSIS .exe installer
```

---

## 📂 Project Structure

```
Kattam/
├── electron/
│   ├── main.cjs          # Main process: SQLite init, IPC handlers, V8 flags, backup
│   └── preload.cjs       # Context bridge: secure API surface for renderer
│
├── src/
│   ├── components/
│   │   └── KattamGrid.tsx        # Interactive Vedic horoscope chart grid editor
│   │
│   ├── i18n/
│   │   ├── LanguageContext.tsx   # React context for language switching
│   │   └── translations.ts       # English & Tamil translation map
│   │
│   ├── pages/
│   │   ├── DataEntry.tsx         # Full candidate registration & edit form
│   │   ├── CandidateSearch.tsx   # Paginated search with standard & advanced filters
│   │   └── ProfileView.tsx       # Profile viewer with PDF/Print export
│   │
│   ├── utils/
│   │   └── astrology.ts          # Vedic chart calculation (Lahiri Ayanamsa, offline)
│   │
│   ├── App.tsx                   # Root layout, navigation, dashboard
│   └── App.css                   # Global design system & component styles
│
├── public/
│   └── images/                   # App logos and branding assets
│
├── package.json
├── vite.config.ts
└── tsconfig.app.json
```

---

## 🧠 Architecture & Performance

### SQLite Optimisation
The database is configured for maximum durability and performance on slow spinning-disk hardware:

```sql
PRAGMA journal_mode = WAL;         -- Non-blocking writes
PRAGMA synchronous = FULL;         -- fsync on every commit
PRAGMA busy_timeout = 5000;        -- Write lock collision prevention
PRAGMA temp_store = MEMORY;        -- Avoid incomplete temp files on power cut
PRAGMA cache_size = -8000;         -- 8 MB page cache
PRAGMA auto_vacuum = INCREMENTAL;  -- Gradual disk reclaim
```

### Composite Indexes for Fast Search
```sql
CREATE INDEX idx_candidate_search ON candidates(gender, caste, registrationId);
CREATE INDEX idx_adv_filter ON candidates(gender, caste, maritalStatus);
CREATE INDEX idx_caste_subcaste ON candidates(caste, subCaste);
-- + 15 additional single-column indexes
```

### V8 Heap Management
The Electron main process enforces a 256 MB V8 heap cap to prevent Windows pagefile thrashing on 2 GB RAM systems:
```js
app.commandLine.appendSwitch('js-flags',
  '--max-old-space-size=256 --optimize-for-size --gc-global'
);
```

### Search Cache
The `CandidateSearch` module uses a module-level `searchCache` object that preserves the last query result, page number, and filter state. Navigating back from a profile view restores the exact scroll position and results instantly — zero re-query.

### IPC Security Model
- **`contextIsolation: true`** and **`nodeIntegration: false`** in the renderer
- All DB access goes through a typed `preload.cjs` context bridge (`window.api`)
- No raw SQL reaches the renderer — only parameterised IPC calls

---

## 🗄️ Database Schema (Key Fields)

The `candidates` table stores 50+ columns covering:

| Category | Fields |
|---|---|
| Identity | `registrationId`, `fullName`, `gender`, `dob`, `tob`, `birthPlace`, `birthLat`, `birthLon` |
| Family | `fatherName`, `fatherJob`, `motherName`, `motherJob`, `siblings`, `additionalInfo` |
| Physical | `height`, `weight`, `complexion`, `bloodGroup`, `diet`, `disability` |
| Education | `qualification`, `occupation`, `placeOfJob`, `income`, `assets` |
| Astrological | `caste`, `subCaste`, `gothram`, `star`, `raasi`, `laknam`, `padam`, `horoscopeBalance` |
| Horoscope Charts | `rasiKattam` (JSON), `amsamKattam` (JSON) |
| Contact | `contactPerson`, `contactNumber`, `presentAddress`, `permanentAddress` |
| Partner Preferences | `partnerQualification`, `partnerJob`, `partnerAgeFrom`, `partnerAgeTo`, `partnerComments` |
| Media | `photo1`, `photo2` (file system paths) |

---

## 🔄 Daily Backup System

On every app startup, an automatic rolling backup is created:

```
%AppData%/Kattam Matrimony/backups/
  kattam_backup_2026_08_15.db
  kattam_backup_2026_08_14.db
  ...  (auto-purged after 7 days)
```

- Only one backup is created per calendar day
- Files are written with `fsync()` to ensure physical disk persistence
- Backups older than **7 days** are automatically deleted on startup

---

## 📄 Data Entry Sections

The registration form is divided into clearly labelled sections:

1. **Personal & Family Details** — Name, Gender, DOB, Time of Birth, Place of Birth, Religion, Mother Tongue, Marital Status, Father/Mother info, Siblings
2. **Horoscope Details** — Caste, Sub-Caste, Gothram, Star, Raasi, Laknam, Dasa Balance, interactive Rasi & Amsam Kattam grids
3. **Education & Occupation** — Qualification, Occupation, Income, Work Location, Assets
4. **Physical Details** — Height, Weight, Complexion, Partner Expectations
5. **Communication** — Contact Person, Phone Number, Address
6. **Photo** — Candidate photo upload with preview

> **Auto-save**: All form data is automatically persisted to `localStorage` every 1.5 seconds. A "Restore Draft?" banner appears on next visit if an unsaved session is detected.

---

## 📋 Screens & Navigation

| Route | Page | Description |
|---|---|---|
| `/` | Dashboard | Stats overview (total/male/female), recent registrations, quick-action cards |
| `/add` | Data Entry | New candidate registration form |
| `/edit/:id` | Data Entry | Edit existing candidate profile |
| `/search` | Candidate Search | Paginated search with standard & advanced filters |
| `/profile/:id` | Profile View | Read-only profile display with Print & PDF export |

---

## 🌐 Internationalisation

The app supports **English** and **Tamil** through a lightweight custom i18n system:

- Language preference is toggled in the top navbar and persisted in `localStorage`
- All UI strings, labels, astrological terms, and planet names are translated
- Tamil script is rendered using Google Fonts' Noto Sans/Serif Tamil for legibility
- The `LanguageContext` (`useLanguage()`) hook provides `t(key)` and `setLanguage()` to all components

---

## 🏭 Build Output

| Platform | Format | Output Directory |
|---|---|---|
| Linux | `.AppImage`, `.deb` | `dist-electron/` |
| Windows | NSIS `.exe` installer | `dist-electron/` |
| macOS | `.dmg`, `.zip` (x64 & arm64) | `dist-electron/` |

The build uses `electron-builder` with ASAR packaging. The `sqlite3` native module is explicitly unpacked from ASAR to ensure correct loading:
```json
"asarUnpack": ["**/node_modules/sqlite3/**/*"]
```

---

## 📜 License

This project is licensed under the **MIT License** — see the [LICENSE](https://github.com/Vignesh-72/Kattam/blob/main/LICENSE) file for full details.

```
MIT License — Copyright (c) 2026 Vignesh-72
https://github.com/Vignesh-72/Kattam
```

You are free to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of this software, provided the copyright notice and permission notice are included in all copies or substantial portions of the Software.
