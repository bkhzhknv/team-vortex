const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'jyldam.db');
const db = new Database(dbPath);

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');

// ── Schema ──────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS incidents (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    priority TEXT NOT NULL CHECK(priority IN ('red','yellow','green')),
    status TEXT NOT NULL DEFAULT 'active',
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    locationName TEXT,
    cameraId TEXT,
    heavyVolume INTEGER DEFAULT 0,
    requiredVolunteers INTEGER DEFAULT 1,
    acceptedVolunteers INTEGER DEFAULT 0,
    dispatchAction TEXT,
    createdAt TEXT NOT NULL,
    resolvedAt TEXT
  );

  CREATE TABLE IF NOT EXISTS volunteers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    avatarColor TEXT NOT NULL,
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    available INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    incidentId TEXT NOT NULL,
    volunteerId TEXT NOT NULL,
    assignedAt TEXT NOT NULL,
    FOREIGN KEY (incidentId) REFERENCES incidents(id),
    FOREIGN KEY (volunteerId) REFERENCES volunteers(id),
    UNIQUE(incidentId, volunteerId)
  );
`);

// ── Seed volunteers if table is empty ───────────────────────
const count = db.prepare('SELECT COUNT(*) as c FROM volunteers').get().c;
if (count === 0) {
  const insert = db.prepare(
    'INSERT INTO volunteers (id, name, avatarColor, lat, lng) VALUES (?, ?, ?, ?, ?)'
  );

  // 12 volunteers scattered around Taraz (42.9000, 71.3667)
  const volunteers = [
    ['v1',  'Aisha K.',     '#6C63FF', 42.9015, 71.3680],
    ['v2',  'Daulet M.',    '#FF6584', 42.8985, 71.3650],
    ['v3',  'Zarina T.',    '#00C9A7', 42.9030, 71.3700],
    ['v4',  'Bolat S.',     '#FFC75F', 42.8970, 71.3620],
    ['v5',  'Madina R.',    '#845EC2', 42.9045, 71.3640],
    ['v6',  'Yerlan A.',    '#FF9671', 42.8960, 71.3710],
    ['v7',  'Kamila N.',    '#00D2FC', 42.9010, 71.3590],
    ['v8',  'Timur B.',     '#F9F871', 42.9025, 71.3730],
    ['v9',  'Saule D.',     '#D65DB1', 42.8990, 71.3550],
    ['v10', 'Arman Z.',     '#FF6F91', 42.9050, 71.3670],
    ['v11', 'Gulnara P.',   '#2C73D2', 42.8940, 71.3690],
    ['v12', 'Nursultan O.', '#0081CF', 42.9005, 71.3760],
  ];

  const insertMany = db.transaction((rows) => {
    for (const r of rows) insert.run(...r);
  });
  insertMany(volunteers);
  console.log('✅ Seeded 12 volunteers into database');
}

module.exports = db;
