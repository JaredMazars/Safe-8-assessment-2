import express from 'express';
import UserEngagementStats from '../models/UserEngagementStats.js';
import { sanitizeLog, default as logger } from '../utils/logger.js';

const router = express.Router();

// Get user dashboard summary
router.get('/dashboard/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    logger.debug('Fetching dashboard summary', { userId: sanitizeLog(userId) });
    
    const dashboardData = await UserEngagementStats.getDashboardSummary(userId);
    
    if (!dashboardData) {
      logger.debug('No dashboard data found', { userId: sanitizeLog(userId) });
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    logger.debug('Dashboard data retrieved');
    res.json({
      success: true,
      data: dashboardData
    });
  } catch (error) {
    logger.error('Error fetching dashboard summary', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard summary'
    });
  }
});

// Get user engagement statistics
router.get('/stats/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    logger.debug('Fetching user stats', { userId: sanitizeLog(userId) });
    
    const stats = await UserEngagementStats.getUserStats(userId);
    
    if (!stats) {
      return res.status(404).json({
        success: false,
        message: 'User stats not found'
      });
    }

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Error fetching user stats', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user statistics'
    });
  }
});

// Get assessment progress for user
router.get('/progress/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit } = req.query;
    
    logger.debug('Fetching assessment progress', { userId: sanitizeLog(userId) });
    
    const progress = await UserEngagementStats.getAssessmentProgress(userId, limit ? parseInt(limit) : 10);

    res.json({
      success: true,
      data: progress
    });
  } catch (error) {
    logger.error('Error fetching assessment progress', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch assessment progress'
    });
  }
});

// Update user engagement statistics
router.post('/update-stats/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const {
      assessment_type,
      overall_score,
      dimension_scores,
      completion_time,
      industry
    } = req.body;
    
    logger.debug('Updating stats', {
      userId: sanitizeLog(userId),
      assessment_type: sanitizeLog(assessment_type),
      overall_score: sanitizeLog(overall_score),
      industry: sanitizeLog(industry)
    });
    
    // Update user statistics
    await UserEngagementStats.updateUserStats(userId);

    // Also create performance tracking entry if assessment data is provided
    if (assessment_type && overall_score !== undefined) {
      await UserEngagementStats.createPerformanceTracking({
        user_id: userId,
        assessment_type,
        overall_score,
        dimension_scores: dimension_scores || [],
        completion_date: completion_time ? new Date(completion_time) : new Date(),
        industry: industry || 'Unknown'
      });
    }

    res.json({
      success: true,
      message: 'User statistics updated successfully'
    });
  } catch (error) {
    logger.error('Error updating user stats', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to update user statistics'
    });
  }
});

// Create performance tracking for assessment
router.post('/performance-tracking', async (req, res) => {
  try {
    const { userId, assessmentId, dimensionScores } = req.body;
    
    logger.debug('Creating performance tracking', { userId: sanitizeLog(userId), assessmentId: sanitizeLog(assessmentId) });
    
    await UserEngagementStats.createPerformanceTracking(userId, assessmentId, dimensionScores);

    res.json({
      success: true,
      message: 'Performance tracking created successfully'
    });
  } catch (error) {
    logger.error('Error creating performance tracking', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to create performance tracking'
    });
  }
});

// Get user risk assessments
router.get('/risks/:userId/:assessmentId?', async (req, res) => {
  try {
    const { userId, assessmentId } = req.params;
    
    logger.debug('Fetching user risks', { userId: sanitizeLog(userId) });
    
    const risks = await UserEngagementStats.getUserRisks(userId, assessmentId);

    res.json({
      success: true,
      data: risks
    });
  } catch (error) {
    logger.error('Error fetching user risks', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user risks'
    });
  }
});

// Generate risk assessment
router.post('/generate-risks', async (req, res) => {
  try {
    const { userId, assessmentId } = req.body;
    
    logger.debug('Generating risk assessment', { userId: sanitizeLog(userId), assessmentId: sanitizeLog(assessmentId) });
    
    await UserEngagementStats.generateRiskAssessment(userId, assessmentId);

    res.json({
      success: true,
      message: 'Risk assessment generated successfully'
    });
  } catch (error) {
    logger.error('Error generating risk assessment', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to generate risk assessment'
    });
  }
});

// Get industry benchmarks
router.get('/benchmarks/:industry/:level', async (req, res) => {
  try {
    const { industry, level } = req.params;
    
    console.log(`📊 Fetching benchmarks for ${sanitizeLog(industry)}, ${sanitizeLog(level)} level`);
    
    const benchmarks = await UserEngagementStats.getIndustryBenchmarks(industry, level);

    res.json({
      success: true,
      data: benchmarks
    });
  } catch (error) {
    console.error('❌ Error fetching industry benchmarks:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch industry benchmarks'
    });
  }
});

// Comprehensive dashboard data endpoint
router.get('/comprehensive/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    console.log(`🔄 Fetching comprehensive dashboard data for user ${sanitizeLog(userId)}`);
    
    // Fetch all dashboard data in parallel
    const [dashboardSummary, assessmentProgress, userRisks] = await Promise.all([
      UserEngagementStats.getDashboardSummary(userId),
      UserEngagementStats.getAssessmentProgress(userId, 5),
      UserEngagementStats.getUserRisks(userId)
    ]);

    if (!dashboardSummary) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get industry benchmarks if user has industry data
    let industryBenchmarks = [];
    if (dashboardSummary.industry && dashboardSummary.last_assessment_type) {
      industryBenchmarks = await UserEngagementStats.getIndustryBenchmarks(
        dashboardSummary.industry, 
        dashboardSummary.last_assessment_type
      );
    }

    res.json({
      success: true,
      data: {
        summary: dashboardSummary,
        progress: assessmentProgress,
        risks: userRisks,
        benchmarks: industryBenchmarks
      }
    });
  } catch (error) {
    console.error('❌ Error fetching comprehensive dashboard data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch comprehensive dashboard data'
    });
  }
});

export default router;
