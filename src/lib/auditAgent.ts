import { Client } from 'pg';

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
    this.config = config;
    this.client = new Client(config);
    await this.client.connect();
    await this.createTablesIfNotExist();
    await this.setupAuditInfrastructure();
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

    // Create Course table (only if not exists)
    await this.client.query(`
      CREATE TABLE IF NOT EXISTS "Course" (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        code VARCHAR(50) UNIQUE NOT NULL,
        credits INTEGER DEFAULT 3,
        description TEXT,
        "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL,
        "updatedAt" TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);

    // Alter existing Course columns to add defaults if they don't have them
    await this.client.query(`
      DO $$ 
      BEGIN
        BEGIN
          ALTER TABLE "Course" ALTER COLUMN "createdAt" SET DEFAULT NOW();
        EXCEPTION WHEN OTHERS THEN NULL;
        END;
        BEGIN
          ALTER TABLE "Course" ALTER COLUMN "updatedAt" SET DEFAULT NOW();
        EXCEPTION WHEN OTHERS THEN NULL;
        END;
        BEGIN
          ALTER TABLE "Course" ALTER COLUMN "createdAt" SET NOT NULL;
        EXCEPTION WHEN OTHERS THEN NULL;
        END;
        BEGIN
          ALTER TABLE "Course" ALTER COLUMN "updatedAt" SET NOT NULL;
        EXCEPTION WHEN OTHERS THEN NULL;
        END;
      END $$;
    `);

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

    // Create audit function
    await this.client.query(`
      CREATE OR REPLACE FUNCTION audit_trigger_func()
      RETURNS TRIGGER AS $$
      DECLARE
        old_data JSON;
        new_data JSON;
      BEGIN
        IF (TG_OP = 'DELETE') THEN
          old_data = row_to_json(OLD);
          new_data = NULL;
        ELSIF (TG_OP = 'UPDATE') THEN
          old_data = row_to_json(OLD);
          new_data = row_to_json(NEW);
        ELSIF (TG_OP = 'INSERT') THEN
          old_data = NULL;
          new_data = row_to_json(NEW);
        END IF;

        PERFORM pg_notify('audit_channel', json_build_object(
          'table_name', TG_TABLE_NAME,
          'operation', TG_OP,
          'user_name', current_user,
          'old_data', old_data,
          'new_data', new_data,
          'timestamp', now()
        )::text);

        IF (TG_OP = 'DELETE') THEN
          RETURN OLD;
        ELSE
          RETURN NEW;
        END IF;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Install triggers on all tables
    const tables = await this.client.query(`
      SELECT tablename FROM pg_tables 
      WHERE schemaname = 'public'
    `);

    for (const row of tables.rows) {
      const tableName = row.tablename;
      await this.client.query(`
        DROP TRIGGER IF EXISTS audit_trigger ON "${tableName}";
        CREATE TRIGGER audit_trigger
        AFTER INSERT OR UPDATE OR DELETE ON "${tableName}"
        FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
      `);
    }
  }

  async startListening(callback: (notification: any) => void) {
    // Prevent multiple listeners
    if (this.isListening) {
      console.log('Already listening to audit channel');
      return;
    }

    // Auto-connect if not already connected
    if (!this.client) {
      const dbConfig = {
        host: process.env.AUDIT_DB_HOST || 'localhost',
        port: parseInt(process.env.AUDIT_DB_PORT || '5432'),
        database: process.env.AUDIT_DB_NAME || 'postgres',
        user: process.env.AUDIT_DB_USER || 'postgres',
        password: process.env.AUDIT_DB_PASSWORD || '',
      };
      await this.connect(dbConfig);
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

export const auditAgent = new AuditAgent();