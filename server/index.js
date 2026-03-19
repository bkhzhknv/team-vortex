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

// ── Start simulation ────────────────────────────────────────
incidents.startSimulation((newIncident) => {
  console.log(`🆕 [${newIncident.priority.toUpperCase()}] ${newIncident.type} @ ${newIncident.locationName}`);

  // Broadcast to all clients
  io.emit('incident:new', newIncident);

  // For red incidents, also ping nearby volunteers
  if (newIncident.priority === 'red') {
    const nearby = volunteers.matchVolunteers(newIncident.lat, newIncident.lng, 100);
    if (nearby.length > 0) {
      io.emit('volunteer:urgent_ping', {
        incident: newIncident,
        nearbyVolunteers: nearby,
      });
      console.log(`  📢 Pinged ${nearby.length} volunteers within 100m`);
    }
  }
});

// ── Server start ────────────────────────────────────────────
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`\n🚀 Jyldam server running on http://localhost:${PORT}`);
  console.log(`📡 WebSocket ready`);
  console.log(`🎯 Simulation active — incidents will auto-generate every 8-15 seconds\n`);
});
