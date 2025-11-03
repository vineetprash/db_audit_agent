import { NextApiRequest, NextApiResponse } from 'next';
import { dbConnection } from '@/lib/dbConnection';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { table, id } = req.query;
  const recordId = parseInt(id as string);
  const tableName = table === 'users' ? 'User' : 'Course';

  try {
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

      const updates = Object.keys(body)
        .map((key, i) => `"${key}" = $${i + 1}`)
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
    res.status(500).json({ error: error.message });
  }
}
