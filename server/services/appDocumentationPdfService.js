import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Forvis Mazars brand colors
const primaryBlue = '#00539F';
const secondaryRed = '#E31B23';
const darkGray = '#333333';
const mediumGray = '#666666';
const lightGray = '#999999';

export async function generateAppDocumentationPDF(outputPath) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 60, bottom: 60, left: 60, right: 60 },
        bufferPages: true
      });

      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks);
        if (outputPath) {
          fs.writeFileSync(outputPath, pdfBuffer);
        }
        resolve(pdfBuffer);
      });
      doc.on('error', reject);

      // Helper functions
      const addSectionTitle = (title) => {
        if (doc.y > 650) doc.addPage();
        doc.fontSize(16).fillColor(primaryBlue).font('Helvetica-Bold').text(title);
        doc.moveDown(0.3);
        doc.moveTo(60, doc.y).lineTo(535, doc.y).stroke(primaryBlue);
        doc.moveDown(0.8);
        doc.font('Helvetica').fillColor(darkGray);
      };

      const addSubsectionTitle = (title) => {
        if (doc.y > 700) doc.addPage();
        doc.fontSize(13).fillColor(secondaryRed).font('Helvetica-Bold').text(title);
        doc.moveDown(0.5);
        doc.font('Helvetica').fillColor(darkGray);
      };

      const addParagraph = (text) => {
        if (doc.y > 720) doc.addPage();
        doc.fontSize(11).fillColor(darkGray).text(text, { align: 'justify' });
        doc.moveDown(0.6);
      };

      const addBulletPoint = (text) => {
        if (doc.y > 720) doc.addPage();
        const bulletX = 75;
        const textX = 95;
        doc.fontSize(11).fillColor(darkGray);
        doc.circle(bulletX, doc.y + 5, 2).fill();
        doc.text(text, textX, doc.y - 5, { width: 440 });
        doc.moveDown(0.4);
      };

      const addCodeBlock = (code) => {
        if (doc.y > 700) doc.addPage();
        doc.fontSize(9).font('Courier').fillColor('#000000');
        doc.rect(60, doc.y, 475, code.split('\n').length * 12 + 10).fillAndStroke('#f5f5f5', '#cccccc');
        doc.fillColor('#000000').text(code, 70, doc.y - (code.split('\n').length * 12 + 5));
        doc.moveDown(1);
        doc.font('Helvetica').fillColor(darkGray);
      };

      // Cover Page
      const logoPath = path.join(__dirname, '../../public/ForvisMazars-Logo-Color-RGB.jpg');
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, 197, 120, { width: 200 });
      }

      doc.moveDown(10);
      doc.fontSize(36).fillColor(primaryBlue).font('Helvetica-Bold').text('SAFE-8', { align: 'center' });
      doc.moveDown(0.8);
      doc.fontSize(26).fillColor(secondaryRed).font('Helvetica').text('Assessment Platform', { align: 'center' });
      doc.moveDown(1.2);
      doc.fontSize(20).fillColor(mediumGray).text('System Documentation', { align: 'center' });
      
      doc.moveDown(5);
      doc.fontSize(11).fillColor(lightGray).text('Version 1.0', { align: 'center' });
      doc.moveDown(0.3);
      doc.text(`Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, { align: 'center' });
      
      doc.moveDown(8);
      doc.fontSize(9).fillColor(lightGray).text('Forvis Mazars Confidential', { align: 'center' });
      doc.font('Helvetica');

      // Table of Contents
      doc.addPage();
      doc.fontSize(20).fillColor(primaryBlue).font('Helvetica-Bold').text('Table of Contents');
      doc.moveDown(0.3);
      doc.moveTo(60, doc.y).lineTo(535, doc.y).stroke(primaryBlue);
      doc.moveDown(0.8);
      
      const toc = [
        '1. Executive Summary',
        '2. System Overview',
        '3. Technical Architecture',
        '4. User Roles and Permissions',
        '5. Assessment Types',
        '6. Core Features',
        '7. Admin Dashboard',
        '8. Security and Compliance',
        '9. API Documentation',
        '10. Database Schema',
        '11. Deployment and Configuration',
        '12. Troubleshooting'
      ];

      doc.fontSize(11).fillColor(darkGray).font('Helvetica');
      toc.forEach(item => {
        doc.text(item, 70);
        doc.moveDown(0.4);
      });

      // 1. Executive Summary
      doc.addPage();
      addSectionTitle('1. Executive Summary');
      addParagraph('The SAFE-8 Assessment Platform is a comprehensive AI readiness evaluation tool designed by Forvis Mazars to help organizations assess their preparedness for artificial intelligence adoption and implementation.');
      addParagraph('This platform provides a structured framework for evaluating organizations across eight critical pillars of AI readiness, delivering actionable insights and personalized recommendations.');
      
      addSubsectionTitle('Key Capabilities');
      addBulletPoint('Multi-tiered assessment system (Core, Advanced, Frontier)');
      addBulletPoint('Real-time scoring and visual analytics with radar charts');
      addBulletPoint('Automated PDF report generation and email delivery');
      addBulletPoint('Comprehensive admin dashboard for platform management');
      addBulletPoint('Industry-specific benchmarking and insights');
      addBulletPoint('Role-based access control (Users, Admins, Super Admins)');
      addBulletPoint('Detailed activity logging and audit trails');

      addSubsectionTitle('Target Users');
      addBulletPoint('Organizations seeking to evaluate AI readiness');
      addBulletPoint('C-suite executives and decision makers');
      addBulletPoint('IT and digital transformation teams');
      addBulletPoint('Forvis Mazars consultants and advisors');

      // 2. System Overview
      doc.addPage();
      addSectionTitle('2. System Overview');
      
      addSubsectionTitle('Platform Purpose');
      addParagraph('SAFE-8 evaluates organizational AI readiness across eight fundamental pillars: Strategy, Architecture, Foundations, Ecosystem, Security, Compliance, People, and Innovation.');
      
      addSubsectionTitle('Eight Pillars of AI Readiness');
      addBulletPoint('Strategy: Strategic vision and AI alignment with business objectives');
      addBulletPoint('Architecture: Technical infrastructure and system design readiness');
      addBulletPoint('Foundations: Data quality, governance, and foundational capabilities');
      addBulletPoint('Ecosystem: Partner networks, vendor relationships, and external collaboration');
      addBulletPoint('Security: Cybersecurity measures and AI-specific security protocols');
      addBulletPoint('Compliance: Regulatory adherence and ethical AI frameworks');
      addBulletPoint('People: Workforce skills, culture, and change management');
      addBulletPoint('Innovation: R&D capabilities and continuous improvement processes');

      addSubsectionTitle('Assessment Flow');
      addParagraph('1. User selects assessment type (Core, Advanced, or Frontier)');
      addParagraph('2. Completes industry selection and basic information');
      addParagraph('3. Answers pillar-specific questions (weighted by admin-configured settings)');
      addParagraph('4. Receives immediate scoring with radar chart visualization');
      addParagraph('5. Downloads comprehensive PDF report with insights');
      addParagraph('6. Receives automated email with PDF attachment');

      // 3. Technical Architecture
      doc.addPage();
      addSectionTitle('3. Technical Architecture');
      
      addSubsectionTitle('Technology Stack');
      addParagraph('Frontend: React 19.0.0, Vite 7.3.1, Recharts for data visualization');
      addParagraph('Backend: Node.js 22.14.0, Express 4.21.2');
      addParagraph('Database: Azure SQL Server (safe-8.database.windows.net/SAFE8)');
      addParagraph('PDF Generation: pdfkit 0.17.2');
      addParagraph('Email: nodemailer 7.0.12 with Gmail SMTP');
      addParagraph('Authentication: JWT tokens with bcrypt password hashing');
      
      addSubsectionTitle('Hosting and Infrastructure');
      addBulletPoint('Frontend: Azure App Service (safe-8-frontend.azurewebsites.net)');
      addBulletPoint('Backend: Azure App Service (safe-8.azurewebsites.net)');
      addBulletPoint('Database: Azure SQL Database with managed backups');
      addBulletPoint('SSL: Managed certificates through Azure');

      addSubsectionTitle('Key Dependencies');
      addCodeBlock(`{
  "react": "^19.0.0",
  "express": "^4.21.2",
  "mssql": "^11.0.3",
  "pdfkit": "^0.17.2",
  "nodemailer": "^7.0.12",
  "bcrypt": "^5.1.1",
  "jsonwebtoken": "^9.0.2"
}`);

      // 4. User Roles
      doc.addPage();
      addSectionTitle('4. User Roles and Permissions');
      
      addSubsectionTitle('User Role');
      addBulletPoint('Purpose: Take assessments and view personal results');
      addBulletPoint('Permissions: Create account, complete assessments, download results PDF');
      addBulletPoint('Access: Public-facing assessment interface');
      
      addSubsectionTitle('Admin Role');
      addBulletPoint('Purpose: Manage platform content and configuration');
      addBulletPoint('Permissions: Manage industries, assessment types, questions, view analytics');
      addBulletPoint('Access: Admin dashboard at /admin');
      addBulletPoint('Features: CRUD operations on all platform data');
      
      addSubsectionTitle('Super Admin Role');
      addBulletPoint('Purpose: Full system control and user management');
      addBulletPoint('Permissions: All admin permissions plus user management and pillar weighting');
      addBulletPoint('Access: Enhanced admin dashboard with additional controls');
      addBulletPoint('Special Features: Configure pillar weights, manage admin accounts, access audit logs');

      // 5. Assessment Types
      doc.addPage();
      addSectionTitle('5. Assessment Types');
      
      addSubsectionTitle('Core Assessment');
      addParagraph('Foundational evaluation designed for organizations beginning their AI journey.');
      addParagraph('Characteristics:');
      addBulletPoint('Duration: 5-8 minutes');
      addBulletPoint('Questions: 20-25 foundational questions');
      addBulletPoint('Target: All organizational levels');
      addBulletPoint('Focus: Basic AI readiness and awareness');
      
      addSubsectionTitle('Advanced Assessment');
      addParagraph('Comprehensive evaluation for organizations with existing AI initiatives.');
      addParagraph('Characteristics:');
      addBulletPoint('Duration: 15-20 minutes');
      addBulletPoint('Questions: 40-50 detailed questions');
      addBulletPoint('Target: IT leaders and decision makers');
      addBulletPoint('Focus: Technical depth and implementation readiness');
      
      addSubsectionTitle('Frontier Assessment');
      addParagraph('Expert-level assessment for AI-mature organizations.');
      addParagraph('Characteristics:');
      addBulletPoint('Duration: 25-35 minutes');
      addBulletPoint('Questions: 60-75 advanced questions');
      addBulletPoint('Target: AI specialists and strategic planners');
      addBulletPoint('Focus: Cutting-edge capabilities and innovation');

      // 6. Core Features
      doc.addPage();
      addSectionTitle('6. Core Features');
      
      addSubsectionTitle('PDF Report Generation');
      addParagraph('Automatically generates professional PDF reports using pdfkit with Forvis Mazars branding. Reports include radar charts, pillar scores, recommendations, and insights.');
      
      addSubsectionTitle('Email Delivery');
      addParagraph('Sends assessment results via email using nodemailer with Gmail SMTP. Includes PDF attachment and personalized messaging.');
      
      addSubsectionTitle('Radar Chart Visualization');
      addParagraph('Interactive radar charts built with Recharts display scores across all eight pillars, providing visual representation of AI readiness.');
      
      addSubsectionTitle('Pillar Weighting System');
      addParagraph('Super admins can configure custom weights for each pillar (0.5x to 2.0x) to emphasize specific areas based on organizational priorities.');
      
      addSubsectionTitle('Activity Logging');
      addParagraph('Comprehensive audit trail tracks all user actions including logins, assessment completions, admin changes, with timestamps and IP addresses.');

      // 7. Admin Dashboard
      doc.addPage();
      addSectionTitle('7. Admin Dashboard');
      
      addSubsectionTitle('Industries Management');
      addBulletPoint('Create, edit, delete industries with descriptions');
      addBulletPoint('Set active/inactive status');
      addBulletPoint('View industry usage statistics');
      
      addSubsectionTitle('Assessment Types Management');
      addBulletPoint('Configure Core, Advanced, Frontier assessments');
      addBulletPoint('Set difficulty levels and duration estimates');
      addBulletPoint('Manage question pools');
      
      addSubsectionTitle('Questions Management');
      addBulletPoint('CRUD operations on assessment questions');
      addBulletPoint('Assign questions to pillars and assessment types');
      addBulletPoint('Configure answer options and scoring');
      
      addSubsectionTitle('Analytics Dashboard');
      addBulletPoint('View total assessments, users, and completion rates');
      addBulletPoint('Industry distribution charts');
      addBulletPoint('Average scores by pillar');
      addBulletPoint('User activity trends');
      
      addSubsectionTitle('User Management (Super Admin)');
      addBulletPoint('View all registered users');
      addBulletPoint('Promote/demote admin privileges');
      addBulletPoint('Delete user accounts');
      addBulletPoint('Force password resets');

      // 8. Security
      doc.addPage();
      addSectionTitle('8. Security and Compliance');
      
      addSubsectionTitle('Authentication');
      addBulletPoint('JWT tokens with secure HTTP-only storage');
      addBulletPoint('Bcrypt password hashing (10 rounds)');
      addBulletPoint('Password reset with secure tokens');
      addBulletPoint('Session timeout after inactivity');
      
      addSubsectionTitle('Authorization');
      addBulletPoint('Role-based access control (RBAC)');
      addBulletPoint('Middleware-enforced permission checks');
      addBulletPoint('Super admin-only routes for sensitive operations');
      
      addSubsectionTitle('Data Protection');
      addBulletPoint('SSL/TLS encryption for all traffic');
      addBulletPoint('Azure SQL with encrypted connections');
      addBulletPoint('Parameterized queries prevent SQL injection');
      addBulletPoint('CORS configured for trusted origins');
      
      addSubsectionTitle('Audit Trail');
      addBulletPoint('All user actions logged with timestamps');
      addBulletPoint('IP address tracking');
      addBulletPoint('Immutable audit records');
      addBulletPoint('90-day retention policy');

      // 9. API Documentation
      doc.addPage();
      addSectionTitle('9. API Documentation');
      
      addSubsectionTitle('Authentication Endpoints');
      addCodeBlock(`POST /api/auth/register
POST /api/auth/login
POST /api/auth/request-password-reset
POST /api/auth/reset-password`);
      
      addSubsectionTitle('Assessment Endpoints');
      addCodeBlock(`GET /api/assessments/types
GET /api/industries
GET /api/questions/:assessmentType
POST /api/submit-assessment
GET /api/assessment-history/:userId`);
      
      addSubsectionTitle('Admin Endpoints');
      addCodeBlock(`GET /api/admin/industries
POST /api/admin/industries
PUT /api/admin/industries/:id
DELETE /api/admin/industries/:id
GET /api/admin/assessment-types
POST /api/admin/assessment-types
GET /api/admin/questions
POST /api/admin/questions
PUT /api/admin/questions/:id
DELETE /api/admin/questions/:id
GET /api/admin/stats
GET /api/admin/analytics`);
      
      addSubsectionTitle('Super Admin Endpoints');
      addCodeBlock(`GET /api/admin/users
PUT /api/admin/users/:id/role
DELETE /api/admin/users/:id
GET /api/admin/pillar-weights
PUT /api/admin/pillar-weights
GET /api/admin/activity-logs`);

      // 10. Database Schema
      doc.addPage();
      addSectionTitle('10. Database Schema');
      
      addSubsectionTitle('Users Table');
      addCodeBlock(`user_id (INT, PK)
username (NVARCHAR)
email (NVARCHAR)
password_hash (NVARCHAR)
full_name (NVARCHAR)
role (NVARCHAR) - 'user', 'admin', 'super_admin'
created_at (DATETIME)
must_change_password (BIT)
is_super_admin (BIT)`);
      
      addSubsectionTitle('Industries Table');
      addCodeBlock(`industry_id (INT, PK)
name (NVARCHAR)
description (NVARCHAR)
is_active (BIT)
created_at (DATETIME)`);
      
      addSubsectionTitle('Assessment_Types Table');
      addCodeBlock(`assessment_type_id (INT, PK)
type_name (NVARCHAR)
description (NVARCHAR)
difficulty_level (NVARCHAR)
estimated_duration (NVARCHAR)
is_active (BIT)`);
      
      addSubsectionTitle('Questions Table');
      addCodeBlock(`question_id (INT, PK)
assessment_type_id (INT, FK)
pillar (NVARCHAR)
question_text (NVARCHAR)
options (NVARCHAR) - JSON array
correct_answer (NVARCHAR)
question_order (INT)`);

      // 11. Deployment
      doc.addPage();
      addSectionTitle('11. Deployment and Configuration');
      
      addSubsectionTitle('Environment Variables');
      addCodeBlock(`DB_SERVER=safe-8.database.windows.net
DB_DATABASE=SAFE8
DB_USER=<username>
DB_PASSWORD=<password>
JWT_SECRET=<secret>
EMAIL_USER=<gmail>
EMAIL_PASS=<app-password>
PORT=3000`);
      
      addSubsectionTitle('Azure Deployment Steps');
      addParagraph('1. Build frontend: npm run build');
      addParagraph('2. Deploy backend to Azure App Service');
      addParagraph('3. Deploy frontend build to separate App Service');
      addParagraph('4. Configure environment variables in Azure');
      addParagraph('5. Enable managed SSL certificates');
      addParagraph('6. Configure CORS for frontend domain');
      
      addSubsectionTitle('Local Development');
      addCodeBlock(`# Backend
cd server
npm install
node index.js

# Frontend
npm install
npm run dev`);

      // 12. Troubleshooting
      doc.addPage();
      addSectionTitle('12. Troubleshooting');
      
      addSubsectionTitle('Common Issues');
      
      addParagraph('Database Connection Errors:');
      addBulletPoint('Verify Azure SQL firewall rules allow your IP');
      addBulletPoint('Check environment variables are set correctly');
      addBulletPoint('Ensure database credentials are valid');
      
      addParagraph('Email Delivery Failures:');
      addBulletPoint('Verify Gmail app password is configured');
      addBulletPoint('Check EMAIL_USER and EMAIL_PASS environment variables');
      addBulletPoint('Ensure "Less secure app access" is enabled (if using regular password)');
      
      addParagraph('PDF Generation Issues:');
      addBulletPoint('Verify pdfkit is installed: npm install pdfkit');
      addBulletPoint('Check logo file exists at public/ForvisMazars-Logo-Color-RGB.jpg');
      addBulletPoint('Ensure sufficient disk space for temporary files');
      
      addParagraph('Authentication Problems:');
      addBulletPoint('Clear browser localStorage and cookies');
      addBulletPoint('Verify JWT_SECRET is set in environment');
      addBulletPoint('Check token expiration settings');

      // Footer on last page
      doc.moveDown(3);
      doc.fontSize(9).fillColor(lightGray).text('End of Documentation', { align: 'center' });
      doc.moveDown(0.5);
      doc.text(`Generated: ${new Date().toLocaleString('en-US')}`, { align: 'center' });
      doc.text('Forvis Mazars Confidential', { align: 'center' });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

export async function generateAppDocumentationPDFBuffer() {
  return generateAppDocumentationPDF(null);
}
