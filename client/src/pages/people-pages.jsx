import { useDeferredValue, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { TacticalMap } from '../components/tactical-map';
import { useWorkspace } from '../providers';
import { buttonVariants } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { haversineDistanceMeters, titleCase } from '../lib/utils';

function MetricCard({ label, value }) {
  return (
    <div className="rounded-[28px] border border-[color:var(--line-soft)] bg-[color:var(--surface-raised)] p-4">
      <div className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--text-faint)]">{label}</div>
      <div className="mt-2 text-sm font-medium text-[color:var(--text-strong)]">{value}</div>
    </div>
  );
}

function NotFoundCard({ label }) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="rounded-[28px] border border-dashed border-[color:var(--line-soft)] bg-[color:var(--surface-raised)] px-6 py-8 text-center text-sm text-[color:var(--text-muted)]">
          {label}
        </div>
      </CardContent>
    </Card>
  );
}

export function VolunteersPage() {
  const { volunteers, incidents } = useWorkspace();
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);

  const filtered = volunteers.filter((volunteer) => volunteer.name.toLowerCase().includes(deferredSearch.toLowerCase()));

  return (
    <div className="grid gap-4">
      <Card>
        <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="text-sm text-[color:var(--text-muted)]">Monitor availability, coverage position, and nearest demand.</div>
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search volunteers" className="max-w-[280px]" />
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((volunteer) => {
          const nearest = incidents
            .map((incident) => ({
              incident,
              distance: haversineDistanceMeters(
                { lat: volunteer.lat, lng: volunteer.lng },
                { lat: incident.lat, lng: incident.lng }
              ),
            }))
            .sort((left, right) => left.distance - right.distance)[0];

          return (
            <Card key={volunteer.id} className="animate-enter">
              <CardContent className="grid gap-4 p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-lg font-semibold text-[color:var(--text-strong)]">{volunteer.name}</div>
                    <div className="text-sm text-[color:var(--text-muted)]">{volunteer.id.toUpperCase()}</div>
                  </div>
                  <Badge variant={volunteer.available ? 'success' : 'neutral'}>
                    {volunteer.available ? 'Ready' : 'Assigned'}
                  </Badge>
                </div>
                <div className="grid gap-2 text-sm text-[color:var(--text-muted)]">
                  <div>Nearest incident: {nearest ? `${nearest.incident.type} (${nearest.distance}m)` : 'None'}</div>
                  <div>Coordinates: {volunteer.lat.toFixed(4)}, {volunteer.lng.toFixed(4)}</div>
                </div>
                <Link className={buttonVariants({ variant: 'secondary' })} to={`/volunteers/${volunteer.id}`}>
                  Open volunteer profile
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export function VolunteerProfilePage() {
  const { id } = useParams();
  const { volunteers, incidents, setSelectedIncident } = useWorkspace();
  const volunteer = volunteers.find((entry) => entry.id === id);

  if (!volunteer) return <NotFoundCard label="Volunteer profile not found." />;

  const nearbyIncidents = incidents
    .map((incident) => ({
      incident,
      distance: haversineDistanceMeters(
        { lat: volunteer.lat, lng: volunteer.lng },
        { lat: incident.lat, lng: incident.lng }
      ),
    }))
    .sort((left, right) => left.distance - right.distance)
    .slice(0, 5);

  return (
    <div className="grid gap-4 xl:grid-cols-[0.85fr,1.15fr]">
      <Card>
        <CardContent className="grid gap-5 p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-2xl font-semibold tracking-[-0.04em] text-[color:var(--text-strong)]">{volunteer.name}</div>
              <div className="mt-1 text-sm text-[color:var(--text-muted)]">Volunteer field profile</div>
            </div>
            <Badge variant={volunteer.available ? 'success' : 'neutral'}>
              {volunteer.available ? 'Ready' : 'Assigned'}
            </Badge>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <MetricCard label="Readiness" value={volunteer.available ? 'Dispatchable' : 'Busy'} />
            <MetricCard label="Coverage point" value={`${volunteer.lat.toFixed(4)}, ${volunteer.lng.toFixed(4)}`} />
            <MetricCard label="Closest demand" value={nearbyIncidents[0] ? `${nearbyIncidents[0].distance}m` : 'None'} />
            <MetricCard label="Nearby active load" value={String(nearbyIncidents.length)} />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        <TacticalMap
          title="Volunteer area view"
          incidents={nearbyIncidents.map((entry) => entry.incident)}
          cameras={[]}
          volunteers={[volunteer]}
          onSelectIncident={setSelectedIncident}
          selectedIncidentId={null}
        />
        <Card>
          <CardHeader>
            <CardTitle>Nearby incidents</CardTitle>
            <CardDescription>Closest open demand points for this volunteer.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {nearbyIncidents.map(({ incident, distance }) => (
              <button
                key={incident.id}
                className="flex items-center justify-between gap-4 rounded-[28px] border border-[color:var(--line-soft)] bg-[color:var(--surface-raised)] p-4 text-left transition hover:border-[color:var(--line-strong)]"
                onClick={() => setSelectedIncident(incident)}
              >
                <div>
                  <div className="font-medium text-[color:var(--text-strong)]">{incident.type}</div>
                  <div className="text-sm text-[color:var(--text-muted)]">{incident.locationName}</div>
                </div>
                <div className="text-sm text-[color:var(--text-soft)]">{distance}m</div>
              </button>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function OperatorsPage() {
  const { operators } = useWorkspace();

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {operators.map((operator) => (
        <Card key={operator.id}>
          <CardContent className="grid gap-4 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-lg font-semibold text-[color:var(--text-strong)]">{operator.name}</div>
                <div className="text-sm text-[color:var(--text-muted)]">{titleCase(operator.role)}</div>
              </div>
              <Badge variant="neutral">{operator.clearance}</Badge>
            </div>
            <div className="grid gap-2 text-sm text-[color:var(--text-muted)]">
              <div>Shift: {operator.shift}</div>
              <div>Focus: {operator.focus}</div>
              <div>Dispatch pace: {operator.dispatchRate}s average</div>
            </div>
            <Link className={buttonVariants({ variant: 'secondary' })} to={`/operators/${operator.id}`}>
              Open operator profile
            </Link>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function OperatorProfilePage() {
  const { id } = useParams();
  const { operators, incidents } = useWorkspace();
  const operator = operators.find((entry) => entry.id === id);

  if (!operator) return <NotFoundCard label="Operator profile not found." />;

  return (
    <div className="grid gap-4 xl:grid-cols-[0.9fr,1.1fr]">
      <Card>
        <CardContent className="grid gap-4 p-6">
          <div>
            <div className="text-2xl font-semibold tracking-[-0.04em] text-[color:var(--text-strong)]">{operator.name}</div>
            <div className="mt-1 text-sm text-[color:var(--text-muted)]">{titleCase(operator.role)} operator</div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <MetricCard label="Shift" value={operator.shift} />
            <MetricCard label="Clearance" value={operator.clearance} />
            <MetricCard label="Handled" value={String(operator.incidentsHandled)} />
            <MetricCard label="Quality score" value={`${operator.qualityScore}%`} />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Current load context</CardTitle>
          <CardDescription>Operator profile enriched from live incident pressure and seeded admin data.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <MetricCard label="Active incident load" value={String(incidents.filter((incident) => incident.status !== 'resolved').length)} />
          <MetricCard label="Red-priority incidents" value={String(incidents.filter((incident) => incident.priority === 'red').length)} />
          <MetricCard label="Dispatch rate" value={`${operator.dispatchRate}s`} />
          <MetricCard label="Last activity" value={operator.lastActivity} />
        </CardContent>
      </Card>
    </div>
  );
}
