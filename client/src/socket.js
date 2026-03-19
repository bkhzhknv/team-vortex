import { io } from 'socket.io-client';

const socket = io('http://localhost:4000', {
  transports: ['websocket', 'polling'],
  autoConnect: true,
});

socket.on('connect', () => {
  console.log('Connected to Jyldam server');
});

socket.on('disconnect', () => {
  console.log('Disconnected from server');
});

export default socket;
