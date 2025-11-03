import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { table, id } = req.query;
  const recordId = parseInt(id as string);

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
    
    const data = table === 'users'
      ? await prisma.user.update({ where: { id: recordId }, data: body })
      : await prisma.course.update({ where: { id: recordId }, data: body });
    return res.status(200).json(data);
  }

  if (req.method === 'DELETE') {
    const data = table === 'users'
      ? await prisma.user.delete({ where: { id: recordId } })
      : await prisma.course.delete({ where: { id: recordId } });
    return res.status(200).json(data);
  }

  res.status(405).json({ error: 'Method not allowed' });
}
