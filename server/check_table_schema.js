import database from './config/database.js';

async function checkSchema() {
  try {
    console.log('Checking existing table schemas...\n');
    
    // Get column info for each table
    const tables = ['assessment_insights', 'service_recommendations', 'industry_benchmarks'];
    
    for (const table of tables) {
      try {
        const columns = await database.query(`
          SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, IS_NULLABLE
          FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_NAME = '${table}'
          ORDER BY ORDINAL_POSITION
        `);
        
        console.log(`\n📋 ${table}:`);
        console.log('─'.repeat(80));
        columns.forEach(col => {
          const length = col.CHARACTER_MAXIMUM_LENGTH ? `(${col.CHARACTER_MAXIMUM_LENGTH})` : '';
          const nullable = col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL';
          console.log(`  ${col.COLUMN_NAME.padEnd(30)} ${col.DATA_TYPE}${length.padEnd(10)} ${nullable}`);
        });
      } catch (error) {
        console.log(`\n✗ ${table}: ${error.message}`);
      }
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkSchema();
