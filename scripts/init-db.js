const { execSync } = require('child_process');

console.log('🔄 Syncing database schema...');

try {
  // Push schema to database without creating migrations
  execSync('npx prisma db push --skip-generate', { stdio: 'inherit' });
  
  // Generate Prisma Client
  execSync('npx prisma generate', { stdio: 'inherit' });
  
  console.log('✅ Database schema synced successfully!');
} catch (error) {
  console.error('❌ Failed to sync database:', error.message);
  process.exit(1);
}
