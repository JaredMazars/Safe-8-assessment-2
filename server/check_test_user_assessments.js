import database from './config/database.js';

async function checkAssessments() {
  try {
    const sql = `
      SELECT TOP 10
        id,
        lead_id,
        assessment_type,
        overall_score,
        completed_at,
        LEN(dimension_scores) as dimension_scores_length,
        LEN(gap_analysis) as gap_analysis_length,
        LEN(service_recommendations) as service_recommendations_length
      FROM assessments
      WHERE lead_id = 61
      ORDER BY completed_at DESC
    `;
    
    const result = await database.query(sql);
    console.log('\n📊 Assessments for test@example.com (lead_id=61):');
    console.table(result.recordset || result);
    
    if (result.recordset && result.recordset.length > 0) {
      const latestId = result.recordset[0].id;
      console.log(`\n🔍 Checking latest assessment (ID: ${latestId})...`);
      
      const detailSql = `
        SELECT 
          dimension_scores,
          gap_analysis,
          service_recommendations
        FROM assessments
        WHERE id = ${latestId}
      `;
      
      const detail = await database.query(detailSql);
      const assessment = (detail.recordset || detail)[0];
      
      console.log('\n📋 Dimension Scores:');
      if (assessment.dimension_scores) {
        const scores = JSON.parse(assessment.dimension_scores);
        console.table(scores);
      } else {
        console.log('❌ No dimension scores');
      }
      
      console.log('\n💡 Gap Analysis:');
      console.log(assessment.gap_analysis || '❌ No gap analysis');
      
      console.log('\n🎯 Service Recommendations:');
      console.log(assessment.service_recommendations || '❌ No service recommendations');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkAssessments();
