import { NextApiRequest, NextApiResponse } from 'next';
import { dbConnection } from '@/lib/dbConnection';
import { auditAgent } from '@/lib/auditAgent';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🧪 Simulating exact CRUD API flow...');

    // Simulate exactly what happens in /api/tables/users
    const tableName = 'User';

    // 1. Ensure audit agent is connected (like the API does)
    const dbConfig = dbConnection.getConfig();
    try {
      await auditAgent.connect(dbConfig);
    } catch (err: any) {
      console.log('⚠️ Could not connect audit agent:', err.message);
    }

    // 2. Set user context (like the API does)
    try {
      await dbConnection.query("SELECT set_config('app.current_user_name', $1, false)", ['Admin']);
    } catch (err) {
      console.log('⚠️ Could not set user context (DB may not be connected)');
    }

    // 3. Prepare data exactly like the API does
    const body = {
      name: 'CRUD Simulation User',
      email: `crudsim-${Date.now()}@example.com`,
      role: 'Student'
    };

    const fieldMap: { [key: string]: string } = {
      rollNo: 'roll_no',
      createdAt: 'createdAt',
      updatedAt: 'updatedAt'
    };

    const columns = Object.keys(body)
      .map(k => `"${fieldMap[k] || k}"`)
      .join(', ');
    const values = Object.values(body);
    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');

    // 4. Execute the exact same INSERT that the API would do
    console.log('Executing CRUD-style INSERT...');
    const result = await dbConnection.query(
      `INSERT INTO "${tableName}" (${columns}) VALUES (${placeholders}) RETURNING *`,
      values
    );

    console.log('CRUD simulation result:', result.rows[0]);

    // 5. Wait and check audit logs
    await new Promise(resolve => setTimeout(resolve, 1000));

    const auditLogs = await dbConnection.query(`
      SELECT * FROM "AuditLog" 
      WHERE "user_name" = 'Admin' 
      ORDER BY timestamp DESC 
      LIMIT 5
    `);

    console.log('Audit logs after CRUD simulation:', auditLogs.rows);

    // Check what triggers exist right now
    const triggers = await dbConnection.query(`
      SELECT trigger_name, event_object_table 
      FROM information_schema.triggers 
      WHERE event_object_table = 'User' AND trigger_name = 'audit_trigger'
    `);

    // Also check ALL triggers on User table
    const allUserTriggers = await dbConnection.query(`
      SELECT trigger_name, event_object_table, action_timing, event_manipulation
      FROM information_schema.triggers 
      WHERE event_object_table = 'User'
    `);

    // Check if audit function exists
    const auditFunction = await dbConnection.query(`
      SELECT proname FROM pg_proc WHERE proname = 'audit_trigger_func'
    `);

    console.log('🔍 Triggers on User table:', allUserTriggers.rows);
    console.log('🔍 Audit function exists:', auditFunction.rows.length > 0);

    res.status(200).json({
      message: 'CRUD simulation completed',
      insertedUser: result.rows[0],
      auditLogs: auditLogs.rows,
      triggersFound: triggers.rows,
      allUserTriggers: allUserTriggers.rows,
      auditFunctionExists: auditFunction.rows.length > 0,
      crudWorked: auditLogs.rows.length > 0
    });

  } catch (error: any) {
    console.error('CRUD simulation failed:', error);
    res.status(500).json({ error: error.message, stack: error.stack });
  }
}