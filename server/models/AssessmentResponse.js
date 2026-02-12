import database from "../config/database.js";

class AssessmentResponse {
  // Create new response
  static async create(responseData) {
    const { lead_user_id, question_id, response_value } = responseData;
    
    const sql = `
      INSERT INTO assessment_responses (lead_user_id, question_id, response_value)
      OUTPUT INSERTED.id
      VALUES (?, ?, ?);
    `;

    try {
      const result = await database.query(sql, [lead_user_id, question_id, response_value]);
      return { 
        success: true, 
        responseId: result.recordset[0]?.id 
      };
    } catch (error) {
      console.error('Error creating assessment response:', error);
      return { success: false, error: error.message };
    }
  }

  // Update or Create response (MERGE pattern)
  static async updateOrCreate(responseData) {
    const { lead_user_id, question_id, response_value } = responseData;
    
    // First check if response exists
    const existingResponse = await this.getByUserAndQuestion(lead_user_id, question_id);
    
    if (existingResponse) {
      // Update existing response
      const sql = `
        UPDATE assessment_responses 
        SET response_value = ?, updated_at = GETDATE()
        WHERE lead_user_id = ? AND question_id = ?;
      `;
      
      try {
        await database.query(sql, [response_value, lead_user_id, question_id]);
        return { 
          success: true, 
          responseId: existingResponse.id,
          isNew: false
        };
      } catch (error) {
        console.error('Error updating response:', error);
        return { success: false, error: error.message };
      }
    } else {
      // Create new response
      const createResult = await this.create(responseData);
      if (createResult.success) {
        return { 
          ...createResult, 
          isNew: true 
        };
      }
      return createResult;
    }
  }

  // Get response by user and question
  static async getByUserAndQuestion(lead_user_id, question_id) {
    const sql = `
      SELECT * FROM assessment_responses 
      WHERE lead_user_id = ? AND question_id = ?;
    `;

    try {
      const result = await database.query(sql, [lead_user_id, question_id]);
      return result.recordset[0] || null;
    } catch (error) {
      console.error('Error getting response:', error);
      return null;
    }
  }

  // Get all responses for a user
  static async getByUserId(lead_user_id) {
    const sql = `
      SELECT ar.*, aq.question_text, aq.pillar_name
      FROM assessment_responses ar
      INNER JOIN assessment_questions aq ON ar.question_id = aq.id
      WHERE ar.lead_user_id = ?
      ORDER BY aq.question_order;
    `;

    try {
      const result = await database.query(sql, [lead_user_id]);
      return result;
    } catch (error) {
      console.error('Error getting user responses:', error);
      return [];
    }
  }

  // Get responses for a specific assessment session
  static async getByUserAndType(lead_user_id, assessment_type) {
    const sql = `
      SELECT ar.*, aq.question_text, aq.pillar_name, aq.question_order
      FROM assessment_responses ar
      INNER JOIN assessment_questions aq ON ar.question_id = aq.id
      WHERE ar.lead_user_id = ? AND aq.assessment_type = ?
      ORDER BY aq.question_order;
    `;

    try {
      const result = await database.query(sql, [lead_user_id, assessment_type.toUpperCase()]);
      return result;
    } catch (error) {
      console.error('Error getting user assessment responses:', error);
      return [];
    }
  }

  // Calculate assessment score for a user
  static async calculateScore(lead_user_id, assessment_type) {
    const sql = `
      SELECT 
        COUNT(*) as total_questions,
        COUNT(ar.response_value) as answered_questions,
        AVG(CAST(ar.response_value AS FLOAT)) as avg_score,
        SUM(ar.response_value) as total_score
      FROM assessment_questions aq
      LEFT JOIN assessment_responses ar ON aq.id = ar.question_id AND ar.lead_user_id = ?
      WHERE aq.assessment_type = ?;
    `;

    try {
      const result = await database.query(sql, [lead_user_id, assessment_type.toUpperCase()]);
      const stats = result[0];
      
      if (stats.answered_questions === 0) {
        return { 
          score: 0, 
          completion_rate: 0,
          total_questions: stats.total_questions,
          answered_questions: 0
        };
      }

      const score = Math.round((stats.avg_score / 5) * 100);
      const completion_rate = Math.round((stats.answered_questions / stats.total_questions) * 100);

      return {
        score,
        completion_rate,
        total_questions: stats.total_questions,
        answered_questions: stats.answered_questions,
        raw_average: stats.avg_score
      };
    } catch (error) {
      console.error('Error calculating assessment score:', error);
      return { score: 0, completion_rate: 0, total_questions: 0, answered_questions: 0 };
    }
  }

  // Delete all responses for a user (for retaking assessment)
  static async deleteByUserId(lead_user_id, assessment_type = null) {
    let sql;
    let params;

    if (assessment_type) {
      sql = `DELETE FROM assessment_responses 
             WHERE lead_user_id = ? 
             AND question_id IN (
               SELECT id FROM assessment_questions WHERE assessment_type = ?
             )`;
      params = [lead_user_id, assessment_type.toUpperCase()];
    } else {
      sql = `DELETE FROM assessment_responses WHERE lead_user_id = ?`;
      params = [lead_user_id];
    }

    try {
      await database.query(sql, params);
      return { success: true };
    } catch (error) {
      console.error('Error deleting assessment responses:', error);
      return { success: false, error: error.message };
    }
  }

  // Get global average score across all completed assessments
  static async getGlobalAverage() {
    const sql = `SELECT AVG(overall_score) as avg_score FROM assessments WHERE overall_score IS NOT NULL`;

    try {
      const result = await database.query(sql);
      const avgScore = Array.isArray(result) ? result[0]?.avg_score : result.recordset[0]?.avg_score;
      
      return { 
        success: true, 
        average: avgScore ? parseFloat(avgScore.toFixed(1)) : 0
      };
    } catch (error) {
      console.error('Error getting global average:', error);
      return { success: false, average: 0, error: error.message };
    }
  }
}

export default AssessmentResponse;
