import { IconBellRinging, IconMap2, IconRadar2, IconUsersGroup } from '@tabler/icons-react';
import { useMemo } from 'react';
import { TacticalMap } from '../components/tactical-map';
import { useWorkspace } from '../providers';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { cn, formatRelative, haversineDistanceMeters, priorityTone, titleCase } from '../lib/utils';

function StatCard({ title, value, helper, icon, tone = 'neutral' }) {
  return (
    <Card className="animate-enter">
      <CardContent className="flex items-center justify-between gap-4 p-5">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--text-faint)]">{title}</div>
          <div className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-[color:var(--text-strong)]">{value}</div>
          <div className="mt-1 text-sm text-[color:var(--text-muted)]">{helper}</div>
        </div>
        <div className={cn(
          'flex h-12 w-12 items-center justify-center rounded-3xl border',
          tone === 'critical' && 'border-red-400/15 bg-red-500/10 text-red-100',
          tone === 'success' && 'border-emerald-400/15 bg-emerald-500/10 text-emerald-100',
          tone === 'neutral' && 'border-[color:var(--line-soft)] bg-[color:var(--surface-raised)] text-[color:var(--text-soft)]'
        )}>
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyMessage({ label }) {
  return (
    <div className="rounded-[28px] border border-dashed border-[color:var(--line-soft)] bg-[color:var(--surface-raised)] px-6 py-8 text-center text-sm text-[color:var(--text-muted)]">
      {label}
    </div>
  );
}

export function OverviewPage() {
  const { incidents, volunteers, cameras, setSelectedIncident, loading } = useWorkspace();

  const metrics = useMemo(() => ({
    active: incidents.filter((incident) => incident.status !== 'resolved').length,
    critical: incidents.filter((incident) => incident.priority === 'red').length,
    ready: volunteers.filter((volunteer) => volunteer.available).length,
    coverage: cameras.length,
  }), [incidents, volunteers, cameras]);

  const activeIncidents = incidents.slice(0, 6);
  const readiness = volunteers
    .map((volunteer) => ({
      ...volunteer,
      nearbyIncident: incidents
        .map((incident) => ({
          incident,
          distance: haversineDistanceMeters(
            { lat: volunteer.lat, lng: volunteer.lng },
            { lat: incident.lat, lng: incident.lng }
          ),
        }))
        .sort((left, right) => left.distance - right.distance)[0],
    }))
    .slice(0, 5);

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Active incidents" value={metrics.active} helper="Open response items" icon={<IconRadar2 size={18} />} />
        <StatCard title="Critical load" value={metrics.critical} helper="Red priority events" icon={<IconBellRinging size={18} />} tone="critical" />
        <StatCard title="Ready volunteers" value={`${metrics.ready}/${volunteers.length || 0}`} helper="Immediately dispatchable" icon={<IconUsersGroup size={18} />} tone="success" />
        <StatCard title="Coverage grid" value={metrics.coverage} helper="Camera sectors connected" icon={<IconMap2 size={18} />} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.95fr,1.25fr]">
        <Card className="animate-enter">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>Live queue</CardTitle>
                <CardDescription>Highest-priority incidents requiring coordination attention.</CardDescription>
              </div>
              <Badge variant="neutral">{activeIncidents.length} tracked</Badge>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3">
            {loading ? <EmptyMessage label="Loading incident posture..." /> : null}
            {!loading && activeIncidents.length === 0 ? <EmptyMessage label="No incidents in queue." /> : null}
            {activeIncidents.map((incident) => (
              <button
                key={incident.id}
                className="group grid gap-2 rounded-[28px] border border-[color:var(--line-soft)] bg-[color:var(--surface-raised)] p-4 text-left transition hover:border-[color:var(--line-strong)] hover:bg-[color:var(--surface-overlay)]"
                onClick={() => setSelectedIncident(incident)}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="font-medium text-[color:var(--text-strong)]">{incident.type}</div>
                  <Badge variant={priorityTone(incident.priority)}>{incident.priority}</Badge>
                </div>
                <div className="text-sm text-[color:var(--text-muted)]">{incident.locationName}</div>
                <div className="flex items-center justify-between gap-3 text-xs uppercase tracking-[0.18em] text-[color:var(--text-faint)]">
                  <span>{titleCase(incident.status)}</span>
                  <span>{formatRelative(incident.createdAt)}</span>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        <TacticalMap
          incidents={incidents.slice(0, 30)}
          cameras={cameras}
          volunteers={volunteers}
          onSelectIncident={setSelectedIncident}
          selectedIncidentId={null}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr,0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Volunteer readiness</CardTitle>
            <CardDescription>Closest field resources and the nearest active demand point.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {readiness.map((volunteer) => (
              <div key={volunteer.id} className="flex items-center justify-between gap-4 rounded-[28px] border border-[color:var(--line-soft)] bg-[color:var(--surface-raised)] p-4">
                <div>
                  <div className="font-medium text-[color:var(--text-strong)]">{volunteer.name}</div>
                  <div className="mt-1 text-sm text-[color:var(--text-muted)]">
                    {volunteer.nearbyIncident ? `${volunteer.nearbyIncident.incident.type} in ${volunteer.nearbyIncident.distance}m` : 'No nearby active incidents'}
                  </div>
                </div>
                <Badge variant={volunteer.available ? 'success' : 'neutral'}>
                  {volunteer.available ? 'Ready' : 'Assigned'}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Escalation posture</CardTitle>
            <CardDescription>Current critical track for emergency dispatch.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {incidents.filter((incident) => incident.priority === 'red').slice(0, 4).map((incident) => (
              <div key={incident.id} className="rounded-[28px] border border-red-400/10 bg-red-500/8 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-medium text-[color:var(--text-strong)]">{incident.type}</div>
                  <Badge variant="critical">{titleCase(incident.status)}</Badge>
                </div>
                <div className="mt-2 text-sm text-[color:var(--text-muted)]">{incident.locationName}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
