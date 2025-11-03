import { NextApiRequest, NextApiResponse } from 'next';
import { dbConnection } from '@/lib/dbConnection';
import { auditAgent } from '@/lib/auditAgent';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🔍 Comparing database connections...');

    // Get dbConnection config
    const dbConfig = dbConnection.getConfig();
    console.log('dbConnection config:', dbConfig);

    // Test dbConnection INSERT
    console.log('Testing dbConnection INSERT...');
    await dbConnection.query("SELECT set_config('app.current_user_name', 'DbConnectionTest', false)");
    
    const dbResult = await dbConnection.query(
      `INSERT INTO "User" (name, email, role) VALUES ($1, $2, $3) RETURNING *`,
      ['DbConnection User', `dbconnection-${Date.now()}@example.com`, 'Student']
    );
    console.log('dbConnection insert result:', dbResult.rows[0]);

    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 500));

    // Check audit logs for dbConnection test
    const dbAuditLogs = await dbConnection.query(`
      SELECT * FROM "AuditLog" 
      WHERE "user_name" = 'DbConnectionTest' 
      ORDER BY timestamp DESC 
      LIMIT 5
    `);
    console.log('Audit logs for dbConnection test:', dbAuditLogs.rows);

    // Now ensure audit agent is connected and test again
    console.log('Ensuring audit agent is connected...');
    await auditAgent.connect(dbConfig);

    // Test another INSERT after ensuring audit agent connection
    console.log('Testing INSERT after audit agent connect...');
    await dbConnection.query("SELECT set_config('app.current_user_name', 'PostAuditAgentTest', false)");
    
    const postAuditResult = await dbConnection.query(
      `INSERT INTO "User" (name, email, role) VALUES ($1, $2, $3) RETURNING *`,
      ['Post-Audit User', `postaudit-${Date.now()}@example.com`, 'Faculty']
    );
    console.log('Post-audit insert result:', postAuditResult.rows[0]);

    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 500));

    // Check audit logs for post-audit test
    const postAuditLogs = await dbConnection.query(`
      SELECT * FROM "AuditLog" 
      WHERE "user_name" = 'PostAuditAgentTest' 
      ORDER BY timestamp DESC 
      LIMIT 5
    `);
    console.log('Audit logs for post-audit test:', postAuditLogs.rows);

    // Check all recent audit logs
    const allRecentLogs = await dbConnection.query(`
      SELECT * FROM "AuditLog" 
      ORDER BY timestamp DESC 
      LIMIT 10
    `);

    res.status(200).json({
      message: 'Connection comparison completed',
      dbConfig: dbConfig,
      dbConnectionTest: {
        user: dbResult.rows[0],
        auditLogs: dbAuditLogs.rows
      },
      postAuditTest: {
        user: postAuditResult.rows[0],
        auditLogs: postAuditLogs.rows
      },
      allRecentLogs: allRecentLogs.rows
    });

  } catch (error: any) {
    console.error('Connection comparison failed:', error);
    res.status(500).json({ error: error.message, stack: error.stack });
  }
}