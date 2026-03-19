import React, { useRef, useEffect, useState } from 'react';
import PrivacyVideo from './PrivacyVideo';
import SosButton from './SosButton';
import './IncidentModal.css';

function formatTime(isoString) {
  const d = new Date(isoString);
  return d.toLocaleString('en-US', {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false, day: '2-digit', month: 'short',
  });
}

function IncidentModal({ incident, onClose, onAccept, onEscalate, volunteers }) {
  const overlayRef = useRef(null);
  const [assignments, setAssignments] = useState([]);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {

    fetch(`http://localhost:4000/api/incidents/${incident.id}`)
      .then(r => r.json())
      .then(data => {
        if (data.assignments) setAssignments(data.assignments);
      })
      .catch(console.error);
  }, [incident.id, incident.acceptedVolunteers]);

  const handleOverlayClick = (e) => {
    if (e.target === overlayRef.current) onClose();
  };

  const handleAccept = async (volunteerId) => {
    setAccepting(true);
    const result = await onAccept(incident.id, volunteerId);
    if (result?.incident) {
      setAssignments(result.assignments || []);
    }
    setAccepting(false);
  };

  const handleEscalate = async () => {
    await onEscalate(incident.id);
    onClose();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') onClose();
  };

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const isHeavy = incident.heavyVolume === 1;
  const needsMore = isHeavy && incident.acceptedVolunteers < incident.requiredVolunteers;

  return (
    <div className="modal-overlay" ref={overlayRef} onClick={handleOverlayClick} role="dialog" aria-modal="true" aria-label={`Incident details: ${incident.type}`}>
      <div className={`modal-container glass ${incident.priority}`}>
        <button className="modal-close" onClick={onClose} aria-label="Close modal">&times;</button>


        <div className="modal-header">
          <div className="modal-header__left">
            <span className={`badge ${incident.priority}`}>
              {incident.priority === 'red' ? '🔴 CRITICAL' : '🟡 ASSISTIVE'}
            </span>
            <h2 className="modal-title">{incident.type}</h2>
          </div>
          <time className="modal-time">{formatTime(incident.createdAt)}</time>
        </div>

        <div className="modal-body">

          <div className="modal-video-section">
            <div className="modal-video-header">
              <span className="camera-label">📷 {incident.locationName}</span>
              <span className="camera-id">{incident.cameraId}</span>
            </div>
            <PrivacyVideo priority={incident.priority} incidentType={incident.type} />
          </div>


          <div className="modal-info">
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Location</span>
                <span className="info-value">{incident.locationName}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Coordinates</span>
                <span className="info-value mono">{incident.lat.toFixed(5)}, {incident.lng.toFixed(5)}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Status</span>
                <span className="info-value">{incident.status.replace(/_/g, ' ').toUpperCase()}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Dispatch</span>
                <span className="info-value dispatch">{incident.dispatchAction}</span>
              </div>
            </div>


            {isHeavy && (
              <div className={`heavy-notice ${needsMore ? 'pending' : 'complete'}`}>
                <span className="heavy-notice__icon">⚖️</span>
                <div className="heavy-notice__text">
                  <strong>Heavy Volume Detected (&gt;100kg)</strong>
                  <span>
                    Status: {needsMore
                      ? `Awaiting ${incident.requiredVolunteers - incident.acceptedVolunteers} more volunteer(s)`
                      : 'Sufficient volunteers assigned'
                    } — {incident.acceptedVolunteers}/{incident.requiredVolunteers} accepted
                  </span>
                </div>
              </div>
            )}


            {assignments.length > 0 && (
              <div className="modal-assignments">
                <h4>Assigned Volunteers</h4>
                <div className="assignment-list">
                  {assignments.map(a => (
                    <div key={a.volunteerId} className="assignment-chip" style={{ borderColor: a.avatarColor }}>
                      <span className="assignment-avatar" style={{ background: a.avatarColor }}>{a.name[0]}</span>
                      <span>{a.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}


            {incident.status !== 'resolved' && (
              <div className="modal-accept">
                <h4>Assign Volunteer</h4>
                <div className="volunteer-grid">
                  {volunteers.slice(0, 6).map(v => (
                    <button
                      key={v.id}
                      className="btn btn-primary volunteer-btn"
                      onClick={() => handleAccept(v.id)}
                      disabled={accepting || assignments.some(a => a.volunteerId === v.id)}
                      aria-label={`Assign ${v.name}`}
                    >
                      <span className="v-avatar" style={{ background: v.avatarColor }}>{v.name[0]}</span>
                      {v.name}
                    </button>
                  ))}
                </div>
              </div>
            )}


            {incident.priority === 'yellow' && (
              <SosButton onEscalate={handleEscalate} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default IncidentModal;
