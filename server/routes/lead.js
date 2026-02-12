import { Router } from 'express';
import Lead from '../models/Lead.js';
import Assessment from '../models/Assessment.js';
import UserActivity from '../models/UserActivity.js';
import database from '../config/database.js';
import { validateLeadForm, validateLeadLogin } from '../middleware/validation.js';
import { sendWelcomeEmail, sendPasswordResetEmail, sendAssessmentResults } from '../services/emailService.js';
import { generateAssessmentPDFBuffer } from '../services/pdfService.js';
import rateLimit from 'express-rate-limit';
import logger from '../utils/logger.js';
import { doubleCsrfProtection } from '../middleware/csrf.js';

// Rate limiter for password reset (3 attempts per hour)
const resetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: 'Too many password reset attempts. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many password reset attempts from this IP. Please try again in 1 hour.'
    });
  }
});

const leadRouter = Router();

// Test endpoint
leadRouter.get('/test', (req, res) => {
  logger.info('Lead router test endpoint accessed');
  res.json({ success: true, message: 'Lead router is working!' });
});

// Create a new lead
leadRouter.post('/create', async (req, res) => {
  logger.info('Lead creation request received', { email: req.body.email, company: req.body.companyName });
  
  try {
    const {
      contactName,
      jobTitle,
      email,
      phoneNumber,
      companyName,
      companySize,
      country,
      industry,
      password
    } = req.body;

    // Basic validation
    if (!contactName || !email || !companyName || !password) {
      logger.warn('Lead creation missing required fields', { hasName: !!contactName, hasEmail: !!email, hasCompany: !!companyName, hasPassword: !!password });
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: contactName, email, companyName, password'
      });
    }

    logger.info('Creating new lead', { contactName, email, companyName });

    // Use updateOrCreate to handle duplicate emails
    const result = await Lead.updateOrCreate({
      contactName,
      jobTitle,
      email,
      phoneNumber,
      companyName,
      companySize,
      country,
      industry,
      password
    });

    
    logger.info('Lead operation completed', { success: result.success, isNew: result.isNew, leadId: result.leadId });
    
    if (result.success) {
      // Send welcome email for new accounts
      if (result.isNew) {
        try {
          await sendWelcomeEmail({
            contact_name: contactName,
            email: email,
            company_name: companyName
          });
          logger.info('Welcome email sent', { email });
        } catch (emailError) {
          logger.warn('Welcome email failed (non-critical)', { error: emailError.message });
        }
      }
      
      return res.status(200).json({
        success: true,
        leadId: result.leadId,
        isNew: result.isNew,
        message: `Lead ${result.isNew ? 'created' : 'updated'} successfully`
      });
    } else {
      logger.error('Lead creation failed', { error: result.error });
      return res.status(500).json({
        success: false,
        message: 'Failed to create lead',
        error: result.error
      });
    }

  } catch (error) {
    logger.error('Error in lead creation', { message: error.message, stack: error.stack });
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get all leads
leadRouter.get('/', async (req, res) => {
  try {
    const leads = await Lead.getAll();
    logger.info('Retrieved leads', { count: leads.length });

    const transformedLeads = leads.map(lead => ({
      id: lead.id.toString(),
      contactName: lead.contact_name,
      jobTitle: lead.job_title,
      email: lead.email,
      phoneNumber: lead.phone_number,
      companyName: lead.company_name,
      companySize: lead.company_size,
      country: lead.country,
      industry: lead.industry,
      leadSource: lead.lead_source,
      createdAt: lead.created_at
    }));

    res.json({
      success: true,
      data: transformedLeads
    });
  } catch (error) {
    logger.error('Error fetching leads', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch leads',
      error: error.message
    });
  }
});

