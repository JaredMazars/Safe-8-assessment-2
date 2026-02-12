import { Router } from 'express';
import sql from 'mssql';
import database from '../config/database.js';
import Assessment from '../models/Assessment.js';
import UserActivity from '../models/UserActivity.js';
import logger from '../utils/logger.js';
import { cache, cacheMiddleware } from '../config/redis.js';
import { doubleCsrfProtection } from '../middleware/csrf.js';

const assessmentRouter = Router();

// Enhanced assessment submission with complete data capture (NO CSRF - Phase 2: Frontend integration pending)
assessmentRouter.post('/submit-complete', async (req, res) => {
  try {
    logger.info('Complete assessment submission received', { leadId: req.body.lead_id });
    logger.debug('Assessment data received', { type: req.body.assessment_type });
    
    const {
      lead_id,
      assessment_type,
      industry,
      overall_score,
      responses,
      pillar_scores,
      risk_assessment,
      service_recommendations,
      gap_analysis,
      completion_time_ms,
      metadata
    } = req.body;

    // Validate required fields
    if (!lead_id || !assessment_type) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: lead_id or assessment_type'
      });
    }

    // Calculate weighted score using new method
    const weightedResult = await Assessment.calculateWeightedScore(lead_id, assessment_type);
    const { overall_score: calculated_score, dimension_scores, weights_applied } = weightedResult;

    // Use calculated score or fallback to provided score
    const final_overall_score = calculated_score || parseFloat(overall_score) || 0;

    // Generate enhanced insights with weighted priorities
    const enhancedInsights = Assessment.generateInsights(
      final_overall_score, 
      dimension_scores, 
      assessment_type
    );

    // Prepare assessment data
    const assessmentData = {
      lead_id: parseInt(lead_id),
      assessment_type: assessment_type.toUpperCase(),
      industry: industry || 'Unknown',
      overall_score: final_overall_score,
      dimension_scores: dimension_scores || pillar_scores || [],
      responses: responses || {},
      insights: {
        ...enhancedInsights,
        score_category: final_overall_score >= 80 ? 'AI Leader' : 
                       final_overall_score >= 60 ? 'AI Adopter' : 
                       final_overall_score >= 40 ? 'AI Explorer' : 'AI Starter',
        completion_date: new Date().toISOString(),
        total_score: final_overall_score,
        completion_time_ms: completion_time_ms || 0,
        weights_applied,
        risk_assessment: risk_assessment || [],
        service_recommendations: service_recommendations || [],
        gap_analysis: gap_analysis || [],
        industry_benchmark: getBenchmarkForIndustry(industry),
        metadata: metadata || {}
      }
    };

    /* LEGACY SUBMISSION LOGIC (BACKUP):
    const assessmentData = {
      lead_id: parseInt(lead_id),
      assessment_type: assessment_type.toUpperCase(),
      industry: industry || 'Unknown',
      overall_score: parseFloat(overall_score),
      dimension_scores: pillar_scores || [],
      responses: responses || {},
      insights: {
        score_category: overall_score >= 80 ? 'AI Leader' : 
                       overall_score >= 60 ? 'AI Adopter' : 
                       overall_score >= 40 ? 'AI Explorer' : 'AI Starter',
        completion_date: new Date().toISOString(),
        total_score: overall_score,
        completion_time_ms: completion_time_ms || 0,
        risk_assessment: risk_assessment || [],
        service_recommendations: service_recommendations || [],
        gap_analysis: gap_analysis || [],
        industry_benchmark: getBenchmarkForIndustry(industry),
        metadata: metadata || {}
      }
    };
    */

    // Use updateOrCreate to handle duplicate assessments
    const result = await Assessment.updateOrCreate(assessmentData);
    
    if (result.success) {
      console.log(`✅ Assessment ${result.isNew ? 'created' : 'updated'} successfully`);
      
      // Log user activity - both start and completion
      if (result.isNew) {
        // Log assessment start
        await UserActivity.log(
          parseInt(lead_id),
          'ASSESSMENT_START',
          'assessment',
          result.assessmentId,
          `Started ${assessment_type} assessment`,
          req.ip || req.connection.remoteAddress,
          req.headers['user-agent']
        );
      }
      
      // Log assessment completion/update
      await UserActivity.log(
        parseInt(lead_id),
        result.isNew ? 'ASSESSMENT_COMPLETE' : 'ASSESSMENT_UPDATE',
        'assessment',
        result.assessmentId,
        `Completed ${assessment_type} assessment with score ${overall_score.toFixed(1)}%`,
        req.ip || req.connection.remoteAddress,
        req.headers['user-agent']
      );
      
      res.json({
        success: true,
        assessment_id: result.assessmentId,
        isNew: result.isNew,
        dimension_scores: pillar_scores || [],
        insights: assessmentData.insights,
        message: result.message
      });
    } else {
      res.status(500).json(result);
    }

  } catch (error) {
    console.error('❌ Error submitting assessment:', error);
    console.error('❌ Error stack:', error.stack);
    console.error('❌ Error message:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to submit assessment',
      error: error.message,
      details: error.stack
    });
  }
});

