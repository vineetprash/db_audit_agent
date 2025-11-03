import { Server as SocketServer } from 'socket.io';
import { Server as HTTPServer } from 'http';

let io: SocketServer | null = null;

export function initSocketServer(server: HTTPServer) {
  if (io) return io;

  io = new SocketServer(server, {
    path: '/api/socket',
    addTrailingSlash: false,
    cors: { origin: '*' },
  });

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  return io;
}

export function getSocketServer() {
  if (!io) throw new Error('Socket server not initialized');
  return io;
}