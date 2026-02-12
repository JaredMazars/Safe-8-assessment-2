import database from './config/database.js';

async function testPillarWeightsEndpoint() {
  try {
    console.log('🧪 Testing pillar weights endpoint logic...\n');

    const assessmentType = 'ADVANCED';

    // Get pillars from assessment_questions
    const pillarsSql = `
      SELECT DISTINCT pillar_name, pillar_short_name
      FROM assessment_questions
      WHERE assessment_type = ? AND is_active = 1
      ORDER BY pillar_name
    `;
    const pillarsResult = await database.query(pillarsSql, [assessmentType]);
    const questionPillars = pillarsResult.recordset || pillarsResult;

    console.log(`Found ${questionPillars.length} pillars from assessment_questions:`);
    questionPillars.forEach(p => console.log(`  - ${p.pillar_name} (${p.pillar_short_name})`));

    // Get ALL active pillars from pillars table
    const allPillarsSql = `
      SELECT name, short_name FROM pillars WHERE is_active = 1 ORDER BY name
    `;
    const allPillarsResult = await database.query(allPillarsSql, []);
    const allPillars = allPillarsResult.recordset || allPillarsResult;

    console.log(`\nFound ${allPillars.length} active pillars from pillars table:`);
    allPillars.forEach(p => console.log(`  - ${p.name} (${p.short_name})`));

    // Merge
    const pillarsMap = new Map();
    
    if (Array.isArray(questionPillars)) {
      questionPillars.forEach(p => {
        pillarsMap.set(p.pillar_short_name, {
          pillar_name: p.pillar_name,
          pillar_short_name: p.pillar_short_name,
          hasQuestions: true
        });
      });
    }
    
    if (Array.isArray(allPillars)) {
      allPillars.forEach(p => {
        if (!pillarsMap.has(p.short_name)) {
          pillarsMap.set(p.short_name, {
            pillar_name: p.name,
            pillar_short_name: p.short_name,
            hasQuestions: false
          });
        }
      });
    }

    const pillars = Array.from(pillarsMap.values());
    const pillarsWithQuestions = pillars.filter(p => p.hasQuestions).length;
    const defaultWeight = pillarsWithQuestions > 0 ? parseFloat((100 / pillarsWithQuestions).toFixed(2)) : 0;

    console.log(`\nMerged result: ${pillars.length} total pillars`);
    console.log(`Pillars with questions: ${pillarsWithQuestions}`);
    console.log(`Default weight for pillars with questions: ${defaultWeight}%\n`);

    const weights = pillars.map((pillar, index) => ({
      pillarId: index + 1,
      pillarName: pillar.pillar_name,
      pillarShortName: pillar.pillar_short_name,
      weight: pillar.hasQuestions ? defaultWeight : 0,
      isDefault: true,
      hasQuestions: pillar.hasQuestions
    }));

    console.log('Final weights:');
    weights.forEach(w => {
      console.log(`  ${w.pillarName} (${w.pillarShortName}): ${w.weight}% ${w.hasQuestions ? '' : '⚠️ NO QUESTIONS'}`);
    });

    const total = weights.reduce((sum, w) => sum + w.weight, 0);
    console.log(`\nTotal: ${total}%`);

    console.log('\n✅ Done');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testPillarWeightsEndpoint();