// Submit assessment (simplified for correct schema)
leadRouter.post('/submit-assessment', async (req, res) => {
  try {
    logger.info('Assessment submission received', { leadId: req.body.leadId });
    
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
    if (!lead_id || !assessment_type || overall_score === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: lead_id, assessment_type, or overall_score'
      });
    }

    // Verify lead exists in leads table
    const leadExists = await Lead.getById(lead_id);
    if (!leadExists) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found'
      });
    }

    logger.info('Lead verified', { contactName: leadExists.contact_name });

    // Generate insights using Assessment model
    const generatedInsights = Assessment.generateInsights(
      overall_score,
      pillar_scores || [],
      assessment_type
    );

    // Convert insights to match PDF expectations
    const gap_analysis_items = [
      ...(generatedInsights.improvement_areas || []).map(area => 
        `${area.area} (${area.score.toFixed(1)}%): ${area.description}`
      ),
      ...(generatedInsights.critical_impact_areas || []).map(area => 
        `Critical: ${area.area} - Score: ${area.score.toFixed(1)}%, Weight: ${area.weight}% - ${area.description}`
      )
    ];

    const service_recommendations_items = [
      ...(generatedInsights.recommendations || []),
      ...(generatedInsights.weighted_priorities || []).map(priority =>
        `Priority ${priority.priority}: Improve ${priority.area} (current: ${priority.score.toFixed(1)}%, weight: ${priority.weight}%)`
      )
    ];

    // Prepare data for insertion
    const dimension_scores = JSON.stringify(pillar_scores || []);
    const responses_json = JSON.stringify(responses || {});
    const insights_json = JSON.stringify({
      score_category: overall_score >= 80 ? 'AI Leader' : 
                     overall_score >= 60 ? 'AI Adopter' : 
                     overall_score >= 40 ? 'AI Explorer' : 'AI Starter',
      completion_date: new Date().toISOString(),
      total_score: overall_score,
      completion_time_ms: completion_time_ms || 0,
      overall_assessment: generatedInsights.overall_assessment,
      strengths: generatedInsights.strengths || [],
      improvement_areas: generatedInsights.improvement_areas || [],
      weighted_priorities: generatedInsights.weighted_priorities || [],
      critical_impact_areas: generatedInsights.critical_impact_areas || [],
      gap_analysis: gap_analysis_items,
      service_recommendations: service_recommendations_items,
      metadata: metadata || {}
    });

    // Insert assessment using parameterized query for security
    const insertQuery = `
      INSERT INTO assessments (
        lead_id, assessment_type, industry, overall_score, 
        dimension_scores, responses, insights, completed_at, created_at
      )
      OUTPUT INSERTED.id
      VALUES (?, ?, ?, ?, ?, ?, ?, GETDATE(), GETDATE())
    `;
    
    const result = await database.query(insertQuery, [
      parseInt(lead_id),
      assessment_type.toUpperCase(),
      industry || leadExists.industry || 'Unknown',
      parseFloat(overall_score),
      dimension_scores,
      responses_json,
      insights_json
    ]);
    
    const assessmentId = result.recordset[0].id;
    
    logger.info('Assessment saved', { assessmentId });

    // Send email with assessment results
    try {
      const emailResult = await sendAssessmentResults(leadExists, {
        overall_score: parseFloat(overall_score),
        dimension_scores: pillar_scores || [],
        insights: JSON.parse(insights_json),
        assessment_type: assessment_type.toUpperCase(),
        completed_at: new Date()
      });
      
      if (emailResult.success) {
        logger.info('Assessment results email sent', { email: leadExists.email });
      } else {
        logger.warn('Email send failed (non-critical)', { error: emailResult.error });
      }
    } catch (emailError) {
      logger.warn('Email service error (continuing)', { error: emailError.message });
    }

    res.json({
      success: true,
      assessment_id: assessmentId,
      dimension_scores: pillar_scores || [],
      insights: JSON.parse(insights_json),
      message: 'Assessment submitted successfully'
    });

  } catch (error) {
    logger.error('Error submitting assessment', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Failed to submit assessment',
      error: error.message
    });
  }
});

