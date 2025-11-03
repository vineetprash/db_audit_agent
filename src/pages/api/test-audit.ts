import { NextApiRequest, NextApiResponse } from 'next';
import { auditAgent } from '@/lib/auditAgent';
import { dbConnection } from '@/lib/dbConnection';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🧪 Testing audit system...');

    // Check database connection first
    const dbConfig = dbConnection.getConfig();
    console.log('Database config:', { host: dbConfig.host, database: dbConfig.database });

    // Check if tables exist
    const tables = await dbConnection.query(`
      SELECT tablename FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename IN ('User', 'Course', 'AuditLog')
    `);
    console.log('Existing tables:', tables.rows.map(r => r.tablename));

    // Check if audit triggers exist
    const triggers = await dbConnection.query(`
      SELECT trigger_name, event_object_table 
      FROM information_schema.triggers 
      WHERE trigger_name = 'audit_trigger'
    `);
    console.log('Existing audit triggers:', triggers.rows);

    // Check if audit function exists
    const auditFunction = await dbConnection.query(`
      SELECT proname FROM pg_proc WHERE proname = 'audit_trigger_func'
    `);
    console.log('Audit function exists:', auditFunction.rows.length > 0);

    // Force audit agent connection with current db config
    console.log('🔗 Connecting audit agent...');
    await auditAgent.connect(dbConfig);

    // Check triggers again after connection
    const triggersAfter = await dbConnection.query(`
      SELECT trigger_name, event_object_table 
      FROM information_schema.triggers 
      WHERE trigger_name = 'audit_trigger'
    `);
    console.log('Triggers after audit agent connect:', triggersAfter.rows);

    // Set user context for testing
    await dbConnection.query("SELECT set_config('app.current_user_name', $1, false)", ['TestUser']);

    // Create a test user to trigger audit
    console.log('Creating test user...');
    const result = await dbConnection.query(
      `INSERT INTO "User" (name, email, role) VALUES ($1, $2, $3) RETURNING *`,
      ['Test User', `test-${Date.now()}@example.com`, 'Student']
    );

    console.log('Test user created:', result.rows[0]);

    // Wait a moment for audit to process
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Check if audit log was created
    const auditLogs = await dbConnection.query(
      `SELECT * FROM "AuditLog" ORDER BY timestamp DESC LIMIT 10`
    );

    console.log('All recent audit logs:', auditLogs.rows);

    res.status(200).json({ 
      message: 'Test completed',
      testUser: result.rows[0],
      auditLogs: auditLogs.rows,
      tablesFound: tables.rows.map(r => r.tablename),
      triggersFound: triggersAfter.rows,
      auditFunctionExists: auditFunction.rows.length > 0
    });
  } catch (error: any) {
    console.error('Test failed:', error);
    res.status(500).json({ error: error.message, stack: error.stack });
  }
}