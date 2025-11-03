import { NextApiRequest } from 'next';
import { NextApiResponseServerIO } from '@/types/socket';
import { auditAgent } from '@/lib/auditAgent';
import { dbConnection } from '@/lib/dbConnection';
import { detectSuspiciousActivity } from '@/lib/detection';
import { initSocketServer } from '@/lib/socket';

let isListening = false;
let processingNotifications = new Set<string>();

export default async function handler(req: NextApiRequest, res: NextApiResponseServerIO) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (isListening) {
    return res.status(200).json({ message: 'Already listening' });
  }

  try {
    // Initialize socket server if it doesn't exist
    if (!res.socket.server.io) {
      console.log('Initializing Socket.IO server...');
      res.socket.server.io = initSocketServer(res.socket.server);
    }

    console.log('🎧 Starting audit agent listener...');

    await auditAgent.startListening(async (notification) => {
      try {
        // Only process if Socket.IO server is available to prevent unnecessary database writes
        if (!res.socket?.server?.io) {
          return; // Skip processing if no one is listening
        }

        // Create a unique key for this notification to prevent duplicate processing
        const notificationKey = `${notification.table_name}-${notification.operation}-${notification.timestamp}-${JSON.stringify(notification.new_data)}`;
        
        if (processingNotifications.has(notificationKey)) {
          console.log('⏭️ Skipping duplicate notification:', notificationKey);
          return;
        }
        
        processingNotifications.add(notificationKey);
        
        // Clean up old processing keys (keep only recent ones)
        if (processingNotifications.size > 100) {
          const keysArray = Array.from(processingNotifications);
          keysArray.slice(0, 50).forEach(key => processingNotifications.delete(key));
        }

        console.log('📝 Processing audit notification:', {
          table: notification.table_name,
          operation: notification.operation,
          user: notification.user_name
        });

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

        // Create enhanced log data for frontend
        const enhancedLog = {
          id: log.id,
          tableName: log.table_name,
          operation: log.operation,
          userName: log.user_name,
          oldData: log.old_data,
          newData: log.new_data,
          timestamp: log.timestamp,
          // Add readable summaries if available
          readableOld: notification.readable_old || '',
          readableNew: notification.readable_new || '',
        };

        console.log('📤 Broadcasting audit log:', enhancedLog);

        // Broadcast to all clients
        res.socket.server.io.emit('audit_log', enhancedLog);

        // Check for suspicious activity
        const suspicion = detectSuspiciousActivity(notification);
        if (suspicion) {
          const alertResult = await dbConnection.query(
            `INSERT INTO "SuspiciousActivity" ("log_id", message, severity, details, timestamp) 
             VALUES ($1, $2, $3, $4, NOW()) RETURNING *`,
            [log.id, suspicion.message, suspicion.severity, suspicion.details]
          );
          
          const alert = alertResult.rows[0];

          res.socket.server.io.emit('suspicious_activity', {
            id: alert.id,
            logId: alert.log_id,
            message: alert.message,
            severity: alert.severity,
            details: alert.details,
            timestamp: alert.timestamp
          });
        }

        // Remove from processing set after successful completion
        setTimeout(() => {
          processingNotifications.delete(notificationKey);
        }, 5000); // Remove after 5 seconds

      } catch (error) {
        console.error('Error processing audit notification:', error);
      }
    });

    isListening = true;
    console.log('✅ Audit listener started successfully');
    res.status(200).json({ message: 'Started listening' });
  } catch (error: any) {
    console.error('❌ Error starting audit listener:', error);
    
    // Handle the case where audit agent isn't connected yet
    if (error.message.includes('not connected')) {
      return res.status(200).json({ 
        message: 'Database not connected. Please connect via Settings page first.',
        connected: false
      });
    }
    
    res.status(500).json({ error: error.message });
  }
}
