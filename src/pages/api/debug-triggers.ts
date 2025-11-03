import { NextApiRequest, NextApiResponse } from 'next';
import { dbConnection } from '@/lib/dbConnection';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🧪 Direct trigger test...');

    // First, let's check what triggers actually exist
    const triggers = await dbConnection.query(`
      SELECT 
        trigger_name, 
        event_object_table, 
        action_timing, 
        event_manipulation,
        action_statement
      FROM information_schema.triggers 
      WHERE trigger_schema = 'public'
      ORDER BY event_object_table, trigger_name
    `);

    console.log('All triggers in database:', triggers.rows);

    // Check if audit function exists
    const auditFunc = await dbConnection.query(`
      SELECT proname, prosrc 
      FROM pg_proc 
      WHERE proname = 'audit_trigger_func'
    `);

    console.log('Audit function exists:', auditFunc.rows.length > 0);

    // Test direct INSERT with detailed logging
    console.log('Testing direct INSERT...');
    
    // Set user context
    await dbConnection.query("SELECT set_config('app.current_user_name', 'DirectTest', false)");
    
    // Insert test record
    const insertResult = await dbConnection.query(
      `INSERT INTO "User" (name, email, role) VALUES ($1, $2, $3) RETURNING *`,
      ['Direct Test User', `directtest-${Date.now()}@example.com`, 'Student']
    );

    console.log('Insert result:', insertResult.rows[0]);

    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 500));

    // Check audit logs
    const auditLogs = await dbConnection.query(`
      SELECT * FROM "AuditLog" 
      WHERE "table_name" = 'User' 
      ORDER BY timestamp DESC 
      LIMIT 5
    `);

    console.log('Audit logs after insert:', auditLogs.rows);

    // Test manual trigger execution
    console.log('Testing manual trigger...');
    try {
      await dbConnection.query(`
        SELECT audit_trigger_func()
      `);
      console.log('Manual trigger function call succeeded');
    } catch (err) {
      console.log('Manual trigger function call failed:', err);
    }

    // Check if trigger exists on User table specifically
    const userTriggers = await dbConnection.query(`
      SELECT * FROM information_schema.triggers 
      WHERE event_object_table = 'User'
    `);

    res.status(200).json({
      message: 'Direct test completed',
      allTriggers: triggers.rows,
      userTriggers: userTriggers.rows,
      auditFunctionExists: auditFunc.rows.length > 0,
      insertedUser: insertResult.rows[0],
      auditLogs: auditLogs.rows
    });

  } catch (error: any) {
    console.error('Direct test failed:', error);
    res.status(500).json({ error: error.message, stack: error.stack });
  }
}