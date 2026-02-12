import database from './config/database.js';
import logger from './utils/logger.js';

/**
 * Test script to verify assessment #39 has the correct insights and pillar data
 */
async function testAssessment39() {
  try {
    logger.info('Testing assessment #39 data...');

    const sql = `
      SELECT 
        id,
        assessment_type,
        industry,
        overall_score,
        dimension_scores,
        insights,
        completed_at
      FROM assessments
      WHERE id = 39
    `;

    const result = await database.query(sql);
    const assessment = Array.isArray(result) ? result[0] : result.recordset[0];

    if (!assessment) {
      console.log('❌ Assessment #39 not found!');
      process.exit(1);
    }

    console.log('\n✅ Assessment #39 Found:');
    console.log('   ID:', assessment.id);
    console.log('   Type:', assessment.assessment_type);
    console.log('   Industry:', assessment.industry);
    console.log('   Overall Score:', assessment.overall_score);
    console.log('   Completed:', assessment.completed_at);

    // Parse dimension scores
    const dimensionScores = typeof assessment.dimension_scores === 'string' 
      ? JSON.parse(assessment.dimension_scores) 
      : assessment.dimension_scores;

    console.log('\n📊 Dimension Scores (Pillars):');
    if (dimensionScores && dimensionScores.length > 0) {
      dimensionScores.forEach((pillar, idx) => {
        console.log(`   ${idx + 1}. ${pillar.pillar_name} (${pillar.pillar_short_name}): ${pillar.score}%`);
      });
    } else {
      console.log('   ❌ NO PILLARS FOUND!');
    }

    // Parse insights
    const insights = typeof assessment.insights === 'string'
      ? JSON.parse(assessment.insights)
      : assessment.insights;

    console.log('\n💡 Insights:');
    console.log('   Score Category:', insights.score_category);
    console.log('   Overall Assessment:', insights.overall_assessment);

    console.log('\n🔍 Gap Analysis:');
    if (insights.gap_analysis && insights.gap_analysis.length > 0) {
      insights.gap_analysis.forEach((gap, idx) => {
        console.log(`   ${idx + 1}. ${gap}`);
      });
    } else {
      console.log('   ❌ NO GAP ANALYSIS FOUND!');
    }

    console.log('\n💡 Service Recommendations:');
    if (insights.service_recommendations && insights.service_recommendations.length > 0) {
      insights.service_recommendations.forEach((rec, idx) => {
        console.log(`   ${idx + 1}. ${rec}`);
      });
    } else {
      console.log('   ❌ NO RECOMMENDATIONS FOUND!');
    }

    console.log('\n✅ Test Complete!');
    process.exit(0);

  } catch (error) {
    logger.error('Test failed:', error);
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testAssessment39();
