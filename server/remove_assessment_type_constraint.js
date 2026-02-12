import database from './config/database.js';

async function removeAssessmentTypeConstraint() {
  try {
    console.log('🔧 Removing assessment type CHECK constraint to allow dynamic types...\n');

    // Check if the constraint exists
    const checkConstraintSql = `
      SELECT COUNT(*) as count
      FROM INFORMATION_SCHEMA.CHECK_CONSTRAINTS
      WHERE CONSTRAINT_NAME = 'CK_assessments_assessment_type';
    `;
    
    const checkResult = await database.query(checkConstraintSql);
    const constraintExists = (checkResult?.recordset || checkResult)[0]?.count > 0;

    if (constraintExists) {
      console.log('📋 Found CHECK constraint CK_assessments_assessment_type');
      
      // Drop the constraint
      const dropConstraintSql = `
        ALTER TABLE assessments
        DROP CONSTRAINT CK_assessments_assessment_type;
      `;
      
      await database.query(dropConstraintSql);
      console.log('✅ Removed CHECK constraint - assessment types are now dynamic!\n');
    } else {
      console.log('ℹ️  No CHECK constraint found - assessment types are already dynamic\n');
    }

    // Verify current assessment types in the table
    const typesSql = `
      SELECT DISTINCT assessment_type 
      FROM assessment_questions 
      WHERE is_active = 1
      ORDER BY assessment_type;
    `;
    
    const typesResult = await database.query(typesSql);
    const types = typesResult?.recordset || typesResult;
    
    console.log('📊 Current active assessment types in database:');
    types.forEach(t => console.log(`  - ${t.assessment_type}`));
    
    console.log('\n✅ Migration complete! You can now create assessments with any type.');
    console.log('💡 New assessment types created in admin panel will work immediately.\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

removeAssessmentTypeConstraint();
