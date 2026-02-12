import db from './config/database.js';

async function checkConfigData() {
  try {
    console.log('🔍 Checking assessment_questions table...\n');
    
    console.log('1️⃣ Table structure:');
    const columns = await db.query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'assessment_questions'
      ORDER BY ORDINAL_POSITION
    `);
    console.log('Columns:', columns);
    
    console.log('\n2️⃣ Row Count:');
    const count = await db.query(`
      SELECT COUNT(*) as total FROM assessment_questions
    `);
    console.log('Total rows:', count);
    
    console.log('\n3️⃣ is_active values:');
    const activeCheck = await db.query(`
      SELECT is_active, COUNT(*) as count
      FROM assessment_questions
      GROUP BY is_active
    `);
    console.log('Active status distribution:', activeCheck);
    
    console.log('\n4️⃣ All Questions (first 5):');
    const questions = await db.query(`
      SELECT TOP 5 id, question_text, assessment_type, pillar_name, pillar_short_name, is_active
      FROM assessment_questions
    `);
    console.log('Questions:', questions);
    
    // Check assessment types
    console.log('\n5️⃣ Assessment Types (without filter):');
    const typesAll = await db.query(`
      SELECT DISTINCT assessment_type 
      FROM assessment_questions
      ORDER BY assessment_type
    `);
    console.log('All types:', typesAll);
    
    console.log('\n6️⃣ Assessment Types (is_active = 1):');
    const types = await db.query(`
      SELECT DISTINCT assessment_type 
      FROM assessment_questions
      WHERE is_active = 1
      ORDER BY assessment_type
    `);
    console.log('Active types:', types);
    
    console.log('\n7️⃣ Pillars (without filter):');
    const pillarsAll = await db.query(`
      SELECT DISTINCT pillar_name, pillar_short_name
      FROM assessment_questions
      WHERE pillar_name IS NOT NULL AND pillar_name != ''
      ORDER BY pillar_name
    `);
    console.log('All pillars:', pillarsAll);
    
    console.log('\n8️⃣ Pillars (is_active = 1):');
    const pillars = await db.query(`
      SELECT DISTINCT pillar_name, pillar_short_name
      FROM assessment_questions
      WHERE is_active = 1 AND pillar_name IS NOT NULL AND pillar_name != ''
      ORDER BY pillar_name
    `);
    console.log('Active pillars:', pillars);
    
    console.log('\n✅ Check complete');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkConfigData();
