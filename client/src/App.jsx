import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/app-shell';
import { IncidentDrawer } from './components/incident-drawer';
import { CamerasPage, DispatchPage, IncidentsPage } from './pages/incident-pages';
import { LoginPage } from './pages/login-page';
import { OperatorProfilePage, OperatorsPage, VolunteerProfilePage, VolunteersPage } from './pages/people-pages';
import { OverviewPage } from './pages/overview-page';
import { SettingsPage } from './pages/settings-page';
import { AuthProvider, SettingsProvider, useAuth, useWorkspace, WorkspaceProvider } from './providers';

function ProtectedRoute({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AppRoutes() {
  const { user } = useAuth();
  const { volunteers, selectedIncident, setSelectedIncident, acceptIncident, escalateIncident } = useWorkspace();

  return (
    <>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<Navigate to={user ? '/overview' : '/login'} replace />} />
        <Route path="/dashboard" element={<Navigate to="/overview" replace />} />
        <Route path="/112" element={<Navigate to="/dispatch-112" replace />} />
        <Route
          element={(
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          )}
        >
          <Route path="/overview" element={<OverviewPage />} />
          <Route path="/incidents" element={<IncidentsPage />} />
          <Route path="/volunteers" element={<VolunteersPage />} />
          <Route path="/volunteers/:id" element={<VolunteerProfilePage />} />
          <Route path="/operators" element={<OperatorsPage />} />
          <Route path="/operators/:id" element={<OperatorProfilePage />} />
          <Route path="/dispatch-112" element={<DispatchPage />} />
          <Route path="/cameras" element={<CamerasPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to={user ? '/overview' : '/login'} replace />} />
      </Routes>

      <IncidentDrawer
        incident={selectedIncident}
        open={Boolean(selectedIncident)}
        volunteers={volunteers}
        onOpenChange={(open) => {
          if (!open) setSelectedIncident(null);
        }}
        onAcceptIncident={acceptIncident}
        onEscalateIncident={escalateIncident}
      />
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SettingsProvider>
          <WorkspaceProvider>
            <AppRoutes />
          </WorkspaceProvider>
        </SettingsProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
