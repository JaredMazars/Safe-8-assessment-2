import express from 'express';
import cors from 'cors';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const helmet = require('helmet');
import morgan from 'morgan';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateToken, doubleCsrfProtection, cookieParser } from './middleware/csrf.js';
import database from './config/database.js';
import './services/emailService.js'; // Initialize email service
import { connectRedis } from './config/redis.js';
import responseRouter from './routes/response.js';
import leadRouter from './routes/lead.js';
import assessmentResponseRouter from './routes/assessmentResponse.js';
import userEngagementRouter from './routes/userEngagement.js';
import assessmentRouter from './routes/assessments.js';
import singleAssessmentRouter from './routes/assessment.js';
import adminRouter from './routes/admin.js';
import logger from './utils/logger.js';
import errorHandlerModule from './middleware/errorHandler.js';

const { errorHandler } = errorHandlerModule;

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || process.env.WEBSITES_PORT || 8080;

// Trust proxy for Azure App Service
app.set('trust proxy', 1);

// ✅ Rate Limiting Configuration
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 attempts per window
  message: 'Too many login attempts from this IP, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
  validate: false, // Disable validation to allow custom keyGenerator
  keyGenerator: (req) => {
    // Extract IP address without port number
    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    return ip.split(':').pop(); // Remove port if present
  },
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many login attempts from this IP, please try again after 15 minutes'
    });
  }
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window per IP
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  validate: false, // Disable validation to allow custom keyGenerator
  keyGenerator: (req) => {
    // Extract IP address without port number
    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    return ip.split(':').pop(); // Remove port if present
  }
});

// ✅ CORS Configuration - Allow localhost and Azure
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5173',
  'http://localhost:5174',
  'https://safe-8-assessment-d8cdftfveefggkgu.canadacentral-01.azurewebsites.net',
  process.env.CORS_ORIGIN // Additional CORS origin from env
].filter(Boolean);

// Middleware - Configure Helmet with secure CSP
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // Vite requires unsafe-inline for dev
      styleSrc: [
        "'self'", 
        "'unsafe-inline'", // React inline styles
        "https://fonts.googleapis.com",
        "https://cdnjs.cloudflare.com"
      ],
      fontSrc: [
        "'self'",
        "https://fonts.gstatic.com",
        "https://cdnjs.cloudflare.com"
      ],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: [
        "'self'",
        // Production: Use HTTPS only
        // Development: Allow HTTP for localhost development servers (safe - traffic never leaves machine)
        process.env.NODE_ENV === 'production' 
          ? 'https://safe-8-assessment-d8cdftfveefggkgu.canadacentral-01.azurewebsites.net'
          : 'http://localhost:*'
      ].filter(Boolean),
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null
    }
  },
  crossOriginEmbedderPolicy: false, // Required for some CDN resources
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(morgan('common'));

// ✅ Serve static frontend files in production (BEFORE other middleware)
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '..', 'dist');
  const fs = require('fs');
  
  console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
  console.log(`Looking for dist folder at: ${distPath}`);
  console.log(`Dist folder exists: ${fs.existsSync(distPath)}`);
  
  if (fs.existsSync(distPath)) {
    console.log(`Dist folder contents:`, fs.readdirSync(distPath));
  }
  
  app.use(express.static(distPath, {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.js')) {
        res.setHeader('Content-Type', 'application/javascript');
      } else if (filePath.endsWith('.css')) {
        res.setHeader('Content-Type', 'text/css');
      } else if (filePath.endsWith('.html')) {
        res.setHeader('Content-Type', 'text/html');
      }
    }
  }));
  console.log(`✅ Serving static files from: ${distPath}`);
} else {
  console.log(`⚠️ Running in development mode - frontend not served`);
}

// ✅ Secure CORS setup
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, same-origin)
    if (!origin) {
      return callback(null, true);
    }
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log(`⚠️ CORS blocked origin: ${origin}`);
      // In production, allow same domain requests
      if (process.env.NODE_ENV === 'production') {
        // Allow same-origin requests in production
        const requestHost = origin.replace(/^https?:\/\//, '');
        const serverHost = process.env.WEBSITE_HOSTNAME || 'safe-8-assessment-d8cdftfveefggkgu.canadacentral-01.azurewebsites.net';
        if (requestHost === serverHost) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      } else {
        callback(null, true); // Allow all in development only
      }
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-csrf-token'],
  credentials: true
}));

// ✅ Cookie parser for CSRF tokens
app.use(cookieParser());

// ✅ HTTPS enforcement in production
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      // Prevent open redirect vulnerability - validate host against allowed domains
      const host = req.header('host');
      const allowedHosts = [
        'safe-8-asessment.azurewebsites.net',
        'safe-8-assessment-d8cdftfveefggkgu.canadacentral-01.azurewebsites.net'
      ];
      
      // Only redirect if host is in allowlist
      if (allowedHosts.includes(host)) {
        // Use relative path to prevent absolute URL manipulation
        res.redirect(301, `https://${host}${req.url}`);
      } else {
        // Reject requests with suspicious hosts
        return res.status(400).send('Invalid host');
      }
    } else {
      next();
    }
  });
}

// ✅ Compression middleware for better performance (gzip)
app.use(compression());

// ✅ Request size limits for DoS protection
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ✅ CSRF token endpoint (must be before CSRF protection)
app.get('/api/csrf-token', (req, res) => {
  console.log('🔐 CSRF token requested');
  try {
    // generateToken from csrf-csrf expects (req, res) and sets the secret cookie automatically
    const token = generateToken(req, res);
    console.log('🔐 CSRF token generated successfully');
    // Also set a readable cookie for the client to access
    res.cookie('x-csrf-token', token, {
      sameSite: 'lax',
      path: '/',
      secure: false,
      httpOnly: false, // JavaScript needs to read this
    });
    res.json({ csrfToken: token });
  } catch (error) {
    console.error('❌ Error generating CSRF token:', error);
    res.status(500).json({ error: 'Failed to generate CSRF token' });
  }
});

