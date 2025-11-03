import { Client } from 'pg';

class DatabaseConnection {
  private static instance: DatabaseConnection;
  private client: Client | null = null;
  private config: any = null;

  private constructor() {
    // Initialize with default env variables
    this.config = {
      host: process.env.AUDIT_DB_HOST || 'localhost',
      port: parseInt(process.env.AUDIT_DB_PORT || '5432'),
      database: process.env.AUDIT_DB_NAME || 'audit_db',
      user: process.env.AUDIT_DB_USER || 'postgres',
      password: process.env.AUDIT_DB_PASSWORD || 'password',
    };
  }

  static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  async updateConfig(config: {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
  }) {
    // Close existing connection if any
    if (this.client) {
      await this.client.end().catch(() => {});
    }
    
    this.config = config;
    this.client = null; // Reset client to force reconnection
  }

  async getClient(): Promise<Client> {
    if (!this.client) {
      this.client = new Client(this.config);
      await this.client.connect();
    }
    return this.client;
  }

  async query(text: string, params?: any[]) {
    const client = await this.getClient();
    return client.query(text, params);
  }

  getConfig() {
    return { ...this.config };
  }
}

export const dbConnection = DatabaseConnection.getInstance();
