import { NextApiRequest, NextApiResponse } from 'next';
import { dbConnection } from '@/lib/dbConnection';
import { auditAgent } from '@/lib/auditAgent';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { table, id } = req.query;
  const recordId = parseInt(id as string);
  const tableName = table === 'users' ? 'User' : 'Course';

  try {
    // Ensure audit agent is connected for all operations
    const dbConfig = dbConnection.getConfig();
    try {
      console.log('🔗 Ensuring audit agent is connected...');
      await auditAgent.connect(dbConfig);
    } catch (err) {
      console.log('⚠️ Could not connect audit agent:', err);
    }

    // Try to set user context, but don't fail if DB is not connected
    try {
      await dbConnection.query("SELECT set_config('app.current_user_name', $1, false)", ['Admin']);
    } catch (err) {
      console.log('⚠️ Could not set user context (DB may not be connected)');
    }

    if (req.method === 'PUT') {
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

      const updates = Object.keys(body)
        .map((key, i) => {
          const dbColumn = fieldMap[key] || key;
          return `"${dbColumn}" = $${i + 1}`;
        })
        .join(', ');
      const values = [...Object.values(body), recordId];
      
      const result = await dbConnection.query(
        `UPDATE "${tableName}" SET ${updates} WHERE id = $${values.length} RETURNING *`,
        values
      );
      
      return res.status(200).json(result.rows[0]);
    }

    if (req.method === 'DELETE') {
      const result = await dbConnection.query(
        `DELETE FROM "${tableName}" WHERE id = $1 RETURNING *`,
        [recordId]
      );
      
      return res.status(200).json(result.rows[0]);
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
