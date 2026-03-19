const { v4: uuid } = require('uuid');
const db = require('./db');

// ── Camera locations in Taraz ───────────────────────────────
const CAMERAS = [
  { id: 'cam-01', name: 'Тole Bi & Abay Ave',        lat: 42.9012, lng: 71.3645 },
  { id: 'cam-02', name: 'Central Bazaar',             lat: 42.8995, lng: 71.3672 },
  { id: 'cam-03', name: 'Taraz Mall Entrance',        lat: 42.9035, lng: 71.3710 },
  { id: 'cam-04', name: 'City Park South Gate',       lat: 42.8968, lng: 71.3630 },
  { id: 'cam-05', name: 'Auezov Street Crossing',     lat: 42.9048, lng: 71.3590 },
  { id: 'cam-06', name: 'Hospital #3 Entrance',       lat: 42.8942, lng: 71.3700 },
  { id: 'cam-07', name: 'School #17 Pedestrian Zone', lat: 42.9060, lng: 71.3660 },
  { id: 'cam-08', name: 'Railway Station Square',     lat: 42.8980, lng: 71.3750 },
  { id: 'cam-09', name: 'Zhambyl Park Alley',         lat: 42.9020, lng: 71.3580 },
  { id: 'cam-10', name: 'Micro-district 5 Junction',  lat: 42.8955, lng: 71.3540 },
];

// ── Incident type definitions ───────────────────────────────
const RED_TYPES = [
  { type: 'Epileptic Seizure',  icon: '🧠' },
  { type: 'Heart Attack',       icon: '❤️' },
  { type: 'Child Near Road',    icon: '🚸' },
  { type: 'Person Collapsed',   icon: '🚨' },
  { type: 'Accident Detected',  icon: '💥' },
];

const YELLOW_TYPES = [
  { type: 'Wheelchair Blocked',    icon: '♿' },
  { type: 'Blind Person Off-Path', icon: '🦯' },
  { type: 'Elderly Fall',          icon: '🧓' },
  { type: 'Lost Child',            icon: '👶' },
  { type: 'Accessibility Hazard',  icon: '⚠️' },
];

// ── Prepared statements ─────────────────────────────────────
const stmts = {
  insert: db.prepare(`
    INSERT INTO incidents (id, type, priority, status, lat, lng, locationName, cameraId, heavyVolume, requiredVolunteers, acceptedVolunteers, dispatchAction, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
  `),
  getAll: db.prepare(`SELECT * FROM incidents ORDER BY createdAt DESC`),
  getActive: db.prepare(`SELECT * FROM incidents WHERE status != 'resolved' ORDER BY createdAt DESC`),
  getById: db.prepare(`SELECT * FROM incidents WHERE id = ?`),
  updateStatus: db.prepare(`UPDATE incidents SET status = ?, resolvedAt = ? WHERE id = ?`),
  updatePriority: db.prepare(`UPDATE incidents SET priority = ?, dispatchAction = ?, status = ? WHERE id = ?`),
  incrementVolunteers: db.prepare(`UPDATE incidents SET acceptedVolunteers = acceptedVolunteers + 1 WHERE id = ?`),
  getAssignments: db.prepare(`SELECT a.*, v.name, v.avatarColor FROM assignments a JOIN volunteers v ON a.volunteerId = v.id WHERE a.incidentId = ?`),
  deleteAllAssignments: db.prepare(`DELETE FROM assignments`),
  deleteAllIncidents: db.prepare(`DELETE FROM incidents`),
};

// ── CRUD ────────────────────────────────────────────────────
function getAllIncidents() {
  return stmts.getAll.all();
}

function getActiveIncidents() {
  return stmts.getActive.all();
}

function getIncidentById(id) {
  return stmts.getById.get(id);
}

function escalateIncident(id) {
  const incident = stmts.getById.get(id);
  if (!incident) return null;
  stmts.updatePriority.run('red', 'Dispatched to 102/103 — ESCALATED', 'dispatched', id);
  return stmts.getById.get(id);
}

