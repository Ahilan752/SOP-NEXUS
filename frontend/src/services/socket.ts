import { io, Socket } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:5000';
let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: false,
      transports: ['websocket', 'polling']
    });
  }
  return socket;
};

export const connectSocket = (userId: string, role: string, departmentId?: string) => {
  const skt = getSocket();
  if (!skt.connected) {
    skt.connect();
    skt.emit('join', { userId, role, departmentId });
    console.log(`Socket connected & requested join for User: ${userId}`);
  }
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    console.log('Socket disconnected.');
  }
};
