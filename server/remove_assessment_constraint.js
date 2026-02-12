import database from './config/database.js';

async function removeAssessmentTypeConstraint() {
  try {
    console.log('\n🔧 Removing hard-coded assessment_type CHECK constraint...\n');
    
    // Drop the existing constraint permanently
    console.log('Dropping CHECK constraint to allow dynamic assessment types...');
    await database.query(`
      ALTER TABLE assessments 
      DROP CONSTRAINT CK__assessmen__asses__07C12930;
    `);
    console.log('✅ CHECK constraint removed\n');
    
    console.log('✅ Database schema updated!');
    console.log('✅ Any assessment type can now be stored dynamically.\n');
    console.log('ℹ️  Assessment types are now controlled by:');
    console.log('   1. Questions in assessment_questions table');
    console.log('   2. Frontend validation (optional)');
    console.log('   3. Application logic\n');
    
  } catch (error) {
    if (error.message.includes('Could not drop constraint')) {
      console.log('✅ Constraint already removed or does not exist\n');
    } else {
      console.error('\n❌ Error:', error.message);
      console.error('Full error:', error);
    }
  } finally {
    process.exit();
  }
}

removeAssessmentTypeConstraint();
