import React, { useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import './VolunteerView.css';

const CENTER = [42.9000, 71.3667];

function createTaskIcon(priority) {
  const color = priority === 'red' ? '#ff3b5c' : '#ffb830';
  return new L.DivIcon({
    className: 'vtask-marker',
    html: `<div class="vtask-pin" style="background:${color};box-shadow:0 0 10px ${color}40">
      <svg viewBox="0 0 24 24" width="14" height="14" fill="white"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
    </div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

function formatTime(isoString) {
  const d = new Date(isoString);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function VolunteerView({ incidents, volunteers, onAccept, onEscalate, urgentPing }) {
  const [selectedVolunteer, setSelectedVolunteer] = useState(volunteers[0]?.id || 'v1');
  const [acceptedTasks, setAcceptedTasks] = useState(new Set());
  const [escalatedTasks, setEscalatedTasks] = useState(new Set());

  const activeIncidents = useMemo(() =>
    incidents.filter(i => i.status !== 'resolved').slice(0, 20),
    [incidents]
  );

  const handleAccept = async (incidentId) => {
    const result = await onAccept(incidentId, selectedVolunteer);
    if (!result.error) {
      setAcceptedTasks(prev => new Set(prev).add(incidentId));
    }
  };

  const handleEscalate = async (incidentId) => {
    await onEscalate(incidentId);
    setEscalatedTasks(prev => new Set(prev).add(incidentId));
  };

  return (
    <div className="volunteer-view">

      {urgentPing && (
        <div className="urgent-banner" role="alert">
          <span className="urgent-banner__icon">🚨</span>
          <div className="urgent-banner__text">
            <strong>URGENT: {urgentPing.incident.type}</strong>
            <span>Emergency at {urgentPing.incident.locationName} — Volunteers needed!</span>
          </div>
        </div>
      )}


      <div className="vol-selector glass">
        <label htmlFor="vol-select" className="vol-selector__label">Acting as Volunteer:</label>
        <select
          id="vol-select"
          value={selectedVolunteer}
          onChange={(e) => setSelectedVolunteer(e.target.value)}
          className="vol-selector__select"
        >
          {volunteers.map(v => (
            <option key={v.id} value={v.id}>{v.name} ({v.id})</option>
          ))}
        </select>
      </div>

      <div className="volunteer-layout">

        <div className="vol-map-container glass">
          <h3 className="vol-section-title">📍 Nearby Tasks</h3>
          <div className="vol-map">
            <MapContainer
              center={CENTER}
              zoom={14}
              scrollWheelZoom={true}
              zoomControl={false}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                attribution='&copy; CARTO'
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              />
              {activeIncidents.map(inc => (
                <Marker
                  key={inc.id}
                  position={[inc.lat, inc.lng]}
                  icon={createTaskIcon(inc.priority)}
                >
                  <Popup className="custom-popup">
                    <div className="popup-content">
                      <strong>{inc.type}</strong>
                      <span className={`badge ${inc.priority}`}>{inc.priority.toUpperCase()}</span>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </div>


        <div className="vol-tasks">
          <h3 className="vol-section-title">📋 Active Tasks ({activeIncidents.length})</h3>
          <div className="vol-task-list">
            {activeIncidents.length === 0 ? (
              <div className="vol-empty">
                <p>No active tasks nearby</p>
                <span>Stay alert — new tasks appear in real-time</span>
              </div>
            ) : (
              activeIncidents.map(inc => {
                const isAccepted = acceptedTasks.has(inc.id);
                const isEscalated = escalatedTasks.has(inc.id);

                return (
                  <div key={inc.id} className={`vol-card ${inc.priority} ${isAccepted ? 'accepted' : ''}`}>
                    <div className="vol-card__header">
                      <span className={`badge ${inc.priority}`}>
                        {inc.priority === 'red' ? '🔴' : '🟡'} {inc.priority.toUpperCase()}
                      </span>
                      <time>{formatTime(inc.createdAt)}</time>
                    </div>

                    <h4 className="vol-card__type">{inc.type}</h4>

                    <div className="vol-card__location">
                      <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
                        <circle cx="12" cy="9" r="2.5"/>
                      </svg>
                      {inc.locationName}
                    </div>

                    {inc.heavyVolume === 1 && (
                      <div className="vol-card__heavy">
                        ⚖️ Heavy Fall — Volunteers Joined: {inc.acceptedVolunteers}/{inc.requiredVolunteers}
                      </div>
                    )}

                    <div className="vol-card__actions">
                      {!isAccepted ? (
                        <button
                          className="btn btn-success vol-accept-btn"
                          onClick={() => handleAccept(inc.id)}
                          aria-label={`Accept task: ${inc.type}`}
                        >
                          ✅ Confirm Attendance
                        </button>
                      ) : (
                        <span className="vol-accepted-badge">✓ Accepted</span>
                      )}

                      {isAccepted && inc.priority === 'yellow' && !isEscalated && (
                        <button
                          className="btn btn-danger vol-sos-btn"
                          onClick={() => handleEscalate(inc.id)}
                          aria-label="Escalate to emergency"
                        >
                          🚨 SOS
                        </button>
                      )}

                      {isEscalated && (
                        <span className="vol-escalated-badge">⚠️ Escalated</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default VolunteerView;
