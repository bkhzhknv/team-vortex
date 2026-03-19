const db = require('./db');

// ── Haversine distance (meters) ─────────────────────────────
function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Queries ─────────────────────────────────────────────────
const stmts = {
  getAll: db.prepare('SELECT * FROM volunteers'),
  getById: db.prepare('SELECT * FROM volunteers WHERE id = ?'),
  getAvailable: db.prepare('SELECT * FROM volunteers WHERE available = 1'),
  setAvailability: db.prepare('UPDATE volunteers SET available = ? WHERE id = ?'),
  updateLocation: db.prepare('UPDATE volunteers SET lat = ?, lng = ? WHERE id = ?'),
};

function getAllVolunteers() {
  return stmts.getAll.all();
}

function getVolunteerById(id) {
  return stmts.getById.get(id);
}

function matchVolunteers(lat, lng, radiusMeters = 100) {
  const available = stmts.getAvailable.all();
  return available.filter((v) => {
    const dist = haversine(lat, lng, v.lat, v.lng);
    return dist <= radiusMeters;
  }).map((v) => ({
    ...v,
    distance: Math.round(haversine(lat, lng, v.lat, v.lng)),
  }));
}

function getNearbyVolunteers(lat, lng, radiusMeters = 2000) {
  const all = stmts.getAll.all();
  return all.map((v) => ({
    ...v,
    distance: Math.round(haversine(lat, lng, v.lat, v.lng)),
  })).filter((v) => v.distance <= radiusMeters);
}

module.exports = {
  getAllVolunteers,
  getVolunteerById,
  matchVolunteers,
  getNearbyVolunteers,
  haversine,
};
