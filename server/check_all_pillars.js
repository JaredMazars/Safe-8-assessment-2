import database from './config/database.js';

async function getAllPillars() {
  try {
    console.log('🔍 Checking all pillars in database...\n');

    // Get all active pillars
    const sql = `
      SELECT name, short_name, default_weight, is_active
      FROM pillars
      WHERE is_active = 1
      ORDER BY name
    `;

    const result = await database.query(sql, []);
    const pillars = result.recordset || result;

    console.log(`Found ${pillars.length} active pillars:\n`);
    pillars.forEach((p, i) => {
      console.log(`${i + 1}. ${p.name} (${p.short_name}) - Default Weight: ${p.default_weight || 'Not set'}`);
    });

    console.log('\n📊 Now checking pillars by assessment type:\n');

    for (const assessmentType of ['CORE', 'ADVANCED', 'FRONTIER', 'TEST']) {
      const typeSql = `
        SELECT DISTINCT pillar_name, pillar_short_name
        FROM assessment_questions
        WHERE assessment_type = ? AND is_active = 1
        ORDER BY pillar_name
      `;
      const typeResult = await database.query(typeSql, [assessmentType]);
      const typePillars = typeResult.recordset || typeResult;
      
      console.log(`${assessmentType}: ${typePillars.length} pillars`);
      typePillars.forEach(p => {
        console.log(`  - ${p.pillar_name} (${p.pillar_short_name})`);
      });
      console.log();
    }

    console.log('✅ Done');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

getAllPillars();
