import database from './config/database.js';

async function checkInsights39() {
  try {
    const sql = `SELECT insights FROM assessments WHERE id = 39`;
    const result = await database.query(sql);
    const assessment = Array.isArray(result) ? result[0] : result.recordset[0];

    const insights = JSON.parse(assessment.insights);
    
    console.log('\n💡 Insights for Assessment #39:\n');
    console.log(JSON.stringify(insights, null, 2));

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkInsights39();
