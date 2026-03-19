const volunteers = [
  { id: 'v1', name: 'Aisha K.', avatarColor: '#6C63FF', lat: 42.9015, lng: 71.368, available: 1 },
  { id: 'v2', name: 'Daulet M.', avatarColor: '#FF6584', lat: 42.8985, lng: 71.365, available: 1 },
  { id: 'v3', name: 'Zarina T.', avatarColor: '#00C9A7', lat: 42.903, lng: 71.37, available: 1 },
  { id: 'v4', name: 'Bolat S.', avatarColor: '#FFC75F', lat: 42.897, lng: 71.362, available: 1 },
  { id: 'v5', name: 'Madina R.', avatarColor: '#845EC2', lat: 42.9045, lng: 71.364, available: 1 },
  { id: 'v6', name: 'Yerlan A.', avatarColor: '#FF9671', lat: 42.896, lng: 71.371, available: 1 },
  { id: 'v7', name: 'Kamila N.', avatarColor: '#00D2FC', lat: 42.901, lng: 71.359, available: 1 },
  { id: 'v8', name: 'Timur B.', avatarColor: '#F9F871', lat: 42.9025, lng: 71.373, available: 1 },
  { id: 'v9', name: 'Saule D.', avatarColor: '#D65DB1', lat: 42.899, lng: 71.355, available: 1 },
  { id: 'v10', name: 'Arman Z.', avatarColor: '#FF6F91', lat: 42.905, lng: 71.367, available: 1 },
  { id: 'v11', name: 'Gulnara P.', avatarColor: '#2C73D2', lat: 42.894, lng: 71.369, available: 1 },
  { id: 'v12', name: 'Nursultan O.', avatarColor: '#0081CF', lat: 42.9005, lng: 71.376, available: 1 },
];

const operators = [
  { id: 'op1', username: 'admin', password: 'admin123', name: 'Admin Operator', role: 'admin' },
  { id: 'op2', username: 'operator', password: 'jyldam2026', name: 'Dispatch Operator', role: 'operator' },
];

const state = {
  incidents: [],
  volunteers: volunteers.map((volunteer) => ({ ...volunteer })),
  operators: operators.map((op) => ({ ...op })),
  assignments: [],
  nextAssignmentId: 1,
};

function clone(value) {
  if (Array.isArray(value)) {
    return value.map((item) => ({ ...item }));
  }

  return value ? { ...value } : value;
}

function normalize(sql) {
  return sql.replace(/\s+/g, ' ').trim();
}