function acceptVolunteer(incidentId, volunteerId) {
  const incident = stmts.getById.get(incidentId);
  if (!incident) return { error: 'Incident not found' };

  try {
    db.prepare('INSERT INTO assignments (incidentId, volunteerId, assignedAt) VALUES (?, ?, ?)')
      .run(incidentId, volunteerId, new Date().toISOString());
  } catch (e) {
    if (e.message.includes('UNIQUE')) return { error: 'Already assigned' };
    throw e;
  }

  stmts.incrementVolunteers.run(incidentId);
  const updated = stmts.getById.get(incidentId);

  // Auto-resolve if enough volunteers accepted
  if (updated.acceptedVolunteers >= updated.requiredVolunteers && updated.status === 'awaiting_volunteers') {
    stmts.updateStatus.run('in_progress', null, incidentId);
  }

  return { incident: stmts.getById.get(incidentId), assignments: stmts.getAssignments.all(incidentId) };
}

function getAssignments(incidentId) {
  return stmts.getAssignments.all(incidentId);
}

function resetDemo() {
  stmts.deleteAllAssignments.run();
  stmts.deleteAllIncidents.run();
  stopSimulation();
}

function createManualIncident({ type, priority, lat, lng, locationName, cameraId, heavyVolume, requiredVolunteers }) {
  const id = uuid();
  const now = new Date().toISOString();
  let dispatchAction = priority === 'red' ? 'Dispatched to 102/103' : 'Dispatched to Volunteer App';
  let status = priority === 'red' ? 'dispatched' : (heavyVolume ? 'awaiting_volunteers' : 'active');
  
  if (heavyVolume) {
    dispatchAction += ` — Status: Awaiting ${requiredVolunteers} Volunteers`;
  }

  stmts.insert.run(id, type, priority, status, lat, lng, locationName, cameraId, heavyVolume ? 1 : 0, requiredVolunteers || 1, dispatchAction, now);
  return stmts.getById.get(id);
}

// ── Simulation engine ───────────────────────────────────────
function generateIncident() {
  const isRed = Math.random() < 0.35;
  const pool = isRed ? RED_TYPES : YELLOW_TYPES;
  const chosen = pool[Math.floor(Math.random() * pool.length)];
  const camera = CAMERAS[Math.floor(Math.random() * CAMERAS.length)];
  const heavyVolume = Math.random() < 0.2 ? 1 : 0;

  const priority = isRed ? 'red' : 'yellow';
  const requiredVolunteers = heavyVolume ? 3 : 1;

  let dispatchAction;
  let status;
  if (priority === 'red') {
    dispatchAction = 'Dispatched to 102/103';
    status = 'dispatched';
  } else {
    dispatchAction = 'Dispatched to Volunteer App';
    status = heavyVolume ? 'awaiting_volunteers' : 'active';
  }

  if (heavyVolume) {
    dispatchAction += ' — Status: Awaiting 3 Volunteers';
  }

  // Jitter lat/lng slightly from camera position
  const lat = camera.lat + (Math.random() - 0.5) * 0.001;
  const lng = camera.lng + (Math.random() - 0.5) * 0.001;

  const id = uuid();
  const now = new Date().toISOString();

  stmts.insert.run(id, chosen.type, priority, status, lat, lng, camera.name, camera.id, heavyVolume, requiredVolunteers, dispatchAction, now);

  return {
    ...stmts.getById.get(id),
    icon: chosen.icon,
  };
}

let simulationTimer = null;

function startSimulation(onNewIncident) {
  function tick() {
    const incident = generateIncident();
    onNewIncident(incident);
    const delay = 8000 + Math.random() * 7000; // 8-15s
    simulationTimer = setTimeout(tick, delay);
  }
  tick();
}

function stopSimulation() {
  if (simulationTimer) clearTimeout(simulationTimer);
}

module.exports = {
  CAMERAS,
  getAllIncidents,
  getActiveIncidents,
  getIncidentById,
  escalateIncident,
  acceptVolunteer,
  getAssignments,
  generateIncident,
  startSimulation,
  stopSimulation,
  resetDemo,
  createManualIncident,
};
