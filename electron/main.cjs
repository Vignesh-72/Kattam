const { app, BrowserWindow, ipcMain, protocol, dialog } = require('electron');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';

// ─── PERF-03: V8 Aggressive GC for 2GB RAM systems ───────────────────────────
// Forces Chromium to cap heap at 256MB and aggressively GC before Windows
// pages V8 heap to pagefile.sys (which causes 1–3s freeze spikes on slow HDDs).
app.commandLine.appendSwitch('js-flags',
  '--max-old-space-size=256 --optimize-for-size --gc-global'
);
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('force-color-profile', 'srgb');

// Disable hardware GPU acceleration to eliminate viz_main_impl crashes on integrated/Linux GPUs
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-software-rasterizer');
app.commandLine.appendSwitch('disable-gpu-sandbox');

let mainWindow;
let db;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 1024,   // CSS-01/02: enforce minimum matching target hardware
    minHeight: 768,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false, // prevents debounce timer drift when unfocused
      spellcheck: false,           // saves ~20MB RAM — not needed in a data entry app
    }
  });

  const isDev = process.env.NODE_ENV !== 'production' && !app.isPackaged;
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

// ─── ARCH-01: Schema Migration System ────────────────────────────────────────
// Uses PRAGMA user_version as a schema version counter.
// Add new migrations as `if (v < N)` blocks. Never modify existing blocks.
function runMigrations(db) {
  db.get('PRAGMA user_version', (err, row) => {
    if (err) { console.error('Migration read error:', err); return; }
    const v = row.user_version;
    console.log(`[DB] Current schema version: ${v}`);

    db.serialize(() => {
      if (v < 1) {
        console.log('[DB] Applying migration v1: initial schema stamp');
        // v1 = initial schema, table already created in initDB before this runs
        db.run('PRAGMA user_version = 1');
      }
      // Future migrations go here:
      // if (v < 2) {
      //   db.run('ALTER TABLE candidates ADD COLUMN newField TEXT DEFAULT ""');
      //   db.run('PRAGMA user_version = 2');
      // }
    });
  });
}

