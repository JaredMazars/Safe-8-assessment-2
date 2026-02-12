import database from './config/database.js';

async function addTestToCheckConstraint() {
  try {
    console.log('\n🔧 Adding TEST to assessment_type CHECK constraint...\n');
    
    // Drop the existing constraint
    console.log('Step 1: Dropping old CHECK constraint...');
    await database.query(`
      ALTER TABLE assessments 
      DROP CONSTRAINT CK__assessmen__asses__07C12930;
    `);
    console.log('✅ Old constraint dropped\n');
    
    // Add new constraint with TEST included
    console.log('Step 2: Adding new CHECK constraint with TEST...');
    await database.query(`
      ALTER TABLE assessments 
      ADD CONSTRAINT CK_assessments_assessment_type 
      CHECK (assessment_type IN ('CORE', 'ADVANCED', 'FRONTIER', 'TEST'));
    `);
    console.log('✅ New constraint added\n');
    
    console.log('✅ Database schema updated! TEST assessment type is now allowed.\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Full error:', error);
  } finally {
    process.exit();
  }
}

addTestToCheckConstraint();
