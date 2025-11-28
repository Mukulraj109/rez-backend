// Quick test to start server and capture error
require('dotenv').config();

console.log('\n🔍 Testing server startup...\n');
console.log('Environment loaded:');
console.log(`- NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
console.log(`- MONGODB_URI: ${process.env.MONGODB_URI ? '✅ Set' : '❌ Not set'}`);
console.log(`- REDIS_URL: ${process.env.REDIS_URL ? '✅ Set' : '❌ Not set'}`);
console.log(`- JWT_SECRET: ${process.env.JWT_SECRET ? `✅ Set (${process.env.JWT_SECRET.length} chars)` : '❌ Not set'}`);
console.log(`- FRONTEND_URL: ${process.env.FRONTEND_URL || '❌ Not set'}`);
console.log('\nAttempting to start server...\n');

try {
  require('./dist/server.js');
} catch (error) {
  console.error('\n❌ Server startup failed:', error.message);
  console.error('\nFull error:', error);
  process.exit(1);
}


