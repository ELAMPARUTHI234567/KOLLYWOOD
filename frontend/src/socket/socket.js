import { io } from 'socket.io-client';

// Connect to explicit backend URL if configured, otherwise fallback to current origin (for local Vite dev proxy)
const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  import.meta.env.VITE_BACKEND_URL ||
  import.meta.env.VITE_API_URL ||
  window.location.origin;

const socket = io(SOCKET_URL, {
  autoConnect: false,
  path: '/socket.io',
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: 15,
  reconnectionDelay: 1000,
  timeout: 10000,
});

export default socket;
