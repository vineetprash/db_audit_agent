import { Server as SocketServer } from 'socket.io';
import { NextApiResponse } from 'next';
import { Server as HTTPServer } from 'http';

export type NextApiResponseServerIO = NextApiResponse & {
  socket: {
    server: HTTPServer & {
      io?: SocketServer;
    };
  };
};
