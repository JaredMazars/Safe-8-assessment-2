// models/Response.js
import database from "../config/database.js";
import logger from '../utils/logger.js';

class Response {
  // Create new response
  static async create(responseData) {
    const { leadUserId, questionId, responseValue } = responseData;
    
    const sql = `
      INSERT INTO assessment_responses (lead_user_id, question_id, response_value)
      OUTPUT INSERTED.id
      VALUES (?, ?, ?);
    `;

    try {
      const result = await database.query(sql, [leadUserId, questionId, responseValue]);
      return { 
        success: true, 
        responseId: result.recordset[0]?.id 
      };
    } catch (error) {
      logger.error('Error creating response', { error: error.message });
      return { success: false, error: 'Failed to save response' };
    }
  }

  // Update or Create response
  static async updateOrCreate(responseData) {
    const { leadUserId, questionId, responseValue } = responseData;
    
    // First check if response exists
    const existingResponse = await this.getByUserAndQuestion(leadUserId, questionId);
    
    if (existingResponse) {
      // Update existing response
      const sql = `
        UPDATE assessment_responses 
        SET response_value = ?, updated_at = GETDATE()
        WHERE lead_user_id = ? AND question_id = ?;
      `;
      
      try {
        await database.query(sql, [responseValue, leadUserId, questionId]);
        return { 
          success: true, 
          responseId: existingResponse.id,
          isNew: false
        };
      } catch (error) {
        logger.error('Error updating response', { error: error.message });
        return { success: false, error: 'Failed to update response' };
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
  static async getByUserAndQuestion(leadUserId, questionId) {
    const sql = `
      SELECT * FROM assessment_responses 
      WHERE lead_user_id = ? AND question_id = ?;
    `;

    try {
      const result = await database.query(sql, [leadUserId, questionId]);
      return result.recordset[0] || null;
    } catch (error) {
      logger.error('Error getting response', { error: error.message });
      return null;
    }
  }

    static async getAll() {
    const sql = `
        SELECT id, question_text, assessment_type, pillar_short_name as pillar_name, question_order, is_active
        FROM assessment_questions 
        ORDER BY assessment_type, pillar_short_name, question_order;
    `;

    try {
        const result = await database.query(sql);
        logger.debug('Questions loaded with SHORT pillar names');
        return result;
    } catch (error) {
        logger.error('Database query failed', { error: error.message });
        throw error;
    }
}

  static async getByUser(leadUserId) {
    // SECURITY FIX: use parameterized query — no string interpolation
    const sql = `
      SELECT ar.*, aq.question_text, aq.pillar_name, aq.assessment_type
      FROM assessment_responses ar
      JOIN assessment_questions aq ON ar.question_id = aq.id
      WHERE ar.lead_user_id = ?
      ORDER BY aq.pillar_name, aq.question_order;
    `;
    const result = await database.query(sql, [parseInt(leadUserId)]);
    return result.recordset;
  }


}

export default Response;
