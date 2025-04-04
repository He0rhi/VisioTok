import { io } from 'socket.io-client';
import { API_CONFIG } from '../config';

const socket = io(`${API_CONFIG.API_HOST}:3002`, {
  "force new connection": true,
  reconnectionAttempts: "Infinity",
  timeout: 10000,
  transports: ["websocket"],
  secure: true,
  rejectUnauthorized: false,
});

export default socket;
