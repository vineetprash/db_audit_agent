import { NextApiRequest } from 'next';
import { NextApiResponseServerIO } from '@/types/socket';
import { auditAgent } from '@/lib/auditAgent';
import { prisma } from '@/lib/prisma';
import { detectSuspiciousActivity } from '@/lib/detection';

let isListening = false;

export default async function handler(req: NextApiRequest, res: NextApiResponseServerIO) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (isListening) {
    return res.status(200).json({ message: 'Already listening' });
  }

  try {
    // Check if database is configured
    if (!process.env.AUDIT_DB_HOST) {
      return res.status(400).json({ error: 'Database not configured. Please configure in Settings.' });
    }

    await auditAgent.startListening(async (notification) => {
      // Save to database
      const log = await prisma.auditLog.create({
        data: {
          tableName: notification.table_name,
          operation: notification.operation,
          userName: notification.user_name,
          oldData: notification.old_data,
          newData: notification.new_data,
        },
      });

      // Broadcast to all clients
      if (res.socket.server.io) {
        res.socket.server.io.emit('audit_log', log);
      }

      // Check for suspicious activity
      const suspicion = detectSuspiciousActivity(notification);
      if (suspicion) {
        const alert = await prisma.suspiciousActivity.create({
          data: {
            logId: log.id,
            message: suspicion.message,
            severity: suspicion.severity,
            details: suspicion.details,
          },
        });

        if (res.socket.server.io) {
          res.socket.server.io.emit('suspicious_activity', alert);
        }
      }
    });

    isListening = true;
    res.status(200).json({ message: 'Started listening' });
  } catch (error: any) {
    console.error('Error starting audit log stream:', error);
    res.status(500).json({ error: error.message || 'Failed to start listening' });
  }
}
