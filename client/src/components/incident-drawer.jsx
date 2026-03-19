import { IconArrowUpRight, IconBolt, IconMapPin, IconRadar, IconUsersGroup } from '@tabler/icons-react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from './ui/sheet';
import { formatCoordinate, formatRelative, formatTime, haversineDistanceMeters, priorityTone, statusTone, titleCase } from '../lib/utils';

function Metric({ label, value }) {
  return (
    <div className="rounded-3xl border border-[color:var(--line-soft)] bg-white/[0.02] p-4">
      <div className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--text-faint)]">{label}</div>
      <div className="mt-1 text-sm font-medium text-[color:var(--text-strong)]">{value}</div>
    </div>
  );
}

export function IncidentDrawer({
  incident,
  open,
  volunteers,
  onOpenChange,
  onAcceptIncident,
  onEscalateIncident,
}) {
  const matches = incident
    ? volunteers
      .map((volunteer) => ({
        ...volunteer,
        distance: haversineDistanceMeters(
          { lat: incident.lat, lng: incident.lng },
          { lat: volunteer.lat, lng: volunteer.lng }
        ),
      }))
      .sort((left, right) => left.distance - right.distance)
      .slice(0, 4)
    : [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        {incident ? (
          <>
            <SheetHeader>
              <div className="flex items-center gap-2">
                <Badge variant={priorityTone(incident.priority)}>{incident.priority}</Badge>
                <Badge variant={statusTone(incident.status)}>{titleCase(incident.status)}</Badge>
              </div>
              <SheetTitle>{incident.type}</SheetTitle>
              <SheetDescription>{incident.locationName}</SheetDescription>
            </SheetHeader>

            <div className="grid gap-4">
              <Card className="bg-[color:var(--surface-raised)]">
                <CardContent className="grid gap-4 p-5">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Metric label="Created" value={formatTime(incident.createdAt)} />
                    <Metric label="Relative" value={formatRelative(incident.createdAt)} />
                    <Metric label="Camera" value={incident.cameraId || 'Manual'} />
                    <Metric label="Coordinates" value={`${formatCoordinate(incident.lat)}, ${formatCoordinate(incident.lng)}`} />
                  </div>
                  <div className="grid gap-2 rounded-3xl border border-[color:var(--line-soft)] bg-black/10 p-4 text-sm text-[color:var(--text-soft)]">
                    <div className="flex items-center gap-2 text-[color:var(--text-strong)]">
                      <IconBolt size={18} />
                      Dispatch action
                    </div>
                    <p>{incident.dispatchAction || 'Awaiting operator decision'}</p>
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-3 sm:grid-cols-2">
                <Button
                  variant="secondary"
                  onClick={() => {
                    const volunteer = matches.find((entry) => entry.available);
                    if (volunteer) onAcceptIncident(incident.id, volunteer.id);
                  }}
                  disabled={!matches.some((entry) => entry.available)}
                >
                  <IconUsersGroup size={16} />
                  Dispatch nearest volunteer
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => onEscalateIncident(incident.id)}
                  disabled={incident.priority === 'red'}
                >
                  <IconArrowUpRight size={16} />
                  Escalate to 112
                </Button>
              </div>

              <div className="grid gap-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold uppercase tracking-[0.2em] text-[color:var(--text-soft)]">Nearest field resources</h4>
                  <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[color:var(--text-faint)]">
                    <IconRadar size={14} />
                    proximity ranked
                  </div>
                </div>
                {matches.map((volunteer) => (
                  <Card key={volunteer.id} className="bg-[color:var(--surface-raised)]">
                    <CardContent className="flex items-center justify-between gap-3 p-4">
                      <div className="space-y-1">
                        <div className="font-medium text-[color:var(--text-strong)]">{volunteer.name}</div>
                        <div className="flex items-center gap-2 text-sm text-[color:var(--text-muted)]">
                          <IconMapPin size={14} />
                          {volunteer.distance}m away
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={volunteer.available ? 'success' : 'neutral'}>
                          {volunteer.available ? 'Ready' : 'Busy'}
                        </Badge>
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={!volunteer.available}
                          onClick={() => onAcceptIncident(incident.id, volunteer.id)}
                        >
                          Assign
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
