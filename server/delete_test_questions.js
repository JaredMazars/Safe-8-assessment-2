import database from './config/database.js';

async function deleteTestQuestions() {
  try {
    console.log('\n🗑️  Deleting existing TEST questions...\n');
    
    const result = await database.query(`
      DELETE FROM assessment_questions 
      WHERE assessment_type = 'TEST'
    `);
    
    const deleted = result.rowsAffected || 0;
    console.log(`✅ Deleted ${deleted} existing TEST questions\n`);
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    process.exit();
  }
}

deleteTestQuestions();
