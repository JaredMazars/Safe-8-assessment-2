import { Router } from 'express';
import database from '../config/database.js';

const assessmentRouter = Router();

// Get current assessment data for a user and assessment type
assessmentRouter.get('/current/:userId/:assessmentType', async (req, res) => {
  try {
    const { userId, assessmentType } = req.params;
    console.log(`🔍 Getting current assessment for user ${userId}, type ${assessmentType}`);
    
    // Get the most recent assessment for this user and type
    const query = `
      SELECT TOP 1 
        a.*,
        l.contact_name,
        l.email,
        l.company_name,
        l.industry
      FROM assessments a
      LEFT JOIN leads l ON a.lead_id = l.id
      WHERE a.lead_id = ${userId} 
        AND UPPER(a.assessment_type) = '${assessmentType.toUpperCase()}'
      ORDER BY a.completed_at DESC
    `;
    
    const result = await database.query(query);
    
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
      error: error.message
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