import React, { useState, useEffect } from 'react';
import CityMap from './CityMap';
import IncidentFeed from './IncidentFeed';
import './OperatorMap.css';

function OperatorMap({ incidents, selectedIncident, onSelectIncident, flashRed }) {
  const [volunteers, setVolunteers] = useState([]);

  useEffect(() => {
    fetch('http://localhost:4000/api/volunteers').then(r => r.json()).then(setVolunteers).catch(console.error);
  }, []);

  const handleReset = async () => {
    try { await fetch('http://localhost:4000/api/incidents/reset', { method: 'POST' }); } catch (e) { console.error(e); }
  };

  const stats = {
    total: incidents.length,
    critical: incidents.filter(i => i.priority === 'red').length,
    dispatched: incidents.filter(i => i.status === 'dispatched' || i.status === 'in_progress').length,
    awaiting: incidents.filter(i => i.status === 'awaiting_volunteers').length,
    resolved: incidents.filter(i => i.status === 'resolved').length,
    volunteersOnline: volunteers.filter(v => v.available).length,
    volunteersTotal: volunteers.length,
  };

  const resolutionRate = stats.total > 0 ? Math.round((stats.resolved / (stats.total + stats.resolved)) * 100) : 100;

  return (
    <div className={`operator-map-layout ${flashRed ? 'flash-red' : ''}`}>
      <div className="dash-stats-grid">
        <div className="dash-stat glass">
          <span className="dash-stat-icon">📡</span>
          <div>
            <span className="dash-stat-val">{stats.total}</span>
            <span className="dash-stat-lbl">Active Incidents</span>
          </div>
        </div>
        <div className="dash-stat glass dash-stat-red">
          <span className="dash-stat-icon">🔴</span>
          <div>
            <span className="dash-stat-val">{stats.critical}</span>
            <span className="dash-stat-lbl">Critical</span>
          </div>
        </div>
        <div className="dash-stat glass dash-stat-blue">
          <span className="dash-stat-icon">🚑</span>
          <div>
            <span className="dash-stat-val">{stats.dispatched}</span>
            <span className="dash-stat-lbl">Dispatched</span>
          </div>
        </div>
        <div className="dash-stat glass dash-stat-yellow">
          <span className="dash-stat-icon">⏳</span>
          <div>
            <span className="dash-stat-val">{stats.awaiting}</span>
            <span className="dash-stat-lbl">Awaiting</span>
          </div>
        </div>
        <div className="dash-stat glass dash-stat-green">
          <span className="dash-stat-icon">👥</span>
          <div>
            <span className="dash-stat-val">{stats.volunteersOnline}/{stats.volunteersTotal}</span>
            <span className="dash-stat-lbl">Volunteers Online</span>
          </div>
        </div>
        <div className="dash-stat glass">
          <span className="dash-stat-icon">📊</span>
          <div>
            <span className="dash-stat-val">{resolutionRate}%</span>
            <span className="dash-stat-lbl">Resolution Rate</span>
          </div>
        </div>
      </div>

      <div className="operator-main">
        <IncidentFeed incidents={incidents} onSelect={onSelectIncident} />
        <CityMap incidents={incidents} onSelectIncident={onSelectIncident} volunteers={volunteers} />
      </div>
    </div>
  );
}

export default OperatorMap;
