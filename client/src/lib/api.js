import { io } from 'socket.io-client';

async function jsonRequest(path, options = {}) {
  const response = await fetch(path, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
    ...options,
  });

  if (!response.ok) {
    let errorMessage = 'Request failed';

    try {
      const payload = await response.json();
      errorMessage = payload.error || errorMessage;
    } catch {
      // Preserve generic error when body is missing.
    }

    throw new Error(errorMessage);
  }

  if (response.status === 204) return null;
  return response.json();
}

export const api = {
  login: (body) => jsonRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(body),
  }),
  incidents: () => jsonRequest('/api/incidents'),
  volunteers: () => jsonRequest('/api/volunteers'),
  cameras: () => jsonRequest('/api/cameras'),
  acceptIncident: (incidentId, volunteerId) => jsonRequest(`/api/incidents/${incidentId}/accept`, {
    method: 'POST',
    body: JSON.stringify({ volunteerId }),
  }),
  escalateIncident: (incidentId) => jsonRequest(`/api/incidents/${incidentId}/escalate`, {
    method: 'POST',
  }),
  resetDemo: () => jsonRequest('/api/incidents/reset', {
    method: 'POST',
  }),
};

export const socket = io(undefined, {
  autoConnect: true,
  transports: ['websocket', 'polling'],
});