// Login endpoint to find user by email
leadRouter.post('/login', validateLeadLogin, async (req, res) => {
  try {
    const { email, password } = req.body;

    logger.info('Login attempt', { email });

    // Verify password and get user
    const verifyResult = await Lead.verifyPassword(email, password);
    
    if (!verifyResult.success) {
      const statusCode = verifyResult.locked ? 423 : 401;
      return res.status(statusCode).json({
        success: false,
        message: verifyResult.message,
        attemptsRemaining: verifyResult.attemptsRemaining
      });
    }

    const user = verifyResult.lead;
    logger.info('Login successful', { contactName: user.contact_name });

    // Log user activity
    await UserActivity.log(
      user.id,
      'LOGIN',
      'user',
      user.id,
      `${user.contact_name} logged in`,
      req.ip || req.connection.remoteAddress,
      req.headers['user-agent']
    );

    // Check if password must be changed
    const mustChangePassword = user.password_must_change === 1 || user.password_must_change === true;

    // Get all assessments for this user
    const assessmentsQuery = `
      SELECT * FROM assessments 
      WHERE lead_id = ? 
      ORDER BY completed_at DESC
    `;
    
    const result = await database.query(assessmentsQuery, [user.id]);
    const assessments = result.recordset || [];
    
    logger.info('Assessments retrieved for user', { count: assessments.length });

    // Transform assessment data
    const transformedAssessments = assessments.map(assessment => ({
      id: assessment.id,
      assessment_type: assessment.assessment_type,
      industry: assessment.industry,
      overall_score: parseFloat(assessment.overall_score),
      dimension_scores: assessment.dimension_scores ? JSON.parse(assessment.dimension_scores) : [],
      responses: assessment.responses ? JSON.parse(assessment.responses) : {},
      insights: assessment.insights ? JSON.parse(assessment.insights) : {},
      completed_at: assessment.completed_at,
      created_at: assessment.created_at
    }));

    res.json({
      success: true,
      mustChangePassword: mustChangePassword,
      user: {
        id: user.id,
        email: user.email,
        contact_name: user.contact_name,
        company_name: user.company_name,
        job_title: user.job_title,
        industry: user.industry,
        company_size: user.company_size,
        country: user.country
      },
      assessments: transformedAssessments,
      message: mustChangePassword 
        ? 'Please change your temporary password to continue' 
        : `Welcome back, ${user.contact_name}!`
    });

  } catch (error) {
    logger.error('Error during login', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to log in',
      error: error.message
    });
  }
});

