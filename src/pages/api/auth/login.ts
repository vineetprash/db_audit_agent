import { NextApiRequest, NextApiResponse } from 'next';
import { authenticate } from '@/lib/auth';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, password } = req.body;
  const user = authenticate(email, password);

  if (user) {
    res.status(200).json({ user });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
}
