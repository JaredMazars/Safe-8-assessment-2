import database from './config/database.js';

async function checkPillarUsage() {
  try {
    console.log('🔍 Checking pillar configuration vs usage...\n');

    // Get all pillars from pillars table
    const pillarsSql = `SELECT name, short_name, is_active FROM pillars ORDER BY name`;
    const pillarsResult = await database.query(pillarsSql, []);
    const allPillars = pillarsResult.recordset || pillarsResult;

    console.log('📋 Pillars defined in "pillars" table:');
    allPillars.forEach((p, i) => {
      console.log(`${i + 1}. ${p.name} (${p.short_name}) - ${p.is_active ? 'ACTIVE' : 'INACTIVE'}`);
    });

    // Get unique pillars actually used in assessment_questions
    const usedSql = `
      SELECT DISTINCT pillar_name, pillar_short_name
      FROM assessment_questions
      WHERE is_active = 1
      ORDER BY pillar_name
    `;
    const usedResult = await database.query(usedSql, []);
    const usedPillars = usedResult.recordset || usedResult;

    console.log('\n📊 Pillars actually used in assessment questions:');
    usedPillars.forEach((p, i) => {
      console.log(`${i + 1}. ${p.pillar_name} (${p.pillar_short_name})`);
    });

    // Find pillars defined but not used
    console.log('\n⚠️ Pillars defined but NOT used in any assessment:');
    const usedNames = usedPillars.map(p => p.short_name);
    const unusedPillars = allPillars.filter(p => !usedNames.includes(p.short_name) && p.is_active);
    
    if (unusedPillars.length === 0) {
      console.log('   (None - all active pillars are being used)');
    } else {
      unusedPillars.forEach(p => {
        console.log(`   - ${p.name} (${p.short_name}) - Add questions to use this pillar`);
      });
    }

    console.log('\n✅ Done');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkPillarUsage();