function initDB() {
  const dbPath = path.join(app.getPath('userData'), 'matrimony.db');
  db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Error opening database:', err);
      return;
    }
    console.log('[DB] Connected at:', dbPath);

    db.serialize(() => {
      // ─── MEM-03: WAL mode + Performance PRAGMAs ──────────────────────────
      // WAL = Write-Ahead Logging: non-blocking writes on slow HDDs.
      // Without WAL, every INSERT locks the entire .db file for 20–150ms.
      db.run('PRAGMA journal_mode = WAL');
      db.run('PRAGMA synchronous = NORMAL');  // Faster than FULL, still crash-safe
      db.run('PRAGMA cache_size = -8000');    // 8MB page cache held in RAM
      db.run('PRAGMA temp_store = MEMORY');   // Temp tables go to RAM, not disk
      db.run('PRAGMA mmap_size = 30000000');  // 30MB memory-mapped I/O

      // ─── Main candidates table ────────────────────────────────────────────
      db.run(`
        CREATE TABLE IF NOT EXISTS candidates (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          registrationId TEXT UNIQUE,
          fullName TEXT NOT NULL,
          gender TEXT,
          dob TEXT,
          tobHour TEXT,
          tobMinute TEXT,
          tobAmPm TEXT,
          birthPlace TEXT,
          birthLat TEXT,
          birthLon TEXT,
          religion TEXT,
          nativity TEXT,
          motherTongue TEXT,
          maritalStatus TEXT,

          fatherName TEXT,
          fatherAlive TEXT,
          fatherJob TEXT,
          motherName TEXT,
          motherAlive TEXT,
          motherJob TEXT,

          siblings TEXT,
          additionalInfo TEXT,

          height TEXT,
          weight TEXT,
          bloodGroup TEXT,
          diet TEXT,
          disability TEXT,
          complexion TEXT,

          qualification TEXT,
          occupation TEXT,
          placeOfJob TEXT,
          income TEXT,
          assets TEXT,

          caste TEXT,
          subCaste TEXT,
          gothram TEXT,
          star TEXT,
          raasi TEXT,
          padam TEXT,
          laknam TEXT,

          horoscopeBalance TEXT,
          rasiKattam TEXT,
          amsamKattam TEXT,

          permanentAddress TEXT,
          presentAddress TEXT,
          contactPerson TEXT,
          contactNumber TEXT,

          partnerQualification TEXT,
          partnerJob TEXT,
          partnerJobReq TEXT,
          partnerIncome TEXT,
          partnerAgeFrom TEXT,
          partnerAgeTo TEXT,
          partnerDiet TEXT,
          partnerHoroscopeReq TEXT,
          partnerMaritalStatus TEXT,
          partnerCaste TEXT,
          partnerSubCaste TEXT,
          partnerComments TEXT,

          photo1 TEXT,
          photo2 TEXT,

          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // ─── MEM-03: Indexes ──────────────────────────────────────────────────
      // Single-column indexes for sort/exact lookups
      db.run('CREATE INDEX IF NOT EXISTS idx_name ON candidates(fullName)');
      db.run('CREATE INDEX IF NOT EXISTS idx_contact ON candidates(contactNumber)');
      db.run('CREATE INDEX IF NOT EXISTS idx_regid ON candidates(registrationId)');
      db.run('CREATE INDEX IF NOT EXISTS idx_caste ON candidates(caste)');
      db.run('CREATE INDEX IF NOT EXISTS idx_subcaste ON candidates(subCaste)');
      db.run('CREATE INDEX IF NOT EXISTS idx_gender ON candidates(gender)');
      db.run('CREATE INDEX IF NOT EXISTS idx_star ON candidates(star)');
      db.run('CREATE INDEX IF NOT EXISTS idx_raasi ON candidates(raasi)');
      db.run('CREATE INDEX IF NOT EXISTS idx_marital ON candidates(maritalStatus)');
      db.run('CREATE INDEX IF NOT EXISTS idx_created ON candidates(createdAt)');
      // Composite index for common matrimonial search queries
      db.run('CREATE INDEX IF NOT EXISTS idx_candidate_search ON candidates(gender, caste, registrationId)');
      db.run('CREATE INDEX IF NOT EXISTS idx_adv_filter ON candidates(gender, caste, maritalStatus)');
    });

    // Run migrations after table is guaranteed to exist
    runMigrations(db);
  });
}

app.whenReady().then(() => {
  initDB();

  // Register local file protocol to serve images from userData
  protocol.registerFileProtocol('local-file', (request, callback) => {
    const url = request.url.replace('local-file://', '');
    try {
      return callback(decodeURIComponent(url));
    } catch (error) {
      console.error('Error handling local-file protocol:', error);
      return callback(404);
    }
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ─── IPC: Database Handlers ───────────────────────────────────────────────────

ipcMain.handle('db:run', (event, query, params) => {
  return new Promise((resolve, reject) => {
    db.run(query, params, function(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
});

ipcMain.handle('db:all', (event, query, params) => {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
});

ipcMain.handle('db:get', (event, query, params) => {
  return new Promise((resolve, reject) => {
    db.get(query, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
});

const fetchSearchFilterOptions = (selectedCaste) => {
  return new Promise((resolve) => {
    const subCasteSql = selectedCaste
      ? "SELECT DISTINCT TRIM(subCaste) as val FROM candidates WHERE LOWER(TRIM(caste)) = LOWER(TRIM(?)) AND subCaste IS NOT NULL AND TRIM(subCaste) != '' ORDER BY val ASC"
      : "SELECT DISTINCT TRIM(subCaste) as val FROM candidates WHERE subCaste IS NOT NULL AND TRIM(subCaste) != '' ORDER BY val ASC";

    const queries = {
      castes: { sql: "SELECT DISTINCT TRIM(caste) as val FROM candidates WHERE caste IS NOT NULL AND TRIM(caste) != '' ORDER BY val ASC", params: [] },
      subCastes: { sql: subCasteSql, params: selectedCaste ? [selectedCaste] : [] },
      gothrams: { sql: "SELECT DISTINCT TRIM(gothram) as val FROM candidates WHERE gothram IS NOT NULL AND TRIM(gothram) != '' ORDER BY val ASC", params: [] },
      stars: { sql: "SELECT DISTINCT TRIM(star) as val FROM candidates WHERE star IS NOT NULL AND TRIM(star) != '' ORDER BY val ASC", params: [] },
      raasis: { sql: "SELECT DISTINCT TRIM(raasi) as val FROM candidates WHERE raasi IS NOT NULL AND TRIM(raasi) != '' ORDER BY val ASC", params: [] },
      laknams: { sql: "SELECT DISTINCT TRIM(laknam) as val FROM candidates WHERE laknam IS NOT NULL AND TRIM(laknam) != '' ORDER BY val ASC", params: [] },
      qualifications: { sql: "SELECT DISTINCT TRIM(qualification) as val FROM candidates WHERE qualification IS NOT NULL AND TRIM(qualification) != '' ORDER BY val ASC", params: [] },
      occupations: { sql: "SELECT DISTINCT TRIM(occupation) as val FROM candidates WHERE occupation IS NOT NULL AND TRIM(occupation) != '' ORDER BY val ASC", params: [] },
      religions: { sql: "SELECT DISTINCT TRIM(religion) as val FROM candidates WHERE religion IS NOT NULL AND TRIM(religion) != '' ORDER BY val ASC", params: [] },
      motherTongues: { sql: "SELECT DISTINCT TRIM(motherTongue) as val FROM candidates WHERE motherTongue IS NOT NULL AND TRIM(motherTongue) != '' ORDER BY val ASC", params: [] },
      nativities: { sql: "SELECT DISTINCT TRIM(nativity) as val FROM candidates WHERE nativity IS NOT NULL AND TRIM(nativity) != '' ORDER BY val ASC", params: [] },
      jobPlaces: { sql: "SELECT DISTINCT TRIM(placeOfJob) as val FROM candidates WHERE placeOfJob IS NOT NULL AND TRIM(placeOfJob) != '' ORDER BY val ASC", params: [] }
    };

    const results = {};
    const keys = Object.keys(queries);
    let pending = keys.length;

    for (const key of keys) {
      const q = queries[key];
      db.all(q.sql, q.params, (err, rows) => {
        if (!err && rows) {
          results[key] = rows.map(r => r.val).filter(v => v && String(v).trim().length > 0);
        } else {
          results[key] = [];
        }
        pending--;
        if (pending === 0) resolve(results);
      });
    }
  });
};

ipcMain.handle('db:getSearchOptions', (event, selectedCaste) => fetchSearchFilterOptions(selectedCaste));
ipcMain.handle('get-search-filter-options', (event, selectedCaste) => fetchSearchFilterOptions(selectedCaste));

// ─── IPC: MEM-01 Fix — Async image save (replaces blocking writeFileSync) ────
ipcMain.handle('save-image', async (event, { data, fileName }) => {
  const imagesDir = path.join(app.getPath('userData'), 'images');
  await fs.promises.mkdir(imagesDir, { recursive: true });
  const filePath = path.join(imagesDir, fileName);
  // MEM-01: was fs.writeFileSync — blocked main thread for 200–800ms on HDD
  await fs.promises.writeFile(filePath, Buffer.from(data, 'base64'));
  return filePath;
});

// ─── IPC: MEM-02 + MEM-05 Fix — Zero-memory photo upload via dialog ──────────
// Opens native OS file picker. Only a file path string (~80 bytes) crosses the
// IPC boundary — eliminates the 14.8MB structured-clone burst from Base64 transfer.
ipcMain.handle('pick-and-save-image', async (event, fileName) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Candidate Photo',
    properties: ['openFile'],
    filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp'] }]
  });
  if (result.canceled || result.filePaths.length === 0) return null;

  const src = result.filePaths[0];
  const imagesDir = path.join(app.getPath('userData'), 'images');
  await fs.promises.mkdir(imagesDir, { recursive: true });
  const dest = path.join(imagesDir, fileName);
  await fs.promises.copyFile(src, dest);
  return dest;
});
