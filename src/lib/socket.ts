import { Server as SocketServer } from 'socket.io';
import { Server as HTTPServer } from 'http';

let io: SocketServer | null = null;

export function initSocketServer(server: HTTPServer) {
  if (io) {
    console.log('♻️ Socket.IO server already initialized');
    return io;
  }

  console.log('🚀 Initializing Socket.IO server...');
  
  io = new SocketServer(server, {
    path: '/api/socket',
    addTrailingSlash: false,
    cors: { 
      origin: '*',
      methods: ['GET', 'POST']
    },
    transports: ['websocket', 'polling'],
    allowEIO3: true,
  });

  io.on('connection', (socket) => {
    console.log('✅ Client connected:', socket.id);
    
    // Send a welcome message to confirm connection
    socket.emit('connected', { message: 'Welcome to audit streaming', socketId: socket.id });
    
    socket.on('test', (data) => {
      console.log('📨 Received test message:', data);
      socket.emit('test_response', { message: 'Test received', data });
    });
    
    socket.on('disconnect', () => {
      console.log('❌ Client disconnected:', socket.id);
    });

    socket.on('error', (error) => {
      console.error('❌ Socket error:', error);
    });
  });

  console.log('✅ Socket.IO server initialized successfully');
  return io;
}

export function getSocketServer() {
  if (!io) throw new Error('Socket server not initialized');
  return io;
}