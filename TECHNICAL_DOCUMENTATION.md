# SAFE-8 Assessment Platform - Technical Documentation

## Table of Contents
1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Folder Structure](#folder-structure)
4. [Routing System](#routing-system)
5. [Database Configuration](#database-configuration)
6. [Security Implementation](#security-implementation)
7. [Frontend Components](#frontend-components)
8. [API Endpoints](#api-endpoints)
9. [Middleware](#middleware)
10. [Deployment](#deployment)

---

## 1. Project Overview

SAFE-8 is a full-stack web application for conducting security and compliance assessments. The platform provides:
- Multiple assessment types (SAFE-8, ITAC, CMMC)
- User registration and authentication
- Admin dashboard for managing assessments
- PDF report generation
- Email notifications
- Real-time assessment scoring

**Technology Stack:**
- Frontend: React 19.2.0 with Vite
- Backend: Node.js with Express
- Database: Microsoft SQL Server
- Deployment: Azure App Service

---

## 2. Architecture

The application follows a three-tier architecture:

```
Client (React + Vite)
    |
    | HTTP/HTTPS
    |
API Server (Express.js)
    |
    | SQL Queries
    |
Database (MS SQL Server)
```

**Key Features:**
- RESTful API design
- Session-based authentication
- CSRF protection
- Rate limiting
- Caching layer (Redis/in-memory)
- PDF generation service
- Email service integration

---

## 3. Folder Structure

### Root Level Structure

```
Safe-8-assessment-main/
|
|-- server/                    # Backend API server
|   |-- config/               # Configuration files
|   |-- controllers/          # Business logic
|   |-- middleware/           # Express middleware
|   |-- models/              # Database models
|   |-- routes/              # API route definitions
|   |-- services/            # External services (email, PDF)
|   |-- utils/               # Utility functions
|   |-- index.js             # Server entry point
|   |-- package.json         # Server dependencies
|
|-- src/                      # Frontend React application
|   |-- components/          # React components
|   |-- services/            # API client services
|   |-- config/              # Frontend configuration
|   |-- assets/              # Images, fonts, etc.
|   |-- App.jsx              # Main application component
|   |-- main.jsx             # Application entry point
|
|-- database_backup/          # Database scripts and backup
|-- cypress/                  # End-to-end tests
|-- public/                   # Static assets
|-- package.json             # Root dependencies
|-- vite.config.js           # Vite build configuration
|-- web.config               # IIS/Azure configuration
```

### Server Folder Breakdown

```
server/
|-- config/
|   |-- database.js          # Database connection pool
|   |-- redis.js             # Redis cache configuration
|   |-- simpleCache.js       # In-memory cache fallback
|   |-- constants.js         # Application constants
|   |-- weightProfiles.js    # Assessment scoring weights
|
|-- controllers/
|   |-- assessmentController.js  # Assessment business logic
|   |-- leadController.js        # Lead management logic
|
|-- middleware/
|   |-- csrf.js              # CSRF token protection
|   |-- errorHandler.js      # Global error handling
|   |-- validation.js        # Input validation rules
|
|-- models/
|   |-- Admin.js             # Admin user model
|   |-- Assessment.js        # Assessment data model
|   |-- Lead.js              # Lead/user model
|   |-- Response.js          # Assessment response model
|   |-- UserActivity.js      # Activity logging model
|
|-- routes/
|   |-- admin.js             # Admin endpoints
|   |-- assessment.js        # Single assessment operations
|   |-- assessments.js       # Bulk assessment operations
|   |-- lead.js              # User registration/login
|   |-- response.js          # Response handling
|
|-- services/
|   |-- emailService.js      # Email notifications
|   |-- pdfService.js        # PDF generation
|   |-- queueService.js      # Background job processing
```

### Frontend Folder Breakdown

```
src/
|-- components/
|   |-- WelcomeScreen.jsx       # Landing page
|   |-- LeadForm.jsx            # User registration
|   |-- AssessmentQuestions.jsx # Assessment interface
|   |-- AssessmentResults.jsx   # Results display
|   |-- AdminLogin.jsx          # Admin authentication
|   |-- AdminDashboard.jsx      # Admin panel
|   |-- UserDashboard.jsx       # User dashboard
|
|-- services/
|   |-- api.js                  # Axios API client
|
|-- config/
|   |-- questions.js            # Assessment questions data
```

---

## 4. Routing System

### Backend API Routes

The server uses Express Router to organize endpoints. Here's the main routing configuration:

**File: server/index.js (Lines 250-350)**

```javascript
// Import route modules
import responseRouter from './routes/response.js';
import leadRouter from './routes/lead.js';
import assessmentResponseRouter from './routes/assessmentResponse.js';
import userEngagementRouter from './routes/userEngagement.js';
import assessmentRouter from './routes/assessments.js';
import singleAssessmentRouter from './routes/assessment.js';
import adminRouter from './routes/admin.js';

// CSRF token generation endpoint
app.get('/api/csrf-token', generateToken, (req, res) => {
  res.json({ 
    success: true,
    csrfToken: req.csrfToken() 
  });
});

// Mount routers with rate limiting
app.use('/api/admin', authLimiter, adminRouter);
app.use('/api/response', doubleCsrfProtection, responseRouter);
app.use('/api/lead', leadRouter);
app.use('/api/assessment-response', doubleCsrfProtection, assessmentResponseRouter);
app.use('/api/user-engagement', userEngagementRouter);
app.use('/api/assessments', assessmentRouter);
app.use('/api/assessment', singleAssessmentRouter);
```

**Key Points:**
- Each route module handles a specific domain (admin, lead, assessment)
- Rate limiting applied to authentication endpoints
- CSRF protection on sensitive operations
- Modular structure for maintainability

### Frontend Routes

**File: src/App.jsx (Lines 100-150)**

```jsx
import { Routes, Route, Navigate } from 'react-router-dom'

function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<WelcomeScreen />} />
      <Route path="/lead-form" element={<LeadForm />} />
      <Route path="/assessment" element={<AssessmentQuestions />} />
      <Route path="/results" element={<AssessmentResults />} />
      
      {/* User Routes */}
      <Route path="/dashboard" element={<UserDashboard />} />
      
      {/* Admin Routes */}
      <Route path="/admin" element={<AdminLogin />} />
      <Route path="/admin/dashboard" element={<AdminDashboard />} />
      <Route path="/admin/change-password" element={<ChangePassword />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      
      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
```

**Navigation Flow:**
1. User lands on WelcomeScreen
2. Selects assessment type
3. Completes LeadForm (registration)
4. Proceeds to AssessmentQuestions
5. Views AssessmentResults
6. Can access UserDashboard for history

---

## 5. Database Configuration

### Connection Pool Setup

**File: server/config/database.js**

```javascript
import sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config();

const config = {
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT || '1433'),
  options: {
    encrypt: process.env.DB_ENCRYPT === 'yes',
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'yes',
    enableArithAbort: true,
    connectTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '60') * 1000,
    requestTimeout: parseInt(process.env.DB_REQUEST_TIMEOUT || '60000'),
  },
  pool: {
    max: parseInt(process.env.DB_POOL_MAX || '10'),
    min: parseInt(process.env.DB_POOL_MIN || '0'),
    idleTimeoutMillis: 30000,
    acquireTimeoutMillis: 60000
  }
};

// Add authentication
if (process.env.DB_INTEGRATED_SECURITY === 'true') {
  config.options.trustedConnection = true;
} else {
  config.user = process.env.DB_USER;
  config.password = process.env.DB_PASSWORD;
}
```

**Configuration Features:**
- Connection pooling for performance
- Configurable timeouts
- Support for both SQL Auth and Windows Auth
- Azure SQL encryption support
- Environment-based configuration

### Database Schema

**Main Tables:**

1. **leads** - User accounts
   - id, contact_name, email, password_hash, company_name, industry
   
2. **assessments** - Completed assessments
   - id, lead_id, assessment_type, overall_score, dimension_scores, responses
   
3. **admins** - Administrative users
   - id, username, password_hash, role, session_token
   
4. **user_activity_log** - Audit trail
   - id, user_id, action_type, ip_address, timestamp

---

## 6. Security Implementation

### CSRF Protection

**File: server/middleware/csrf.js**

```javascript
import { doubleCsrf } from 'csrf-csrf';
import cookieParser from 'cookie-parser';

const {
  generateToken,
  doubleCsrfProtection,
} = doubleCsrf({
  getSecret: () => process.env.CSRF_SECRET,
  cookieName: '__Host-csrf',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'strict',
    path: '/'
  },
  size: 64,
  ignoredMethods: ['GET', 'HEAD', 'OPTIONS']
});

export { generateToken, doubleCsrfProtection, cookieParser };
```

### Rate Limiting

**File: server/index.js (Lines 40-75)**

```javascript
import rateLimit from 'express-rate-limit';

// Authentication endpoints - 30 requests per 15 minutes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: 'Too many login attempts, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    return ip.split(':').pop();
  }
});

// General API endpoints - 100 requests per 15 minutes
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false
});
```

### Input Validation

**File: server/middleware/validation.js**

```javascript
import { body, validationResult } from 'express-validator';

export const validateLeadForm = [
  body('contactName')
    .trim()
    .notEmpty().withMessage('Contact name is required')
    .isLength({ min: 2, max: 200 }),
  
  body('email')
    .trim()
    .notEmpty()
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),
  
  body('companyName')
    .trim()
    .notEmpty()
    .isLength({ min: 2, max: 200 }),
  
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain uppercase, lowercase, and number'),
  
  handleValidationErrors
];
```

### Authentication Middleware

**File: server/routes/admin.js (Lines 60-90)**

```javascript
const authenticateAdmin = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No authentication token provided'
      });
    }

    const session = await Admin.verifySession(token);
    
    if (!session.success) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired session'
      });
    }

    req.admin = session.admin;
    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Authentication error'
    });
  }
};
```

---

## 7. Frontend Components

### Main Application Component

**File: src/App.jsx**

```jsx
import { useState, useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import api from './services/api'

function App() {
  // State management with sessionStorage persistence
  const [selectedAssessmentType, setSelectedAssessmentType] = useState(
    () => sessionStorage.getItem('assessmentType') || null
  )
  
  const [userData, setUserData] = useState(
    () => {
      const saved = sessionStorage.getItem('userData')
      return saved ? JSON.parse(saved) : null
    }
  )
  
  const [assessmentResults, setAssessmentResults] = useState(
    () => {
      const saved = sessionStorage.getItem('assessmentResults')
      return saved ? JSON.parse(saved) : null
    }
  )

  // Persist state to sessionStorage
  useEffect(() => {
    if (selectedAssessmentType) {
      sessionStorage.setItem('assessmentType', selectedAssessmentType)
    }
  }, [selectedAssessmentType])

  // Load industries from API
  useEffect(() => {
    const loadIndustries = async () => {
      try {
        const response = await api.get('/api/industries')
        setIndustries(response.data)
      } catch (error) {
        console.error('Error loading industries:', error)
      }
    }
    loadIndustries()
  }, [])

  return (
    <Routes>
      {/* Routes defined here */}
    </Routes>
  )
}
```

**Key Features:**
- Centralized state management
- Session persistence across page refreshes
- API integration for dynamic data
- React Router for navigation

### API Service Client

**File: src/services/api.js**

```javascript
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true
});

// Request interceptor for CSRF token
api.interceptors.request.use(async (config) => {
  if (['post', 'put', 'patch', 'delete'].includes(config.method)) {
    const csrfResponse = await axios.get(
      `${API_BASE_URL}/api/csrf-token`,
      { withCredentials: true }
    );
    config.headers['x-csrf-token'] = csrfResponse.data.csrfToken;
  }
  return config;
});

export default api;
```

---

## 8. API Endpoints

### Lead Management Routes

**File: server/routes/lead.js**

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | /api/lead/create | Register new user | No |
| POST | /api/lead/login | User login | No |
| POST | /api/lead/logout | User logout | Yes |
| POST | /api/lead/forgot-password | Request password reset | No |
| POST | /api/lead/reset-password | Reset password with token | No |
| GET | /api/lead/:id | Get user details | Yes |

**Example: Create Lead Endpoint**

```javascript
leadRouter.post('/create', async (req, res) => {
  try {
    const {
      contactName,
      email,
      companyName,
      password,
      industry
    } = req.body;

    // Validate required fields
    if (!contactName || !email || !companyName || !password) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Use updateOrCreate to handle duplicate emails
    const result = await Lead.updateOrCreate({
      contactName,
      email,
      companyName,
      password,
      industry
    });
    
    if (result.success) {
      // Send welcome email for new accounts
      if (result.isNew) {
        await sendWelcomeEmail({
          contact_name: contactName,
          email: email,
          company_name: companyName
        });
      }
      
      return res.status(200).json({
        success: true,
        leadId: result.leadId,
        isNew: result.isNew,
        message: 'Lead created successfully'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create lead'
    });
  }
});
```

### Assessment Routes

**File: server/routes/assessment.js**

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | /api/assessment/current/:userId/:type | Get latest assessment | No |
| POST | /api/assessment/submit | Submit assessment responses | Yes |

**Example: Get Current Assessment**

```javascript
assessmentRouter.get('/current/:userId/:assessmentType', async (req, res) => {
  try {
    const { userId, assessmentType } = req.params;
    
    const query = `
      SELECT TOP 1 
        a.*,
        l.contact_name,
        l.email,
        l.company_name,
        l.industry
      FROM assessments a
      LEFT JOIN leads l ON a.lead_id = l.id
      WHERE a.lead_id = ? 
        AND UPPER(a.assessment_type) = ?
      ORDER BY a.completed_at DESC
    `;
    
    const result = await database.query(query, [
      parseInt(userId), 
      assessmentType.toUpperCase()
    ]);
    
    if (result.length > 0) {
      res.json({
        success: true,
        data: {
          assessment_id: result[0].id,
          overall_score: result[0].overall_score,
          dimension_scores: JSON.parse(result[0].dimension_scores),
          responses: JSON.parse(result[0].responses),
          completed_at: result[0].completed_at
        }
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get assessment'
    });
  }
});
```

### Admin Routes

**File: server/routes/admin.js**

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | /api/admin/login | Admin login | No |
| POST | /api/admin/logout | Admin logout | Yes |
| GET | /api/admin/assessments | List all assessments | Yes (Admin) |
| GET | /api/admin/leads | List all leads | Yes (Admin) |
| GET | /api/admin/stats | Dashboard statistics | Yes (Admin) |
| POST | /api/admin/users/create | Create new admin | Yes (Super Admin) |
| DELETE | /api/admin/users/:id | Delete admin user | Yes (Super Admin) |

**Example: Admin Login**

```javascript
router.post('/login', validateAdminLogin, async (req, res) => {
  try {
    const { username, password } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];

    const result = await Admin.authenticate(
      username, 
      password, 
      ipAddress, 
      userAgent
    );

    if (result.success) {
      res.json(result);
    } else {
      res.status(401).json(result);
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Login error'
    });
  }
});
```

---

## 9. Middleware

### Error Handler

**File: server/middleware/errorHandler.js**

```javascript
export const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // SQL Server errors
  if (err.code === 'ECONNREFUSED') {
    return res.status(503).json({
      success: false,
      message: 'Database connection failed'
    });
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: err.errors
    });
  }

  // Default error
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error'
  });
};
```

### CORS Configuration

**File: server/index.js (Lines 150-180)**

```javascript
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'https://safe-8-assessment.azurewebsites.net',
  process.env.CORS_ORIGIN
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) {
      return callback(null, true);
    }
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      if (process.env.NODE_ENV === 'production') {
        const requestHost = origin.replace(/^https?:\/\//, '');
        const serverHost = process.env.WEBSITE_HOSTNAME;
        if (requestHost === serverHost) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      } else {
        callback(null, true);
      }
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-csrf-token'],
  credentials: true
}));
```

---

## 10. Deployment

### Environment Variables

**Required Variables:**

```
# Database Configuration
DB_SERVER=your-server.database.windows.net
DB_NAME=Safe8Assessment
DB_USER=your-username
DB_PASSWORD=your-password
DB_ENCRYPT=yes
DB_TRUST_SERVER_CERTIFICATE=no
DB_PORT=1433

# Application Settings
PORT=8080
NODE_ENV=production
CORS_ORIGIN=https://your-domain.azurewebsites.net

# Security
CSRF_SECRET=your-random-secret-key
JWT_SECRET=your-jwt-secret

# Email Configuration
EMAIL_HOST=smtp.office365.com
EMAIL_PORT=587
EMAIL_USER=your-email@domain.com
EMAIL_PASSWORD=your-password
EMAIL_FROM=noreply@domain.com

# Azure Settings
WEBSITE_HOSTNAME=your-app.azurewebsites.net
```

### Build Scripts

**package.json**

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "server": "cd server && npm start",
    "server:dev": "cd server && npm run dev"
  }
}
```

**server/package.json**

```json
{
  "scripts": {
    "start": "node index.js",
    "dev": "nodemon index.js"
  }
}
```

### Azure Deployment Configuration

**web.config**

```xml
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <system.webServer>
    <handlers>
      <add name="iisnode" path="server/index.js" verb="*" modules="iisnode"/>
    </handlers>
    <rewrite>
      <rules>
        <rule name="NodeInspector" patternSyntax="ECMAScript" stopProcessing="true">
          <match url="^server/index.js\/debug[\/]?" />
        </rule>
        <rule name="StaticContent">
          <action type="Rewrite" url="public{REQUEST_URI}"/>
        </rule>
        <rule name="DynamicContent">
          <conditions>
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="True"/>
          </conditions>
          <action type="Rewrite" url="server/index.js"/>
        </rule>
      </rules>
    </rewrite>
    <security>
      <requestFiltering>
        <hiddenSegments>
          <remove segment="bin"/>
        </hiddenSegments>
      </requestFiltering>
    </security>
    <httpErrors existingResponse="PassThrough" />
  </system.webServer>
</configuration>
```

### Deployment Steps

1. **Install Dependencies:**
   ```powershell
   npm install
   cd server
   npm install
   cd ..
   ```

2. **Build Frontend:**
   ```powershell
   npm run build
   ```

3. **Configure Environment:**
   - Set all environment variables in Azure App Service Configuration
   - Enable Application Insights for monitoring

4. **Deploy to Azure:**
   - Using Azure CLI:
     ```powershell
     az webapp up --name safe-8-assessment --resource-group YourResourceGroup
     ```
   - Or use GitHub Actions for CI/CD
   - Or deploy via VS Code Azure extension

5. **Database Setup:**
   - Run migration scripts from database_backup folder
   - Configure firewall rules for Azure SQL
   - Test connection from Azure App Service

---

## Summary

This technical documentation covers:

- Complete folder and file structure organization
- Backend routing with Express.js
- Frontend routing with React Router
- Database configuration and connection pooling
- Security implementations (CSRF, rate limiting, validation)
- API endpoint specifications
- Middleware architecture
- Deployment configuration for Azure

**Key Architectural Decisions:**

1. **Modular Structure**: Separate concerns into routes, models, controllers, and services
2. **Security First**: Multiple layers of protection (CSRF, rate limiting, input validation)
3. **Scalability**: Connection pooling, caching, and async operations
4. **Maintainability**: Clear folder structure, consistent naming, comprehensive error handling
5. **Cloud-Ready**: Environment-based configuration, Azure-optimized settings

**Development Best Practices:**

- Always validate input on both client and server
- Use parameterized queries to prevent SQL injection
- Implement proper error handling and logging
- Maintain session state for better user experience
- Follow RESTful API conventions
- Use middleware for cross-cutting concerns
- Keep sensitive data in environment variables
- Implement comprehensive testing (unit, integration, E2E)

---

**Document Version:** 1.0  
**Last Updated:** February 16, 2026  
**Application Version:** 1.0.0
