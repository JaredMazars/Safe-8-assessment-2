import database from './config/database.js';

async function checkSchema() {
  console.log('🔍 Checking Leads Table Schema...\n');

  try {
    // Get column names from leads table
    const schemaResult = await database.query(`
      SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'leads'
      ORDER BY ORDINAL_POSITION
    `);
    
    console.log('===== LEADS TABLE COLUMNS =====');
    const columns = schemaResult.recordset || schemaResult;
    if (columns && columns.length > 0) {
      columns.forEach(col => {
        console.log(`  ${col.COLUMN_NAME} (${col.DATA_TYPE}${col.CHARACTER_MAXIMUM_LENGTH ? `(${col.CHARACTER_MAXIMUM_LENGTH})` : ''})`);
      });
    } else {
      console.log('No columns found or empty result');
      console.log('Result:', JSON.stringify(schemaResult, null, 2));
    }

    // Now fetch with correct columns
    console.log('\n\n===== FETCHING USERS =====');
    const usersResult = await database.query(`
      SELECT TOP 10 *
      FROM leads
      ORDER BY created_at DESC
    `);
    
    console.log(`\nFound ${usersResult.recordset.length} users:\n`);
    usersResult.recordset.forEach((user, idx) => {
      console.log(`${idx + 1}. User ID: ${user.id}`);
      Object.keys(user).forEach(key => {
        if (!['password_hash', 'password_updated_at', 'password_created_at'].includes(key)) {
          console.log(`   ${key}: ${user[key]}`);
        }
      });
      console.log('');
    });

    // Check assessments schema
    console.log('\n===== ASSESSMENTS TABLE COLUMNS =====');
    const assessmentSchemaResult = await database.query(`
      SELECT COLUMN_NAME, DATA_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'assessments'
      ORDER BY ORDINAL_POSITION
    `);
    
    assessmentSchemaResult.recordset.forEach(col => {
      console.log(`  ${col.COLUMN_NAME} (${col.DATA_TYPE})`);
    });

    // Fetch assessments
    console.log('\n\n===== FETCHING ASSESSMENTS =====');
    const assessmentsResult = await database.query(`
      SELECT TOP 10 *
      FROM assessments
      ORDER BY completed_at DESC
    `);
    
    console.log(`\nFound ${assessmentsResult.recordset.length} assessments\n`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    process.exit(0);
  }
}

checkSchema();
