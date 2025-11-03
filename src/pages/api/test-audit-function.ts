import { NextApiRequest, NextApiResponse } from 'next';
import { dbConnection } from '@/lib/dbConnection';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🧪 Testing audit function directly...');

    // Check if AuditLog table exists and is accessible
    const auditTableCheck = await dbConnection.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'AuditLog' AND table_schema = 'public'
    `);
    console.log('AuditLog table columns:', auditTableCheck.rows);

    // Test direct insert into AuditLog
    console.log('Testing direct AuditLog insert...');
    await dbConnection.query(`
      INSERT INTO "AuditLog" ("table_name", operation, "user_name", "old_data", "new_data", timestamp)
      VALUES ('TestTable', 'INSERT', 'DirectTest', NULL, '{"test": true}', NOW())
    `);
    
    // Check if it worked
    const directTest = await dbConnection.query(`
      SELECT * FROM "AuditLog" WHERE "user_name" = 'DirectTest' ORDER BY timestamp DESC LIMIT 1
    `);
    
    console.log('Direct insert result:', directTest.rows);

    // Now test if we can call the audit function manually
    console.log('Testing audit function call...');
    
    // First set user context
    await dbConnection.query("SELECT set_config('app.current_user_name', $1, false)", ['FunctionTest']);
    
    // Try to trigger the function manually with a test insert
    try {
      const testInsert = await dbConnection.query(`
        INSERT INTO "User" (name, email, role) VALUES ($1, $2, $3) RETURNING *
      `, ['Function Test User', `functest-${Date.now()}@example.com`, 'Student']);
      
      console.log('Test insert successful:', testInsert.rows[0]);
      
      // Wait and check for audit logs
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const auditLogs = await dbConnection.query(`
        SELECT * FROM "AuditLog" WHERE "user_name" = 'FunctionTest' ORDER BY timestamp DESC
      `);
      
      console.log('Function test audit logs:', auditLogs.rows);
      
    } catch (insertError: any) {
      console.error('Insert with function test failed:', insertError.message);
    }

    // Check PostgreSQL logs for any errors
    const pgErrors = await dbConnection.query(`
      SELECT * FROM pg_stat_activity WHERE state = 'active'
    `).catch(() => ({ rows: [] }));

    res.status(200).json({
      message: 'Audit function test completed',
      auditTableExists: auditTableCheck.rows.length > 0,
      directInsertWorked: directTest.rows.length > 0,
      auditFunctionLogs: directTest.rows,
      activeConnections: pgErrors.rows.length
    });

  } catch (error: any) {
    console.error('Audit function test failed:', error);
    res.status(500).json({ error: error.message, stack: error.stack });
  }
}