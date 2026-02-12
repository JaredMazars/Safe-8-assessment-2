import db from './config/database.js';

async function setActiveFlags() {
  try {
    console.log('🔄 Setting is_active = 1 for all existing questions...\n');
    
    const updateSql = `
      UPDATE assessment_questions
      SET is_active = 1
      WHERE is_active IS NULL
    `;
    
    const result = await db.query(updateSql);
    console.log('✅ Update result:', result);
    
    // Verify
    console.log('\n🔍 Verifying update...');
    const checkSql = `
      SELECT is_active, COUNT(*) as count
      FROM assessment_questions
      GROUP BY is_active
    `;
    const check = await db.query(checkSql);
    console.log('Active status after update:', check);
    
    // Test assessment types query
    console.log('\n🔍 Testing assessment types query...');
    const typesSql = `
      SELECT DISTINCT assessment_type 
      FROM assessment_questions
      WHERE is_active = 1
      ORDER BY assessment_type
    `;
    const types = await db.query(typesSql);
    console.log('Assessment types:', types);
    
    // Test pillars query
    console.log('\n🔍 Testing pillars query...');
    const pillarsSql = `
      SELECT DISTINCT pillar_name as name, pillar_short_name as short_name
      FROM assessment_questions
      WHERE is_active = 1
      ORDER BY pillar_name
    `;
    const pillars = await db.query(pillarsSql);
    console.log('Pillars:', pillars);
    
    console.log('\n✅ All done! Data is now ready for the config endpoints.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

setActiveFlags();
