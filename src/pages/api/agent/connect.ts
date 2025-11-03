import { NextApiRequest, NextApiResponse } from 'next';
import { auditAgent } from '@/lib/auditAgent'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { host, port, database, user, password } = req.body;
    await auditAgent.connect({ host, port, database, user, password });
    res.status(200).json({ message: 'Connected and triggers installed' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
