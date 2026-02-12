import database from './config/database.js';

async function checkAssessmentsSchema() {
  try {
    console.log('🔍 Checking assessments table schema...\n');
    
    const result = await database.query(`
      SELECT 
        COLUMN_NAME,
        DATA_TYPE,
        CHARACTER_MAXIMUM_LENGTH,
        IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'assessments'
      ORDER BY ORDINAL_POSITION
    `);
    
    const columns = Array.isArray(result) ? result : result.recordset;
    
    console.log('===== ASSESSMENTS TABLE COLUMNS =====');
    columns.forEach(col => {
      const length = col.CHARACTER_MAXIMUM_LENGTH ? `(${col.CHARACTER_MAXIMUM_LENGTH})` : '';
      console.log(`${col.COLUMN_NAME} (${col.DATA_TYPE}${length})`);
    });
    
    // Check for sample data
    const sampleResult = await database.query('SELECT TOP 1 * FROM assessments');
    const sample = Array.isArray(sampleResult) ? sampleResult : sampleResult.recordset;
    
    if (sample && sample.length > 0) {
      console.log('\n\n===== SAMPLE ASSESSMENT RECORD =====');
      console.log(JSON.stringify(sample[0], null, 2));
    } else {
      console.log('\n\n❌ No assessments found in database');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await database.closePool();
    process.exit(0);
  }
}

checkAssessmentsSchema();
