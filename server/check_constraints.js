import database from './config/database.js';

async function checkConstraints() {
  try {
    console.log('\n🔍 Checking assessment_type constraints...\n');
    
    const result = await database.query(`
      SELECT 
        OBJECT_NAME(parent_object_id) AS table_name,
        name AS constraint_name,
        definition
      FROM sys.check_constraints
      WHERE OBJECT_NAME(parent_object_id) = 'assessments'
        AND definition LIKE '%assessment_type%'
    `);
    
    const constraints = result.recordset || result;
    
    if (constraints && constraints.length > 0) {
      console.log('📋 Current CHECK constraints:\n');
      constraints.forEach(c => {
        console.log(`Table: ${c.table_name}`);
        console.log(`Constraint: ${c.constraint_name}`);
        console.log(`Definition: ${c.definition}\n`);
      });
    } else {
      console.log('✅ No CHECK constraint on assessment_type');
      console.log('✅ Any assessment type can be stored dynamically!\n');
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    process.exit();
  }
}

checkConstraints();
