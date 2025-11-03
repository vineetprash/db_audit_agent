import { NextApiRequest, NextApiResponse } from 'next';
import { dbConnection } from '@/lib/dbConnection';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { table } = req.query;
  const tableName = table === 'users' ? 'User' : 'Course';

  try {
    if (req.method === 'GET') {
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

      const columns = Object.keys(body).map(k => `"${k}"`).join(', ');
      const values = Object.values(body);
      const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
      
      const result = await dbConnection.query(
        `INSERT INTO "${tableName}" (${columns}) VALUES (${placeholders}) RETURNING *`,
        values
      );
      
      return res.status(201).json(result.rows[0]);
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: error.message });
  }
}
