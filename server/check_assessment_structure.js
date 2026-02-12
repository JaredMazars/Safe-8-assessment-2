import database from './config/database.js';

async function checkAssessmentStructure() {
  try {
    const sql = `
      SELECT TOP 1 *
      FROM assessments
      WHERE lead_id = 61
      ORDER BY completed_at DESC
    `;
    
    const result = await database.query(sql);
    console.log('\n📊 Latest assessment for test@example.com:');
    if (result.recordset && result.recordset.length > 0) {
      const assessment = result.recordset[0];
      console.log('\nColumns:', Object.keys(assessment));
      console.log('\nAssessment details:');
      console.table([{
        id: assessment.id,
        assessment_type: assessment.assessment_type,
        overall_score: assessment.overall_score,
        completed_at: assessment.completed_at,
        hasDimensionScores: !!assessment.dimension_scores,
        hasInsights: !!assessment.insights
      }]);
      
      if (assessment.dimension_scores) {
        console.log('\n📊 Dimension Scores:');
        const scores = JSON.parse(assessment.dimension_scores);
        console.table(scores);
      }
      
      if (assessment.insights) {
        console.log('\n💡 Insights:');
        const insights = JSON.parse(assessment.insights);
        
        console.log('\n📊 Overall Assessment:');
        console.log(insights.overall_assessment || '❌ Missing');
        
        console.log('\n💪 Strengths:');
        if (insights.strengths && insights.strengths.length > 0) {
          insights.strengths.forEach((s, i) => {
            console.log(`  ${i+1}. ${s.area} (${s.score}%) - ${s.description}`);
          });
        } else {
          console.log('  ❌ No strengths found');
        }
        
        console.log('\n⚠️ Improvement Areas:');
        if (insights.improvement_areas && insights.improvement_areas.length > 0) {
          insights.improvement_areas.forEach((a, i) => {
            console.log(`  ${i+1}. [${a.priority}] ${a.area} (${a.score}%) - ${a.description}`);
          });
        } else {
          console.log('  ✅ No major improvement areas');
        }
        
        console.log('\n🎯 Gap Analysis:');
        if (insights.gap_analysis && insights.gap_analysis.length > 0) {
          insights.gap_analysis.forEach((gap, i) => {
            console.log(`  ${i+1}. ${gap}`);
          });
        } else {
          console.log('  ❌ No gap analysis');
        }
        
        console.log('\n🔧 Service Recommendations:');
        if (insights.service_recommendations && insights.service_recommendations.length > 0) {
          insights.service_recommendations.forEach((rec, i) => {
            console.log(`  ${i+1}. ${rec}`);
          });
        } else {
          console.log('  ❌ No service recommendations');
        }
        
        console.log('\n⭐ Weighted Priorities:');
        if (insights.weighted_priorities && insights.weighted_priorities.length > 0) {
          insights.weighted_priorities.forEach((p, i) => {
            console.log(`  ${i+1}. [${p.priority}] ${p.area} - Score: ${p.score}%, Weight: ${p.weight}%, Impact: ${p.impact_score}`);
            console.log(`      ${p.description}`);
          });
        } else {
          console.log('  ❌ No weighted priorities');
        }
      } else {
        console.log('\n❌ No insights found');
      }
    } else {
      console.log('No assessments found for this user');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkAssessmentStructure();