// Export assessment as PDF (for users to download their own assessments)
// MUST be before /:leadId route to avoid route matching conflicts
leadRouter.get('/assessments/:assessmentId/export-pdf', async (req, res) => {
  try {
    const { assessmentId } = req.params;
    const id = parseInt(assessmentId);

    logger.info('PDF export request received', { assessmentId: id });

    // Get assessment with user details
    const sql = `
      SELECT 
        a.*,
        l.contact_name,
        l.email,
        l.company_name,
        l.job_title
      FROM assessments a
      LEFT JOIN leads l ON a.lead_id = l.id
      WHERE a.id = @param1
    `;
    
    const result = await database.query(sql, [id]);
    const assessment = Array.isArray(result) ? result[0] : result.recordset[0];
    
    if (!assessment) {
      logger.warn('Assessment not found for PDF export', { assessmentId: id });
      return res.status(404).json({
        success: false,
        message: 'Assessment not found'
      });
    }

    logger.info('Assessment found, preparing data', { assessmentId: id });

    // Debug: Log raw database values
    logger.info('Raw assessment from DB', {
      id: assessment.id,
      dimension_scores_type: typeof assessment.dimension_scores,
      dimension_scores_value: assessment.dimension_scores ? String(assessment.dimension_scores).substring(0, 100) : 'NULL',
      insights_type: typeof assessment.insights,
      insights_value: assessment.insights ? String(assessment.insights).substring(0, 100) : 'NULL'
    });

    // Prepare user data
    const userData = {
      contact_name: assessment.contact_name,
      email: assessment.email,
      company_name: assessment.company_name,
      job_title: assessment.job_title
    };

    // Prepare assessment data - with better error handling
    let dimension_scores_parsed = [];
    if (assessment.dimension_scores) {
      if (typeof assessment.dimension_scores === 'string') {
        try {
          dimension_scores_parsed = JSON.parse(assessment.dimension_scores);
        } catch (e) {
          logger.error('Failed to parse dimension_scores', { error: e.message });
        }
      } else if (Array.isArray(assessment.dimension_scores)) {
        dimension_scores_parsed = assessment.dimension_scores;
      }
    }

    let insights_parsed = {};
    if (assessment.insights) {
      if (typeof assessment.insights === 'string') {
        try {
          insights_parsed = JSON.parse(assessment.insights);
        } catch (e) {
          logger.error('Failed to parse insights', { error: e.message });
        }
      } else if (typeof assessment.insights === 'object') {
        insights_parsed = assessment.insights;
      }
    }

    const assessmentData = {
      overall_score: parseFloat(assessment.overall_score),
      dimension_scores: dimension_scores_parsed,
      insights: insights_parsed,
      assessment_type: assessment.assessment_type || 'GENERAL',
      completed_at: assessment.completed_at || new Date()
    };

    logger.info('Assessment data prepared for PDF', { 
      assessmentId: id,
      overallScore: assessmentData.overall_score,
      dimensionScoresCount: assessmentData.dimension_scores?.length || 0,
      dimensionScores: assessmentData.dimension_scores,
      hasInsights: !!assessmentData.insights
    });

    logger.info('Generating PDF buffer', { assessmentId: id });

    // Generate PDF buffer
    const pdfBuffer = await generateAssessmentPDFBuffer(userData, assessmentData);

    logger.info('PDF generated successfully', { assessmentId: id, bufferSize: pdfBuffer.length });

    // Set headers for PDF download
    const filename = `SAFE-8_Assessment_${assessment.contact_name.replace(/\s+/g, '_')}_${assessmentId}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    // Send PDF buffer
    res.send(pdfBuffer);
  } catch (error) {
    logger.error('Error exporting assessment PDF', { 
      error: error.message, 
      stack: error.stack,
      assessmentId: req.params.assessmentId 
    });
    res.status(500).json({
      success: false,
      message: 'Error exporting assessment PDF',
      error: error.message
    });
  }
});

// Email assessment results (for users to send their results via email)
leadRouter.post('/assessments/:assessmentId/email-results', async (req, res) => {
  try {
    const { assessmentId } = req.params;
    const { email } = req.body;
    const id = parseInt(assessmentId);

    logger.info('Email results request received', { assessmentId: id, email });

    // Get assessment with user details
    const sql = `
      SELECT 
        a.*,
        l.contact_name,
        l.email,
        l.company_name,
        l.job_title
      FROM assessments a
      LEFT JOIN leads l ON a.lead_id = l.id
      WHERE a.id = @param1
    `;
    
    const result = await database.query(sql, [id]);
    const assessment = Array.isArray(result) ? result[0] : result.recordset[0];
    
    if (!assessment) {
      logger.warn('Assessment not found for email', { assessmentId: id });
      return res.status(404).json({
        success: false,
        message: 'Assessment not found'
      });
    }

    // Prepare user data
    const userData = {
      contact_name: assessment.contact_name,
      email: email || assessment.email,
      company_name: assessment.company_name,
      job_title: assessment.job_title
    };

    // Prepare assessment data - with enhanced error handling
    let dimension_scores_parsed = [];
    if (assessment.dimension_scores) {
      if (typeof assessment.dimension_scores === 'string') {
        try {
          dimension_scores_parsed = JSON.parse(assessment.dimension_scores);
        } catch (e) {
          logger.error('Failed to parse dimension_scores', { error: e.message });
        }
      } else if (Array.isArray(assessment.dimension_scores)) {
        dimension_scores_parsed = assessment.dimension_scores;
      }
    }

    let insights_parsed = {};
    if (assessment.insights) {
      if (typeof assessment.insights === 'string') {
        try {
          insights_parsed = JSON.parse(assessment.insights);
        } catch (e) {
          logger.error('Failed to parse insights', { error: e.message });
        }
      } else if (typeof assessment.insights === 'object') {
        insights_parsed = assessment.insights;
      }
    }

    const assessmentData = {
      overall_score: parseFloat(assessment.overall_score),
      dimension_scores: dimension_scores_parsed,
      insights: insights_parsed,
      assessment_type: assessment.assessment_type || 'GENERAL',
      completed_at: assessment.completed_at || new Date()
    };

    logger.info('Sending email with assessment results', { assessmentId: id, email: userData.email });

    // Send email using the email service
    const emailResult = await sendAssessmentResults(userData, assessmentData);

    if (emailResult.success) {
      logger.info('Email sent successfully', { assessmentId: id });
      res.json({
        success: true,
        message: 'Assessment results sent to your email successfully'
      });
    } else {
      logger.error('Failed to send email', { error: emailResult.error });
      res.status(500).json({
        success: false,
        message: 'Failed to send email: ' + emailResult.error
      });
    }
  } catch (error) {
    logger.error('Error sending assessment results email', { 
      error: error.message, 
      stack: error.stack,
      assessmentId: req.params.assessmentId 
    });
    res.status(500).json({
      success: false,
      message: 'Error sending email',
      error: error.message
    });
  }
});

// Get lead by ID
leadRouter.get('/:leadId', async (req, res) => {
  try {
    const { leadId } = req.params;
    const lead = await Lead.getById(leadId);

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found'
      });
    }

    res.json({
      success: true,
      data: {
        id: lead.id,
        contactName: lead.contact_name,
        jobTitle: lead.job_title,
        email: lead.email,
        phoneNumber: lead.phone_number,
        companyName: lead.company_name,
        companySize: lead.company_size,
        country: lead.country,
        industry: lead.industry,
        leadSource: lead.lead_source,
        createdAt: lead.created_at,
        updatedAt: lead.updated_at
      }
    });

  } catch (error) {
    logger.error('Error fetching lead', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch lead',
      error: error.message
    });
  }
});

// Request password reset
leadRouter.post('/forgot-password', resetLimiter, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email address is required'
      });
    }

    logger.info('Password reset requested', { email });

    // Generate reset token
    const result = await Lead.createPasswordResetToken(email);

    // Always return success to prevent email enumeration
    if (!result.success) {
      return res.json({
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent.'
      });
    }

    // Send reset email
    try {
      await sendPasswordResetEmail({
        contact_name: result.lead.contact_name,
        email: result.lead.email,
        company_name: result.lead.company_name,
        resetToken: result.resetToken
      });
      logger.info('Password reset email sent', { email });
    } catch (emailError) {
      logger.error('Failed to send reset email', { error: emailError.message });
      // Still return success to prevent enumeration
      return res.json({
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent.'
      });
    }

    res.json({
      success: true,
      message: 'If an account exists with this email, a password reset link has been sent.'
    });

  } catch (error) {
    logger.error('Error in forgot-password', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to process password reset request',
      error: error.message
    });
  }
});

// Reset password with token
leadRouter.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Token and new password are required'
      });
    }

    // Validate password strength
    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long'
      });
    }

    logger.info('Password reset attempt with token');

    // Reset password
    const result = await Lead.resetPassword(token, newPassword);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message || 'Invalid or expired reset token'
      });
    }

    logger.info('Password reset successful', { email: result.email });

    res.json({
      success: true,
      message: 'Password has been reset successfully. You can now log in with your new password.'
    });

  } catch (error) {
    logger.error('Error in reset-password', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to reset password',
      error: error.message
    });
  }
});

// Verify reset token (optional - for UI validation)
leadRouter.post('/verify-reset-token', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token is required'
      });
    }

    const result = await Lead.verifyResetToken(token);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message || 'Invalid or expired token'
      });
    }

    res.json({
      success: true,
      email: result.email,
      message: 'Token is valid'
    });

  } catch (error) {
    console.error('❌ Error verifying token:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify token'
    });
  }
});

/**
 * Change password (forced change after temp password)
 */
leadRouter.post('/change-password', async (req, res) => {
  try {
    const { email, currentPassword, newPassword } = req.body;

    logger.info('Password change attempt', { email });

    // Validate inputs
    if (!email || !currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Email, current password, and new password are required'
      });
    }

    // Verify current password
    const verifyResult = await Lead.verifyPassword(email, currentPassword);
    
    if (!verifyResult.success) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    const user = verifyResult.lead;

    // Validate new password strength
    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 8 characters long'
      });
    }

    // Hash new password
    const bcrypt = await import('bcrypt');
    const passwordHash = await bcrypt.hash(newPassword, 12);

    // Update password and clear password_must_change flag
    const updateSql = `
      UPDATE leads 
      SET password_hash = ?, 
          password_must_change = 0,
          password_created_at = GETDATE()
      WHERE id = ?
    `;

    await database.query(updateSql, [passwordHash, user.id]);

    logger.info('Password changed successfully', { userId: user.id });

    // Log activity
    await UserActivity.log(
      user.id,
      'PASSWORD_CHANGE',
      'user',
      user.id,
      'Password changed successfully',
      req.ip || req.connection.remoteAddress,
      req.headers['user-agent']
    );

    res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('❌ Error changing password:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to change password'
    });
  }
});

export default leadRouter;