import { io } from 'socket.io-client';

const rawSocketUrl = (
  import.meta.env.VITE_SOCKET_URL ||
  import.meta.env.VITE_BACKEND_URL ||
  import.meta.env.VITE_API_URL ||
  window.location.origin
).trim().replace(/\/+$/, '');

const socket = io(rawSocketUrl, {
  autoConnect: false,
  path: '/socket.io',
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: 15,
  reconnectionDelay: 1000,
  timeout: 10000,
});

export default socket;
