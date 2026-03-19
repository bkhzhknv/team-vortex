import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import App from '../App';

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => ({
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
  })),
}));

function createResponse(payload) {
  return Promise.resolve({
    ok: true,
    json: async () => payload,
  });
}

beforeEach(() => {
  window.localStorage.clear();
  global.fetch = vi.fn((input) => {
    const url = String(input);

    if (url.includes('/api/incidents')) return createResponse([]);
    if (url.includes('/api/volunteers')) return createResponse([]);
    if (url.includes('/api/cameras')) return createResponse([]);

    return createResponse({});
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

test('shows login for unauthenticated users', async () => {
  render(<App />);

  expect(await screen.findByRole('heading', { name: /jyldam/i })).toBeInTheDocument();
  expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
});

test('shows overview navigation for authenticated operators', async () => {
  window.localStorage.setItem('jyldam-user', JSON.stringify({
    id: 'op1',
    name: 'Admin Operator',
    role: 'admin',
  }));

  render(<App />);

  expect(await screen.findByRole('link', { name: /overview/i })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /incidents/i })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /overview/i })).toBeInTheDocument();
});
