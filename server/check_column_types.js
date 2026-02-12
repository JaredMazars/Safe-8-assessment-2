import database from './config/database.js';

async function checkColumnTypes() {
  try {
    console.log('🔍 Checking column data types...\n');
    
    // Check admin_activity_log columns
    console.log('📋 admin_activity_log columns:');
    const adminResult = await database.query(`
      SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'admin_activity_log'
      ORDER BY ORDINAL_POSITION
    `);
    const adminColumns = Array.isArray(adminResult) ? adminResult : adminResult.recordset;
    adminColumns.forEach(col => {
      console.log(`  ${col.COLUMN_NAME}: ${col.DATA_TYPE}${col.CHARACTER_MAXIMUM_LENGTH ? `(${col.CHARACTER_MAXIMUM_LENGTH})` : ''} ${col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
    
    // Check user_activity_log columns
    console.log('\n📋 user_activity_log columns:');
    const userResult = await database.query(`
      SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'user_activity_log'
      ORDER BY ORDINAL_POSITION
    `);
    const userColumns = Array.isArray(userResult) ? userResult : userResult.recordset;
    userColumns.forEach(col => {
      console.log(`  ${col.COLUMN_NAME}: ${col.DATA_TYPE}${col.CHARACTER_MAXIMUM_LENGTH ? `(${col.CHARACTER_MAXIMUM_LENGTH})` : ''} ${col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
    
    // Check leads table for company_name
    console.log('\n📋 leads table (company_name column):');
    const leadsResult = await database.query(`
      SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'leads' AND COLUMN_NAME = 'company_name'
    `);
    const leadsColumns = Array.isArray(leadsResult) ? leadsResult : leadsResult.recordset;
    if (leadsColumns.length > 0) {
      const col = leadsColumns[0];
      console.log(`  ${col.COLUMN_NAME}: ${col.DATA_TYPE}${col.CHARACTER_MAXIMUM_LENGTH ? `(${col.CHARACTER_MAXIMUM_LENGTH})` : ''} ${col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL'}`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

checkColumnTypes();
