import { NextApiRequest, NextApiResponse } from 'next';
import { dbConnection } from '@/lib/dbConnection';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check AuditLog table schema
    const auditSchema = await dbConnection.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'AuditLog' AND table_schema = 'public'
      ORDER BY ordinal_position
    `);

    // Check if we can select from the table
    const auditCount = await dbConnection.query(`SELECT COUNT(*) as count FROM "AuditLog"`);
    
    // Check recent audit logs
    const recentLogs = await dbConnection.query(`
      SELECT * FROM "AuditLog" ORDER BY timestamp DESC LIMIT 3
    `);

    // Check all tables
    const allTables = await dbConnection.query(`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename
    `);

    res.status(200).json({
      auditTableSchema: auditSchema.rows,
      auditCount: auditCount.rows[0]?.count || 0,
      recentLogs: recentLogs.rows,
      allTables: allTables.rows.map(r => r.tablename)
    });

  } catch (error: any) {
    console.error('Schema check failed:', error);
    res.status(500).json({ error: error.message });
  }
}