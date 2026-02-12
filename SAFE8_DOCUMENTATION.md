# SAFE-8 Assessment Platform
## System Documentation

**Version:** 1.0  
**Generated:** February 3, 2026  
**Organization:** Forvis Mazars  
**Status:** Confidential

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Overview](#2-system-overview)
3. [Technical Architecture](#3-technical-architecture)
4. [User Roles and Permissions](#4-user-roles-and-permissions)
5. [Assessment Types](#5-assessment-types)
6. [Core Features](#6-core-features)
7. [Admin Dashboard](#7-admin-dashboard)
8. [Security and Compliance](#8-security-and-compliance)
9. [API Documentation](#9-api-documentation)
10. [Database Schema](#10-database-schema)
11. [Deployment and Configuration](#11-deployment-and-configuration)
12. [Troubleshooting](#12-troubleshooting)

---

## 1. Executive Summary

The SAFE-8 Assessment Platform is a comprehensive AI readiness evaluation tool designed by Forvis Mazars to help organizations assess their preparedness for artificial intelligence adoption and implementation.

This platform provides a structured framework for evaluating organizations across eight critical pillars of AI readiness, delivering actionable insights and personalized recommendations.

### Key Capabilities

- Multi-tiered assessment system (Core, Advanced, Frontier)
- Real-time scoring and visual analytics with radar charts
- Automated PDF report generation and email delivery
- Comprehensive admin dashboard for platform management
- Industry-specific benchmarking and insights
- Role-based access control (Users, Admins, Super Admins)
- Detailed activity logging and audit trails

### Target Users

- Organizations seeking to evaluate AI readiness
- C-suite executives and decision makers
- IT and digital transformation teams
- Forvis Mazars consultants and advisors

---

## 2. System Overview

### Purpose and Scope

SAFE-8 is designed to provide organizations with a clear understanding of their AI readiness across eight fundamental pillars. The platform guides users through structured assessments, analyzes their responses, and generates comprehensive reports with tailored recommendations.

### Assessment Pillars

The platform evaluates organizations across the following eight pillars:

1. **STRAT - Strategy**: AI vision, goals, and strategic alignment
2. **DATA - Data Management**: Data quality, governance, and accessibility
3. **TECH - Technology Infrastructure**: Systems, tools, and scalability
4. **SKILL - Skills and Talent**: Team capabilities and training
5. **PROC - Processes**: Workflows, documentation, and optimization
6. **GOV - Governance**: Policies, compliance, and risk management
7. **CULT - Culture**: Innovation mindset and change readiness
8. **ETH - Ethics**: Responsible AI, fairness, and transparency

### Workflow

1. **User Registration**: Organizations create accounts with company details
2. **Assessment Selection**: Choose appropriate assessment level (Core/Advanced/Frontier)
3. **Question Response**: Answer tailored questions across all eight pillars
4. **Scoring and Analysis**: Real-time calculation of pillar scores and overall readiness
5. **Results Delivery**: View interactive dashboard with radar charts and receive PDF report via email
6. **Historical Tracking**: Access previous assessments and track improvement over time

---

## 3. Technical Architecture

### Technology Stack

#### Frontend
- **React 19.0.0** - Modern UI framework
- **Vite 7.3.1** - Fast build tool and dev server
- **React Router 7.1.1** - Client-side routing
- **Recharts 2.15.0** - Data visualization and radar charts
- **Axios** - HTTP client for API communication

#### Backend
- **Node.js 22.14.0** - JavaScript runtime
- **Express 4.21.2** - Web application framework
- **ES Modules** - Modern JavaScript module system

#### Database
- **Azure SQL Server** - Cloud-based relational database
- **MSSQL 11.0.1** - SQL Server driver for Node.js

#### Security
- **bcryptjs 2.4.3** - Password hashing
- **jsonwebtoken 9.0.2** - JWT authentication
- **csrf-csrf 3.0.8** - CSRF protection
- **express-rate-limit 7.4.1** - Rate limiting

#### PDF Generation
- **PDFKit 0.17.2** - Professional PDF document creation

#### Email Service
- **Nodemailer 7.0.12** - Email delivery via Gmail SMTP

### Architecture Pattern

The application follows a modern three-tier architecture:

- **Presentation Layer**: React SPA with component-based UI
- **Application Layer**: Express.js REST API with middleware
- **Data Layer**: Azure SQL Server with stored procedures

### Key Design Patterns

- **MVC Pattern**: Separation of models, views, and controllers
- **Repository Pattern**: Database abstraction through model classes
- **Middleware Pattern**: Request processing pipeline
- **Service Layer**: Business logic encapsulation

---

## 4. User Roles and Permissions

### User Role

Standard users who take assessments and view their results.

**Permissions:**
- Create account and login
- Take assessments (Core, Advanced, Frontier)
- View assessment results and history
- Download PDF reports
- Update profile information
- Reset password

### Admin Role

Platform administrators who manage content and users.

**Permissions:**
- All user permissions
- View and manage all users
- Create, edit, delete assessment questions
- Manage assessment types and configurations
- View all assessments and export PDFs
- Manage industries and pillars
- Access activity logs and analytics
- Configure pillar weights and scoring

### Super Admin Role

System administrators with full platform control.

**Permissions:**
- All admin permissions
- Create, edit, delete admin accounts
- Manage admin roles and permissions
- Access system configuration
- View complete audit trails

---

## 5. Assessment Types

### Core Assessment

Entry-level assessment designed for organizations beginning their AI journey.

**Characteristics:**
- **Duration**: Approximately 5-8 minutes
- **Questions**: 20-25 foundational questions
- **Target Audience**: All organizational levels
- **Focus**: Basic AI readiness and awareness
- **Difficulty**: Beginner-friendly

### Advanced Assessment

Intermediate assessment for organizations with some AI experience.

**Characteristics:**
- **Duration**: Approximately 10-15 minutes
- **Questions**: 30-40 detailed questions
- **Target Audience**: Managers and team leads
- **Focus**: Deeper evaluation of capabilities and processes
- **Difficulty**: Moderate complexity

### Frontier Assessment

Advanced assessment for mature AI organizations.

**Characteristics:**
- **Duration**: Approximately 15-20 minutes
- **Questions**: 50+ comprehensive questions
- **Target Audience**: Senior executives and AI leaders
- **Focus**: Strategic alignment and advanced capabilities
- **Difficulty**: Expert-level

---

## 6. Core Features

### User Dashboard

Personalized dashboard showing assessment history and results.

- Assessment history table with scores and completion dates
- Quick access to retake assessments
- Profile management
- Assessment type selection cards

### Assessment Interface

Intuitive question-by-question interface with progress tracking.

- Clean, focused layout for optimal user experience
- Progress bar showing completion status
- Question navigation (previous/next)
- 5-point Likert scale responses
- Auto-save functionality
- Real-time validation

### Results and Analytics

Comprehensive results presentation with visual analytics.

- Overall AI readiness score (0-100%)
- Interactive radar chart showing all eight pillars
- Pillar-by-pillar breakdown with scores
- Comparison to industry benchmarks
- Historical trend analysis
- Downloadable PDF reports

### PDF Report Generation

Professional, branded PDF reports with detailed insights.

- Forvis Mazars branding and styling
- Executive summary
- Visual radar chart of results
- Pillar scores with descriptions
- Personalized recommendations
- Industry context and benchmarks
- Next steps and action items

### Email Delivery

Automated email delivery of assessment results.

- Immediate delivery upon assessment completion
- Professional HTML email template
- PDF report attached
- Summary of results in email body
- Links to access platform

---

## 7. Admin Dashboard

### Dashboard Overview

Real-time statistics and analytics for platform monitoring.

- Total users, assessments, and questions
- Average assessment scores
- Assessment type breakdown
- Recent activity feed
- Quick access to all management functions

### User Management

Comprehensive user administration capabilities.

- View all users with pagination
- Search users by name, email, company
- Create new user accounts
- Edit user profiles and details
- Delete users (with confirmation)
- View user assessment history
- Export user assessment PDFs

### Question Management

Full CRUD operations for assessment questions.

- Create, edit, delete questions
- Filter by assessment type and pillar
- Drag-and-drop question reordering
- Activate/deactivate questions
- Bulk operations support
- Question preview

### Assessment Management

View and analyze all completed assessments.

- Complete assessment listing with pagination
- Search by user, company, industry
- Filter by assessment type
- View detailed assessment results
- Export individual assessment PDFs
- Delete assessments

### Activity Log

Comprehensive audit trail of all platform activities.

- Track all user and admin actions
- Filter by action type (CREATE, UPDATE, DELETE, VIEW)
- Filter by entity type (user, admin, question, assessment)
- View actor details and timestamps
- Search and export capabilities

### Configuration Management

Platform-wide configuration and customization.

- Manage assessment types and cards
- Add/edit/delete industries
- Manage assessment pillars
- Configure pillar weights
- Customize assessment type metadata

### Admin Management (Super Admin)

Admin account management for super admins.

- Create admin and super admin accounts
- Edit admin profiles
- Activate/deactivate admin accounts
- Delete admin accounts
- Force password changes

---

## 8. Security and Compliance

### Authentication and Authorization

Multi-layered security approach for user and admin access.

- JWT-based authentication with secure token generation
- Password hashing using bcrypt (12 rounds)
- Role-based access control (RBAC)
- Session management with token expiration
- Secure password reset flow with time-limited tokens
- Force password change on first login

### Data Protection

- Azure SQL Server with encryption at rest
- HTTPS/TLS encryption for data in transit
- Soft deletion for data recovery
- No sensitive data in client-side storage
- Secure database connection strings

### Application Security

- CSRF protection on all state-changing operations
- Rate limiting to prevent abuse
- Input validation and sanitization
- SQL injection prevention via parameterized queries
- XSS protection through React's automatic escaping
- Security headers (CORS, CSP, etc.)

### Audit and Compliance

- Comprehensive activity logging
- User action tracking
- Admin action tracking
- Timestamp and actor attribution
- Audit trail for compliance requirements

---

## 9. API Documentation

### Authentication Endpoints

```
POST /api/auth/register
```
Register new user account

```
POST /api/auth/login
```
User login with credentials

```
POST /api/auth/forgot-password
```
Request password reset

```
POST /api/auth/reset-password
```
Reset password with token

```
POST /api/admin/login
```
Admin login

```
POST /api/admin/change-password
```
Change admin password

### User Endpoints

```
GET /api/leads/me
```
Get current user profile

```
PUT /api/leads/me
```
Update user profile

```
GET /api/leads/assessments
```
Get user assessment history

```
POST /api/leads/assessments
```
Submit new assessment

### Assessment Endpoints

```
GET /api/questions?type={type}
```
Get questions by assessment type

```
GET /api/assessment-types
```
Get available assessment types

```
GET /api/industries
```
Get industry list

### Admin Endpoints

```
GET /api/admin/stats
```
Dashboard statistics

```
GET /api/admin/users
```
List all users (paginated)

```
POST /api/admin/users
```
Create user

```
PUT /api/admin/users/:id
```
Update user

```
DELETE /api/admin/users/:id
```
Delete user

```
GET /api/admin/questions
```
List questions (filtered, paginated)

```
POST /api/admin/questions
```
Create question

```
PUT /api/admin/questions/:id
```
Update question

```
DELETE /api/admin/questions/:id
```
Delete question

```
GET /api/admin/assessments
```
List assessments (paginated)

```
GET /api/admin/assessments/:id
```
Get assessment details

```
GET /api/admin/assessments/:id/export-pdf
```
Export assessment PDF

```
DELETE /api/admin/assessments/:id
```
Delete assessment

```
GET /api/admin/activity
```
Activity logs (filtered, paginated)

### Configuration Endpoints

```
GET /api/admin/config/assessment-types
```
List assessment types

```
POST /api/admin/config/assessment-types
```
Create assessment type

```
DELETE /api/admin/config/assessment-types/:type
```
Delete type

```
GET /api/admin/config/industries
```
List industries

```
POST /api/admin/config/industries
```
Create industry

```
PUT /api/admin/config/industries/:id
```
Update industry

```
DELETE /api/admin/config/industries/:id
```
Delete industry

```
GET /api/admin/config/pillars
```
List pillars

```
POST /api/admin/config/pillars
```
Create pillar

```
PUT /api/admin/config/pillars/:id
```
Update pillar

```
DELETE /api/admin/config/pillars/:id
```
Delete pillar

```
GET /api/admin/documentation/generate-pdf
```
Generate and download application documentation PDF

---

## 10. Database Schema

### Core Tables

#### leads
User accounts and profiles

**Columns:**
- `id` (primary key)
- `email`
- `password_hash`
- `full_name`
- `company_name`
- `industry`
- `company_size`
- `phone_number`
- `country_code`
- `country`
- `created_at`
- `last_login_at`
- `deleted_at`

#### assessments
Completed assessments

**Columns:**
- `id` (primary key)
- `lead_id` (foreign key)
- `assessment_type`
- `overall_score`
- `pillar_scores` (JSON)
- `completed_at`
- `created_at`
- `deleted_at`

#### assessment_questions
Question bank

**Columns:**
- `id` (primary key)
- `assessment_type`
- `pillar_short_name`
- `question_text`
- `question_order`
- `is_active`
- `created_at`
- `updated_at`
- `deleted_at`

#### assessment_responses
User responses

**Columns:**
- `id` (primary key)
- `assessment_id`
- `question_id`
- `response_value` (1-5)
- `created_at`

### Configuration Tables

#### industries
Industry master data

**Columns:**
- `id` (primary key)
- `name`
- `is_active`
- `created_at`
- `updated_at`

#### assessment_pillars
Pillar definitions

**Columns:**
- `id` (primary key)
- `name`
- `short_name`
- `description`
- `is_active`
- `created_at`
- `updated_at`

#### pillar_weights
Scoring weights by assessment type

**Columns:**
- `id` (primary key)
- `assessment_type`
- `pillar_short_name`
- `weight_percentage`
- `created_at`
- `updated_at`

### Admin Tables

#### admins
Admin user accounts

**Columns:**
- `id` (primary key)
- `username`
- `email`
- `password_hash`
- `full_name`
- `role`
- `is_active`
- `must_change_password`
- `created_at`
- `last_login_at`
- `deleted_at`

#### password_reset_tokens
Password reset tracking

**Columns:**
- `id` (primary key)
- `lead_id` / `admin_id`
- `token`
- `user_type` (lead/admin)
- `expires_at`
- `used_at`
- `created_at`

#### user_activity_logs
Audit trail

**Columns:**
- `id` (primary key)
- `actor_id`
- `actor_type`
- `action_type`
- `entity_type`
- `entity_id`
- `description`
- `ip_address`
- `created_at`

---

## 11. Deployment and Configuration

### Environment Variables

**Backend (.env file):**

```env
PORT=5000
NODE_ENV=production
DB_SERVER=safe-8.database.windows.net
DB_NAME=SAFE8
DB_USER=saadmin
DB_PASSWORD=[your-password]
JWT_SECRET=[your-jwt-secret]
EMAIL_USER=jaredmoodley1212@gmail.com
EMAIL_PASSWORD=[app-password]
CLIENT_URL=https://your-domain.com
```

### Frontend Configuration

Update `src/services/api.js` with production API URL:

```javascript
const API_BASE_URL = process.env.NODE_ENV === 'production'
  ? 'https://api.your-domain.com/api'
  : 'http://localhost:5000/api';
```

### Deployment Steps

#### Backend Deployment

1. Set environment variables on hosting platform
2. Run `npm install` to install dependencies
3. Start server with `node index.js`
4. Ensure database connectivity

#### Frontend Deployment

1. Update API_BASE_URL in configuration
2. Run `npm run build` to create production build
3. Deploy `dist/` folder to static hosting
4. Configure routing for SPA

### Database Setup

1. Create Azure SQL Server instance
2. Configure firewall rules
3. Run database migration scripts
4. Create initial admin account
5. Seed default data (industries, pillars)

---

## 12. Troubleshooting

### Common Issues and Solutions

#### Login Issues

- Verify database connection
- Check JWT_SECRET is configured
- Ensure password is hashed correctly
- Verify user account is active

#### Email Delivery Issues

- Check EMAIL_USER and EMAIL_PASSWORD
- Verify Gmail app password is correct
- Check firewall/network restrictions
- Review email service logs

#### PDF Generation Issues

- Ensure PDFKit is installed
- Verify logo file exists in public folder
- Check file permissions
- Review PDF service logs

#### Database Connection Issues

- Verify connection string is correct
- Check database firewall rules
- Ensure IP address is whitelisted
- Verify database user credentials

#### Frontend Build Issues

- Clear node_modules and reinstall
- Check Node.js version compatibility
- Review Vite configuration
- Verify all dependencies are installed

### Logging and Debugging

The application includes comprehensive logging:

- **Server logs**: Console output with timestamps
- **Database queries**: SQL query logging
- **API requests**: Request/response logging
- **Error tracking**: Stack traces and error details
- **Activity logs**: User and admin actions in database

### Performance Optimization

- Enable database indexing on frequently queried columns
- Implement caching for static data (industries, pillars)
- Use pagination for large datasets
- Optimize SQL queries with proper indexes
- Enable gzip compression on server
- Minify frontend assets in production

---

## Appendix

### Contact Information

For technical support or questions:

- **Email**: support@forvismazars.com
- **Platform**: SAFE-8 Assessment Platform
- **Version**: 1.0

### Additional Resources

- Forvis Mazars website: www.forvismazars.com
- AI Readiness Assessment information
- Consulting services and support

---

**Confidentiality Notice:** This documentation is confidential and proprietary to Forvis Mazars. Unauthorized distribution or reproduction is prohibited.

---

*Document generated: February 3, 2026*