// ✅ Apply general API rate limiting
app.use('/api', apiLimiter);
console.log('✅ Rate limiting enabled');

// ✅ Apply strict rate limiting to authentication endpoints
app.use('/api/admin/login', authLimiter);
app.use('/api/lead/login', authLimiter);

// Public API endpoint for industries (used by welcome screen)
app.get('/api/industries', async (req, res) => {
  try {
    // Default industries that are always available
    const defaultIndustries = [
      { id: 'default-1', name: 'Financial Services', is_active: true },
      { id: 'default-2', name: 'Technology', is_active: true },
      { id: 'default-3', name: 'Healthcare', is_active: true },
      { id: 'default-4', name: 'Manufacturing', is_active: true },
      { id: 'default-5', name: 'Retail & E-commerce', is_active: true },
      { id: 'default-6', name: 'Energy & Utilities', is_active: true },
      { id: 'default-7', name: 'Government', is_active: true },
      { id: 'default-8', name: 'Education', is_active: true },
      { id: 'default-9', name: 'Professional Services', is_active: true },
      { id: 'default-10', name: 'Other', is_active: true }
    ];

    // Get custom industries from database
    const sql = `
      SELECT id, name, is_active 
      FROM industries 
      WHERE is_active = 1 
      ORDER BY name ASC
    `;
    const result = await database.query(sql);
    const customIndustries = Array.isArray(result) ? result : [];

    // Combine defaults + custom, with 'Other' always at the end
    const allIndustries = [...defaultIndustries, ...customIndustries].sort((a, b) => {
      if (a.name === 'Other') return 1;
      if (b.name === 'Other') return -1;
      return a.name.localeCompare(b.name);
    });

    res.json(allIndustries);
  } catch (error) {
    console.error('Error fetching industries:', error);
    // Return defaults even if database fails
    res.json([
      { id: 'default-1', name: 'Financial Services', is_active: true },
      { id: 'default-2', name: 'Technology', is_active: true },
      { id: 'default-3', name: 'Healthcare', is_active: true },
      { id: 'default-4', name: 'Manufacturing', is_active: true },
      { id: 'default-5', name: 'Retail & E-commerce', is_active: true },
      { id: 'default-6', name: 'Energy & Utilities', is_active: true },
      { id: 'default-7', name: 'Government', is_active: true },
      { id: 'default-8', name: 'Education', is_active: true },
      { id: 'default-9', name: 'Professional Services', is_active: true },
      { id: 'default-10', name: 'Other', is_active: true }
    ]);
  }
});

// Mount routes
app.use('/api/lead', leadRouter);
app.use('/api/user-engagement', userEngagementRouter);

// ✅ User assessment routes (NO CSRF - public endpoints for users to submit assessments)
// These are intentionally left unprotected to allow seamless user experience
app.use('/api/assessment-response', assessmentResponseRouter);
app.use('/api/assessment', singleAssessmentRouter);
app.use('/api/assessments', assessmentRouter);
app.use('/api/questions', responseRouter);

// ✅ Admin routes (CSRF enabled, but login route will skip it internally)
app.use('/api/admin', adminRouter);

console.log('✅ CSRF protection configured');

// Root endpoint
app.get('/', (req, res) => {
  res.status(200).json({ 
    message: 'SAFE-8 Assessment API',
    status: 'running',
    version: '1.0.0',
    endpoints: {
      healthProbe: '/health/ping',
      health: '/health',
      csrf: '/api/csrf-token',
      industries: '/api/industries',
      assessments: '/api/assessments',
      admin: '/api/admin',
      lead: '/api/lead'
    }
  });
});

// ✅ Simple health probe for Azure load balancer (fast, no DB check)
app.get('/health/ping', (req, res) => {
  res.status(200).send('OK');
});

// ✅ Detailed health check endpoint (includes DB connection check)
app.get('/health', async (req, res) => {
  const health = {
    status: 'OK',
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
    memory: process.memoryUsage()
  };

  // Check database connection
  try {
    await database.testConnection();
    health.database = 'connected';
  } catch (error) {
    health.database = 'disconnected';
    health.databaseError = error.message;
    health.status = 'DEGRADED';
  }

  const statusCode = health.status === 'OK' ? 200 : 503;
  res.status(statusCode).json(health);
});

// ✅ Centralized error handling middleware
app.use(errorHandler);

// Serve React app for all non-API routes in production
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    // Don't serve index.html for API routes or health checks
    if (req.path.startsWith('/api') || req.path.startsWith('/health')) {
      return res.status(404).json({ error: 'Route not found' });
    }
    res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'));
  });
} else {
  // 404 handler for development
  app.use('*', (req, res) => {
    res.status(404).json({ error: 'Route not found' });
  });
}

app.listen(PORT, async () => {
  logger.info(`Server started on port ${PORT}`, { 
    environment: process.env.NODE_ENV || 'development',
    port: PORT 
  });
  
  // Initialize Redis cache (optional - graceful degradation)
  try {
    await connectRedis();
    logger.info('Redis cache initialized');
  } catch (error) {
    logger.warn('Redis connection failed - running without cache', { error: error.message });
  }
  
  // Test database connection
  try {
    const database = (await import('./config/database.js')).default;
    await database.testConnection();
  } catch (error) {
    logger.error('Database connection failed - server will run but database operations may fail', 
      { error: error.message });
  }
});
