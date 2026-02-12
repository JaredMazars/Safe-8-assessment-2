import express from 'express';
import UserEngagementStats from '../models/UserEngagementStats.js';

const router = express.Router();

// Get user dashboard summary
router.get('/dashboard/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    console.log(`📊 Fetching dashboard summary for user ${userId}`);
    
    const dashboardData = await UserEngagementStats.getDashboardSummary(userId);
    
    if (!dashboardData) {
      console.log(`❌ No dashboard data found for user ${userId}`);
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    console.log('✅ Dashboard data retrieved successfully');
    res.json({
      success: true,
      data: dashboardData
    });
  } catch (error) {
    console.error('❌ Error fetching dashboard summary:', error);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard summary',
      error: error.message
    });
  }
});

// Get user engagement statistics
router.get('/stats/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    console.log(`📈 Fetching user stats for user ${userId}`);
    
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
    console.error('❌ Error fetching user stats:', error);
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
    
    console.log(`📋 Fetching assessment progress for user ${userId}`);
    
    const progress = await UserEngagementStats.getAssessmentProgress(userId, limit ? parseInt(limit) : 10);

    res.json({
      success: true,
      data: progress
    });
  } catch (error) {
    console.error('❌ Error fetching assessment progress:', error);
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
    
    console.log(`🔄 Updating stats for user ${userId} with assessment data:`, {
      assessment_type,
      overall_score,
      industry
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
    console.error('❌ Error updating user stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user statistics',
      error: error.message
    });
  }
});

// Create performance tracking for assessment
router.post('/performance-tracking', async (req, res) => {
  try {
    const { userId, assessmentId, dimensionScores } = req.body;
    
    console.log(`📊 Creating performance tracking for user ${userId}, assessment ${assessmentId}`);
    
    await UserEngagementStats.createPerformanceTracking(userId, assessmentId, dimensionScores);

    res.json({
      success: true,
      message: 'Performance tracking created successfully'
    });
  } catch (error) {
    console.error('❌ Error creating performance tracking:', error);
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
    
    console.log(`⚠️ Fetching risks for user ${userId}${assessmentId ? `, assessment ${assessmentId}` : ''}`);
    
    const risks = await UserEngagementStats.getUserRisks(userId, assessmentId);

    res.json({
      success: true,
      data: risks
    });
  } catch (error) {
    console.error('❌ Error fetching user risks:', error);
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
    
    console.log(`🎯 Generating risk assessment for user ${userId}, assessment ${assessmentId}`);
    
    await UserEngagementStats.generateRiskAssessment(userId, assessmentId);

    res.json({
      success: true,
      message: 'Risk assessment generated successfully'
    });
  } catch (error) {
    console.error('❌ Error generating risk assessment:', error);
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
    
    console.log(`📊 Fetching benchmarks for ${industry}, ${level} level`);
    
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
    
    console.log(`🔄 Fetching comprehensive dashboard data for user ${userId}`);
    
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
