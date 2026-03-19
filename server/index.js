const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const incidents = require('./incidents');
const volunteers = require('./volunteers');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

app.use(cors());
app.use(express.json());

const db = require('./db');

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
  const found = db.state.operators.find(o => o.username === username && o.password === password);
  if (!found) return res.status(401).json({ error: 'Invalid credentials' });
  const { password: _, ...safe } = found;
  res.json({ token: Buffer.from(JSON.stringify(safe)).toString('base64'), user: safe });
});

app.get('/api/volunteers/stats', (req, res) => {
  const all = volunteers.getAllVolunteers();
  const available = all.filter(v => v.available === 1);
  res.json({ total: all.length, available: available.length, onDuty: all.length - available.length });
});

app.post('/api/incident', (req, res) => {
  const d = req.body;
  if (!d.incident_type) return res.status(400).json({ error: 'incident_type required' });

  const priorityMap = { critical: 'red', high: 'red', medium: 'yellow', low: 'yellow' };
  const priority = priorityMap[d.severity] || 'yellow';
  const camera = incidents.CAMERAS.find(c => c.id === d.source_id) || incidents.CAMERAS[0];

  const newIncident = incidents.createManualIncident({
    type: d.incident_type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    priority,
    lat: camera.lat + (Math.random() - 0.5) * 0.001,
    lng: camera.lng + (Math.random() - 0.5) * 0.001,
    locationName: d.location_label || camera.name,
    cameraId: d.source_id || camera.id,
    heavyVolume: false,
    requiredVolunteers: 1,
  });

  io.emit('incident:new', newIncident);

  if (priority === 'red') {
    const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const TELEGRAM_CHAT = process.env.TELEGRAM_CHAT_ID;
    if (TELEGRAM_TOKEN && TELEGRAM_CHAT && TELEGRAM_TOKEN !== 'YOUR_BOT_TOKEN_HERE') {
      const msg = `🚨 *JYLDAM ALERT*\n\n🔴 *${newIncident.type}*\n📍 ${newIncident.locationName}\n⏱ ${new Date().toLocaleTimeString()}\n🆔 Camera: ${newIncident.cameraId}\n\nConfidence: ${((d.confidence || 0) * 100).toFixed(0)}%`;
      fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: TELEGRAM_CHAT, text: msg, parse_mode: 'Markdown' }),
      }).catch(err => console.error('Telegram error:', err.message));
    }

    const nearby = volunteers.matchVolunteers(newIncident.lat, newIncident.lng, 500);
    io.emit('volunteer:urgent_ping', { incident: newIncident, nearbyVolunteers: nearby });
  }

  console.log(`📹 [CAMERA ${priority.toUpperCase()}] ${newIncident.type} @ ${newIncident.locationName}`);
  res.json(newIncident);
});

// ── REST API ────────────────────────────────────────────────

// Get all active incidents
app.get('/api/incidents', (req, res) => {
  res.json(incidents.getActiveIncidents());
});

// Get all incidents (including resolved)
app.get('/api/incidents/all', (req, res) => {
  res.json(incidents.getAllIncidents());
});

// Get single incident with assignments
app.get('/api/incidents/:id', (req, res) => {
  const incident = incidents.getIncidentById(req.params.id);
  if (!incident) return res.status(404).json({ error: 'Not found' });
  const assignments = incidents.getAssignments(req.params.id);
  res.json({ ...incident, assignments });
});

// Volunteer accepts a task
app.post('/api/incidents/:id/accept', (req, res) => {
  const { volunteerId } = req.body;
  if (!volunteerId) return res.status(400).json({ error: 'volunteerId required' });

  const result = incidents.acceptVolunteer(req.params.id, volunteerId);
  if (result.error) return res.status(400).json(result);

  // Broadcast update
  io.emit('incident:updated', result.incident);
  res.json(result);
});

// Escalate incident (SOS)
app.post('/api/incidents/:id/escalate', (req, res) => {
  const updated = incidents.escalateIncident(req.params.id);
  if (!updated) return res.status(404).json({ error: 'Not found' });

  // Broadcast escalation
  io.emit('incident:escalated', updated);
  io.emit('incident:updated', updated);

  // Find and notify nearby volunteers (wider radius for emergencies)
  const nearby = volunteers.matchVolunteers(updated.lat, updated.lng, 500);
  io.emit('volunteer:urgent_ping', {
    incident: updated,
    nearbyVolunteers: nearby,
  });

  res.json(updated);
});

// Get all cameras
app.get('/api/cameras', (req, res) => {
  res.json(incidents.CAMERAS);
});

// Get all volunteers
app.get('/api/volunteers', (req, res) => {
  res.json(volunteers.getAllVolunteers());
});

// Get nearby volunteers for an incident
app.get('/api/volunteers/nearby/:incidentId', (req, res) => {
  const incident = incidents.getIncidentById(req.params.incidentId);
  if (!incident) return res.status(404).json({ error: 'Incident not found' });
  const nearby = volunteers.getNearbyVolunteers(incident.lat, incident.lng);
  res.json(nearby);
});

// Trigger manual incident
app.post('/api/incidents/trigger', (req, res) => {
  const newIncident = incidents.createManualIncident(req.body);
  console.log(`🆕 [MANUAL ${req.body.priority.toUpperCase()}] ${newIncident.type} @ ${newIncident.locationName}`);
  
  io.emit('incident:new', newIncident);
  
  if (newIncident.priority === 'red') {
    // ── TELEGRAM BOT INTEGRATION STUB ──
    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || 'YOUR_BOT_TOKEN_HERE';
    const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || 'JURY_CHAT_ID_HERE';
    console.log(`\n📱 [TELEGRAM ALERT] Sending message to Chat ID ${TELEGRAM_CHAT_ID}:`);
    console.log(`   "🚨 EMERGENCY: ${newIncident.type} at ${newIncident.locationName}!"\n`);
    // fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, { ... })

    const nearby = volunteers.matchVolunteers(newIncident.lat, newIncident.lng, 500);
    io.emit('volunteer:urgent_ping', { incident: newIncident, nearbyVolunteers: nearby });
  }
  
  res.json(newIncident);
});

// Reset demo
app.post('/api/incidents/reset', (req, res) => {
  incidents.resetDemo();
  console.log('🔄 Demo reset triggered.');
  io.emit('demo:reset');
  res.json({ success: true });
});

// ── WebSocket ───────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);

  // Send current state on connect
  socket.emit('incidents:snapshot', incidents.getActiveIncidents());

  socket.on('disconnect', () => {
    console.log(`❌ Client disconnected: ${socket.id}`);
  });
});



// ── Server start ────────────────────────────────────────────
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`\n🚀 Jyldam server running on http://localhost:${PORT}`);
  console.log(`📡 WebSocket ready`);
  console.log(`🎯 Simulation active — incidents will auto-generate every 8-15 seconds\n`);
});
