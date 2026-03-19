import React, { useEffect, useState, useRef } from 'react';
import './Dispatch112.css';

function Dispatch112({ socket }) {
  const [emergencies, setEmergencies] = useState([]);
  const [activeEmergency, setActiveEmergency] = useState(null);
  const [progress, setProgress] = useState(0);
  const [dispatched, setDispatched] = useState(false);

  useEffect(() => {
    const handleNew = (incident) => {
      if (incident.priority === 'red') {
        setEmergencies(prev => [incident, ...prev].slice(0, 20));
        if (!activeEmergency) {
          setActiveEmergency(incident);
          setProgress(0);
          setDispatched(false);
        }
      }
    };

    socket.on('incident:new', handleNew);
    socket.on('demo:reset', () => { setEmergencies([]); setActiveEmergency(null); });
    return () => { socket.off('incident:new', handleNew); socket.off('demo:reset'); };
  }, [socket, activeEmergency]);

  useEffect(() => {
    if (activeEmergency && !dispatched) {
      const interval = setInterval(() => {
        setProgress(p => {
          if (p >= 100) { clearInterval(interval); setDispatched(true); return 100; }
          return p + 1;
        });
      }, 100);
      return () => clearInterval(interval);
    }
  }, [activeEmergency, dispatched]);

  const handleClear = () => {
    setActiveEmergency(null);
    setDispatched(false);
    setProgress(0);
  };

  const handleSelect = (e) => {
    setActiveEmergency(e);
    setProgress(0);
    setDispatched(false);
  };

  return (
    <div className="d112-page">
      <div className="d112-sidebar glass">
        <div className="d112-sidebar-header">
          <h2>🚨 Dispatch 112</h2>
          <span className="d112-count">{emergencies.length}</span>
        </div>
        <div className="d112-list">
          {emergencies.length === 0 ? (
            <div className="d112-empty">
              <span className="d112-empty-icon">📡</span>
              <p>No emergencies</p>
              <p className="d112-empty-sub">System monitoring active</p>
            </div>
          ) : (
            emergencies.map((e, i) => (
              <button key={e.id} className={`d112-item ${activeEmergency?.id === e.id ? 'active' : ''}`} onClick={() => handleSelect(e)}>
                <div className="d112-item-header">
                  <span className="d112-item-badge">🔴 RED</span>
                  <span className="d112-item-time">{new Date(e.createdAt).toLocaleTimeString('en-US', { hour12: false })}</span>
                </div>
                <h4 className="d112-item-type">{e.type}</h4>
                <p className="d112-item-loc">📍 {e.locationName}</p>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="d112-main">
        {!activeEmergency ? (
          <div className="d112-standby">
            <div className="d112-pulse-ring"></div>
            <div className="d112-standby-content">
              <span className="d112-standby-icon">🛡️</span>
              <h1>System Active</h1>
              <p>All Clear — Monitoring {10} cameras in Taraz</p>
              <div className="d112-standby-stats">
                <div className="d112-ss"><span className="d112-ss-val">10</span><span className="d112-ss-lbl">Cameras</span></div>
                <div className="d112-ss"><span className="d112-ss-val">12</span><span className="d112-ss-lbl">Volunteers</span></div>
                <div className="d112-ss"><span className="d112-ss-val">{emergencies.length}</span><span className="d112-ss-lbl">Total Alerts</span></div>
              </div>
            </div>
          </div>
        ) : (
          <div className={`d112-emergency ${dispatched ? 'd112-resolved' : ''}`}>
            <div className="d112-emer-header">
              <div className="d112-emer-badge">⚠️ EMERGENCY</div>
              <h1 className="d112-emer-type">{activeEmergency.type}</h1>
              <p className="d112-emer-loc">📍 {activeEmergency.locationName} — Camera: {activeEmergency.cameraId}</p>
            </div>

            <div className="d112-emer-grid">
              <div className="d112-info-card glass">
                <h3>Incident Details</h3>
                <div className="d112-detail-row"><span>Priority</span><span className="d112-red">RED — Critical</span></div>
                <div className="d112-detail-row"><span>Status</span><span>{dispatched ? '✅ Dispatched' : '⏳ Dispatching...'}</span></div>
                <div className="d112-detail-row"><span>Camera</span><span>{activeEmergency.cameraId}</span></div>
                <div className="d112-detail-row"><span>Location</span><span>{activeEmergency.locationName}</span></div>
                <div className="d112-detail-row"><span>Time</span><span>{new Date(activeEmergency.createdAt).toLocaleTimeString()}</span></div>
              </div>

              <div className="d112-info-card glass">
                <h3>🚑 Dispatch Progress</h3>
                {!dispatched ? (
                  <>
                    <div className="d112-progress-bg">
                      <div className="d112-progress-fill" style={{ width: `${progress}%` }}></div>
                    </div>
                    <p className="d112-progress-text">Dispatching emergency units... {Math.round(progress)}%</p>
                  </>
                ) : (
                  <div className="d112-success">
                    <span className="d112-success-icon">✅</span>
                    <h2>Units Dispatched</h2>
                    <p>ETA: 4 minutes</p>
                    <button className="d112-clear-btn" onClick={handleClear}>Clear & Return</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Dispatch112;
