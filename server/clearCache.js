import database from './config/database.js';
import { cache } from './config/simpleCache.js';
import logger from './utils/logger.js';

/**
 * Clear all caches and reset database connections
 */
async function clearAllCaches() {
  console.log('🧹 Starting cache clear process...');
  
  try {
    // 1. Clear in-memory cache
    console.log('📦 Clearing in-memory cache...');
    cache.clear();
    console.log('✅ In-memory cache cleared');
    
    // 2. Reset database connection pool
    console.log('🔌 Resetting database connection pool...');
    await database.resetPool();
    console.log('✅ Database pool reset');
    
    // 3. Test new connection
    console.log('🔍 Testing database connection...');
    const connected = await database.testConnection();
    
    if (connected) {
      console.log('✅ Database connection test successful');
    } else {
      console.log('❌ Database connection test failed');
    }
    
    console.log('');
    console.log('✅ Cache clear complete!');
    console.log('');
    console.log('Summary:');
    console.log('  - In-memory cache: CLEARED');
    console.log('  - Database pool: RESET');
    console.log('  - Connection status:', connected ? 'CONNECTED' : 'DISCONNECTED');
    
    process.exit(connected ? 0 : 1);
    
  } catch (error) {
    console.error('❌ Error clearing caches:', error);
    process.exit(1);
  }
}

// Run if called directly
clearAllCaches();
