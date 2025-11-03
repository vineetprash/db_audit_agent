import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const activities = await prisma.suspiciousActivity.findMany({
    orderBy: { timestamp: 'desc' },
    take: 50,
  });

  res.status(200).json(activities);
}
