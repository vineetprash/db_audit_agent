import { Client } from 'pg';

export class AuditAgent {
  private client: Client | null = null;
  private listener: Client | null = null;

  async connect(config: {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
  }) {
    this.client = new Client(config);
    await this.client.connect();
    await this.setupAuditInfrastructure();
    return true;
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
    if (!this.client) throw new Error('Not connected');

    this.listener = new Client({
      host: process.env.AUDIT_DB_HOST,
      port: parseInt(process.env.AUDIT_DB_PORT || '5432'),
      database: process.env.AUDIT_DB_NAME,
      user: process.env.AUDIT_DB_USER,
      password: process.env.AUDIT_DB_PASSWORD,
    });

    await this.listener.connect();
    await this.listener.query('LISTEN audit_channel');

    this.listener.on('notification', (msg) => {
      if (msg.channel === 'audit_channel' && msg.payload) {
        callback(JSON.parse(msg.payload));
      }
    });
  }

  async disconnect() {
    if (this.client) await this.client.end();
    if (this.listener) await this.listener.end();
  }
}

export const auditAgent = new AuditAgent();