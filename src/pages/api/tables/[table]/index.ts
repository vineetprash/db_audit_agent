import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { table } = req.query;

  if (req.method === 'GET') {
    const data = table === 'users'
      ? await prisma.user.findMany()
      : await prisma.course.findMany();
    return res.status(200).json(data);
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
    
    const data = table === 'users'
      ? await prisma.user.create({ data: body })
      : await prisma.course.create({ data: body });
    return res.status(201).json(data);
  }

  res.status(405).json({ error: 'Method not allowed' });
}
