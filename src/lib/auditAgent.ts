import { Client } from 'pg';

// Use global to ensure true singleton across hot reloads
declare global {
  var __auditAgent: AuditAgent | undefined;
}

export class AuditAgent {
  private client: Client | null = null;
  private listener: Client | null = null;
  private config: any = null;
  private isListening: boolean = false;

  async connect(config: {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
  }) {
    // Check if already connected with same config
    if (this.client && this.config && 
        this.config.host === config.host &&
        this.config.database === config.database &&
        this.config.user === config.user) {
      console.log('� AuditAgent already connected with same config');
      return true;
    }

    console.log('�🔗 AuditAgent connecting to:', { host: config.host, database: config.database });
    
    // Close existing connections
    if (this.client) {
      await this.client.end().catch(() => {});
    }
    if (this.listener) {
      await this.listener.end().catch(() => {});
      this.isListening = false;
    }

    this.config = config;
    
    // Add SSL configuration for Supabase and other cloud databases
    const clientConfig = {
      ...config,
      ssl: config.host.includes('supabase.co') || config.host.includes('amazonaws.com') || config.host.includes('azure.com')
        ? { rejectUnauthorized: false }
        : false
    };

    this.client = new Client(clientConfig);
    await this.client.connect();
    await this.createTablesIfNotExist();
    await this.setupAuditInfrastructure();
    
    console.log('✅ AuditAgent connected successfully');
    return true;
  }

