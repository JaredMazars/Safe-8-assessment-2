import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { generateAssessmentPDFBuffer } from './pdfService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Logo path for attachments
const LOGO_PATH = path.join(__dirname, '..', 'assets', 'forvis-mazars-logo.jpg');

// Create transporter with better error handling
const createTransporter = () => {
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (!smtpUser || !smtpPass) {
    console.warn('⚠️  Email service: SMTP credentials not configured');
    return null;
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: smtpUser,
      pass: smtpPass
    }
  });
};

const transporter = createTransporter();

// Verify connection only if transporter exists
if (transporter) {
  transporter.verify((error, success) => {
    if (error) {
      console.error('❌ Email service verification failed:', error.message);
      console.log('ℹ️  Email service will attempt to send anyway...');
    } else {
      console.log('✅ Email service ready');
    }
  });
} else {
  console.log('ℹ️  Email service disabled (no credentials configured)');
}

/**
 * Generic email sending function
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML email content
 * @param {string} [options.from] - Sender email (optional, uses default)
 * @returns {Promise<Object>} - Email send result
 */
const sendEmail = async ({ to, subject, html, from }) => {
  if (!transporter) {
    console.warn('⚠️  Email service not configured - skipping email send');
    return { success: false, message: 'Email service not configured' };
  }

  const mailOptions = {
    from: from || process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject,
    html
  };

  try {
    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully:', result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('❌ Failed to send email:', error.message);
    throw error;
  }
};

/**
 * Generate HTML email template for assessment results
 * Designed according to Forvis Mazars branding guidelines
 */
