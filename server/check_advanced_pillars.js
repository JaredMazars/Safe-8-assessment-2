import database from './config/database.js';

async function checkAdvancedPillars() {
  try {
    console.log('🔍 Checking ADVANCED assessment pillars...\n');

    const sql = `
      SELECT DISTINCT pillar_name, pillar_short_name
      FROM assessment_questions
      WHERE assessment_type = ? AND is_active = 1
      ORDER BY pillar_name
    `;

    const result = await database.query(sql, ['ADVANCED']);
    const pillars = result.recordset || result;

    console.log(`Found ${pillars.length} pillars for ADVANCED:\n`);
    pillars.forEach((p, i) => {
      console.log(`${i + 1}. ${p.pillar_name} (${p.pillar_short_name})`);
    });

    console.log('\n✅ Done');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkAdvancedPillars();
