import database from './config/database.js';

async function countQuestions() {
  try {
    console.log('\n📊 Question Count by Assessment Type:\n');
    
    const result = await database.query(`
      SELECT assessment_type, COUNT(*) as count 
      FROM assessment_questions 
      WHERE is_active = 1 
      GROUP BY assessment_type 
      ORDER BY assessment_type
    `);
    
    const counts = result.recordset || result;
    
    counts.forEach(row => {
      console.log(`  ${row.assessment_type.padEnd(12)}: ${row.count} questions`);
    });
    
    const total = counts.reduce((sum, row) => sum + row.count, 0);
    console.log(`\n  ${'TOTAL'.padEnd(12)}: ${total} questions\n`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    process.exit();
  }
}

countQuestions();
