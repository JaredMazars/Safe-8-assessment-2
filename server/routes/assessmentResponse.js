import express from 'express';
import AssessmentResponse from '../models/AssessmentResponse.js';
import { validateAssessmentResponse } from '../middleware/validation.js';
import { doubleCsrfProtection } from '../middleware/csrf.js';
import { sanitizeLog, default as logger } from '../utils/logger.js';

const router = express.Router();

// Save individual question response (NO CSRF - Phase 2: Frontend integration pending)
router.post('/response', async (req, res) => {
  try {

    const { lead_user_id, question_id, response_value } = req.body;

    if (!lead_user_id || !question_id || response_value === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: lead_user_id, question_id, response_value'
      });
    }

    // Validate response value (1-5 scale)
    if (response_value < 1 || response_value > 5) {
      return res.status(400).json({
        success: false,
        message: 'Response value must be between 1 and 5'
      });
    }

    // Use updateOrCreate to handle duplicate responses
    const result = await AssessmentResponse.updateOrCreate({
      lead_user_id,
      question_id,
      response_value: parseInt(response_value)
    });

    if (result.success) {
      logger.debug('Response saved', { isNew: result.isNew });
    }

    res.json(result);
  } catch (error) {
    logger.error('Error saving response', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to save response'
    });
  }
});

// Get all responses for a user
router.get('/responses/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const responses = await AssessmentResponse.getByUserId(parseInt(userId));
    
    res.json({
      success: true,
      responses
    });
  } catch (error) {
    logger.error('Error getting responses', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to get responses'
    });
  }
});

// Get responses for a specific assessment type
router.get('/responses/:userId/:assessmentType', async (req, res) => {
  try {
    const { userId, assessmentType } = req.params;
    const responses = await AssessmentResponse.getByUserAndType(
      parseInt(userId), 
      assessmentType
    );
    
    res.json({
      success: true,
      responses
    });
  } catch (error) {
    logger.error('Error getting assessment responses', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to get assessment responses'
    });
  }
});

// Calculate assessment score
router.get('/score/:userId/:assessmentType', async (req, res) => {
  try {
    const { userId, assessmentType } = req.params;
    const scoreData = await AssessmentResponse.calculateScore(
      parseInt(userId),
      assessmentType
    );
    
    res.json({
      success: true,
      ...scoreData
    });
  } catch (error) {
    logger.error('Error calculating score', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to calculate score'
    });
  }
});

// Get global average score (for industry benchmark)
router.get('/global-average', async (req, res) => {
  try {
    const result = await AssessmentResponse.getGlobalAverage();
    
    res.json({
      success: true,
      average: result.average || 0
    });
  } catch (error) {
    logger.error('Error getting global average', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to get global average'
    });
  }
});

// Delete responses (for retaking assessment)
router.delete('/responses/:userId/:assessmentType?', async (req, res) => {
  try {
    const { userId, assessmentType } = req.params;
    const result = await AssessmentResponse.deleteByUserId(
      parseInt(userId),
      assessmentType
    );
    
    res.json(result);
  } catch (error) {
    logger.error('Error deleting responses', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to delete responses'
    });
  }
});

export default router;
