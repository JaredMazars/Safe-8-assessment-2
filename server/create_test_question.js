import database from './config/database.js';

async function createTestQuestion() {
  try {
    console.log('\n📝 Creating test question...\n');
    
    const questionData = {
      question_text: 'Test Question',
      assessment_type: 'TEST',
      pillar_name: 'Data Readiness',
      pillar_short_name: 'DATA',
      question_order: 1
    };
    
    console.log('Question data:', questionData);
    
    const sql = `
      INSERT INTO assessment_questions (
        assessment_type, pillar_name, pillar_short_name, question_text, question_order, is_active
      )
      OUTPUT INSERTED.id, INSERTED.question_text, INSERTED.assessment_type, INSERTED.pillar_name
      VALUES (?, ?, ?, ?, ?, 1);
    `;
    
    const result = await database.query(sql, [
      questionData.assessment_type.toUpperCase(),
      questionData.pillar_name,
      questionData.pillar_short_name,
      questionData.question_text,
      questionData.question_order
    ]);
    
    const inserted = result.recordset ? result.recordset[0] : result[0];
    
    console.log('\n✅ Question created successfully!');
    console.log('ID:', inserted.id);
    console.log('Question:', inserted.question_text);
    console.log('Type:', inserted.assessment_type);
    console.log('Pillar:', inserted.pillar_name);
    
  } catch (error) {
    console.error('\n❌ Error creating question:', error.message);
    console.error('Full error:', error);
  } finally {
    process.exit();
  }
}

createTestQuestion();