// Get all assessments for a user with detailed information
// Get assessment history for a user with caching
assessmentRouter.get('/user/:userId/history', cacheMiddleware(180), async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10, filter } = req.query;
    
    console.log(`📋 Getting assessment history for user ${userId}, page ${page}`);
    
    // Build WHERE clause with parameterized queries
    let whereClause = `WHERE lead_id = ?`;
    let params = [parseInt(userId)];
    
    if (filter && filter !== 'all') {
      whereClause += ` AND assessment_type = ?`;
      params.push(filter.toUpperCase());
    }
    
    // Calculate offset for pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    // Get total count for pagination
    const countQuery = `SELECT COUNT(*) as total FROM assessments ${whereClause}`;
    const countResult = await database.query(countQuery, params);
    
    // Handle different result structures
    let totalCount;
    if (Array.isArray(countResult)) {
      totalCount = countResult[0]?.total || 0;
    } else if (countResult && countResult.recordset) {
      totalCount = countResult.recordset[0]?.total || 0;
    } else {
      totalCount = countResult?.total || 0;
    }
    
    console.log('📊 Total count for pagination:', totalCount);
    
    // Get assessments with pagination
    const historyQuery = `
      SELECT 
        id,
        assessment_type,
        industry,
        overall_score,
        completed_at,
        FORMAT(completed_at, 'MMMM dd, yyyy') as formatted_date,
        CASE 
          WHEN DATEDIFF(day, completed_at, GETDATE()) = 0 THEN 'Today'
          WHEN DATEDIFF(day, completed_at, GETDATE()) = 1 THEN '1 day ago'
          WHEN DATEDIFF(day, completed_at, GETDATE()) < 7 THEN CAST(DATEDIFF(day, completed_at, GETDATE()) AS VARCHAR) + ' days ago'
          WHEN DATEDIFF(day, completed_at, GETDATE()) < 30 THEN CAST(DATEDIFF(week, completed_at, GETDATE()) AS VARCHAR) + ' weeks ago'
          ELSE CAST(DATEDIFF(month, completed_at, GETDATE()) AS VARCHAR) + ' months ago'
        END as time_ago
      FROM assessments 
      ${whereClause}
      ORDER BY completed_at DESC
      OFFSET ? ROWS
      FETCH NEXT ? ROWS ONLY`;
    
    // Add pagination params to existing params array
    const paginationParams = [...params, offset, parseInt(limit)];
    const result = await database.query(historyQuery, paginationParams);
    
    // Handle different result structures
    let assessments;
    if (Array.isArray(result)) {
      assessments = result;
    } else if (result && result.recordset) {
      assessments = result.recordset;
    } else {
      assessments = [];
    }
    
    console.log(`📊 Retrieved ${assessments.length} assessments`);

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / parseInt(limit));

    res.json({
      assessments,
      pagination: {
        current_page: parseInt(page),
        total_pages: totalPages,
        total_count: totalCount,
        per_page: parseInt(limit),
        has_next: parseInt(page) < totalPages,
        has_prev: parseInt(page) > 1
      }
    });

    console.log(`✅ Assessment history retrieved: ${assessments.length} records`);

  } catch (error) {
    console.error('❌ Error fetching user assessment history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch assessment history',
      error: error.message
    });
  }
});