const generateAssessmentEmailHTML = (userData, assessmentData) => {
  const { contact_name, email, company_name } = userData;
  const { 
    overall_score, 
    dimension_scores, 
    insights,
    assessment_type,
    completed_at 
  } = assessmentData;

  const scoreCategory = overall_score >= 80 ? 'AI Leader' : 
                       overall_score >= 60 ? 'AI Adopter' : 
                       overall_score >= 40 ? 'AI Explorer' : 'AI Starter';

  const categoryColor = overall_score >= 80 ? '#00A651' : 
                       overall_score >= 60 ? '#0098DB' : 
                       overall_score >= 40 ? '#F7941D' : '#E31B23';

  const pillarRows = dimension_scores.map(pillar => `
    <tr>
      <td style="padding: 16px; border-bottom: 1px solid #E5E5E5; font-family: Arial, sans-serif; font-size: 14px; color: #333333;">
        <strong>${pillar.pillar_name}</strong>
      </td>
      <td style="padding: 16px; border-bottom: 1px solid #E5E5E5; text-align: center;">
        <div style="background: #F5F5F5; border-radius: 4px; height: 24px; overflow: hidden; position: relative;">
          <div style="background: #00539F; height: 100%; width: ${pillar.score}%; transition: width 0.3s ease;"></div>
        </div>
      </td>
      <td style="padding: 16px; border-bottom: 1px solid #E5E5E5; text-align: center; font-family: Arial, sans-serif; font-size: 14px;">
        <strong style="color: #00539F;">${pillar.score.toFixed(1)}%</strong>
      </td>
    </tr>
  `).join('');

  const gapAnalysis = insights.gap_analysis && insights.gap_analysis.length > 0 
    ? insights.gap_analysis.map(gap => `<li style="margin-bottom: 12px; font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #333333;">${gap}</li>`).join('')
    : '<li style="font-family: Arial, sans-serif; font-size: 14px; color: #666666;">No specific gaps identified at this time.</li>';

  const recommendations = insights.service_recommendations && insights.service_recommendations.length > 0
    ? insights.service_recommendations.map(rec => `<li style="margin-bottom: 12px; font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #333333;">${rec}</li>`).join('')
    : '<li style="font-family: Arial, sans-serif; font-size: 14px; color: #666666;">Complete your assessment for personalized recommendations.</li>';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your SAFE-8 Assessment Results</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td {font-family: Arial, sans-serif !important;}
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #F5F5F5; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
  
  <!-- Email Container -->
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #F5F5F5;">
    <tr>
      <td style="padding: 20px 0;">
        
        <!-- Main Content Table -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="margin: 0 auto; background-color: #FFFFFF; max-width: 600px;">
          
          <!-- Header with Logo -->
          <tr>
            <td style="background-color: #FFFFFF; padding: 30px 40px; border-bottom: 4px solid #00539F;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td>
                    <!-- Forvis Mazars Logo -->
                    <img src="\cid:forvismazarslogo" alt="Forvis Mazars" style="height: 50px; width: auto; display: block;" />
                    <div style="font-size: 11px; color: #666666; margin-top: 8px; font-family: Arial, sans-serif; letter-spacing: 0.5px;">
                      SAFE-8 ASSESSMENT PLATFORM
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Title Bar -->
          <tr>
            <td style="background-color: #00539F; padding: 25px 40px;">
              <h1 style="margin: 0; font-family: Arial, sans-serif; font-size: 24px; font-weight: bold; color: #FFFFFF; line-height: 1.3;">
                Your SAFE-8 Assessment Results
              </h1>
              <p style="margin: 8px 0 0 0; font-family: Arial, sans-serif; font-size: 14px; color: #FFFFFF; opacity: 0.95;">
                ${assessment_type} Assessment | Completed ${new Date(completed_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 40px 40px 30px 40px;">
              
              <!-- Greeting -->
              <p style="margin: 0 0 20px 0; font-family: Arial, sans-serif; font-size: 15px; color: #333333; line-height: 1.6;">
                Dear <strong>${contact_name}</strong>,
              </p>
              
              <p style="margin: 0 0 30px 0; font-family: Arial, sans-serif; font-size: 14px; color: #333333; line-height: 1.6;">
                Thank you for completing your SAFE-8 assessment. We have analyzed your responses and compiled personalized insights to help ${company_name || 'your organization'} advance its AI transformation journey.
              </p>

              <!-- Overall Score Card -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 30px; background-color: #F5F5F5; border-left: 5px solid ${categoryColor};">
                <tr>
                  <td style="padding: 25px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td style="vertical-align: middle;">
                          <div style="font-family: Arial, sans-serif; font-size: 14px; color: #666666; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">
                            Overall Performance
                          </div>
                          <h2 style="margin: 0; font-family: Arial, sans-serif; font-size: 20px; font-weight: bold; color: #333333;">
                            ${scoreCategory}
                          </h2>
                        </td>
                        <td style="text-align: right; vertical-align: middle;">
                          <div style="font-family: Arial, sans-serif; font-size: 42px; font-weight: bold; color: ${categoryColor}; line-height: 1;">
                            ${overall_score.toFixed(1)}%
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Pillar Performance Section -->
              <div style="margin-bottom: 35px;">
                <h2 style="margin: 0 0 20px 0; font-family: Arial, sans-serif; font-size: 18px; font-weight: bold; color: #00539F; padding-bottom: 10px; border-bottom: 2px solid #00539F;">
                  Pillar Performance Breakdown
                </h2>
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border: 1px solid #E5E5E5;">
                  <thead>
                    <tr style="background-color: #F5F5F5;">
                      <th style="padding: 14px 16px; text-align: left; font-family: Arial, sans-serif; font-size: 13px; font-weight: bold; color: #333333; text-transform: uppercase; letter-spacing: 0.5px;">
                        Pillar
                      </th>
                      <th style="padding: 14px 16px; text-align: center; font-family: Arial, sans-serif; font-size: 13px; font-weight: bold; color: #333333; text-transform: uppercase; letter-spacing: 0.5px; width: 200px;">
                        Progress
                      </th>
                      <th style="padding: 14px 16px; text-align: center; font-family: Arial, sans-serif; font-size: 13px; font-weight: bold; color: #333333; text-transform: uppercase; letter-spacing: 0.5px; width: 80px;">
                        Score
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    ${pillarRows}
                  </tbody>
                </table>
              </div>

              <!-- Gap Analysis -->
              <div style="margin-bottom: 35px;">
                <h2 style="margin: 0 0 20px 0; font-family: Arial, sans-serif; font-size: 18px; font-weight: bold; color: #E31B23; padding-bottom: 10px; border-bottom: 2px solid #E31B23;">
                  Key Areas for Improvement
                </h2>
                <ul style="margin: 0; padding-left: 20px; list-style-type: disc;">
                  ${gapAnalysis}
                </ul>
              </div>

              <!-- Recommendations -->
              <div style="margin-bottom: 35px;">
                <h2 style="margin: 0 0 20px 0; font-family: Arial, sans-serif; font-size: 18px; font-weight: bold; color: #00539F; padding-bottom: 10px; border-bottom: 2px solid #00539F;">
                  Recommended Next Steps
                </h2>
                <ul style="margin: 0; padding-left: 20px; list-style-type: disc;">
                  ${recommendations}
                </ul>
              </div>

              <!-- Expert Guidance Box -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #F5F5F5; margin-top: 30px;">
                <tr>
                  <td style="padding: 25px;">
                    <h3 style="margin: 0 0 12px 0; font-family: Arial, sans-serif; font-size: 16px; font-weight: bold; color: #00539F;">
                      Need Expert Guidance?
                    </h3>
                    <p style="margin: 0; font-family: Arial, sans-serif; font-size: 14px; color: #333333; line-height: 1.6;">
                      Our specialists at Forvis Mazars can help you translate these insights into actionable strategies. We offer comprehensive AI transformation services tailored to your organization's unique needs.
                    </p>
                    <p style="margin: 12px 0 0 0; font-family: Arial, sans-serif; font-size: 14px; color: #333333;">
                      <a href="mailto:ai.advisory@forvismazars.com" style="color: #00539F; text-decoration: none; font-weight: bold;">Contact our AI Advisory Team →</a>
                    </p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

              <!-- Footer -->
          <tr>
            <td style="background-color: #F5F5F5; padding: 30px 40px; border-top: 1px solid #E5E5E5;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="padding-bottom: 15px;">
                    <img src="\cid:forvismazarslogo" alt="Forvis Mazars" style="height: 40px; width: auto; display: block;" />
                  </td>
                </tr>
                <tr>
                  <td>
                    <p style="margin: 0 0 8px 0; font-family: Arial, sans-serif; font-size: 12px; color: #666666; line-height: 1.5;">
                      This assessment report was generated for ${contact_name} at ${company_name || 'your organization'}.
                    </p>
                    <p style="margin: 0 0 8px 0; font-family: Arial, sans-serif; font-size: 12px; color: #666666; line-height: 1.5;">
                      Email sent to: <a href="mailto:${email}" style="color: #00539F; text-decoration: none;">${email}</a>
                    </p>
                    <p style="margin: 15px 0 0 0; font-family: Arial, sans-serif; font-size: 11px; color: #999999; line-height: 1.5;">
                      © ${new Date().getFullYear()} Forvis Mazars. All rights reserved. Forvis Mazars South Africa is registered in South Africa.
                    </p>
                    <p style="margin: 8px 0 0 0; font-family: Arial, sans-serif; font-size: 11px; color: #999999; line-height: 1.5;">
                      This email and any files transmitted with it are confidential and intended solely for the use of the individual or entity to whom they are addressed.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
        <!-- End Main Content Table -->

      </td>
    </tr>
  </table>
  <!-- End Email Container -->

</body>
</html>
  `;
};

/**
 * Send assessment results email with PDF attachment
 */
export const sendAssessmentResults = async (userData, assessmentData) => {
  if (!transporter) {
    console.log('ℹ️  Email sending skipped (service not configured)');
    return { success: false, error: 'Email service not configured' };
  }

  try {
    console.log('📧 Preparing to send assessment results email to:', userData.email);

    // Generate PDF as buffer
    const pdfBuffer = await generateAssessmentPDFBuffer(userData, assessmentData);
    
    const mailOptions = {
      from: {
        name: 'Forvis Mazars - SAFE-8 Platform',
        address: process.env.SMTP_USER
      },
      to: userData.email,
      subject: `Your SAFE-8 ${assessmentData.assessment_type} Assessment Results - ${assessmentData.overall_score.toFixed(1)}%`,
      html: generateAssessmentEmailHTML(userData, assessmentData),
      attachments: [
        {
          filename: `SAFE-8_Assessment_Report_${userData.contact_name.replace(/\s+/g, '_')}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        },
        {
          filename: 'logo.jpg',
          path: LOGO_PATH,
          cid: 'forvismazarslogo'
        }
      ]
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Assessment results email sent:', info.messageId);
    
    return {
      success: true,
      messageId: info.messageId
    };
  } catch (error) {
    console.error('❌ Error sending assessment results email:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Send welcome email to new user
 * Designed according to Forvis Mazars branding guidelines
 */
export const sendWelcomeEmail = async (userData) => {
  if (!transporter) {
    console.log('ℹ️  Welcome email skipped (service not configured)');
    return { success: false };
  }

  try {
    const mailOptions = {
      from: {
        name: 'Forvis Mazars - SAFE-8 Platform',
        address: process.env.SMTP_USER
      },
      to: userData.email,
      subject: 'Welcome to SAFE-8 Assessment Platform',
      html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to SAFE-8</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td {font-family: Arial, sans-serif !important;}
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #F5F5F5; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
  
  <!-- Email Container -->
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #F5F5F5;">
    <tr>
      <td style="padding: 20px 0;">
        
        <!-- Main Content Table -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="margin: 0 auto; background-color: #FFFFFF; max-width: 600px;">
          
          <!-- Header with Logo -->
          <tr>
            <td style="background-color: #FFFFFF; padding: 30px 40px; border-bottom: 4px solid #00539F;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td>
                    <!-- Forvis Mazars Logo -->
                    <img src="\cid:forvismazarslogo" alt="Forvis Mazars" style="height: 50px; width: auto; display: block;" />
                    <div style="font-size: 11px; color: #666666; margin-top: 8px; font-family: Arial, sans-serif; letter-spacing: 0.5px;">
                      SAFE-8 ASSESSMENT PLATFORM
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Title Bar -->
          <tr>
            <td style="background-color: #00539F; padding: 25px 40px;">
              <h1 style="margin: 0; font-family: Arial, sans-serif; font-size: 24px; font-weight: bold; color: #FFFFFF; line-height: 1.3;">
                Welcome to SAFE-8
              </h1>
              <p style="margin: 8px 0 0 0; font-family: Arial, sans-serif; font-size: 14px; color: #FFFFFF; opacity: 0.95;">
                Your AI Transformation Journey Begins Here
              </p>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 40px 40px 30px 40px;">
              
              <!-- Greeting -->
              <p style="margin: 0 0 20px 0; font-family: Arial, sans-serif; font-size: 15px; color: #333333; line-height: 1.6;">
                Dear <strong>${userData.contact_name}</strong>,
              </p>
              
              <p style="margin: 0 0 25px 0; font-family: Arial, sans-serif; font-size: 14px; color: #333333; line-height: 1.6;">
                Thank you for registering with the SAFE-8 Assessment Platform. We're pleased to support ${userData.company_name || 'your organization'} in evaluating and advancing your AI capabilities.
              </p>

              <!-- What to Expect -->
              <h2 style="margin: 0 0 20px 0; font-family: Arial, sans-serif; font-size: 18px; font-weight: bold; color: #00539F; padding-bottom: 10px; border-bottom: 2px solid #00539F;">
                What to Expect
              </h2>

              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 30px;">
                <tr>
                  <td style="padding: 15px 0; border-bottom: 1px solid #E5E5E5;">
                    <div style="font-family: Arial, sans-serif; font-size: 14px; color: #00539F; font-weight: bold; margin-bottom: 5px;">
                      ✓ Comprehensive Assessment
                    </div>
                    <div style="font-family: Arial, sans-serif; font-size: 13px; color: #666666; line-height: 1.5;">
                      Evaluate your organization across 8 key AI pillars
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 15px 0; border-bottom: 1px solid #E5E5E5;">
                    <div style="font-family: Arial, sans-serif; font-size: 14px; color: #00539F; font-weight: bold; margin-bottom: 5px;">
                      ✓ Personalized Insights
                    </div>
                    <div style="font-family: Arial, sans-serif; font-size: 13px; color: #666666; line-height: 1.5;">
                      Receive tailored recommendations based on your results
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 15px 0;">
                    <div style="font-family: Arial, sans-serif; font-size: 14px; color: #00539F; font-weight: bold; margin-bottom: 5px;">
                      ✓ Expert Guidance
                    </div>
                    <div style="font-family: Arial, sans-serif; font-size: 13px; color: #666666; line-height: 1.5;">
                      Access to Forvis Mazars AI transformation specialists
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Support Information -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #F5F5F5; margin-top: 30px;">
                <tr>
                  <td style="padding: 25px;">
                    <h3 style="margin: 0 0 12px 0; font-family: Arial, sans-serif; font-size: 16px; font-weight: bold; color: #00539F;">
                      Need Assistance?
                    </h3>
                    <p style="margin: 0; font-family: Arial, sans-serif; font-size: 14px; color: #333333; line-height: 1.6;">
                      Our support team is here to help you get the most out of your assessment experience. If you have any questions, please don't hesitate to reach out.
                    </p>
                    <p style="margin: 12px 0 0 0; font-family: Arial, sans-serif; font-size: 14px; color: #333333;">
                      <a href="mailto:ai.advisory@forvismazars.com" style="color: #00539F; text-decoration: none; font-weight: bold;">Contact Support →</a>
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin: 30px 0 0 0; font-family: Arial, sans-serif; font-size: 14px; color: #333333; line-height: 1.6;">
                Best regards,<br>
                <strong style="color: #00539F;">The SAFE-8 Team</strong><br>
                <span style="color: #666666; font-size: 13px;">Forvis Mazars</span>
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #F5F5F5; padding: 30px 40px; border-top: 1px solid #E5E5E5;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="padding-bottom: 15px;">
                    <img src="\cid:forvismazarslogo" alt="Forvis Mazars" style="height: 40px; width: auto; display: block;" />
                  </td>
                </tr>
                <tr>
                  <td>
                    <p style="margin: 0 0 8px 0; font-family: Arial, sans-serif; font-size: 12px; color: #666666; line-height: 1.5;">
                      This welcome message was sent to ${userData.contact_name} at ${userData.company_name || 'your organization'}.
                    </p>
                    <p style="margin: 0 0 8px 0; font-family: Arial, sans-serif; font-size: 12px; color: #666666; line-height: 1.5;">
                      Email sent to: <a href="mailto:${userData.email}" style="color: #00539F; text-decoration: none;">${userData.email}</a>
                    </p>
                    <p style="margin: 15px 0 0 0; font-family: Arial, sans-serif; font-size: 11px; color: #999999; line-height: 1.5;">
                      © ${new Date().getFullYear()} Forvis Mazars. All rights reserved. Forvis Mazars South Africa is registered in South Africa.
                    </p>
                    <p style="margin: 8px 0 0 0; font-family: Arial, sans-serif; font-size: 11px; color: #999999; line-height: 1.5;">
                      This email and any files transmitted with it are confidential and intended solely for the use of the individual or entity to whom they are addressed.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
        <!-- End Main Content Table -->

      </td>
    </tr>
  </table>
  <!-- End Email Container -->

</body>
</html>
      `,
      attachments: [
        {
          filename: 'logo.jpg',
          path: LOGO_PATH,
          cid: 'forvismazarslogo'
        }
      ]
    };

    await transporter.sendMail(mailOptions);
    console.log('✅ Welcome email sent to:', userData.email);
  } catch (error) {
    console.error('❌ Error sending welcome email:', error);
  }
};

/**
 * Send password reset email
 * Designed according to Forvis Mazars branding guidelines
 */
export const sendPasswordResetEmail = async (userData) => {
  if (!transporter) {
    console.log('ℹ️  Password reset email skipped (service not configured)');
    return { success: false, error: 'Email service not configured' };
  }

  try {
    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${userData.resetToken}`;
    const expiryTime = '1 hour';

    const mailOptions = {
      from: {
        name: 'Forvis Mazars - SAFE-8 Platform',
        address: process.env.SMTP_USER
      },
      to: userData.email,
      subject: 'Reset Your SAFE-8 Password',
      html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td {font-family: Arial, sans-serif !important;}
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #F5F5F5; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
  
  <!-- Email Container -->
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #F5F5F5;">
    <tr>
      <td style="padding: 20px 0;">
        
        <!-- Main Content Table -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="margin: 0 auto; background-color: #FFFFFF; max-width: 600px;">
          
          <!-- Header with Logo -->
          <tr>
            <td style="background-color: #FFFFFF; padding: 30px 40px; border-bottom: 4px solid #00539F;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td>
                    <!-- Forvis Mazars Logo -->
                    <img src="\cid:forvismazarslogo" alt="Forvis Mazars" style="height: 50px; width: auto; display: block;" />
                    <div style="font-size: 11px; color: #666666; margin-top: 8px; font-family: Arial, sans-serif; letter-spacing: 0.5px;">
                      SAFE-8 ASSESSMENT PLATFORM
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Alert Bar -->
          <tr>
            <td style="background-color: #E31B23; padding: 20px 40px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="text-align: center;">
                    <div style="font-family: Arial, sans-serif; font-size: 14px; color: #FFFFFF; font-weight: bold;">
                      🔒 PASSWORD RESET REQUEST
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 40px 40px 30px 40px;">
              
              <!-- Greeting -->
              <p style="margin: 0 0 20px 0; font-family: Arial, sans-serif; font-size: 15px; color: #333333; line-height: 1.6;">
                Dear <strong>${userData.contact_name}</strong>,
              </p>
              
              <p style="margin: 0 0 25px 0; font-family: Arial, sans-serif; font-size: 14px; color: #333333; line-height: 1.6;">
                We received a request to reset the password for your SAFE-8 account associated with <strong>${userData.email}</strong>.
              </p>

              <p style="margin: 0 0 30px 0; font-family: Arial, sans-serif; font-size: 14px; color: #333333; line-height: 1.6;">
                Click the button below to create a new password. This link will expire in <strong>${expiryTime}</strong>.
              </p>

              <!-- Reset Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 0 30px 0;">
                <tr>
                  <td style="border-radius: 4px; background-color: #00539F;">
                    <a href="${resetLink}" target="_blank" style="display: inline-block; padding: 16px 40px; font-family: Arial, sans-serif; font-size: 16px; color: #FFFFFF; text-decoration: none; font-weight: bold; border-radius: 4px;">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 20px 0; font-family: Arial, sans-serif; font-size: 13px; color: #666666; line-height: 1.6;">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              
              <p style="margin: 0 0 30px 0; font-family: Arial, sans-serif; font-size: 12px; color: #00539F; word-break: break-all; background-color: #F5F5F5; padding: 12px; border-radius: 4px;">
                ${resetLink}
              </p>

              <!-- Security Notice -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #FFF9E6; border-left: 4px solid #F7941D; margin-top: 30px;">
                <tr>
                  <td style="padding: 20px;">
                    <h3 style="margin: 0 0 10px 0; font-family: Arial, sans-serif; font-size: 14px; font-weight: bold; color: #333333;">
                      ⚠️ Security Notice
                    </h3>
                    <p style="margin: 0; font-family: Arial, sans-serif; font-size: 13px; color: #333333; line-height: 1.6;">
                      If you didn't request this password reset, please ignore this email or contact our support team immediately. Your account security is important to us.
                    </p>
                    <p style="margin: 12px 0 0 0; font-family: Arial, sans-serif; font-size: 13px; color: #333333;">
                      <a href="mailto:ai.advisory@forvismazars.com" style="color: #00539F; text-decoration: none; font-weight: bold;">Report Suspicious Activity →</a>
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin: 30px 0 0 0; font-family: Arial, sans-serif; font-size: 14px; color: #333333; line-height: 1.6;">
                Best regards,<br>
                <strong style="color: #00539F;">The SAFE-8 Team</strong><br>
                <span style="color: #666666; font-size: 13px;">Forvis Mazars</span>
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #F5F5F5; padding: 30px 40px; border-top: 1px solid #E5E5E5;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="padding-bottom: 15px;">
                    <img src="\cid:forvismazarslogo" alt="Forvis Mazars" style="height: 40px; width: auto; display: block;" />
                  </td>
                </tr>
                <tr>
                  <td>
                    <p style="margin: 0 0 8px 0; font-family: Arial, sans-serif; font-size: 12px; color: #666666; line-height: 1.5;">
                      This password reset email was sent to ${userData.contact_name} at ${userData.company_name || 'your organization'}.
                    </p>
                    <p style="margin: 0 0 8px 0; font-family: Arial, sans-serif; font-size: 12px; color: #666666; line-height: 1.5;">
                      Email sent to: <a href="mailto:${userData.email}" style="color: #00539F; text-decoration: none;">${userData.email}</a>
                    </p>
                    <p style="margin: 15px 0 0 0; font-family: Arial, sans-serif; font-size: 11px; color: #999999; line-height: 1.5;">
                      © ${new Date().getFullYear()} Forvis Mazars. All rights reserved. Forvis Mazars South Africa is registered in South Africa.
                    </p>
                    <p style="margin: 8px 0 0 0; font-family: Arial, sans-serif; font-size: 11px; color: #999999; line-height: 1.5;">
                      This email and any files transmitted with it are confidential and intended solely for the use of the individual or entity to whom they are addressed.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
        <!-- End Main Content Table -->

      </td>
    </tr>
  </table>
  <!-- End Email Container -->

</body>
</html>
      `,
      attachments: [
        {
          filename: 'logo.jpg',
          path: LOGO_PATH,
          cid: 'forvismazarslogo'
        }
      ]
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Password reset email sent:', info.messageId);
    
    return {
      success: true,
      messageId: info.messageId
    };
  } catch (error) {
    console.error('❌ Error sending password reset email:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Send email to admin-created user with temporary password
 */
export const sendAdminCreatedUserEmail = async (userData, tempPassword) => {
  if (!transporter) {
    console.log('ℹ️  Admin user email skipped (service not configured)');
    return { success: false };
  }

  try {
    const loginUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    
    const mailOptions = {
      from: {
        name: 'Forvis Mazars - SAFE-8 Platform',
        address: process.env.SMTP_USER
      },
      to: userData.email,
      subject: 'Welcome to SAFE-8 Assessment Platform - Your Account Details',
      html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to SAFE-8</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td {font-family: Arial, sans-serif !important;}
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #F5F5F5; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
  
  <!-- Email Container -->
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #F5F5F5;">
    <tr>
      <td style="padding: 20px 0;">
        
        <!-- Main Content Table -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="margin: 0 auto; background-color: #FFFFFF; max-width: 600px;">
          
          <!-- Header with Logo -->
          <tr>
            <td style="background-color: #FFFFFF; padding: 30px 40px; border-bottom: 4px solid #00539F;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td>
                    <!-- Forvis Mazars Logo -->
                    <img src="\cid:forvismazarslogo" alt="Forvis Mazars" style="height: 50px; width: auto; display: block;" />
                    <div style="font-size: 11px; color: #666666; margin-top: 8px; font-family: Arial, sans-serif; letter-spacing: 0.5px;">
                      SAFE-8 ASSESSMENT PLATFORM
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Title Bar -->
          <tr>
            <td style="background-color: #00539F; padding: 25px 40px;">
              <h1 style="margin: 0; font-family: Arial, sans-serif; font-size: 24px; font-weight: bold; color: #FFFFFF; line-height: 1.3;">
                Your SAFE-8 Account Has Been Created
              </h1>
              <p style="margin: 8px 0 0 0; font-family: Arial, sans-serif; font-size: 14px; color: #FFFFFF; opacity: 0.95;">
                Access your account with the credentials below
              </p>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 40px 40px 30px 40px;">
              
              <!-- Greeting -->
              <p style="margin: 0 0 20px 0; font-family: Arial, sans-serif; font-size: 15px; color: #333333; line-height: 1.6;">
                Dear <strong>${userData.first_name || userData.contact_name}</strong>,
              </p>
              
              <p style="margin: 0 0 25px 0; font-family: Arial, sans-serif; font-size: 14px; color: #333333; line-height: 1.6;">
                An account has been created for you on the SAFE-8 Assessment Platform. Below are your login credentials and next steps to get started.
              </p>

              <!-- Login Credentials Box -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #F8F9FA; border: 2px solid #00539F; border-radius: 8px; margin-bottom: 30px;">
                <tr>
                  <td style="padding: 25px;">
                    <h3 style="margin: 0 0 20px 0; font-family: Arial, sans-serif; font-size: 16px; font-weight: bold; color: #00539F;">
                      🔑 Your Login Credentials
                    </h3>
                    
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td style="padding: 8px 0; font-family: Arial, sans-serif; font-size: 13px; color: #666666; width: 40%;">
                          Email:
                        </td>
                        <td style="padding: 8px 0; font-family: Arial, sans-serif; font-size: 14px; color: #333333; font-weight: bold;">
                          ${userData.email}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; font-family: Arial, sans-serif; font-size: 13px; color: #666666;">
                          Temporary Password:
                        </td>
                        <td style="padding: 8px 0;">
                          <div style="background-color: #FFFFFF; border: 1px solid #00539F; padding: 12px 15px; font-family: 'Courier New', monospace; font-size: 16px; color: #00539F; font-weight: bold; letter-spacing: 1px; border-radius: 4px;">
                            ${tempPassword}
                          </div>
                        </td>
                      </tr>
                    </table>

                    <div style="margin-top: 20px; padding: 15px; background-color: #FFF3CD; border-left: 4px solid #FFC107; border-radius: 4px;">
                      <p style="margin: 0; font-family: Arial, sans-serif; font-size: 13px; color: #856404; line-height: 1.5;">
                        <strong>⚠️ Security Notice:</strong> You will be required to change this temporary password when you first log in. Please choose a strong, unique password for your account.
                      </p>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Next Steps -->
              <h2 style="margin: 0 0 20px 0; font-family: Arial, sans-serif; font-size: 18px; font-weight: bold; color: #00539F; padding-bottom: 10px; border-bottom: 2px solid #00539F;">
                Next Steps
              </h2>

              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 30px;">
                <tr>
                  <td style="padding: 15px 0; border-bottom: 1px solid #E5E5E5;">
                    <div style="font-family: Arial, sans-serif; font-size: 14px; color: #00539F; font-weight: bold; margin-bottom: 5px;">
                      1. Log In
                    </div>
                    <div style="font-family: Arial, sans-serif; font-size: 13px; color: #666666; line-height: 1.5; margin-bottom: 10px;">
                      Click the button below to access the login page
                    </div>
                    <div style="margin-top: 10px;">
                      <a href="${loginUrl}" style="display: inline-block; background-color: #00539F; color: #FFFFFF; text-decoration: none; padding: 12px 30px; border-radius: 4px; font-family: Arial, sans-serif; font-size: 14px; font-weight: bold;">
                        Log In to SAFE-8
                      </a>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 15px 0; border-bottom: 1px solid #E5E5E5;">
                    <div style="font-family: Arial, sans-serif; font-size: 14px; color: #00539F; font-weight: bold; margin-bottom: 5px;">
                      2. Change Your Password
                    </div>
                    <div style="font-family: Arial, sans-serif; font-size: 13px; color: #666666; line-height: 1.5;">
                      You'll be prompted to create a new password immediately after your first login
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 15px 0;">
                    <div style="font-family: Arial, sans-serif; font-size: 14px; color: #00539F; font-weight: bold; margin-bottom: 5px;">
                      3. Begin Your Assessment
                    </div>
                    <div style="font-family: Arial, sans-serif; font-size: 13px; color: #666666; line-height: 1.5;">
                      Once logged in, you can start your AI transformation assessment
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Support Information -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #F5F5F5; margin-top: 30px;">
                <tr>
                  <td style="padding: 25px;">
                    <h3 style="margin: 0 0 12px 0; font-family: Arial, sans-serif; font-size: 16px; font-weight: bold; color: #00539F;">
                      Need Assistance?
                    </h3>
                    <p style="margin: 0; font-family: Arial, sans-serif; font-size: 14px; color: #333333; line-height: 1.6;">
                      If you have any questions about your account or need help getting started, our support team is here to assist you.
                    </p>
                    <p style="margin: 12px 0 0 0; font-family: Arial, sans-serif; font-size: 14px; color: #333333;">
                      <a href="mailto:ai.advisory@forvismazars.com" style="color: #00539F; text-decoration: none; font-weight: bold;">Contact Support →</a>
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin: 30px 0 0 0; font-family: Arial, sans-serif; font-size: 14px; color: #333333; line-height: 1.6;">
                Best regards,<br>
                <strong style="color: #00539F;">The SAFE-8 Team</strong><br>
                <span style="color: #666666; font-size: 13px;">Forvis Mazars</span>
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #F5F5F5; padding: 30px 40px; border-top: 1px solid #E5E5E5;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="padding-bottom: 15px;">
                    <img src="\cid:forvismazarslogo" alt="Forvis Mazars" style="height: 40px; width: auto; display: block;" />
                  </td>
                </tr>
                <tr>
                  <td style="font-family: Arial, sans-serif; font-size: 12px; color: #666666; line-height: 1.6;">
                    <p style="margin: 0 0 8px 0;">
                      This email was sent to ${userData.email} regarding your SAFE-8 account.
                    </p>
                    <p style="margin: 0; color: #999999; font-size: 11px;">
                      © ${new Date().getFullYear()} Forvis Mazars. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
        
      </td>
    </tr>
  </table>

</body>
</html>
      `,
      attachments: [
        {
          filename: 'logo.jpg',
          path: LOGO_PATH,
          cid: 'forvismazarslogo'
        }
      ]
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Admin-created user email sent successfully:', info.messageId);
    
    return { 
      success: true, 
      messageId: info.messageId,
      recipient: userData.email 
    };
    
  } catch (error) {
    console.error('❌ Error sending admin-created user email:', error);
    return { 
      success: false, 
      error: error.message 
    };
  }
};

export default {
  sendEmail,
  sendAssessmentResults,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendAdminCreatedUserEmail
};



