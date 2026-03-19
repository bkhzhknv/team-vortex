import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import socket from './socket';
import CAMERAS from './data/cameras';
import { BrowserRouter as Router, Routes, Route, Navigate, NavLink, useNavigate } from 'react-router-dom';
import OperatorMap from './components/OperatorMap';
import Dispatch112 from './components/Dispatch112';
import VolunteerView from './components/VolunteerView';
import IncidentModal from './components/IncidentModal';
import VolunteersPage from './components/VolunteersPage';
import ProfilesPage from './components/ProfilesPage';
import LoginPage from './components/LoginPage';
import './App.css';

const AuthContext = createContext(null);
const ThemeContext = createContext(null);

export function useAuth() { return useContext(AuthContext); }
export function useTheme() { return useContext(ThemeContext); }

function ThemeProvider({ children }) {
  const [dark, setDark] = useState(() => localStorage.getItem('jyldam-theme') !== 'light');
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('jyldam-theme', dark ? 'dark' : 'light');
  }, [dark]);
  return <ThemeContext.Provider value={{ dark, toggle: () => setDark(d => !d) }}>{children}</ThemeContext.Provider>;
}

function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('jyldam-user');
    return saved ? JSON.parse(saved) : null;
  });
  const login = async (username, password) => {
    const res = await fetch('http://localhost:4000/api/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
    const data = await res.json();
    setUser(data.user);
    localStorage.setItem('jyldam-user', JSON.stringify(data.user));
    localStorage.setItem('jyldam-token', data.token);
    return data.user;
  };
  const logout = () => { setUser(null); localStorage.removeItem('jyldam-user'); localStorage.removeItem('jyldam-token'); };
  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>;
}

function ProtectedRoute({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function Sidebar() {
  const { user, logout } = useAuth();
  const { dark, toggle } = useTheme();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  if (!user) return null;

  const links = [
    { to: '/dashboard', label: 'Dashboard', icon: '📊' },
    { to: '/volunteers', label: 'Volunteers', icon: '👥' },
    { to: '/profiles', label: 'Profiles', icon: '🪪' },
    { to: '/112', label: 'Dispatch 112', icon: '🚨' },
  ];

  return (
    <aside className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <div className="sidebar-brand">
        <span className="sidebar-logo">◆</span>
        {!collapsed && <span className="sidebar-title">Jyldam</span>}
        <button className="sidebar-toggle" onClick={() => setCollapsed(c => !c)}>{collapsed ? '→' : '←'}</button>
      </div>
      <nav className="sidebar-nav">
        {links.map(l => (
          <NavLink key={l.to} to={l.to} className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} title={l.label}>
            <span className="sidebar-link-icon">{l.icon}</span>
            {!collapsed && <span>{l.label}</span>}
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-footer">
        {!collapsed && (
          <button className="sidebar-theme-btn" onClick={toggle}>
            {dark ? '☀️' : '🌙'} {dark ? 'Light mode' : 'Dark mode'}
          </button>
        )}
        <div className="sidebar-user">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: `linear-gradient(135deg, hsl(224 64% 50%), hsl(270 60% 60%))`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{user.name?.charAt(0)}</div>
            {!collapsed && <span className="sidebar-user-name">{user.name}</span>}
          </div>
          {!collapsed && <button className="sidebar-logout" onClick={() => { logout(); navigate('/login'); }}>↗</button>}
        </div>
      </div>
    </aside>
  );
}

function AppContent() {
  const [incidents, setIncidents] = useState([]);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [flashRed, setFlashRed] = useState(false);
  const [urgentPing, setUrgentPing] = useState(null);
  const [volunteers, setVolunteers] = useState([]);

  useEffect(() => {
    fetch('http://localhost:4000/api/incidents').then(r => r.json()).then(setIncidents).catch(console.error);
    fetch('http://localhost:4000/api/volunteers').then(r => r.json()).then(setVolunteers).catch(console.error);
  }, []);

  useEffect(() => {
    socket.on('incidents:snapshot', setIncidents);
    socket.on('incident:new', (inc) => { setIncidents(prev => [inc, ...prev]); if (inc.priority === 'red') { setFlashRed(true); setTimeout(() => setFlashRed(false), 3000); } });
    socket.on('incident:updated', (upd) => { setIncidents(prev => prev.map(i => i.id === upd.id ? upd : i)); if (selectedIncident?.id === upd.id) setSelectedIncident(upd); });
    socket.on('incident:escalated', (esc) => { setIncidents(prev => prev.map(i => i.id === esc.id ? esc : i)); setFlashRed(true); setTimeout(() => setFlashRed(false), 3000); });
    socket.on('volunteer:urgent_ping', (data) => { setUrgentPing(data); setTimeout(() => setUrgentPing(null), 8000); });
    return () => { socket.off('incidents:snapshot'); socket.off('incident:new'); socket.off('incident:updated'); socket.off('incident:escalated'); socket.off('volunteer:urgent_ping'); };
  }, [selectedIncident]);

  const handleAcceptTask = useCallback(async (incidentId, volunteerId) => {
    try {
      const res = await fetch(`http://localhost:4000/api/incidents/${incidentId}/accept`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ volunteerId }),
      });
      const data = await res.json();
      if (data.incident) setIncidents(prev => prev.map(i => i.id === data.incident.id ? data.incident : i));
      return data;
    } catch (err) { return { error: 'Network error' }; }
  }, []);

  const handleEscalate = useCallback(async (incidentId) => {
    try { const res = await fetch(`http://localhost:4000/api/incidents/${incidentId}/escalate`, { method: 'POST' }); return await res.json(); } catch (err) { console.error(err); }
  }, []);

  return (
    <div className={`app-layout ${flashRed ? 'flash-red' : ''}`}>
      <Sidebar />
      <main className="main-content">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<ProtectedRoute><OperatorMap incidents={incidents} selectedIncident={selectedIncident} onSelectIncident={setSelectedIncident} flashRed={flashRed} /></ProtectedRoute>} />
          <Route path="/volunteers" element={<ProtectedRoute><VolunteersPage volunteers={volunteers} incidents={incidents} /></ProtectedRoute>} />
          <Route path="/profiles" element={<ProtectedRoute><ProfilesPage volunteers={volunteers} /></ProtectedRoute>} />
          <Route path="/volunteer" element={<ProtectedRoute><VolunteerView incidents={incidents} volunteers={volunteers} onAccept={handleAcceptTask} onEscalate={handleEscalate} urgentPing={urgentPing} /></ProtectedRoute>} />
          <Route path="/112" element={<ProtectedRoute><Dispatch112 socket={socket} /></ProtectedRoute>} />
        </Routes>
      </main>
      {selectedIncident && <IncidentModal incident={selectedIncident} onClose={() => setSelectedIncident(null)} onAccept={handleAcceptTask} onEscalate={handleEscalate} volunteers={volunteers} />}
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <AppContent />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