//  Get assessment summary statistics for dashboard
// Get assessment summary/statistics for a user with caching
assessmentRouter.get('/user/:userId/summary', cacheMiddleware(300), async (req, res) => {
  try {
    const { userId } = req.params;
    console.log(`📊 Getting assessment summary for user ${userId}`);
    
    const query = `
      SELECT 
        COUNT(*) as total_assessments,
        AVG(CAST(overall_score AS FLOAT)) as average_score,
        MAX(overall_score) as highest_score,
        MIN(overall_score) as lowest_score,
        MAX(completed_at) as latest_assessment_date,
        COUNT(CASE WHEN overall_score >= 80 THEN 1 END) as excellent_scores,
        COUNT(CASE WHEN overall_score >= 60 AND overall_score < 80 THEN 1 END) as good_scores,
        COUNT(CASE WHEN overall_score < 60 THEN 1 END) as needs_improvement_scores
      FROM assessments 
      WHERE lead_id = ${parseInt(userId)}`;
    
    const result = await database.query(query);
    console.log('📊 Query result structure:', result);
    
    // Handle different result structures from database query function
    let stats;
    if (Array.isArray(result)) {
      stats = result[0];
    } else if (result && result.recordset) {
      stats = result.recordset[0];
    } else {
      stats = result;
    }
    
    console.log('📊 Stats extracted:', stats);

    if (!stats) {
      console.log('⚠️ No stats found, returning empty summary');
      return res.json({
        total_assessments: 0,
        average_score: 0,
        highest_score: 0,
        lowest_score: 0,
        latest_assessment_date: null,
        score_distribution: {
          excellent: 0,
          good: 0,
          needs_improvement: 0
        },
        improvement_trend: {
          improvement_percentage: 0,
          trend_direction: 'stable'
        }
      });
    }

    const summary = {
      total_assessments: stats.total_assessments || 0,
      average_score: Math.round(stats.average_score || 0),
      highest_score: stats.highest_score || 0,
      lowest_score: stats.lowest_score || 0,
      latest_assessment_date: stats.latest_assessment_date,
      score_distribution: {
        excellent: stats.excellent_scores || 0,
        good: stats.good_scores || 0,
        needs_improvement: stats.needs_improvement_scores || 0
      },
      improvement_trend: {
        improvement_percentage: 0, // We'll calculate this separately if needed
        trend_direction: 'stable'
      }
    };

    console.log('✅ Assessment summary retrieved successfully:', summary);
    res.json(summary);

  } catch (error) {
    console.error('❌ Error fetching user assessment summary:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch assessment summary',
      error: error.message 
    });
  }
});

// Get specific assessment by ID with caching
assessmentRouter.get('/:assessmentId', cacheMiddleware(300), async (req, res) => {
  try {
    const { assessmentId } = req.params;
    console.log(`🔍 Getting assessment details for ID ${assessmentId}`);
    
    const query = `
      SELECT 
        a.*,
        l.contact_name,
        l.company_name,
        l.email
      FROM assessments a
      LEFT JOIN leads l ON a.lead_id = l.id
      WHERE a.id = ${parseInt(assessmentId)}`;

    const result = await database.query(query);

    // Handle different result structures
    let assessmentData;
    if (Array.isArray(result)) {
      assessmentData = result;
    } else if (result && result.recordset) {
      assessmentData = result.recordset;
    } else {
      assessmentData = [];
    }

    if (assessmentData.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Assessment not found'
      });
    }

    const assessment = assessmentData[0];
    
    const detailedAssessment = {
      id: assessment.id,
      assessment_type: assessment.assessment_type,
      industry: assessment.industry,
      overall_score: parseFloat(assessment.overall_score),
      dimension_scores: assessment.dimension_scores ? JSON.parse(assessment.dimension_scores) : [],
      responses: assessment.responses ? JSON.parse(assessment.responses) : {},
      insights: assessment.insights ? JSON.parse(assessment.insights) : {},
      completed_at: assessment.completed_at,
      user_info: {
        contact_name: assessment.contact_name,
        company_name: assessment.company_name,
        email: assessment.email
      }
    };

    res.json({
      success: true,
      data: detailedAssessment
    });

  } catch (error) {
    console.error('❌ Error fetching assessment details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch assessment details',
      error: error.message
    });
  }
});

// Helper functions
function getBenchmarkForIndustry(industry) {
  const benchmarks = {
    'technology': { average: 75, best_practice: 90 },
    'financial-services': { average: 65, best_practice: 85 },
    'healthcare': { average: 55, best_practice: 78 },
    'manufacturing': { average: 60, best_practice: 82 },
    'retail': { average: 62, best_practice: 80 },
    'default': { average: 60, best_practice: 80 }
  };
  
  const industryKey = industry?.toLowerCase().replace(/\s+/g, '-') || 'default';
  return benchmarks[industryKey] || benchmarks['default'];
}

function getTimeAgo(date) {
  const now = new Date();
  const assessmentDate = new Date(date);
  const diffInSeconds = Math.floor((now - assessmentDate) / 1000);
  
  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`;
  if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)} months ago`;
  return `${Math.floor(diffInSeconds / 31536000)} years ago`;
}

export default assessmentRouter;
