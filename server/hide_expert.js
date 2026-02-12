import database from './config/database.js';

async function hideExpert() {
  try {
    console.log('🔄 Hiding EXPERT assessment...');

    const sql = `
      UPDATE assessment_types_config
      SET is_active = 0
      WHERE assessment_type = 'TEST2'
    `;

    await database.query(sql);
    console.log('✅ EXPERT assessment hidden');

    // Show current status
    const checkSql = `
      SELECT assessment_type, title, is_active, display_order
      FROM assessment_types_config
      WHERE is_active = 1
      ORDER BY display_order, assessment_type
    `;
    const check = await database.query(checkSql);
    console.log('\n📊 Active assessment types:');
    console.table(check.recordset || check);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

hideExpert();