function sortByCreatedAtDesc(rows) {
  return [...rows].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function createStatement(sql) {
  switch (normalize(sql)) {
    case 'SELECT * FROM volunteers':
      return {
        all() {
          return clone(state.volunteers);
        },
      };

    case 'SELECT * FROM volunteers WHERE id = ?':
      return {
        get(id) {
          return clone(state.volunteers.find((volunteer) => volunteer.id === id));
        },
      };

    case 'SELECT * FROM volunteers WHERE available = 1':
      return {
        all() {
          return clone(state.volunteers.filter((volunteer) => volunteer.available === 1));
        },
      };

    case 'UPDATE volunteers SET available = ? WHERE id = ?':
      return {
        run(available, id) {
          const volunteer = state.volunteers.find((entry) => entry.id === id);
          if (volunteer) volunteer.available = available;
          return { changes: volunteer ? 1 : 0 };
        },
      };

    case 'UPDATE volunteers SET lat = ?, lng = ? WHERE id = ?':
      return {
        run(lat, lng, id) {
          const volunteer = state.volunteers.find((entry) => entry.id === id);
          if (volunteer) {
            volunteer.lat = lat;
            volunteer.lng = lng;
          }
          return { changes: volunteer ? 1 : 0 };
        },
      };

    case 'INSERT INTO incidents (id, type, priority, status, lat, lng, locationName, cameraId, heavyVolume, requiredVolunteers, acceptedVolunteers, dispatchAction, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)':
      return {
        run(id, type, priority, status, lat, lng, locationName, cameraId, heavyVolume, requiredVolunteers, dispatchAction, createdAt) {
          state.incidents.push({
            id,
            type,
            priority,
            status,
            lat,
            lng,
            locationName,
            cameraId,
            heavyVolume,
            requiredVolunteers,
            acceptedVolunteers: 0,
            dispatchAction,
            createdAt,
            resolvedAt: null,
          });
          return { changes: 1 };
        },
      };

    case 'SELECT * FROM incidents ORDER BY createdAt DESC':
      return {
        all() {
          return clone(sortByCreatedAtDesc(state.incidents));
        },
      };

    case "SELECT * FROM incidents WHERE status != 'resolved' ORDER BY createdAt DESC":
      return {
        all() {
          return clone(sortByCreatedAtDesc(state.incidents.filter((incident) => incident.status !== 'resolved')));
        },
      };

    case 'SELECT * FROM incidents WHERE id = ?':
      return {
        get(id) {
          return clone(state.incidents.find((incident) => incident.id === id));
        },
      };

    case 'UPDATE incidents SET status = ?, resolvedAt = ? WHERE id = ?':
      return {
        run(status, resolvedAt, id) {
          const incident = state.incidents.find((entry) => entry.id === id);
          if (incident) {
            incident.status = status;
            incident.resolvedAt = resolvedAt;
          }
          return { changes: incident ? 1 : 0 };
        },
      };

    case 'UPDATE incidents SET priority = ?, dispatchAction = ?, status = ? WHERE id = ?':
      return {
        run(priority, dispatchAction, status, id) {
          const incident = state.incidents.find((entry) => entry.id === id);
          if (incident) {
            incident.priority = priority;
            incident.dispatchAction = dispatchAction;
            incident.status = status;
          }
          return { changes: incident ? 1 : 0 };
        },
      };

    case 'UPDATE incidents SET acceptedVolunteers = acceptedVolunteers + 1 WHERE id = ?':
      return {
        run(id) {
          const incident = state.incidents.find((entry) => entry.id === id);
          if (incident) incident.acceptedVolunteers += 1;
          return { changes: incident ? 1 : 0 };
        },
      };

    case 'SELECT a.*, v.name, v.avatarColor FROM assignments a JOIN volunteers v ON a.volunteerId = v.id WHERE a.incidentId = ?':
      return {
        all(incidentId) {
          const rows = state.assignments
            .filter((assignment) => assignment.incidentId === incidentId)
            .map((assignment) => {
              const volunteer = state.volunteers.find((entry) => entry.id === assignment.volunteerId);
              return {
                ...assignment,
                name: volunteer?.name,
                avatarColor: volunteer?.avatarColor,
              };
            });
          return clone(rows);
        },
      };

    case 'DELETE FROM assignments':
      return {
        run() {
          state.assignments = [];
          state.nextAssignmentId = 1;
          return { changes: 1 };
        },
      };

    case 'DELETE FROM incidents':
      return {
        run() {
          state.incidents = [];
          return { changes: 1 };
        },
      };

    case 'INSERT INTO assignments (incidentId, volunteerId, assignedAt) VALUES (?, ?, ?)':
      return {
        run(incidentId, volunteerId, assignedAt) {
          const exists = state.assignments.some(
            (assignment) => assignment.incidentId === incidentId && assignment.volunteerId === volunteerId
          );

          if (exists) {
            throw new Error('UNIQUE constraint failed: assignments.incidentId, assignments.volunteerId');
          }

          state.assignments.push({
            id: state.nextAssignmentId++,
            incidentId,
            volunteerId,
            assignedAt,
          });

          return { changes: 1 };
        },
      };

    default:
      throw new Error(`Unsupported query in in-memory db: ${normalize(sql)}`);
  }
}

module.exports = {
  state,
  prepare(sql) {
    return createStatement(sql);
  },
  transaction(fn) {
    return (...args) => fn(...args);
  },
};
