import { useDeferredValue, useState } from 'react';
import { useWorkspace } from '../providers';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs';
import { TacticalMap } from '../components/tactical-map';
import { formatRelative, formatTime, priorityTone, titleCase } from '../lib/utils';

function EmptyMessage({ label }) {
  return (
    <div className="rounded-[28px] border border-dashed border-[color:var(--line-soft)] bg-[color:var(--surface-raised)] px-4 py-5 text-center text-sm text-[color:var(--text-muted)]">
      {label}
    </div>
  );
}

function Lane({ title, items, onSelect }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base">{title}</CardTitle>
          <Badge variant="neutral">{items.length}</Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3">
        {items.length === 0 ? <EmptyMessage label={`No incidents in ${title.toLowerCase()}.`} /> : null}
        {items.map((incident) => (
          <button
            key={incident.id}
            className="grid gap-2 rounded-[24px] border border-[color:var(--line-soft)] bg-[color:var(--surface-raised)] p-4 text-left transition hover:border-[color:var(--line-strong)]"
            onClick={() => onSelect(incident)}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="font-medium text-[color:var(--text-strong)]">{incident.type}</div>
              <Badge variant={priorityTone(incident.priority)}>{incident.priority}</Badge>
            </div>
            <div className="text-sm text-[color:var(--text-muted)]">{incident.locationName}</div>
            <div className="text-xs uppercase tracking-[0.18em] text-[color:var(--text-faint)]">{formatRelative(incident.createdAt)}</div>
          </button>
        ))}
      </CardContent>
    </Card>
  );
}

function MetricCard({ label, value }) {
  return (
    <div className="rounded-[28px] border border-[color:var(--line-soft)] bg-[color:var(--surface-raised)] p-4">
      <div className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--text-faint)]">{label}</div>
      <div className="mt-2 text-sm font-medium text-[color:var(--text-strong)]">{value}</div>
    </div>
  );
}

export function IncidentsPage() {
  const { incidents, volunteers, setSelectedIncident } = useWorkspace();
  const [search, setSearch] = useState('');
  const [priority, setPriority] = useState('all');
  const deferredSearch = useDeferredValue(search);

  const filtered = incidents.filter((incident) => {
    const matchesSearch = `${incident.type} ${incident.locationName}`.toLowerCase().includes(deferredSearch.toLowerCase());
    const matchesPriority = priority === 'all' || incident.priority === priority;
    return matchesSearch && matchesPriority;
  });

  const grouped = {
    awaiting_volunteers: filtered.filter((incident) => incident.status === 'awaiting_volunteers'),
    active: filtered.filter((incident) => incident.status === 'active'),
    dispatched: filtered.filter((incident) => incident.status === 'dispatched' || incident.priority === 'red'),
    resolved: filtered.filter((incident) => incident.status === 'resolved'),
  };

  const readyCount = volunteers.filter((volunteer) => volunteer.available).length;

  return (
    <div className="grid gap-4">
      <Card>
        <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="grid gap-2">
            <div className="text-sm text-[color:var(--text-muted)]">Filter active response queues and open incidents into the detail drawer.</div>
            <div className="flex items-center gap-3 text-xs uppercase tracking-[0.18em] text-[color:var(--text-faint)]">
              <span>{readyCount} ready volunteers</span>
              <span>{filtered.length} visible incidents</span>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search type or location" className="min-w-[240px]" />
            <Tabs value={priority} onValueChange={setPriority}>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="red">Critical</TabsTrigger>
                <TabsTrigger value="yellow">Volunteer</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-4">
        <Lane title="Awaiting Volunteers" items={grouped.awaiting_volunteers} onSelect={setSelectedIncident} />
        <Lane title="Active" items={grouped.active} onSelect={setSelectedIncident} />
        <Lane title="Dispatched" items={grouped.dispatched} onSelect={setSelectedIncident} />
        <Lane title="Resolved" items={grouped.resolved} onSelect={setSelectedIncident} />
      </div>
    </div>
  );
}

export function DispatchPage() {
  const { incidents, setSelectedIncident, resetDemo } = useWorkspace();
  const emergencies = incidents.filter((incident) => incident.priority === 'red');
  const activeEmergency = emergencies[0];

  return (
    <div className="grid gap-4 xl:grid-cols-[0.8fr,1.2fr]">
      <Card>
        <CardHeader>
          <CardTitle>Emergency queue</CardTitle>
          <CardDescription>All red-priority incidents streaming into dispatch.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          {emergencies.length === 0 ? <EmptyMessage label="No active emergency escalations." /> : null}
          {emergencies.map((incident) => (
            <button
              key={incident.id}
              className="rounded-[28px] border border-red-400/12 bg-red-500/8 p-4 text-left transition hover:border-red-300/20"
              onClick={() => setSelectedIncident(incident)}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="font-medium text-[color:var(--text-strong)]">{incident.type}</div>
                <Badge variant="critical">{titleCase(incident.status)}</Badge>
              </div>
              <div className="mt-2 text-sm text-[color:var(--text-muted)]">{incident.locationName}</div>
              <div className="mt-3 text-xs uppercase tracking-[0.18em] text-[color:var(--text-faint)]">{formatTime(incident.createdAt)}</div>
            </button>
          ))}
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardContent className="grid gap-6 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Badge variant="critical" className="mb-3">Critical escalation track</Badge>
              <div className="text-3xl font-semibold tracking-[-0.05em] text-[color:var(--text-strong)]">
                {activeEmergency ? activeEmergency.type : 'System monitoring'}
              </div>
              <p className="mt-2 text-sm text-[color:var(--text-muted)]">
                {activeEmergency ? activeEmergency.locationName : 'No red-priority incidents are currently open.'}
              </p>
            </div>
            <Button variant="secondary" onClick={resetDemo}>Reset demo feed</Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <MetricCard label="Open emergencies" value={String(emergencies.length)} />
            <MetricCard label="Latest trigger" value={activeEmergency ? formatRelative(activeEmergency.createdAt) : 'Standby'} />
            <MetricCard label="Dispatch posture" value={activeEmergency ? 'Active' : 'Clear'} />
          </div>

          <TacticalMap
            title="Emergency map"
            incidents={emergencies}
            cameras={[]}
            volunteers={[]}
            onSelectIncident={setSelectedIncident}
            selectedIncidentId={activeEmergency?.id || null}
          />
        </CardContent>
      </Card>
    </div>
  );
}

export function CamerasPage() {
  const { cameras, incidents, setSelectedIncident } = useWorkspace();

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {cameras.map((camera) => {
        const linked = incidents.filter((incident) => incident.cameraId === camera.id);

        return (
          <Card key={camera.id}>
            <CardContent className="grid gap-4 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-lg font-semibold text-[color:var(--text-strong)]">{camera.name}</div>
                  <div className="text-sm text-[color:var(--text-muted)]">{camera.id}</div>
                </div>
                <Badge variant="success">Online</Badge>
              </div>
              <div className="grid gap-3 text-sm text-[color:var(--text-muted)]">
                <div>Coordinates: {camera.lat.toFixed(4)}, {camera.lng.toFixed(4)}</div>
                <div>Linked incidents: {linked.length}</div>
                <div>Critical linked: {linked.filter((incident) => incident.priority === 'red').length}</div>
              </div>
              {linked[0] ? (
                <Button variant="secondary" onClick={() => setSelectedIncident(linked[0])}>Open latest linked incident</Button>
              ) : null}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
