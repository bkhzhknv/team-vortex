import React from 'react';
import { useAuth } from '../App';
import './ProfilesPage.css';

const OPERATORS = [
  { id: 'op1', name: 'Admin Operator', username: 'admin', role: 'Admin', avatar: '#6366f1', shiftsCompleted: 128, responseSec: 14 },
  { id: 'op2', name: 'Dispatch Operator', username: 'operator', role: 'Dispatcher', avatar: '#8b5cf6', shiftsCompleted: 85, responseSec: 22 },
];

function ProfilesPage({ volunteers }) {
  const { user } = useAuth();

  return (
    <div className="profiles-page">
      <div className="pp-header">
        <h1 className="pp-title">Profiles</h1>
        <p className="pp-subtitle">Operators & Volunteer team directory</p>
      </div>

      <section className="pp-section">
        <h2 className="pp-section-title">Operators</h2>
        <div className="pp-grid">
          {OPERATORS.map(op => (
            <div key={op.id} className={`pp-card glass ${user?.id === op.id ? 'pp-card-active' : ''}`}>
              <div className="pp-card-top">
                <div className="pp-avatar" style={{ background: `linear-gradient(135deg, ${op.avatar}, ${op.avatar}88)` }}>
                  {op.name.charAt(0)}
                </div>
                <div>
                  <h3 className="pp-name">{op.name}</h3>
                  <span className="pp-role">{op.role}</span>
                </div>
              </div>
              <div className="pp-stats">
                <div className="pp-stat">
                  <span className="pp-stat-num">{op.shiftsCompleted}</span>
                  <span className="pp-stat-lbl">Shifts</span>
                </div>
                <div className="pp-stat">
                  <span className="pp-stat-num">{op.responseSec}s</span>
                  <span className="pp-stat-lbl">Avg Response</span>
                </div>
                <div className="pp-stat">
                  <span className="pp-stat-num pp-online">●</span>
                  <span className="pp-stat-lbl">{user?.id === op.id ? 'You' : 'Online'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="pp-section">
        <h2 className="pp-section-title">Volunteers <span className="pp-count">{volunteers.length}</span></h2>
        <div className="pp-grid">
          {volunteers.map(v => (
            <div key={v.id} className="pp-card glass">
              <div className="pp-card-top">
                <div className="pp-avatar" style={{ background: v.avatarColor }}>
                  {v.name.charAt(0)}
                </div>
                <div>
                  <h3 className="pp-name">{v.name}</h3>
                  <span className={`pp-badge ${v.available ? 'green' : 'orange'}`}>
                    {v.available ? 'Available' : 'On duty'}
                  </span>
                </div>
              </div>
              <div className="pp-stats">
                <div className="pp-stat">
                  <span className="pp-stat-num mono">{v.lat.toFixed(3)}</span>
                  <span className="pp-stat-lbl">Lat</span>
                </div>
                <div className="pp-stat">
                  <span className="pp-stat-num mono">{v.lng.toFixed(3)}</span>
                  <span className="pp-stat-lbl">Lng</span>
                </div>
                <div className="pp-stat">
                  <span className="pp-stat-num">{v.id.toUpperCase()}</span>
                  <span className="pp-stat-lbl">ID</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default ProfilesPage;
