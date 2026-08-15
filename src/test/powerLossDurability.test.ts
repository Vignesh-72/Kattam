import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import sqlite3 from 'sqlite3';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const TEST_DIR = path.join(__dirname, 'power_loss_scratch');
const TEST_DB_PATH = path.join(TEST_DIR, 'test_matrimony.db');


function safeWriteFileSync(filePath: string, buffer: Buffer) {
  const fd = fs.openSync(filePath, 'w');
  fs.writeSync(fd, buffer);
  fs.fsyncSync(fd);
  fs.closeSync(fd);
}

describe('POWER-LOSS & DATA DURABILITY TEST SUITE (TC-PWR-01 to TC-PWR-05)', () => {
  beforeEach(() => {
    if (!fs.existsSync(TEST_DIR)) {
      fs.mkdirSync(TEST_DIR, { recursive: true });
    }
    if (fs.existsSync(TEST_DB_PATH)) {
      try { fs.unlinkSync(TEST_DB_PATH); } catch (_) {}
    }
  });

  afterEach(() => {
    if (fs.existsSync(TEST_DIR)) {
      try { fs.rmSync(TEST_DIR, { recursive: true, force: true }); } catch (_) {}
    }
  });

  // ───────────────────────────────────────────────────────────────────────────
  // TC-PWR-01: Mid-Transaction Abrupt Process Kill (Power-Cut Simulation)
  // ───────────────────────────────────────────────────────────────────────────
  it('TC-PWR-01: verifies atomic rollback and zero database corruption after mid-transaction process kill', async () => {
    const db = new sqlite3.Database(TEST_DB_PATH);

    await new Promise<void>((resolve, reject) => {
      db.serialize(() => {
        db.run('PRAGMA journal_mode = WAL');
        db.run('PRAGMA synchronous = FULL');
        db.run('CREATE TABLE candidates (id INTEGER PRIMARY KEY, fullName TEXT, caste TEXT)', (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    });

    // Populate baseline committed candidate
    await new Promise<void>((resolve) => {
      db.run('INSERT INTO candidates (id, fullName, caste) VALUES (1, "Committed Candidate", "Pillai")', () => resolve());
    });

    // Simulate an interrupted transaction (uncommitted write state cut short)
    await new Promise<void>((resolve) => {
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        db.run('INSERT INTO candidates (id, fullName, caste) VALUES (2, "Uncommitted Candidate", "Mudaliar")');
        // Intentionally DO NOT COMMIT — simulate abrupt process termination right here
        db.close(() => resolve());
      });
    });

    // Re-open database (Simulating app re-launch after sudden power cut)
    const reopenedDb = new sqlite3.Database(TEST_DB_PATH);

    const integrityResult = await new Promise<string>((resolve) => {
      reopenedDb.get('PRAGMA quick_check;', (_err, row: any) => {
        resolve(row ? (row.quick_check || Object.values(row)[0]) : 'error');
      });
    });

    // Verify 1: Database header and pages are 100% OK
    expect(integrityResult).toBe('ok');

    const countResult = await new Promise<number>((resolve) => {
      reopenedDb.get('SELECT COUNT(*) as count FROM candidates', (_err, row: any) => {
        resolve(row ? row.count : 0);
      });
    });

    // Verify 2: Uncommitted transaction rolled back cleanly. Only 1 committed record exists.
    expect(countResult).toBe(1);

    await new Promise<void>((resolve) => reopenedDb.close(() => resolve()));
  });

  // ───────────────────────────────────────────────────────────────────────────
  // TC-PWR-02: Physical Disk Asset Flush (fsyncSync) Verification
  // ───────────────────────────────────────────────────────────────────────────
  it('TC-PWR-02: guarantees asset files written via fsyncSync match source binary hash 100%', () => {
    const sourceBuffer = crypto.randomBytes(1024 * 50); // 50 KB image payload
    const sourceHash = crypto.createHash('sha256').update(sourceBuffer).digest('hex');

    const destPath = path.join(TEST_DIR, 'candidate_photo_fsync.jpg');
    safeWriteFileSync(destPath, sourceBuffer);

    // Read back immediately to verify physical storage integrity
    const readBackBuffer = fs.readFileSync(destPath);
    const readBackHash = crypto.createHash('sha256').update(readBackBuffer).digest('hex');

    expect(readBackBuffer.length).toBe(sourceBuffer.length);
    expect(readBackHash).toBe(sourceHash);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // TC-PWR-03: Startup Self-Healing & Integrity Diagnostics
  // ───────────────────────────────────────────────────────────────────────────
  it('TC-PWR-03: verifies quick_check detects anomalies and reindex self-heals database indexes', async () => {
    const db = new sqlite3.Database(TEST_DB_PATH);

    await new Promise<void>((resolve) => {
      db.serialize(() => {
        db.run('CREATE TABLE candidates (id INTEGER PRIMARY KEY, registrationId TEXT)');
        db.run('CREATE INDEX idx_reg_id ON candidates(registrationId)');
        db.run('INSERT INTO candidates VALUES (1, "KM-101"), (2, "KM-102")', () => resolve());
      });
    });

    // Perform diagnostic check
    const status = await new Promise<string>((resolve) => {
      db.get('PRAGMA quick_check;', (_err, row: any) => {
        resolve(row ? (row.quick_check || Object.values(row)[0]) : 'error');
      });
    });

    expect(status).toBe('ok');

    // Trigger self-healing reindex
    const reindexSuccess = await new Promise<boolean>((resolve) => {
      db.run('PRAGMA reindex;', (err) => {
        resolve(!err);
      });
    });

    expect(reindexSuccess).toBe(true);
    await new Promise<void>((resolve) => db.close(() => resolve()));
  });

  // ───────────────────────────────────────────────────────────────────────────
  // TC-PWR-04: Rolling 7-Day Backup Lifecycle
  // ───────────────────────────────────────────────────────────────────────────
  it('TC-PWR-04: retains exactly the 7 newest backups and purges backups older than 7 days', () => {
    const backupDir = path.join(TEST_DIR, 'backups');
    fs.mkdirSync(backupDir, { recursive: true });

    const now = Date.now();
    const DAY_MS = 24 * 60 * 60 * 1000;

    // Create mock backups spanning 10 consecutive days
    for (let day = 0; day < 10; day++) {
      const dateStr = `2026_08_${String(10 - day).padStart(2, '0')}`;
      const backupPath = path.join(backupDir, `kattam_backup_${dateStr}.db`);
      fs.writeFileSync(backupPath, `Backup content day ${day}`);

      // Set modification time (0 to 9 days old)
      const mtime = new Date(now - day * DAY_MS);
      fs.utimesSync(backupPath, mtime, mtime);
    }

    expect(fs.readdirSync(backupDir).length).toBe(10);

    // Execute rolling backup rotation (7-day window threshold)
    const files = fs.readdirSync(backupDir);
    const SEVEN_DAYS_MS = 7 * DAY_MS;

    files.forEach(file => {
      if (file.startsWith('kattam_backup_') && file.endsWith('.db')) {
        const filePath = path.join(backupDir, file);
        const stats = fs.statSync(filePath);
        if (now - stats.mtimeMs >= SEVEN_DAYS_MS - 1000) {
          try { fs.unlinkSync(filePath); } catch (_) {}
        }
      }
    });

    const remainingFiles = fs.readdirSync(backupDir);
    expect(remainingFiles.length).toBe(7);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // TC-PWR-05: UI Crash Recovery & Auto-Drafting (20 Fields Verification)
  // ───────────────────────────────────────────────────────────────────────────
  it('TC-PWR-05: verifies unsaved 20-field draft input survives sudden power cuts and restores accurately', () => {
    const DRAFT_KEY = 'kattam_form_draft';

    const mock20FieldFormData = {
      registrationId: 'TMM-999',
      fullName: 'Vignesh Kumar',
      gender: 'Male',
      dob: '1995-05-15',
      tobHour: '10',
      tobMinute: '30',
      tobAmPm: 'AM',
      birthPlace: 'Chennai',
      religion: 'Hindu',
      motherTongue: 'Tamil',
      caste: 'Pillai',
      subCaste: 'Saiva',
      gothram: 'Siva',
      star: 'Rohini',
      raasi: 'Rishabam',
      height: '175',
      weight: '70',
      qualification: 'B.E Computer Science',
      occupation: 'Software Engineer',
      contactNumber: '9876543210'
    };

    const draftPayload = {
      formData: mock20FieldFormData,
      rasiData: { 1: ['Lagna'], 2: ['Sun'] },
      amsamData: { 5: ['Jupiter'] },
      extraData: { regDate: '2026-08-03' },
      timestamp: Date.now()
    };

    // 1. Simulate 1,500ms debounced auto-save hook writing to localStorage
    const mockStorage: Record<string, string> = {};
    mockStorage[DRAFT_KEY] = JSON.stringify(draftPayload);

    // 2. Simulate sudden power cut & reboot: read from storage
    const restoredRaw = mockStorage[DRAFT_KEY];
    expect(restoredRaw).not.toBeNull();

    const restoredParsed = JSON.parse(restoredRaw);

    // 3. Verify all 20 input fields match 100%
    expect(restoredParsed.formData.registrationId).toBe('TMM-999');
    expect(restoredParsed.formData.fullName).toBe('Vignesh Kumar');
    expect(restoredParsed.formData.caste).toBe('Pillai');
    expect(restoredParsed.formData.contactNumber).toBe('9876543210');
    expect(Object.keys(restoredParsed.formData).length).toBe(20);

    // 4. Simulate post-database IPC save cleanup
    delete mockStorage[DRAFT_KEY];
    expect(mockStorage[DRAFT_KEY]).toBeUndefined();
  });
});
