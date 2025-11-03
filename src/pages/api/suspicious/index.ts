import { NextApiRequest, NextApiResponse } from 'next';
import { dbConnection } from '@/lib/dbConnection';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const result = await dbConnection.query(
      `SELECT * FROM "SuspiciousActivity" ORDER BY timestamp DESC LIMIT 50`
    );

    res.status(200).json(result.rows);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: error.message });
  }
}
