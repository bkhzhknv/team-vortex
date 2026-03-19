import { useMemo } from 'react';
import { CircleMarker, MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { formatTime, priorityTone } from '../lib/utils';

const CENTER = [42.9002, 71.3665];

function createCameraIcon() {
  return new L.DivIcon({
    className: '',
    html: `
      <div style="
        display:flex;
        align-items:center;
        justify-content:center;
        width:18px;
        height:18px;
        border-radius:999px;
        background:rgba(166,255,211,0.18);
        border:1px solid rgba(166,255,211,0.5);
        box-shadow:0 0 0 6px rgba(166,255,211,0.08);
      "></div>
    `,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

function incidentStyle(priority) {
  if (priority === 'red') {
    return { color: '#f38f8f', fillColor: '#e14d4d', radius: 10 };
  }

  return { color: '#ffd06a', fillColor: '#b88b31', radius: 8 };
}

export function TacticalMap({ incidents, cameras, volunteers, selectedIncidentId, onSelectIncident, title = 'Tactical Map' }) {
  const cameraIcon = useMemo(() => createCameraIcon(), []);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-[color:var(--line-soft)]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle>{title}</CardTitle>
            <p className="text-sm text-[color:var(--text-muted)]">Live field visibility across Taraz camera sectors</p>
          </div>
          <Badge variant="success">{cameras.length} cameras online</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="h-[360px] md:h-[420px]">
          <MapContainer center={CENTER} zoom={14} scrollWheelZoom className="h-full w-full">
            <TileLayer
              attribution="&copy; OpenStreetMap contributors &copy; CARTO"
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />

            {cameras.map((camera) => (
              <Marker key={camera.id} position={[camera.lat, camera.lng]} icon={cameraIcon}>
                <Popup>
                  <div className="space-y-1">
                    <div className="text-xs uppercase tracking-[0.2em] text-slate-500">{camera.id}</div>
                    <div className="font-semibold">{camera.name}</div>
                  </div>
                </Popup>
              </Marker>
            ))}

            {volunteers.slice(0, 10).map((volunteer) => (
              <CircleMarker
                key={volunteer.id}
                center={[volunteer.lat, volunteer.lng]}
                radius={6}
                pathOptions={{
                  color: volunteer.available ? '#63e6be' : '#7c8799',
                  fillColor: volunteer.available ? '#29b37e' : '#455066',
                  fillOpacity: 1,
                }}
              >
                <Popup>
                  <div className="space-y-1">
                    <div className="font-semibold">{volunteer.name}</div>
                    <div className="text-sm text-slate-500">{volunteer.available ? 'Ready' : 'Assigned'}</div>
                  </div>
                </Popup>
              </CircleMarker>
            ))}

            {incidents.map((incident) => {
              const style = incidentStyle(incident.priority);

              return (
                <CircleMarker
                  key={incident.id}
                  center={[incident.lat, incident.lng]}
                  radius={style.radius}
                  pathOptions={{
                    color: selectedIncidentId === incident.id ? '#f8fafc' : style.color,
                    fillColor: style.fillColor,
                    fillOpacity: 0.92,
                    weight: selectedIncidentId === incident.id ? 2 : 1,
                  }}
                  eventHandlers={{ click: () => onSelectIncident(incident) }}
                >
                  <Popup>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-semibold">{incident.type}</div>
                        <Badge variant={priorityTone(incident.priority)}>{incident.priority}</Badge>
                      </div>
                      <div className="text-sm text-slate-500">{incident.locationName}</div>
                      <div className="text-xs uppercase tracking-[0.18em] text-slate-400">{formatTime(incident.createdAt)}</div>
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}
          </MapContainer>
        </div>
      </CardContent>
    </Card>
  );
}
