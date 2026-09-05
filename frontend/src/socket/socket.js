import { io } from 'socket.io-client';

// When VITE_SOCKET_URL is empty, Socket.IO connects to the same origin.
// Vite dev proxy forwards /socket.io/* (with WebSocket) to http://localhost:5000.
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || window.location.origin;

const socket = io(SOCKET_URL, {
  autoConnect: false,
  path: '/socket.io',
  transports: ['polling'],
  reconnection: true,
  reconnectionAttempts: 15,
  reconnectionDelay: 1000,
  timeout: 10000,
});

export default socket;
