import { createContext, startTransition, useContext, useEffect, useMemo, useState } from 'react';
import { api, socket } from './lib/api';
import { OPERATORS } from './lib/operators';

const AuthContext = createContext(null);
const SettingsContext = createContext(null);
const WorkspaceContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

export function useSettings() {
  return useContext(SettingsContext);
}

export function useWorkspace() {
  return useContext(WorkspaceContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = window.localStorage.getItem('jyldam-user');
    return raw ? JSON.parse(raw) : null;
  });

  async function login(username, password) {
    const response = await api.login({ username, password });
    setUser(response.user);
    window.localStorage.setItem('jyldam-user', JSON.stringify(response.user));
    window.localStorage.setItem('jyldam-token', response.token);
    return response.user;
  }

  function logout() {
    setUser(null);
    window.localStorage.removeItem('jyldam-user');
    window.localStorage.removeItem('jyldam-token');
  }

  const value = useMemo(() => ({ user, login, logout }), [user]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function SettingsProvider({ children }) {
  const [dark, setDark] = useState(() => window.localStorage.getItem('jyldam-theme') !== 'light');
  const [reducedMotion, setReducedMotion] = useState(() => window.localStorage.getItem('jyldam-reduced-motion') === 'true');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    document.documentElement.dataset.motion = reducedMotion ? 'reduced' : 'full';
    window.localStorage.setItem('jyldam-theme', dark ? 'dark' : 'light');
    window.localStorage.setItem('jyldam-reduced-motion', String(reducedMotion));
  }, [dark, reducedMotion]);

  const value = useMemo(() => ({
    dark,
    reducedMotion,
    toggleTheme: () => setDark((current) => !current),
    toggleMotion: () => setReducedMotion((current) => !current),
  }), [dark, reducedMotion]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function WorkspaceProvider({ children }) {
  const { user } = useAuth();
  const [incidents, setIncidents] = useState([]);
  const [volunteers, setVolunteers] = useState([]);
  const [cameras, setCameras] = useState([]);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [urgentPing, setUrgentPing] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return undefined;

    let active = true;
    setLoading(true);

    Promise.all([api.incidents(), api.volunteers(), api.cameras()])
      .then(([incidentRows, volunteerRows, cameraRows]) => {
        if (!active) return;
        setIncidents(incidentRows);
        setVolunteers(volunteerRows);
        setCameras(cameraRows);
      })
      .catch((error) => {
        console.error(error);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    const onSnapshot = (snapshot) => startTransition(() => setIncidents(snapshot));
    const onNewIncident = (incident) => startTransition(() => setIncidents((current) => [incident, ...current]));
    const onIncidentUpdated = (incident) => startTransition(() => {
      setIncidents((current) => current.map((entry) => entry.id === incident.id ? incident : entry));
      setSelectedIncident((current) => (current?.id === incident.id ? incident : current));
    });
    const onEscalated = (incident) => startTransition(() => {
      setIncidents((current) => current.map((entry) => entry.id === incident.id ? incident : entry));
      setSelectedIncident((current) => (current?.id === incident.id ? incident : current));
    });
    const onUrgentPing = (payload) => {
      setUrgentPing(payload);
      window.setTimeout(() => setUrgentPing(null), 6000);
    };

    socket.on('incidents:snapshot', onSnapshot);
    socket.on('incident:new', onNewIncident);
    socket.on('incident:updated', onIncidentUpdated);
    socket.on('incident:escalated', onEscalated);
    socket.on('volunteer:urgent_ping', onUrgentPing);

    return () => {
      active = false;
      socket.off('incidents:snapshot', onSnapshot);
      socket.off('incident:new', onNewIncident);
      socket.off('incident:updated', onIncidentUpdated);
      socket.off('incident:escalated', onEscalated);
      socket.off('volunteer:urgent_ping', onUrgentPing);
    };
  }, [user]);

  async function acceptIncident(incidentId, volunteerId) {
    const payload = await api.acceptIncident(incidentId, volunteerId);
    if (payload.incident) {
      setIncidents((current) => current.map((entry) => entry.id === payload.incident.id ? payload.incident : entry));
      setSelectedIncident((current) => (current?.id === payload.incident.id ? payload.incident : current));
    }
  }

  async function escalateIncident(incidentId) {
    const payload = await api.escalateIncident(incidentId);
    setIncidents((current) => current.map((entry) => entry.id === payload.id ? payload : entry));
    setSelectedIncident((current) => (current?.id === payload.id ? payload : current));
  }

  async function resetDemo() {
    await api.resetDemo();
    setSelectedIncident(null);
  }

  const value = useMemo(() => ({
    incidents,
    volunteers,
    cameras,
    operators: OPERATORS,
    selectedIncident,
    urgentPing,
    loading,
    setSelectedIncident,
    acceptIncident,
    escalateIncident,
    resetDemo,
  }), [incidents, volunteers, cameras, selectedIncident, urgentPing, loading]);

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}
