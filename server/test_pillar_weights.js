import database from './config/database.js';

async function testPillarWeights() {
  try {
    console.log('🔍 Testing pillar weights system...\n');

    // Test the actual query for FRONTIER from assessment_questions
    console.log('1. Getting pillars from assessment_questions for FRONTIER...');
    const pillarsSql = `
      SELECT DISTINCT 
        pillar_name,
        pillar_short_name
      FROM assessment_questions
      WHERE assessment_type = ?
        AND is_active = 1
      ORDER BY pillar_name
    `;
    const pillarsResult = await database.query(pillarsSql, ['FRONTIER']);
    const pillars = pillarsResult.recordset || pillarsResult;
    console.log(`Found ${pillars?.length || 0} pillars:`, pillars);

    // Get weights
    console.log('\n2. Getting weights from pillar_weights...');
    const weightsSql = `
      SELECT pillar_name, pillar_short_name, weight_percentage, is_default
      FROM pillar_weights
      WHERE assessment_type = ?
    `;
    const weightsResult = await database.query(weightsSql, ['FRONTIER']);
    const weightsData = weightsResult.recordset || weightsResult;
    console.log(`Found ${weightsData?.length || 0} weights:`, weightsData);

    // Build the response like the endpoint does
    console.log('\n3. Building response...');
    const customWeights = {};
    if (Array.isArray(weightsData)) {
      weightsData.forEach(row => {
        customWeights[row.pillar_short_name] = {
          weight: parseFloat(row.weight_percentage),
          isDefault: row.is_default
        };
      });
    }

    const weights = Array.isArray(pillars) ? pillars.map((pillar, index) => ({
      pillarId: index + 1,
      pillarName: pillar.pillar_name,
      pillarShortName: pillar.pillar_short_name,
      weight: customWeights[pillar.pillar_short_name]?.weight || 12.5,
      isDefault: customWeights[pillar.pillar_short_name]?.isDefault !== undefined 
        ? customWeights[pillar.pillar_short_name].isDefault 
        : true
    })) : [];

    console.log('\n4. Final weights array:', JSON.stringify(weights, null, 2));
    console.log(`\nTotal weight: ${weights.reduce((sum, w) => sum + w.weight, 0)}%`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testPillarWeights();