  private async createTablesIfNotExist() {
    if (!this.client) throw new Error('Not connected');

    // Check if User table exists and has correct schema
    const userTableExists = await this.client.query(`
      SELECT column_name, column_default, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'User' AND table_schema = 'public'
    `);

    if (userTableExists.rows.length === 0) {
      // Create User table from scratch
      await this.client.query(`
        CREATE TABLE "User" (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          role VARCHAR(50) DEFAULT 'Faculty',
          "roll_no" VARCHAR(50),
          marks INTEGER,
          "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL,
          "updatedAt" TIMESTAMP DEFAULT NOW() NOT NULL
        )
      `);
    } else {
      // Check if columns have proper defaults
      const hasCreatedAtDefault = userTableExists.rows.find(r => r.column_name === 'createdAt')?.column_default;
      const hasUpdatedAtDefault = userTableExists.rows.find(r => r.column_name === 'updatedAt')?.column_default;

      if (!hasCreatedAtDefault || !hasUpdatedAtDefault) {
        // Recreate table with proper schema
        await this.client.query(`DROP TABLE "User" CASCADE`);
        await this.client.query(`
          CREATE TABLE "User" (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            role VARCHAR(50) DEFAULT 'Faculty',
            "roll_no" VARCHAR(50),
            marks INTEGER,
            "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL,
            "updatedAt" TIMESTAMP DEFAULT NOW() NOT NULL
          )
        `);
      }
    }

    // Create trigger to auto-update updatedAt for User table
    await this.client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW."updatedAt" = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await this.client.query(`
      DROP TRIGGER IF EXISTS update_user_updated_at ON "User";
      CREATE TRIGGER update_user_updated_at
      BEFORE UPDATE ON "User"
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
    `);

    // Check if Course table exists and has correct schema
    const courseTableExists = await this.client.query(`
      SELECT column_name, column_default, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'Course' AND table_schema = 'public'
    `);

    if (courseTableExists.rows.length === 0) {
      // Create Course table from scratch
      await this.client.query(`
        CREATE TABLE "Course" (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          code VARCHAR(50) UNIQUE NOT NULL,
          credits INTEGER DEFAULT 3,
          description TEXT,
          "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL,
          "updatedAt" TIMESTAMP DEFAULT NOW() NOT NULL
        )
      `);
    } else {
      // Check if columns have proper defaults
      const hasCreatedAtDefault = courseTableExists.rows.find(r => r.column_name === 'createdAt')?.column_default;
      const hasUpdatedAtDefault = courseTableExists.rows.find(r => r.column_name === 'updatedAt')?.column_default;

      if (!hasCreatedAtDefault || !hasUpdatedAtDefault) {
        // Recreate table with proper schema
        await this.client.query(`DROP TABLE "Course" CASCADE`);
        await this.client.query(`
          CREATE TABLE "Course" (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            code VARCHAR(50) UNIQUE NOT NULL,
            credits INTEGER DEFAULT 3,
            description TEXT,
            "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL,
            "updatedAt" TIMESTAMP DEFAULT NOW() NOT NULL
          )
        `);
      }
    }

    // Create trigger to auto-update updatedAt for Course table
    await this.client.query(`
      DROP TRIGGER IF EXISTS update_course_updated_at ON "Course";
      CREATE TRIGGER update_course_updated_at
      BEFORE UPDATE ON "Course"
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
    `);

    // Create AuditLog table
    await this.client.query(`
      CREATE TABLE IF NOT EXISTS "AuditLog" (
        id SERIAL PRIMARY KEY,
        "table_name" VARCHAR(255) NOT NULL,
        operation VARCHAR(50) NOT NULL,
        "user_name" VARCHAR(255) NOT NULL,
        "old_data" JSONB,
        "new_data" JSONB,
        timestamp TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create indexes for AuditLog
    await this.client.query(`
      CREATE INDEX IF NOT EXISTS idx_auditlog_timestamp ON "AuditLog"(timestamp);
      CREATE INDEX IF NOT EXISTS idx_auditlog_table ON "AuditLog"("table_name");
    `);

    // Create SuspiciousActivity table
    await this.client.query(`
      CREATE TABLE IF NOT EXISTS "SuspiciousActivity" (
        id SERIAL PRIMARY KEY,
        "log_id" INTEGER,
        message TEXT NOT NULL,
        severity VARCHAR(50) NOT NULL,
        details JSONB NOT NULL,
        timestamp TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create index for SuspiciousActivity
    await this.client.query(`
      CREATE INDEX IF NOT EXISTS idx_suspicious_timestamp ON "SuspiciousActivity"(timestamp);
    `);
  }

  private async setupAuditInfrastructure() {
    if (!this.client) throw new Error('Not connected');

    // First, clean up ALL existing audit triggers to prevent conflicts
    console.log('🧹 Cleaning up existing audit triggers...');
    const allTables = await this.client.query(`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    `);
    
    for (const row of allTables.rows) {
      await this.client.query(`DROP TRIGGER IF EXISTS audit_trigger ON "${row.tablename}"`);
    }

    // Create super simple audit function with error handling
    await this.client.query(`
      CREATE OR REPLACE FUNCTION audit_trigger_func()
      RETURNS TRIGGER AS $$
      DECLARE
        app_user_name TEXT DEFAULT 'System';
      BEGIN
        -- Get application user name from session variable if available
        BEGIN
          SELECT current_setting('app.current_user_name', true) INTO app_user_name;
          IF app_user_name IS NULL OR app_user_name = '' THEN
            app_user_name := 'System';
          END IF;
        EXCEPTION WHEN OTHERS THEN
          app_user_name := 'System';
        END;

        -- Insert audit log with explicit error handling
        BEGIN
          INSERT INTO "AuditLog" (table_name, operation, user_name, old_data, new_data, timestamp)
          VALUES (
            TG_TABLE_NAME,
            TG_OP,
            app_user_name,
            CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
            CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN row_to_json(NEW) ELSE NULL END,
            NOW()
          );
        EXCEPTION WHEN OTHERS THEN
          -- Log error to PostgreSQL log
          RAISE WARNING 'Audit trigger failed: %', SQLERRM;
          -- Continue execution even if audit fails
        END;

        -- Send notification (simplified)
        BEGIN
          PERFORM pg_notify('audit_channel', 
            format('{"table":"%s","operation":"%s","user":"%s"}', 
              TG_TABLE_NAME, TG_OP, app_user_name));
        EXCEPTION WHEN OTHERS THEN
          -- Ignore notification errors
        END;

        IF (TG_OP = 'DELETE') THEN
          RETURN OLD;
        ELSE
          RETURN NEW;
        END IF;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Only install triggers on specific business tables we want to audit
    const tablesToAudit = ['User', 'Course'];
    
    for (const tableName of tablesToAudit) {
      // Check if table exists first
      const tableExists = await this.client.query(`
        SELECT 1 FROM pg_tables WHERE tablename = $1 AND schemaname = 'public'
      `, [tableName]);
      
      if (tableExists.rows.length > 0) {
        console.log(`📋 Installing audit trigger on ${tableName}`);
        // Drop existing trigger first
        await this.client.query(`DROP TRIGGER IF EXISTS audit_trigger ON "${tableName}"`);
        // Create new trigger
        await this.client.query(`
          CREATE TRIGGER audit_trigger
          AFTER INSERT OR UPDATE OR DELETE ON "${tableName}"
          FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
        `);
        console.log(`✅ Audit trigger installed on ${tableName}`);
      } else {
        console.log(`⚠️ Table ${tableName} does not exist, skipping trigger installation`);
      }
    }
    
    console.log('✅ Audit infrastructure setup complete');
  }

  async startListening(callback: (notification: any) => void) {
    // Prevent multiple listeners
    if (this.isListening) {
      console.log('Already listening to audit channel');
      return;
    }

    console.log('🔍 AuditAgent current state:', { 
      hasClient: !!this.client, 
      hasConfig: !!this.config,
      configHost: this.config?.host 
    });

    // Auto-connect if not already connected
    if (!this.client) {
      // Server-side can't access localStorage, so we need a different approach
      // For now, require explicit connection via Settings first
      throw new Error('Audit agent not connected. Please connect via Settings page first.');
    }

    // Use the stored config
    const dbConfig = this.config!;

    this.listener = new Client(dbConfig);

    await this.listener.connect();
    await this.listener.query('LISTEN audit_channel');
    
    this.isListening = true;

    this.listener.on('notification', (msg) => {
      if (msg.channel === 'audit_channel' && msg.payload) {
        callback(JSON.parse(msg.payload));
      }
    });
  }

  async disconnect() {
    if (this.client) await this.client.end();
    if (this.listener) {
      await this.listener.end();
      this.isListening = false;
    }
  }
}

function getAuditAgent(): AuditAgent {
  if (!global.__auditAgent) {
    console.log('🏗️ Creating new AuditAgent instance');
    global.__auditAgent = new AuditAgent();
  }
  return global.__auditAgent;
}

export const auditAgent = getAuditAgent();