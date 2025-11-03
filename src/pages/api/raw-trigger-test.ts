import { NextApiRequest, NextApiResponse } from 'next';
import { dbConnection } from '@/lib/dbConnection';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🧪 Raw trigger test - bypassing audit agent...');

    // Manually create the audit function and trigger
    console.log('Creating audit function...');
    await dbConnection.query(`
      CREATE OR REPLACE FUNCTION test_audit_func()
      RETURNS TRIGGER AS $$
      BEGIN
        INSERT INTO "AuditLog" ("table_name", operation, "user_name", "old_data", "new_data", timestamp)
        VALUES (
          TG_TABLE_NAME,
          TG_OP,
          'RawTest',
          CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
          CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN row_to_json(NEW) ELSE NULL END,
          NOW()
        );
        
        IF TG_OP = 'DELETE' THEN
          RETURN OLD;
        ELSE
          RETURN NEW;
        END IF;
      END;
      $$ LANGUAGE plpgsql;
    `);

    console.log('Dropping existing triggers...');
    await dbConnection.query(`DROP TRIGGER IF EXISTS test_audit_trigger ON "User"`);
    
    console.log('Creating test trigger...');
    await dbConnection.query(`
      CREATE TRIGGER test_audit_trigger
      AFTER INSERT OR UPDATE OR DELETE ON "User"
      FOR EACH ROW EXECUTE FUNCTION test_audit_func();
    `);

    // Clear old test data
    await dbConnection.query(`DELETE FROM "AuditLog" WHERE "user_name" = 'RawTest'`);

    // Test insert
    console.log('Testing insert...');
    const insertResult = await dbConnection.query(
      `INSERT INTO "User" (name, email, role) VALUES ($1, $2, $3) RETURNING *`,
      ['Raw Test User', `rawtest-${Date.now()}@example.com`, 'Student']
    );

    console.log('Insert completed:', insertResult.rows[0]);

    // Check audit logs immediately
    const auditLogs = await dbConnection.query(`
      SELECT * FROM "AuditLog" WHERE "user_name" = 'RawTest' ORDER BY timestamp DESC
    `);

    console.log('Raw test audit logs:', auditLogs.rows);

    // Clean up test trigger
    await dbConnection.query(`DROP TRIGGER IF EXISTS test_audit_trigger ON "User"`);

    res.status(200).json({
      message: 'Raw trigger test completed',
      insertedUser: insertResult.rows[0],
      auditLogs: auditLogs.rows,
      triggerWorked: auditLogs.rows.length > 0
    });

  } catch (error: any) {
    console.error('Raw trigger test failed:', error);
    res.status(500).json({ error: error.message, stack: error.stack });
  }
}