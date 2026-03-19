import React from 'react';
import './IncidentFeed.css';

function formatTime(isoString) {
  const d = new Date(isoString);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
}

function IncidentFeed({ incidents, onSelect }) {
  return (
    <aside className="incident-feed glass" id="incident-feed" role="complementary" aria-label="Incident feed">
      <div className="feed-header">
        <h2>Incident Feed</h2>
        <span className="feed-count">{incidents.length}</span>
      </div>
      <div className="feed-list" role="list">
        {incidents.length === 0 ? (
          <div className="feed-empty">
            <span className="feed-empty__icon">📡</span>
            <p>Monitoring city cameras...</p>
            <p className="feed-empty__sub">Incidents will appear here in real-time</p>
          </div>
        ) : (
          incidents.map((incident, index) => {
            const isNew = index === 0;
            return (
              <button
                key={incident.id}
                className={`feed-card ${incident.priority} ${isNew ? 'new' : ''}`}
                onClick={() => onSelect(incident)}
                role="listitem"
                aria-label={`${incident.priority} priority: ${incident.type} at ${incident.locationName}`}
              >
                <div className="feed-card__header">
                  <span className={`badge ${incident.priority}`}>
                    {incident.priority === 'red' ? '🔴' : '🟡'} {incident.priority.toUpperCase()}
                  </span>
                  <time className="feed-card__time">{formatTime(incident.createdAt)}</time>
                </div>
                <h3 className="feed-card__type">{incident.type}</h3>
                <div className="feed-card__location">
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
                    <circle cx="12" cy="9" r="2.5"/>
                  </svg>
                  <span>{incident.locationName}</span>
                </div>
                <div className="feed-card__footer">
                  <span className="feed-card__status">{incident.dispatchAction}</span>
                  {incident.heavyVolume === 1 && (
                    <span className="feed-card__heavy badge yellow">⚖️ Heavy</span>
                  )}
                </div>
                {incident.heavyVolume === 1 && (
                  <div className="feed-card__volunteers">
                    Awaiting: {incident.acceptedVolunteers}/{incident.requiredVolunteers} volunteers
                  </div>
                )}
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
}

export default IncidentFeed;
