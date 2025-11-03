/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  env: {
    DATABASE_URL: process.env.DATABASE_URL,
    AUDIT_DB_HOST: process.env.AUDIT_DB_HOST,
    AUDIT_DB_PORT: process.env.AUDIT_DB_PORT,
    AUDIT_DB_NAME: process.env.AUDIT_DB_NAME,
    AUDIT_DB_USER: process.env.AUDIT_DB_USER,
    AUDIT_DB_PASSWORD: process.env.AUDIT_DB_PASSWORD,
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        net: false,
        tls: false,
        fs: false,
      };
    }
    return config;
  },
};