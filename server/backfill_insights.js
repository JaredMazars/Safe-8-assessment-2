import database from './config/database.js';
import Assessment from './models/Assessment.js';
import logger from './utils/logger.js';

/**
 * Backfill insights for assessments that don't have them
 * This script regenerates gap_analysis and service_recommendations
 * for all existing assessments
 */
async function backfillInsights() {
  try {
    logger.info('Starting insights backfill process...');

    // Get all assessments
    const sql = `
      SELECT 
        id,
        assessment_type,
        overall_score,
        dimension_scores,
        insights
      FROM assessments
      ORDER BY id
    `;

    const result = await database.query(sql);
    const assessments = Array.isArray(result) ? result : result.recordset;

    logger.info(`Found ${assessments.length} assessments to process`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const assessment of assessments) {
      try {
        // Parse existing data
        const dimensionScores = typeof assessment.dimension_scores === 'string' 
          ? JSON.parse(assessment.dimension_scores) 
          : assessment.dimension_scores || [];
        
        const existingInsights = typeof assessment.insights === 'string'
          ? JSON.parse(assessment.insights)
          : assessment.insights || {};

        // Check if insights already have gap_analysis and service_recommendations
        if (existingInsights.gap_analysis && 
            existingInsights.gap_analysis.length > 0 &&
            existingInsights.service_recommendations &&
            existingInsights.service_recommendations.length > 0) {
          logger.info(`Assessment ${assessment.id} already has insights, skipping`);
          skippedCount++;
          continue;
        }

        logger.info(`Processing assessment ${assessment.id}...`);

        // Generate new insights
        const generatedInsights = Assessment.generateInsights(
          assessment.overall_score,
          dimensionScores,
          assessment.assessment_type || 'GENERAL'
        );

        // Convert insights to match expected format
        const gap_analysis_items = [
          ...(generatedInsights.improvement_areas || []).map(area => 
            `${area.area} (${area.score.toFixed(1)}%): ${area.description}`
          ),
          ...(generatedInsights.critical_impact_areas || []).map(area => 
            `Critical: ${area.area} - Score: ${area.score.toFixed(1)}%, Weight: ${area.weight}% - ${area.description}`
          )
        ];

        const service_recommendations_items = [
          ...(generatedInsights.recommendations || []),
          ...(generatedInsights.weighted_priorities || []).map(priority =>
            `Priority ${priority.priority}: Improve ${priority.area} (current: ${priority.score.toFixed(1)}%, weight: ${priority.weight}%)`
          )
        ];

        // Merge with existing insights
        const updatedInsights = {
          ...existingInsights,
          overall_assessment: generatedInsights.overall_assessment,
          strengths: generatedInsights.strengths || [],
          improvement_areas: generatedInsights.improvement_areas || [],
          weighted_priorities: generatedInsights.weighted_priorities || [],
          critical_impact_areas: generatedInsights.critical_impact_areas || [],
          gap_analysis: gap_analysis_items,
          service_recommendations: service_recommendations_items,
          backfilled_at: new Date().toISOString()
        };

        // Update the assessment
        const updateSql = `
          UPDATE assessments
          SET insights = @param1
          WHERE id = @param2
        `;

        await database.query(updateSql, [
          JSON.stringify(updatedInsights),
          assessment.id
        ]);

        logger.info(`✅ Updated assessment ${assessment.id} with insights`);
        updatedCount++;

      } catch (error) {
        logger.error(`Error processing assessment ${assessment.id}:`, error.message);
      }
    }

    logger.info(`Backfill complete: ${updatedCount} updated, ${skippedCount} skipped`);
    console.log('\n✅ Backfill Summary:');
    console.log(`   Total Assessments: ${assessments.length}`);
    console.log(`   Updated: ${updatedCount}`);
    console.log(`   Skipped (already have insights): ${skippedCount}`);
    console.log(`   Failed: ${assessments.length - updatedCount - skippedCount}`);

    process.exit(0);

  } catch (error) {
    logger.error('Backfill failed:', error);
    console.error('\n❌ Backfill failed:', error.message);
    process.exit(1);
  }
}

// Run the backfill
backfillInsights();
