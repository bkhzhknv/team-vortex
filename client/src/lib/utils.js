import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatTime(value) {
  if (!value) return 'Unknown';

  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: 'short',
  }).format(new Date(value));
}

export function formatRelative(value) {
  if (!value) return 'Unknown';

  const now = Date.now();
  const diffMs = new Date(value).getTime() - now;
  const diffMinutes = Math.round(diffMs / 60000);
  const absMinutes = Math.abs(diffMinutes);

  if (absMinutes < 1) return 'now';
  if (absMinutes < 60) return `${Math.abs(diffMinutes)}m ${diffMinutes < 0 ? 'ago' : 'ahead'}`;

  const diffHours = Math.round(absMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ${diffMinutes < 0 ? 'ago' : 'ahead'}`;

  const diffDays = Math.round(diffHours / 24);
  return `${diffDays}d ${diffMinutes < 0 ? 'ago' : 'ahead'}`;
}

export function formatCoordinate(value) {
  return Number(value).toFixed(4);
}

export function haversineDistanceMeters(from, to) {
  const R = 6371000;
  const toRad = (degrees) => (degrees * Math.PI) / 180;
  const dLat = toRad(to.lat - from.lat);
  const dLng = toRad(to.lng - from.lng);
  const lat1 = toRad(from.lat);
  const lat2 = toRad(to.lat);

  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export function priorityTone(priority) {
  if (priority === 'red') return 'critical';
  if (priority === 'yellow') return 'warning';
  return 'neutral';
}

export function statusTone(status) {
  switch (status) {
    case 'resolved':
      return 'success';
    case 'awaiting_volunteers':
      return 'warning';
    case 'dispatched':
      return 'critical';
    default:
      return 'neutral';
  }
}

export function titleCase(value) {
  if (!value) return '';
  return value
    .replace(/_/g, ' ')
    .split(' ')
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(' ');
}
