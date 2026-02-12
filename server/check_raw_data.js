import database from './config/database.js';
import logger from './utils/logger.js';

/**
 * Check raw dimension_scores data for assessment #39
 */
async function checkRawData() {
  try {
    const sql = `SELECT dimension_scores FROM assessments WHERE id = 39`;
    const result = await database.query(sql);
    const assessment = Array.isArray(result) ? result[0] : result.recordset[0];

    console.log('\n📊 Raw dimension_scores field:');
    console.log('Type:', typeof assessment.dimension_scores);
    console.log('Value:', assessment.dimension_scores);
    console.log('Length:', assessment.dimension_scores?.length);
    
    if (assessment.dimension_scores) {
      try {
        const parsed = JSON.parse(assessment.dimension_scores);
        console.log('\nParsed:', parsed);
        console.log('Is Array:', Array.isArray(parsed));
        console.log('Array Length:', parsed.length);
      } catch (e) {
        console.log('Parse error:', e.message);
      }
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkRawData();
