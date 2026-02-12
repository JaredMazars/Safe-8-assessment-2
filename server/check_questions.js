import database from './config/database.js';

async function checkQuestions() {
  try {
    console.log('\n📋 Checking assessment questions...\n');
    
    const result = await database.query(`
      SELECT TOP 10 
        id, 
        question_text, 
        assessment_type, 
        pillar_name, 
        pillar_short_name,
        question_order,
        created_at
      FROM assessment_questions 
      ORDER BY id DESC
    `);
    
    const questions = result.recordset || result;
    
    if (questions && questions.length > 0) {
      console.log(`✅ Found ${questions.length} questions:\n`);
      questions.forEach((q, idx) => {
        console.log(`${idx + 1}. [ID: ${q.id}] ${q.question_text.substring(0, 50)}...`);
        console.log(`   Type: ${q.assessment_type} | Pillar: ${q.pillar_name} (${q.pillar_short_name})`);
        console.log(`   Order: ${q.question_order} | Created: ${q.created_at}`);
        console.log('');
      });
    } else {
      console.log('❌ No questions found in database');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    process.exit();
  }
}

checkQuestions();
