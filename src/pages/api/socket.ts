import { Server as HTTPServer } from 'http';
import { NextApiRequest } from 'next';
import { NextApiResponseServerIO } from '@/types/socket';
import { initSocketServer } from '@/lib/socket';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default function handler(req: NextApiRequest, res: NextApiResponseServerIO) {
  if (!res.socket.server.io) {
    const httpServer: HTTPServer = res.socket.server as any;
    res.socket.server.io = initSocketServer(httpServer);
  }
  res.end();
}
