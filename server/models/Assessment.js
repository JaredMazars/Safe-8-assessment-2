import database from "../config/database.js";

class Assessment {
  // Create a new assessment record with final results
  static async create(assessmentData) {
    const {
      lead_id,
      assessment_type,
      industry,
      overall_score,
      dimension_scores,
      responses,
      insights
    } = assessmentData;

    const sql = `
      INSERT INTO assessments (
        lead_id, assessment_type, industry, overall_score, 
        dimension_scores, responses, insights, completed_at
      ) OUTPUT INSERTED.id
      VALUES (?, ?, ?, ?, ?, ?, ?, GETDATE());
    `;

    try {
      const result = await database.query(sql, [
        lead_id,
        assessment_type.toUpperCase(),
        industry,
        overall_score,
        JSON.stringify(dimension_scores),
        JSON.stringify(responses),
        JSON.stringify(insights)
      ]);
      
      return { 
        success: true, 
        assessmentId: result.recordset[0]?.id,
        message: 'Assessment saved successfully'
      };
    } catch (error) {
      console.error('Error creating assessment:', error);
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  // Update or Create assessment
  static async updateOrCreate(assessmentData) {
    const { lead_id, assessment_type, industry } = assessmentData;
    
    // First check if assessment exists for this user, type, and industry
    const existingAssessment = await this.getByUserTypeAndIndustry(lead_id, assessment_type, industry);
    
    if (existingAssessment) {
      // Update existing assessment
      const sql = `
        UPDATE assessments 
        SET overall_score = ?, 
            dimension_scores = ?, 
            responses = ?, 
            insights = ?,
            completed_at = GETDATE()
        WHERE id = ?;
      `;
      
      try {
        await database.query(sql, [
          assessmentData.overall_score,
          JSON.stringify(assessmentData.dimension_scores),
          JSON.stringify(assessmentData.responses),
          JSON.stringify(assessmentData.insights),
          existingAssessment.id
        ]);
        
        return { 
          success: true, 
          assessmentId: existingAssessment.id,
          isNew: false,
          message: 'Assessment updated successfully'
        };
      } catch (error) {
        console.error('Error updating assessment:', error);
        return { success: false, error: error.message };
      }
    } else {
      // Create new assessment
      const createResult = await this.create(assessmentData);
      if (createResult.success) {
        return { 
          ...createResult, 
          isNew: true 
        };
      }
      return createResult;
    }
  }

  // Get assessment by user, type, and industry
  static async getByUserTypeAndIndustry(lead_id, assessment_type, industry) {
    const sql = `
      SELECT * FROM assessments 
      WHERE lead_id = ? AND assessment_type = ? AND industry = ?
      ORDER BY completed_at DESC;
    `;

    try {
      const result = await database.query(sql, [lead_id, assessment_type.toUpperCase(), industry]);
      if (result.recordset && result.recordset.length > 0) {
        const assessment = result.recordset[0];
        return {
          ...assessment,
          dimension_scores: JSON.parse(assessment.dimension_scores || '{}'),
          responses: JSON.parse(assessment.responses || '{}')
        };
      }
      return null;
    } catch (error) {
      console.error('Error getting assessment:', error);
      return null;
    }
  }

  // Get assessment by ID
  static async getById(assessmentId) {
    const sql = `
      SELECT a.*, l.contact_name, l.email, l.company_name
      FROM assessments a
      INNER JOIN leads l ON a.lead_id = l.id
      WHERE a.id = ?;
    `;

    try {
      const result = await database.query(sql, [assessmentId]);
      if (result.length > 0) {
        const assessment = result[0];
        return {
          ...assessment,
          dimension_scores: JSON.parse(assessment.dimension_scores),
          responses: JSON.parse(assessment.responses)
        };
      }
      return null;
    } catch (error) {
      console.error('Error getting assessment:', error);
      return null;
    }
  }

  // Get all assessments for a user
  static async getByUserId(lead_id) {
    const sql = `
      SELECT * FROM assessments 
      WHERE lead_id = ? 
      ORDER BY completed_at DESC;
    `;

    try {
      const result = await database.query(sql, [lead_id]);
      return result.map(assessment => ({
        ...assessment,
        dimension_scores: JSON.parse(assessment.dimension_scores),
        responses: JSON.parse(assessment.responses)
      }));
    } catch (error) {
      console.error('Error getting user assessments:', error);
      return [];
    }
  }

  // ==================== LEGACY METHODS (BACKUP) ====================
  // Original equal-weight calculation methods preserved for potential reversion

  // LEGACY: Calculate dimension scores from responses (equal weight)
  static async calculateDimensionScores_LEGACY(lead_user_id, assessment_type) {
    const sql = `
      SELECT 
        aq.pillar_name,
        aq.pillar_short_name,
        COUNT(*) as total_questions,
        COUNT(ar.response_value) as answered_questions,
        AVG(CAST(ar.response_value AS FLOAT)) as avg_score,
        MIN(ar.response_value) as min_score,
        MAX(ar.response_value) as max_score
      FROM assessment_questions aq
      LEFT JOIN assessment_responses ar ON aq.id = ar.question_id AND ar.lead_user_id = ?
      WHERE aq.assessment_type = ?
      GROUP BY aq.pillar_name, aq.pillar_short_name
      ORDER BY aq.pillar_name;
    `;

    try {
      const result = await database.query(sql, [lead_user_id, assessment_type.toUpperCase()]);
      
      return result.map(pillar => ({
        pillar_name: pillar.pillar_name,
        pillar_short_name: pillar.pillar_short_name,
        total_questions: pillar.total_questions,
        answered_questions: pillar.answered_questions,
        score: pillar.answered_questions > 0 ? Math.round((pillar.avg_score / 5) * 100) : 0,
        raw_average: pillar.avg_score,
        min_score: pillar.min_score,
        max_score: pillar.max_score,
        completion_rate: Math.round((pillar.answered_questions / pillar.total_questions) * 100)
      }));
    } catch (error) {
      console.error('Error calculating dimension scores (LEGACY):', error);
      return [];
    }
  }

  // LEGACY: Generate insights based on assessment results (binary thresholds)
  static generateInsights_LEGACY(overall_score, dimension_scores) {
    const insights = {
      overall_assessment: '',
      strengths: [],
      improvement_areas: [],
      recommendations: []
    };

    // Overall assessment
    if (overall_score >= 80) {
      insights.overall_assessment = 'Your organization demonstrates advanced AI readiness with strong foundations across most dimensions.';
    } else if (overall_score >= 60) {
      insights.overall_assessment = 'Your organization shows good AI readiness with solid foundations and clear opportunities for enhancement.';
    } else if (overall_score >= 40) {
      insights.overall_assessment = 'Your organization has emerging AI capabilities with significant potential for development.';
    } else {
      insights.overall_assessment = 'Your organization is in the early stages of AI readiness with substantial opportunities for growth.';
    }

    // Identify strengths (scores >= 70)
    dimension_scores.forEach(dimension => {
      if (dimension.score >= 70) {
        insights.strengths.push({
          area: dimension.pillar_name,
          score: dimension.score,
          description: `Strong performance in ${dimension.pillar_name.toLowerCase()}`
        });
      }
    });

    // Identify improvement areas (scores < 60)
    dimension_scores.forEach(dimension => {
      if (dimension.score < 60) {
        insights.improvement_areas.push({
          area: dimension.pillar_name,
          score: dimension.score,
          priority: dimension.score < 40 ? 'High' : 'Medium',
          description: `${dimension.pillar_name} requires focused attention`
        });
      }
    });

    // Generate recommendations
    if (overall_score < 50) {
      insights.recommendations.push('Focus on building foundational AI capabilities and governance');
      insights.recommendations.push('Develop a comprehensive AI strategy aligned with business objectives');
    }
    
    if (dimension_scores.some(d => d.pillar_short_name === 'DATA' && d.score < 60)) {
      insights.recommendations.push('Invest in data quality and governance infrastructure');
    }
    
    if (dimension_scores.some(d => d.pillar_short_name === 'SECURITY' && d.score < 70)) {
      insights.recommendations.push('Strengthen security and compliance frameworks for AI');
    }

    insights.recommendations.push('Consider engaging AI readiness experts for detailed transformation planning');

    return insights;
  }

  // ==================== NEW WEIGHTED METHODS ====================

  // Calculate dimension scores (with optional weighting)
  static async calculateDimensionScores(lead_user_id, assessment_type, applyWeights = false) {
    const sql = `
      SELECT 
        aq.pillar_name,
        aq.pillar_short_name,
        COUNT(*) as total_questions,
        COUNT(ar.response_value) as answered_questions,
        AVG(CAST(ar.response_value AS FLOAT)) as avg_score,
        MIN(ar.response_value) as min_score,
        MAX(ar.response_value) as max_score
      FROM assessment_questions aq
      LEFT JOIN assessment_responses ar ON aq.id = ar.question_id AND ar.lead_user_id = ?
      WHERE aq.assessment_type = ?
      GROUP BY aq.pillar_name, aq.pillar_short_name
      ORDER BY aq.pillar_name;
    `;

    try {
      const result = await database.query(sql, [lead_user_id, assessment_type.toUpperCase()]);
      
      // database.query returns full result object when params are used
      const resultSet = result.recordset || result;
      
      const dimensionScores = resultSet.map(pillar => ({
        pillar_name: pillar.pillar_name,
        pillar_short_name: pillar.pillar_short_name,
        total_questions: pillar.total_questions,
        answered_questions: pillar.answered_questions,
        score: pillar.answered_questions > 0 ? Math.round((pillar.avg_score / 5) * 100) : 0,
        raw_average: pillar.avg_score,
        min_score: pillar.min_score,
        max_score: pillar.max_score,
        completion_rate: Math.round((pillar.answered_questions / pillar.total_questions) * 100)
      }));

      // Apply weights if requested
      if (applyWeights) {
        const weights = await this.getPillarWeights(assessment_type);
        return dimensionScores.map(dim => ({
          ...dim,
          weight: weights[dim.pillar_short_name] || 12.5
        }));
      }

      return dimensionScores;
    } catch (error) {
      console.error('Error calculating dimension scores:', error);
      return [];
    }
  }

  // Get pillar weights for assessment type
  static async getPillarWeights(assessment_type) {
    const sql = `
      SELECT pillar_short_name, weight_percentage
      FROM pillar_weights
      WHERE assessment_type = ?
    `;

    try {
      const result = await database.query(sql, [assessment_type.toUpperCase()]);
      
      // database.query returns full result object when params are used
      const resultSet = result.recordset || result;
      
      if (resultSet.length === 0) {
        // No custom weights - use equal distribution
        const pillarsSql = `
          SELECT pillar_short_name, default_weight
          FROM pillars
          WHERE assessment_type = ?
        `;
        const pillarsResult = await database.query(pillarsSql, [assessment_type.toUpperCase()]);
        
        const pillarsResultSet = pillarsResult.recordset || pillarsResult;
        
        const weights = {};
        pillarsResultSet.forEach(p => {
          weights[p.pillar_short_name] = p.default_weight || 12.5;
        });
        return weights;
      }

      // Return custom weights
      const weights = {};
      resultSet.forEach(row => {
        weights[row.pillar_short_name] = parseFloat(row.weight_percentage);
      });
      return weights;
    } catch (error) {
      console.error('Error fetching pillar weights:', error);
      // Fallback to equal weights
      return {};
    }
  }

  // Calculate weighted overall score
  static async calculateWeightedScore(lead_user_id, assessment_type) {
    try {
      const dimensionScores = await this.calculateDimensionScores(lead_user_id, assessment_type, false);
      const weights = await this.getPillarWeights(assessment_type);

      let weightedSum = 0;
      let totalWeight = 0;

      dimensionScores.forEach(dimension => {
        const weight = weights[dimension.pillar_short_name] || 12.5;
        weightedSum += dimension.score * (weight / 100);
        totalWeight += weight;
      });

      // Normalize if weights don't sum to 100
      const overall_score = totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 100) : 0;

      return {
        overall_score,
        dimension_scores: dimensionScores.map(dim => ({
          ...dim,
          weight: weights[dim.pillar_short_name] || 12.5,
          weighted_contribution: Math.round(dim.score * (weights[dim.pillar_short_name] || 12.5) / 100)
        })),
        weights_applied: Object.keys(weights).length > 0
      };
    } catch (error) {
      console.error('Error calculating weighted score:', error);
      // Fallback to simple average
      const dimensionScores = await this.calculateDimensionScores(lead_user_id, assessment_type, false);
      const overall_score = dimensionScores.length > 0
        ? Math.round(dimensionScores.reduce((sum, d) => sum + d.score, 0) / dimensionScores.length)
        : 0;
      
      return { overall_score, dimension_scores: dimensionScores, weights_applied: false };
    }
  }

  // Generate insights with weighted priorities
  static generateInsights(overall_score, dimension_scores, assessment_type = null) {
    const insights = {
      overall_assessment: '',
      strengths: [],
      improvement_areas: [],
      weighted_priorities: [],
      critical_impact_areas: [],
      recommendations: []
    };

    // Overall assessment
    if (overall_score >= 80) {
      insights.overall_assessment = 'Excellent AI maturity with strong capabilities across dimensions';
    } else if (overall_score >= 60) {
      insights.overall_assessment = 'Good AI maturity with opportunities for strategic enhancement';
    } else if (overall_score >= 40) {
      insights.overall_assessment = 'Developing AI maturity with clear areas for improvement';
    } else {
      insights.overall_assessment = 'Early-stage AI maturity requiring foundational development';
    }

    // Identify strengths (score >= 70)
    dimension_scores.forEach(dimension => {
      if (dimension.score >= 70) {
        insights.strengths.push({
          area: dimension.pillar_name,
          score: dimension.score,
          weight: dimension.weight || 12.5,
          description: `Strong performance in ${dimension.pillar_name}`
        });
      }
    });

    // Calculate impact scores for prioritization
    const impactScores = dimension_scores.map(dimension => {
      const weight = dimension.weight || 12.5;
      const gap = 100 - dimension.score;
      const impactScore = gap * (weight / 100);
      
      return {
        area: dimension.pillar_name,
        pillar_short_name: dimension.pillar_short_name,
        score: dimension.score,
        weight,
        gap,
        impact_score: impactScore,
        priority: impactScore > 15 ? 'Critical' : impactScore > 8 ? 'High' : impactScore > 4 ? 'Medium' : 'Low'
      };
    });

    // Sort by impact score (descending)
    impactScores.sort((a, b) => b.impact_score - a.impact_score);

    // Top 3 weighted priorities
    insights.weighted_priorities = impactScores.slice(0, 3).map(item => ({
      area: item.area,
      score: item.score,
      weight: item.weight,
      impact_score: Math.round(item.impact_score * 10) / 10,
      priority: item.priority,
      description: `${item.area} (${item.weight}% weight) has ${item.gap}% improvement potential`
    }));

    // Critical impact areas (impact score > 15)
    insights.critical_impact_areas = impactScores
      .filter(item => item.impact_score > 15)
      .map(item => ({
        area: item.area,
        score: item.score,
        weight: item.weight,
        impact_score: Math.round(item.impact_score * 10) / 10,
        description: `High-impact improvement needed in ${item.area}`
      }));

    // Improvement areas (score < 60)
    dimension_scores.forEach(dimension => {
      if (dimension.score < 60) {
        const weight = dimension.weight || 12.5;
        insights.improvement_areas.push({
          area: dimension.pillar_name,
          score: dimension.score,
          weight,
          priority: dimension.score < 40 ? 'High' : 'Medium',
          description: `${dimension.pillar_name} requires focused attention`
        });
      }
    });

    // Weighted recommendations
    if (overall_score < 50) {
      insights.recommendations.push('Focus on building foundational AI capabilities and governance');
      insights.recommendations.push('Develop a comprehensive AI strategy aligned with business objectives');
    }

    // Top priority recommendation
    if (impactScores.length > 0 && impactScores[0].impact_score > 12) {
      const topPriority = impactScores[0];
      insights.recommendations.push(
        `Prioritize improvements in ${topPriority.area} - highest impact opportunity (${topPriority.weight}% of overall score)`
      );
    }

    // Specific pillar recommendations
    if (dimension_scores.some(d => d.pillar_short_name === 'DATA' && d.score < 60)) {
      insights.recommendations.push('Invest in data quality and governance infrastructure');
    }
    
    if (dimension_scores.some(d => d.pillar_short_name === 'SECURITY' && d.score < 70)) {
      insights.recommendations.push('Strengthen security and compliance frameworks for AI');
    }

    if (dimension_scores.some(d => d.pillar_short_name === 'STRATEGY' && d.score < 60)) {
      insights.recommendations.push('Develop clear AI strategy and vision aligned with business goals');
    }

    insights.recommendations.push('Consider engaging AI readiness experts for detailed transformation planning');

    return insights;
  }
}


export default Assessment;
