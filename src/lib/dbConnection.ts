import { Client } from 'pg';

// Use global to ensure true singleton across hot reloads
declare global {
  var __dbConnection: DatabaseConnection | undefined;
}

class DatabaseConnection {
  private client: Client | null = null;
  private config: any = null;

  private constructor() {
    console.log('🏗️ Creating new DatabaseConnection instance');
    
    // Fall back to environment variables as default
    this.config = {
      host: process.env.AUDIT_DB_HOST || 'localhost',
      port: parseInt(process.env.AUDIT_DB_PORT || '5432'),
      database: process.env.AUDIT_DB_NAME || 'audit_db',
      user: process.env.AUDIT_DB_USER || 'postgres',
      password: process.env.AUDIT_DB_PASSWORD || 'password',
    };
  }

  static getInstance(): DatabaseConnection {
    if (!global.__dbConnection) {
      global.__dbConnection = new DatabaseConnection();
    }
    return global.__dbConnection;
  }

  async updateConfig(config: {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
  }) {
    console.log('🔄 Updating database config to:', { host: config.host, database: config.database });
    
    // Close existing connection if any
    if (this.client) {
      await this.client.end().catch(() => {});
    }
    
    this.config = config;
    this.client = null; // Reset client to force reconnection
    
    console.log('✅ Database config updated. isUsingDefaults:', this.isUsingDefaults());
  }

  private loadSavedConfig() {
    // This will be called from API routes where we can access localStorage indirectly
    if (typeof window !== 'undefined') {
      const savedConfig = localStorage.getItem('dbConfig');
      if (savedConfig) {
        try {
          this.config = JSON.parse(savedConfig);
          this.config.port = parseInt(this.config.port);
          return true;
        } catch (e) {
          console.error('Failed to load saved database config:', e);
        }
      }
    }
    return false;
  }

  async getClient(): Promise<Client> {
    if (!this.client) {
      this.client = new Client(this.config);
      
      // Add connection timeout and error handling
      try {
        await this.client.connect();
      } catch (error: any) {
        console.error('❌ Database connection failed:', error.message);
        this.client = null; // Reset client on connection failure
        throw error;
      }
    }
    return this.client;
  }

  isUsingDefaults(): boolean {
    return this.config.host === 'localhost' || this.config.host === (process.env.AUDIT_DB_HOST || 'localhost');
  }

  async query(text: string, params?: any[]) {
    try {
      const client = await this.getClient();
      return client.query(text, params);
    } catch (error: any) {
      // Reset client on query failure to force reconnection next time
      if (this.client && (error.code === 'ECONNRESET' || error.code === 'EPIPE' || error.code === 'ENOTFOUND')) {
        console.log('🔄 Resetting database client due to connection error');
        await this.client.end().catch(() => {});
        this.client = null;
      }
      throw error;
    }
  }

  getConfig() {
    return { ...this.config };
  }
}

export const dbConnection = DatabaseConnection.getInstance();
