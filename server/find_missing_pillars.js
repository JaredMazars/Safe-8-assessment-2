import database from './config/database.js';
import logger from './utils/logger.js';

/**
 * Find all assessments with missing dimension_scores
 */
async function findMissingPillars() {
  try {
    const sql = `
      SELECT id, assessment_type, overall_score, dimension_scores, completed_at
      FROM assessments
      ORDER BY id
    `;
    
    const result = await database.query(sql);
    const assessments = Array.isArray(result) ? result : result.recordset;

    console.log(`\n📊 Checking ${assessments.length} assessments for missing pillar data...\n`);

    let missingCount = 0;
    let validCount = 0;

    assessments.forEach(assessment => {
      const dimensionScores = assessment.dimension_scores ? JSON.parse(assessment.dimension_scores) : [];
      const hasPillars = dimensionScores && dimensionScores.length > 0;

      if (!hasPillars) {
        console.log(`❌ ID ${assessment.id}: NO PILLARS (Type: ${assessment.assessment_type}, Score: ${assessment.overall_score}%)`);
        missingCount++;
      } else {
        console.log(`✅ ID ${assessment.id}: ${dimensionScores.length} pillars (Type: ${assessment.assessment_type}, Score: ${assessment.overall_score}%)`);
        validCount++;
      }
    });

    console.log(`\n📊 Summary:`);
    console.log(`   Total: ${assessments.length}`);
    console.log(`   ✅ With Pillars: ${validCount}`);
    console.log(`   ❌ Missing Pillars: ${missingCount}`);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

findMissingPillars();
