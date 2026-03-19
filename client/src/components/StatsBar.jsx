import React from 'react';
import './StatsBar.css';

function StatsBar({ stats, viewMode, onToggleView }) {
  return (
    <header className="stats-bar glass" role="banner">
      <div className="stats-bar__brand">
        <div className="stats-bar__logo">
          <span className="logo-icon">◆</span>
          <h1>Jyldam</h1>
        </div>
        <span className="stats-bar__tagline">Inclusive & Emergency Dispatch</span>
      </div>

      <div className="stats-bar__metrics" role="status" aria-label="Dashboard statistics">
        <div className="metric">
          <span className="metric__value">{stats.total}</span>
          <span className="metric__label">Active</span>
        </div>
        <div className="metric metric--red">
          <span className="metric__value">{stats.critical}</span>
          <span className="metric__label">Critical</span>
        </div>
        <div className="metric metric--accent">
          <span className="metric__value">{stats.dispatched}</span>
          <span className="metric__label">Dispatched</span>
        </div>
        <div className="metric metric--yellow">
          <span className="metric__value">{stats.awaiting}</span>
          <span className="metric__label">Awaiting</span>
        </div>
      </div>

      <div className="stats-bar__actions">
        <button
          className={`view-toggle ${viewMode === 'volunteer' ? 'active' : ''}`}
          onClick={onToggleView}
          aria-label={`Switch to ${viewMode === 'operator' ? 'volunteer' : 'operator'} view`}
          id="view-toggle-btn"
        >
          <span className="toggle-icon">{viewMode === 'operator' ? '👤' : '🖥️'}</span>
          <span className="toggle-text">{viewMode === 'operator' ? 'Volunteer View' : 'Operator View'}</span>
        </button>
        <div className="live-indicator" aria-label="Live connection status">
          <span className="live-dot"></span>
          <span>LIVE</span>
        </div>
      </div>
    </header>
  );
}

export default StatsBar;
