import { useSettings } from '../providers';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';

function MetricCard({ label, value }) {
  return (
    <div className="rounded-[28px] border border-[color:var(--line-soft)] bg-[color:var(--surface-raised)] p-4">
      <div className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--text-faint)]">{label}</div>
      <div className="mt-2 text-sm font-medium text-[color:var(--text-strong)]">{value}</div>
    </div>
  );
}

function SettingRow({ title, description, action, onClick }) {
  return (
    <button
      className="flex items-center justify-between gap-4 rounded-[28px] border border-[color:var(--line-soft)] bg-[color:var(--surface-raised)] p-4 text-left transition hover:border-[color:var(--line-strong)]"
      onClick={onClick}
    >
      <div>
        <div className="font-medium text-[color:var(--text-strong)]">{title}</div>
        <div className="mt-1 text-sm text-[color:var(--text-muted)]">{description}</div>
      </div>
      <Badge variant="neutral">{action}</Badge>
    </button>
  );
}

export function SettingsPage() {
  const { dark, reducedMotion, toggleTheme, toggleMotion } = useSettings();

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Workspace environment</CardTitle>
          <CardDescription>Operator comfort and display defaults for this browser.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <SettingRow
            title="Theme"
            description="Switch between quiet tactical dark and its light companion."
            action={dark ? 'Dark active' : 'Light active'}
            onClick={toggleTheme}
          />
          <SettingRow
            title="Motion"
            description="Reduce nonessential motion for operators sensitive to UI movement."
            action={reducedMotion ? 'Reduced motion' : 'Full motion'}
            onClick={toggleMotion}
          />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Alert posture</CardTitle>
          <CardDescription>Frontend-first controls aligned with the current API surface.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <MetricCard label="Socket transport" value="Live" />
          <MetricCard label="Notification mode" value="Urgent only" />
          <MetricCard label="Command density" value="Hybrid tactical" />
          <MetricCard label="Interaction model" value="Drawer-based drilldown" />
        </CardContent>
      </Card>
    </div>
  );
}
