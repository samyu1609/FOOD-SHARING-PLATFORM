import { io } from 'socket.io-client';

// 'http://localhost:5001' is the backend server URL.
// In production, this should point to your deployed backend.
const socket = io('http://localhost:5001', {
  autoConnect: false // Connect manually when needed
});

export default socket;
