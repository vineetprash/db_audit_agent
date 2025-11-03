import { NextApiRequest } from 'next';
import { NextApiResponseServerIO } from '@/types/socket';
import { auditAgent } from '@/lib/auditAgent';
import { dbConnection } from '@/lib/dbConnection';
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
    await auditAgent.startListening(async (notification) => {
      // Save to database using dbConnection
      const result = await dbConnection.query(
        `INSERT INTO "AuditLog" ("table_name", operation, "user_name", "old_data", "new_data", timestamp) 
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [
          notification.table_name,
          notification.operation,
          notification.user_name,
          notification.old_data,
          notification.new_data,
          notification.timestamp
        ]
      );
      
      const log = result.rows[0];

      // Broadcast to all clients
      if (res.socket.server.io) {
        res.socket.server.io.emit('audit_log', {
          id: log.id,
          tableName: log.table_name,
          operation: log.operation,
          userName: log.user_name,
          oldData: log.old_data,
          newData: log.new_data,
          timestamp: log.timestamp
        });
      }

      // Check for suspicious activity
      const suspicion = detectSuspiciousActivity(notification);
      if (suspicion) {
        const alertResult = await dbConnection.query(
          `INSERT INTO "SuspiciousActivity" ("log_id", message, severity, details, timestamp) 
           VALUES ($1, $2, $3, $4, NOW()) RETURNING *`,
          [log.id, suspicion.message, suspicion.severity, suspicion.details]
        );
        
        const alert = alertResult.rows[0];

        if (res.socket.server.io) {
          res.socket.server.io.emit('suspicious_activity', {
            id: alert.id,
            logId: alert.log_id,
            message: alert.message,
            severity: alert.severity,
            details: alert.details,
            timestamp: alert.timestamp
          });
        }
      }
    });

    isListening = true;
    res.status(200).json({ message: 'Started listening' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
