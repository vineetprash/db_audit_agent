import { NextApiRequest, NextApiResponse } from 'next';
import { dbConnection } from '@/lib/dbConnection';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check if using default localhost config and handle gracefully
    if (dbConnection.isUsingDefaults()) {
      // Return empty array if no database configured yet
      return res.status(200).json([]);
    }

    const result = await dbConnection.query(
      `SELECT * FROM "AuditLog" ORDER BY timestamp DESC LIMIT 100`
    );

    // Transform database field names to match frontend interface
    const transformedLogs = result.rows.map(row => ({
      id: row.id,
      tableName: row.table_name,
      operation: row.operation,
      userName: row.user_name,
      oldData: row.old_data,
      newData: row.new_data,
      timestamp: row.timestamp
    }));

    res.status(200).json(transformedLogs);
  } catch (error: any) {
    console.error('Database error:', error);
    // Return empty array instead of error if database not reachable
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
      console.log('⚠️ Database connection failed, returning empty logs array');
      return res.status(200).json([]);
    }
    
    // For other errors, still return empty array to prevent frontend breakage
    console.log('⚠️ Database error occurred, returning empty logs array to prevent frontend breakage');
    return res.status(200).json([]);
  }
}
