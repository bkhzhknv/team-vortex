import React, { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import CAMERAS from '../data/cameras';
import './CityMap.css';

const CENTER = [42.9000, 71.3667];

const cameraIcon = new L.DivIcon({
  className: 'camera-marker',
  html: `<div class="camera-pin"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M17 2l-2 3h-6L7 2"/></svg></div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

function createIncidentIcon(priority) {
  const color = priority === 'red' ? '#ff3b5c' : priority === 'yellow' ? '#ffb830' : '#00e09e';
  const pulse = priority === 'red' ? 'incident-pulse-red' : 'incident-pulse-yellow';
  return new L.DivIcon({
    className: `incident-marker ${pulse}`,
    html: `<div class="incident-pin" style="--color: ${color}"><span class="incident-dot" style="background: ${color}"></span></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

function createVolunteerIcon(color) {
  return new L.DivIcon({
    className: 'volunteer-marker',
    html: `<div class="volunteer-pin" style="background: ${color}; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

function CityMap({ incidents, onSelectIncident, volunteers = [] }) {
  const activeIncidents = useMemo(() =>
    incidents.filter(i => i.status !== 'resolved'),
    [incidents]
  );

  return (
    <div className="city-map" id="city-map">
      <MapContainer
        center={CENTER}
        zoom={14}
        scrollWheelZoom={true}
        zoomControl={true}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        {CAMERAS.map(cam => (
          <Marker key={cam.id} position={[cam.lat, cam.lng]} icon={cameraIcon}>
            <Popup className="custom-popup">
              <div className="popup-content">
                <strong>📷 {cam.name}</strong>
                <span className="popup-id">{cam.id}</span>
              </div>
            </Popup>
          </Marker>
        ))}

        {volunteers.map(v => (
          <Marker key={v.id} position={[v.lat, v.lng]} icon={createVolunteerIcon(v.avatarColor)}>
            <Popup className="custom-popup">
              <div className="popup-content">
                <strong>👤 {v.name}</strong>
                <span style={{ fontSize: '11px', color: '#94a3c0' }}>{v.available ? '🟢 Available' : '🟡 On duty'}</span>
              </div>
            </Popup>
          </Marker>
        ))}

        {activeIncidents.map(inc => (
          <Marker
            key={inc.id}
            position={[inc.lat, inc.lng]}
            icon={createIncidentIcon(inc.priority)}
            eventHandlers={{ click: () => onSelectIncident(inc) }}
          >
            <Popup className="custom-popup">
              <div className="popup-content">
                <strong>{inc.type}</strong>
                <span className={`badge ${inc.priority}`}>{inc.priority.toUpperCase()}</span>
                <span style={{ fontSize: '11px', color: '#94a3c0' }}>{inc.locationName}</span>
              </div>
            </Popup>
          </Marker>
        ))}

        {activeIncidents.filter(i => i.priority === 'red').map(inc => (
          <CircleMarker
            key={`radius-${inc.id}`}
            center={[inc.lat, inc.lng]}
            radius={20}
            pathOptions={{
              color: 'rgba(255, 59, 92, 0.4)',
              fillColor: 'rgba(255, 59, 92, 0.1)',
              fillOpacity: 0.3,
              weight: 1,
            }}
          />
        ))}
      </MapContainer>
    </div>
  );
}

export default CityMap;
