import React, { useState, useEffect } from 'react';
import './VolunteersPage.css';

function VolunteersPage({ volunteers, incidents }) {
  const [stats, setStats] = useState({ total: 0, available: 0, onDuty: 0 });
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('http://localhost:4000/api/volunteers/stats')
      .then(r => r.json())
      .then(setStats)
      .catch(console.error);
  }, []);

  const filtered = volunteers.filter(v =>
    v.name.toLowerCase().includes(search.toLowerCase())
  );

  const getAssignmentCount = (vid) => incidents.filter(i => i.status !== 'resolved').length > 0 ? Math.floor(Math.random() * 3) : 0;

  return (
    <div className="volunteers-page">
      <div className="vp-header">
        <div>
          <h1 className="vp-title">Volunteers</h1>
          <p className="vp-subtitle">Manage and monitor volunteer network</p>
        </div>
        <div className="vp-stats-row">
          <div className="vp-stat-card">
            <span className="vp-stat-value">{stats.total}</span>
            <span className="vp-stat-label">Total</span>
          </div>
          <div className="vp-stat-card vp-stat-green">
            <span className="vp-stat-value">{stats.available}</span>
            <span className="vp-stat-label">Available</span>
          </div>
          <div className="vp-stat-card vp-stat-blue">
            <span className="vp-stat-value">{stats.onDuty}</span>
            <span className="vp-stat-label">On Duty</span>
          </div>
        </div>
      </div>

      <div className="vp-search-bar">
        <input
          type="text"
          placeholder="Search volunteers..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="vp-search-input"
        />
      </div>

      <div className="vp-grid">
        {filtered.map(v => (
          <div key={v.id} className="vp-card">
            <div className="vp-card-header">
              <div className="vp-avatar" style={{ background: v.avatarColor }}>
                {v.name.charAt(0)}
              </div>
              <div className="vp-card-info">
                <h3 className="vp-card-name">{v.name}</h3>
                <span className={`vp-status-badge ${v.available ? 'available' : 'busy'}`}>
                  {v.available ? 'Available' : 'On Duty'}
                </span>
              </div>
            </div>
            <div className="vp-card-details">
              <div className="vp-detail-row">
                <span className="vp-detail-label">Location</span>
                <span className="vp-detail-value">{v.lat.toFixed(4)}, {v.lng.toFixed(4)}</span>
              </div>
              <div className="vp-detail-row">
                <span className="vp-detail-label">ID</span>
                <span className="vp-detail-value">{v.id}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default VolunteersPage;
