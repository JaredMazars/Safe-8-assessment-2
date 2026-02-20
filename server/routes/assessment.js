import { Router } from 'express';
import database from '../config/database.js';

const assessmentRouter = Router();

// Get current assessment data for a user and assessment type
assessmentRouter.get('/current/:userId/:assessmentType', async (req, res) => {
  try {
    const { userId, assessmentType } = req.params;
    console.log(`🔍 Getting current assessment for user ${userId}, type ${assessmentType}`);
    
    // Get the most recent assessment for this user and type (using parameterized query to prevent SQL injection)
    const query = `
      SELECT TOP 1 
        a.*,
        l.contact_name,
        l.email,
        l.company_name,
        l.industry
      FROM assessments a
      LEFT JOIN leads l ON a.lead_id = l.id
      WHERE a.lead_id = ? 
        AND UPPER(a.assessment_type) = ?
      ORDER BY a.completed_at DESC
    `;
    
    const result = await database.query(query, [parseInt(userId), assessmentType.toUpperCase()]);
    
    if (result.length > 0) {
      const assessment = result[0];
      res.json({
        success: true,
        data: {
          assessment_id: assessment.id,
          overall_score: assessment.overall_score,
          dimension_scores: JSON.parse(assessment.dimension_scores || '[]'),
          responses: JSON.parse(assessment.responses || '{}'),
          insights: JSON.parse(assessment.insights || '{}'),
          completed_at: assessment.completed_at,
          user: {
            contact_name: assessment.contact_name,
            email: assessment.email,
            company_name: assessment.company_name,
            industry: assessment.industry
          }
        }
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'No assessment found for this user and type'
      });
    }
    
  } catch (error) {
    console.error('❌ Error getting current assessment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get current assessment',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get industry benchmark comparison data
assessmentRouter.get('/benchmark/:assessmentType/:industry', async (req, res) => {
  try {
    const { assessmentType, industry } = req.params;
    console.log(`📊 Getting benchmark data for ${assessmentType} in ${industry}`);
    
    // Get overall average for this assessment type and industry
    const overallQuery = `
      SELECT 
        AVG(a.overall_score) as industry_avg,
        COUNT(*) as total_assessments,
        MAX(a.overall_score) as best_score,
        MIN(a.overall_score) as lowest_score
      FROM assessments a
      LEFT JOIN leads l ON a.lead_id = l.id
      WHERE UPPER(a.assessment_type) = ?
        AND (l.industry = ? OR ? = 'all')
    `;
    
    const overallResult = await database.query(overallQuery, [
      assessmentType.toUpperCase(),
      industry,
      industry
    ]);
    
    // Get global average across all assessments
    const globalQuery = `
      SELECT AVG(overall_score) as global_avg
      FROM assessments
      WHERE UPPER(assessment_type) = ?
    `;
    
    const globalResult = await database.query(globalQuery, [assessmentType.toUpperCase()]);
    
    const data = overallResult[0] || {};
    const globalData = globalResult[0] || {};
    
    res.json({
      success: true,
      benchmark: {
        industry_average: data.industry_avg ? Math.round(data.industry_avg * 10) / 10 : null,
        global_average: globalData.global_avg ? Math.round(globalData.global_avg * 10) / 10 : null,
        best_score: data.best_score ? Math.round(data.best_score * 10) / 10 : null,
        lowest_score: data.lowest_score ? Math.round(data.lowest_score * 10) / 10 : null,
        total_assessments: data.total_assessments || 0,
        assessment_type: assessmentType,
        industry: industry
      }
    });
    
  } catch (error) {
    console.error('❌ Error getting benchmark data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get benchmark data',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

assessmentRouter.post('/submit', async (req, res) => {
  try {
    console.log('🚀 Assessment submission received:', req.body);
    
    res.json({
      success: true,
      message: 'Assessment submitted successfully!'
    });
  } catch (error) {
    console.error('Error submitting assessment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit assessment'
    });
  }
});

export default assessmentRouter;