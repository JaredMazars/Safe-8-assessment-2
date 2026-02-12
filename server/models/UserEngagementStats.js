import { getPool, sql } from '../config/database.js';

class UserEngagementStats {
  // Get user engagement statistics
  static async getUserStats(userId) {
    try {
      console.log('📈 Getting user stats for:', userId);
      const pool = await getPool();
      const result = await pool.request()
        .input('userId', sql.Int, userId)
        .query(`
          SELECT 
            l.id as user_id,
            l.contact_name,
            l.email,
            l.company_name,
            l.industry,
            l.job_title,
            (SELECT COUNT(*) FROM assessments WHERE lead_id = @userId) as total_assessments,
            (SELECT AVG(CAST(overall_score AS FLOAT)) FROM assessments WHERE lead_id = @userId) as average_score
          FROM leads l
          WHERE l.id = @userId
        `);
      
      return result.recordset[0] || null;
    } catch (error) {
      console.error('❌ Error getting user stats:', error);
      throw error;
    }
  }

  // Get dashboard summary for user
  static async getDashboardSummary(userId) {
    try {
      console.log('📊 Getting dashboard summary for user:', userId);
      const pool = await getPool();
      
      // Get user info and calculated stats from assessments
      const result = await pool.request()
        .input('userId', sql.Int, userId)
        .query(`
          SELECT 
            l.id as user_id,
            l.contact_name,
            l.email,
            l.company_name,
            l.industry,
            l.job_title,
            -- Calculate total assessments
            (SELECT COUNT(*) FROM assessments WHERE lead_id = @userId) as totalAssessments,
            -- Calculate average score
            (SELECT AVG(CAST(overall_score AS FLOAT)) FROM assessments WHERE lead_id = @userId) as averageScore,
            -- Get last assessment date
            (SELECT MAX(completed_at) FROM assessments WHERE lead_id = @userId) as lastAssessmentDate,
            -- Calculate completion rate (100% since all are completed)
            100 as completionRate,
            -- Days since last assessment
            DATEDIFF(day, (SELECT MAX(completed_at) FROM assessments WHERE lead_id = @userId), GETDATE()) as daysSinceLastAssessment
          FROM leads l
          WHERE l.id = @userId
        `);
      
      const userData = result.recordset[0];
      
      if (!userData) {
        console.log('❌ User not found:', userId);
        return null;
      }
      
      console.log('✅ Dashboard data retrieved:', userData);
      return userData;
    } catch (error) {
      console.error('❌ Error getting dashboard summary:', error);
      console.error('Error details:', error.message);
      throw error;
    }
  }

  // Update user engagement stats
  static async updateUserStats(userId) {
    try {
      const pool = await getPool();
      await pool.request()
        .input('userId', sql.Int, userId)
        .execute('sp_UpdateUserEngagementStats');
      
      return { success: true };
    } catch (error) {
      console.error('Error updating user stats:', error);
      throw error;
    }
  }

  // Get assessment performance tracking
  static async getAssessmentProgress(userId, limit = 10) {
    try {
      const pool = await getPool();
      const result = await pool.request()
        .input('userId', sql.Int, userId)
        .input('limit', sql.Int, limit)
        .query(`
          SELECT TOP(@limit)
            apt.user_id,
            apt.assessment_id,
            a.assessment_type,
            a.completed_at,
            apt.pillar_name,
            apt.pillar_score,
            apt.improvement_from_previous,
            apt.industry_percentile,
            apt.best_practice_gap,
            apt.risk_level,
            a.overall_score
          FROM assessment_performance_tracking apt
          INNER JOIN assessments a ON apt.assessment_id = a.id
          WHERE apt.user_id = @userId
          ORDER BY a.completed_at DESC
        `);
      
      return result.recordset;
    } catch (error) {
      console.error('Error getting assessment progress:', error);
      throw error;
    }
  }

  // Create or update performance tracking for assessment
  static async createPerformanceTracking(userId, assessmentId, dimensionScores) {
    try {
      const pool = await getPool();
      
      // First, delete any existing tracking for this assessment
      await pool.request()
        .input('userId', sql.Int, userId)
        .input('assessmentId', sql.Int, assessmentId)
        .query(`
          DELETE FROM assessment_performance_tracking 
          WHERE user_id = @userId AND assessment_id = @assessmentId
        `);

      // Insert new tracking records for each dimension
      for (const dimension of dimensionScores) {
        await pool.request()
          .input('userId', sql.Int, userId)
          .input('assessmentId', sql.Int, assessmentId)
          .input('pillarName', sql.VarChar, dimension.pillar_name)
          .input('pillarScore', sql.Decimal(5,2), dimension.score)
          .input('industryPercentile', sql.Decimal(5,2), dimension.industry_percentile || 50)
          .input('bestPracticeGap', sql.Decimal(5,2), Math.max(0, 85 - dimension.score))
          .input('riskLevel', sql.VarChar, dimension.score < 40 ? 'critical' : 
                                          dimension.score < 60 ? 'high' : 
                                          dimension.score < 75 ? 'medium' : 'low')
          .query(`
            INSERT INTO assessment_performance_tracking 
            (user_id, assessment_id, pillar_name, pillar_score, industry_percentile, 
             best_practice_gap, risk_level)
            VALUES (@userId, @assessmentId, @pillarName, @pillarScore, @industryPercentile,
                    @bestPracticeGap, @riskLevel)
          `);
      }

      return { success: true };
    } catch (error) {
      console.error('Error creating performance tracking:', error);
      throw error;
    }
  }

  // Get user risk assessments
  static async getUserRisks(userId, assessmentId = null) {
    try {
      const pool = await getPool();
      let query = `
        SELECT 
          ura.*,
          a.assessment_type,
          a.completed_at
        FROM user_risk_assessments ura
        INNER JOIN assessments a ON ura.assessment_id = a.id
        WHERE ura.user_id = @userId
      `;
      
      const request = pool.request().input('userId', sql.Int, userId);
      
      if (assessmentId) {
        query += ' AND ura.assessment_id = @assessmentId';
        request.input('assessmentId', sql.Int, assessmentId);
      }
      
      query += ' ORDER BY ura.mitigation_priority, ura.risk_score DESC';
      
      const result = await request.query(query);
      return result.recordset;
    } catch (error) {
      console.error('Error getting user risks:', error);
      throw error;
    }
  }

  // Generate risk assessment for an assessment
  static async generateRiskAssessment(userId, assessmentId) {
    try {
      const pool = await getPool();
      await pool.request()
        .input('userId', sql.Int, userId)
        .input('assessmentId', sql.Int, assessmentId)
        .execute('sp_GenerateRiskAssessment');
      
      return { success: true };
    } catch (error) {
      console.error('Error generating risk assessment:', error);
      throw error;
    }
  }

  // Get industry benchmarks
  static async getIndustryBenchmarks(industry, assessmentLevel) {
    try {
      const pool = await getPool();
      const result = await pool.request()
        .input('industry', sql.VarChar, industry)
        .input('assessmentLevel', sql.VarChar, assessmentLevel)
        .query(`
          SELECT * FROM industry_benchmarks 
          WHERE industry = @industry AND assessment_level = @assessmentLevel
          ORDER BY pillar_name
        `);
      
      return result.recordset;
    } catch (error) {
      console.error('Error getting industry benchmarks:', error);
      throw error;
    }
  }
}

export default UserEngagementStats;
