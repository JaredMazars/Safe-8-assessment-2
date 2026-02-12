import database from './config/database.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  console.log('🔧 Running password reset migration...');
  
  try {
    const migrationPath = path.join(__dirname, 'migrations', 'add_password_reset_fields.sql');
    const sqlScript = fs.readFileSync(migrationPath, 'utf8');
    
    const { getPool } = await import('./config/database.js');
    const pool = await getPool();
    
    // Split by GO statements and execute each batch
    const batches = sqlScript.split(/\bGO\b/i).filter(batch => batch.trim());
    
    for (const batch of batches) {
      if (batch.trim()) {
        await pool.request().query(batch);
      }
    }
    
    console.log('✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
