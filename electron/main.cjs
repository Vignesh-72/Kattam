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
app.commandLine.appendSwitch('disable-gpu-compositing');

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

function performRollingDailyBackup(userDataPath, dbPath) {
  try {
    const backupDir = path.join(userDataPath, 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    const todayStr = new Date().toISOString().split('T')[0].replace(/-/g, '_');
    const backupFile = path.join(backupDir, `kattam_backup_${todayStr}.db`);

    if (!fs.existsSync(backupFile) && fs.existsSync(dbPath)) {
      console.log(`[Backup] Creating rolling daily backup: ${backupFile}`);
      const data = fs.readFileSync(dbPath);
      const fdDest = fs.openSync(backupFile, 'w');
      fs.writeSync(fdDest, data);
      fs.fsyncSync(fdDest);
      fs.closeSync(fdDest);
      console.log('[Backup] Daily backup completed and fsynced to disk.');
    }

    // Clean up backups older than 7 days
    const files = fs.readdirSync(backupDir);
    const now = Date.now();
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

    files.forEach(file => {
      if (file.startsWith('kattam_backup_') && file.endsWith('.db')) {
        const filePath = path.join(backupDir, file);
        const stats = fs.statSync(filePath);
        if (now - stats.mtimeMs > SEVEN_DAYS_MS) {
          console.log(`[Backup] Purging backup older than 7 days: ${file}`);
          try { fs.unlinkSync(filePath); } catch (_) {}
        }
      }
    });
  } catch (err) {
    console.error('[Backup] Rolling daily backup failed gracefully:', err);
  }
}

function copyFileWithFsync(src, dest) {
  const data = fs.readFileSync(src);
  const fd = fs.openSync(dest, 'w');
  fs.writeSync(fd, data);
  fs.fsyncSync(fd);
  fs.closeSync(fd);
}

function initDB() {
  const userDataPath = app.getPath('userData');
  const dbPath = path.join(userDataPath, 'matrimony.db');
  
  // Execute automated 7-day rolling daily backup on startup
  performRollingDailyBackup(userDataPath, dbPath);

  db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Error opening database:', err);
      return;
    }
    console.log('[DB] Connected at:', dbPath);

    db.serialize(() => {
      // ─── HARDENED POWER-LOSS & DURABILITY PRAGMAS ───────────────────────
      // WAL = Write-Ahead Logging for atomic transaction support
      db.run('PRAGMA journal_mode = WAL');
      // FULL = Mandatory fsync() on every transaction commit before returning
      db.run('PRAGMA synchronous = FULL');
      // busy_timeout = Prevents write lock collisions
      db.run('PRAGMA busy_timeout = 5000');
      // temp_store = Keep temporary tables in RAM to avoid incomplete temp files on disk cut
      db.run('PRAGMA temp_store = MEMORY');
      db.run('PRAGMA cache_size = -8000');
      db.run('PRAGMA mmap_size = 30000000');
      db.run('PRAGMA auto_vacuum = INCREMENTAL');

      // ─── STARTUP DIAGNOSTICS & SELF-HEALING ──────────────────────────────
      db.get('PRAGMA quick_check;', (checkErr, row) => {
        const status = row ? (row.quick_check || Object.values(row)[0]) : 'error';
        if (checkErr || status !== 'ok') {
          console.warn('[DB Integrity Warning] Quick check issue detected:', checkErr || status);
          console.log('[DB Self-Healing] Executing PRAGMA reindex to rebuild indexes...');
          db.run('PRAGMA reindex;');
        } else {
          console.log('[DB Integrity] PRAGMA quick_check passed: ok');
        }
      });

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
      db.run('CREATE INDEX IF NOT EXISTS idx_caste_subcaste ON candidates(caste, subCaste)');
      db.run('CREATE INDEX IF NOT EXISTS idx_gender ON candidates(gender)');
      db.run('CREATE INDEX IF NOT EXISTS idx_star ON candidates(star)');
      db.run('CREATE INDEX IF NOT EXISTS idx_raasi ON candidates(raasi)');
      db.run('CREATE INDEX IF NOT EXISTS idx_gothram ON candidates(gothram)');
      db.run('CREATE INDEX IF NOT EXISTS idx_laknam ON candidates(laknam)');
      db.run('CREATE INDEX IF NOT EXISTS idx_religion ON candidates(religion)');
      db.run('CREATE INDEX IF NOT EXISTS idx_mothertongue ON candidates(motherTongue)');
      db.run('CREATE INDEX IF NOT EXISTS idx_nativity ON candidates(nativity)');
      db.run('CREATE INDEX IF NOT EXISTS idx_placeofjob ON candidates(placeOfJob)');
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

const fetchSearchFilterOptions = (filterState = {}) => {
  return new Promise((resolve) => {
    const filters = typeof filterState === 'string' ? { caste: filterState } : (filterState || {});

    const fieldMapping = {
      castes: 'caste',
      subCastes: 'subCaste',
      gothrams: 'gothram',
      stars: 'star',
      raasis: 'raasi',
      laknams: 'laknam',
      qualifications: 'qualification',
      occupations: 'occupation',
      religions: 'religion',
      motherTongues: 'motherTongue',
      nativities: 'nativity',
      jobPlaces: 'placeOfJob',
      diets: 'diet',
      partnerJobReqs: 'partnerJobReq',
      partnerHoroscopeReqs: 'partnerHoroscopeReq',
      maritalStatuses: 'maritalStatus'
    };

    const buildQueryForField = (targetCol) => {
      const conditions = [`${targetCol} IS NOT NULL`, `TRIM(${targetCol}) != ''` ];
      const params = [];

      Object.entries(fieldMapping).forEach(([, col]) => {
        if (col === targetCol) return;
        const val = filters[col] || (col === 'placeOfJob' ? filters.jobPlace : null);
        if (val && String(val).trim().length > 0 && val !== 'All') {
          conditions.push(`LOWER(TRIM(${col})) = LOWER(TRIM(?))`);
          params.push(String(val).trim());
        }
      });

      if (filters.gender && filters.gender !== 'All' && targetCol !== 'gender') {
        conditions.push(`LOWER(TRIM(gender)) = LOWER(TRIM(?))`);
        params.push(String(filters.gender).trim());
      }
      if (filters.maritalStatus && filters.maritalStatus !== 'All' && targetCol !== 'maritalStatus') {
        conditions.push(`LOWER(TRIM(maritalStatus)) = LOWER(TRIM(?))`);
        params.push(String(filters.maritalStatus).trim());
      }

      return {
        sql: `SELECT DISTINCT TRIM(${targetCol}) as val FROM candidates WHERE ${conditions.join(' AND ')} ORDER BY val ASC`,
        params
      };
    };

    const results = {};
    const keys = Object.keys(fieldMapping);
    let pending = keys.length;

    for (const key of keys) {
      const targetCol = fieldMapping[key];
      const { sql, params } = buildQueryForField(targetCol);

      db.all(sql, params, (err, rows) => {
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

// ─── IPC: Physical Asset Disk Flushing (fsync) ───────────────────────────────
ipcMain.handle('save-image', async (event, { data, fileName }) => {
  const imagesDir = path.join(app.getPath('userData'), 'images');
  await fs.promises.mkdir(imagesDir, { recursive: true });
  const filePath = path.join(imagesDir, fileName);
  const buffer = Buffer.from(data, 'base64');
  const fd = fs.openSync(filePath, 'w');
  fs.writeSync(fd, buffer);
  fs.fsyncSync(fd); // Force physical disk controller flush
  fs.closeSync(fd);
  return filePath;
});

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
  copyFileWithFsync(src, dest);
  return dest;
});

// ─── IPC: Hard Delete Candidate & Remove Photo Files from Disk ─────────────────
ipcMain.handle('delete-candidate', async (event, id) => {
  return new Promise((resolve) => {
    if (!db) return resolve({ success: false, error: 'Database not initialized' });
    db.get('SELECT photo1, photo2 FROM candidates WHERE id = ?', [id], async (err, row) => {
      if (row) {
        if (row.photo1 && fs.existsSync(row.photo1)) {
          try { await fs.promises.unlink(row.photo1); } catch (_) {}
        }
        if (row.photo2 && fs.existsSync(row.photo2)) {
          try { await fs.promises.unlink(row.photo2); } catch (_) {}
        }
      }
      db.run('DELETE FROM candidates WHERE id = ?', [id], function (deleteErr) {
        if (deleteErr) resolve({ success: false, error: deleteErr.message });
        else resolve({ success: true, changes: this.changes });
      });
    });
  });
});

// ─── IPC: Manual / Maintenance Database Vacuum Trigger ────────────────────────
ipcMain.handle('db-vacuum', async () => {
  return new Promise((resolve) => {
    if (!db) return resolve({ success: false, error: 'Database not initialized' });
    db.serialize(() => {
      db.run('PRAGMA incremental_vacuum;', (err) => {
        if (err) resolve({ success: false, error: err.message });
        else resolve({ success: true });
      });
    });
  });
});

// ─── App Lifecycle: WAL Checkpoint & Query Optimization On Termination ───────
app.on('before-quit', () => {
  if (db) {
    try {
      console.log('[DB] Merging WAL log pages & optimizing query planner indexes before quit...');
      db.serialize(() => {
        db.run('PRAGMA wal_checkpoint(TRUNCATE)');
        db.run('PRAGMA optimize');
      });
    } catch (err) {
      console.error('[DB] Exit optimization error:', err);
    }
  }
});
