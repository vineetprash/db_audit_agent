import { NextApiRequest, NextApiResponse } from 'next';
import { dbConnection } from '@/lib/dbConnection';
import { auditAgent } from '@/lib/auditAgent';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { table } = req.query;
  const tableName = table === 'users' ? 'User' : 'Course';

  try {
    // Ensure audit agent is connected for all operations (only if not already connected)
    const dbConfig = dbConnection.getConfig();
    try {
      await auditAgent.connect(dbConfig);
    } catch (err: any) {
      console.log('⚠️ Could not connect audit agent:', err.message);
    }

    if (req.method === 'GET') {
      // Check if using default localhost config and handle gracefully
      if (dbConnection.isUsingDefaults()) {
        // Return empty array if no database configured yet
        return res.status(200).json([]);
      }

      // Try to set user context, but don't fail if DB is not connected
      try {
        await dbConnection.query("SELECT set_config('app.current_user_name', $1, false)", ['Admin']);
      } catch (err) {
        console.log('⚠️ Could not set user context (DB may not be connected)');
      }

      const result = await dbConnection.query(`SELECT * FROM "${tableName}" ORDER BY id`);
      return res.status(200).json(result.rows);
    }

    if (req.method === 'POST') {
      const body = { ...req.body };
      
      // Convert marks to integer if it exists
      if (table === 'users' && body.marks) {
        body.marks = parseInt(body.marks);
      }
      
      // Convert credits to integer for courses
      if (table === 'courses' && body.credits) {
        body.credits = parseInt(body.credits);
      }

      // Map camelCase to snake_case for database columns
      const fieldMap: { [key: string]: string } = {
        rollNo: 'roll_no',
        createdAt: 'createdAt',
        updatedAt: 'updatedAt'
      };

      const columns = Object.keys(body)
        .map(k => `"${fieldMap[k] || k}"`)
        .join(', ');
      const values = Object.values(body);
      const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');

      // Try to set user context, but don't fail if DB is not connected
      try {
        await dbConnection.query("SELECT set_config('app.current_user_name', $1, false)", ['Admin']);
      } catch (err) {
        console.log('⚠️ Could not set user context (DB may not be connected)');
      }
      
      const result = await dbConnection.query(
        `INSERT INTO "${tableName}" (${columns}) VALUES (${placeholders}) RETURNING *`,
        values
      );
      
      return res.status(201).json(result.rows[0]);
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Database error:', error);
    
    // Handle common database connection errors gracefully
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
      return res.status(503).json({ 
        error: 'Database connection failed. Please check your database settings.',
        code: 'DB_CONNECTION_ERROR'
      });
    }
    
    res.status(500).json({ error: error.message });
  }
}
