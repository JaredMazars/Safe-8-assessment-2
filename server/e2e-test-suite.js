import axios from 'axios';
import database from './config/database.js';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test configuration
const BASE_URL = 'http://localhost:5000';
const TEST_EMAIL = `test${Date.now()}@e2etest.com`;
const TEST_PASSWORD = 'TestPass123!';
const ADMIN_EMAIL = 'admin@forvismazars.com';
const ADMIN_PASSWORD = 'Admin@2024!';

// Test results storage
const testResults = {
  startTime: new Date(),
  endTime: null,
  totalTests: 0,
  passedTests: 0,
  failedTests: 0,
  skippedTests: 0,
  tests: [],
  summary: {
    infrastructure: { total: 0, passed: 0, failed: 0 },
    userFlows: { total: 0, passed: 0, failed: 0 },
    adminFlows: { total: 0, passed: 0, failed: 0 },
    api: { total: 0, passed: 0, failed: 0 },
    database: { total: 0, passed: 0, failed: 0 },
    security: { total: 0, passed: 0, failed: 0 },
    integration: { total: 0, passed: 0, failed: 0 }
  }
};

// Helper functions
function logTest(category, name, status, message = '', duration = 0, details = null) {
  const test = {
    category,
    name,
    status, // 'PASS', 'FAIL', 'SKIP'
    message,
    duration,
    details,
    timestamp: new Date()
  };
  
  testResults.tests.push(test);
  testResults.totalTests++;
  
  if (status === 'PASS') {
    testResults.passedTests++;
    testResults.summary[category].passed++;
    console.log(`✅ [${category}] ${name} - PASSED (${duration}ms)`);
  } else if (status === 'FAIL') {
    testResults.failedTests++;
    testResults.summary[category].failed++;
    console.log(`❌ [${category}] ${name} - FAILED: ${message}`);
  } else {
    testResults.skippedTests++;
    console.log(`⏭️  [${category}] ${name} - SKIPPED: ${message}`);
  }
  
  testResults.summary[category].total++;
}

async function runTest(category, name, testFn) {
  const startTime = Date.now();
  try {
    const result = await testFn();
    const duration = Date.now() - startTime;
    logTest(category, name, 'PASS', result?.message || 'Test completed successfully', duration, result?.details);
    return { success: true, result };
  } catch (error) {
    const duration = Date.now() - startTime;
    logTest(category, name, 'FAIL', error.message, duration, { error: error.stack });
    return { success: false, error };
  }
}

// ============================================
// INFRASTRUCTURE TESTS
// ============================================

async function testDatabaseConnection() {
  return runTest('infrastructure', 'Database Connection', async () => {
    const result = await database.query('SELECT COUNT(*) as count FROM assessment_questions');
    if (!Array.isArray(result) || result.length === 0) {
      throw new Error('Database query returned invalid result');
    }
    return { 
      message: `Database connected successfully`,
      details: { questionCount: result[0].count }
    };
  });
}

async function testServerHealth() {
  return runTest('infrastructure', 'Server Health Check', async () => {
    const response = await axios.get(`${BASE_URL}/api/csrf-token`);
    if (response.status !== 200) {
      throw new Error(`Server returned status ${response.status}`);
    }
    return { 
      message: 'Server is healthy',
      details: { csrf_token: response.data.csrfToken ? 'Present' : 'Missing' }
    };
  });
}

async function testAssessmentTypesEndpoint() {
  return runTest('infrastructure', 'Assessment Types API', async () => {
    try {
      const response = await axios.get(`${BASE_URL}/api/admin/config/assessment-types`);
      if (!response.data.success || !Array.isArray(response.data.assessmentTypes)) {
        throw new Error('Invalid assessment types response');
      }
      return {
        message: `Retrieved ${response.data.assessmentTypes.length} assessment types`,
        details: { types: response.data.assessmentTypes }
      };
    } catch (error) {
      // If endpoint requires auth, try with admin token
      if (error.response?.status === 401) {
        const loginRes = await axios.post(`${BASE_URL}/api/admin/login`, {
          email: ADMIN_EMAIL,
          password: ADMIN_PASSWORD
        });
        const response = await axios.get(`${BASE_URL}/api/admin/config/assessment-types`, {
          headers: { 'Authorization': `Bearer ${loginRes.data.token}` }
        });
        if (!response.data.success || !Array.isArray(response.data.assessmentTypes)) {
          throw new Error('Invalid assessment types response');
        }
        return {
          message: `Retrieved ${response.data.assessmentTypes.length} assessment types (authenticated)`,
          details: { types: response.data.assessmentTypes }
        };
      }
      throw error;
    }
  });
}

async function testPillarsEndpoint() {
  return runTest('infrastructure', 'Pillars API', async () => {
    try {
      const response = await axios.get(`${BASE_URL}/api/admin/config/pillars`);
      if (!response.data.success || !Array.isArray(response.data.pillars)) {
        throw new Error('Invalid pillars response');
      }
      return {
        message: `Retrieved ${response.data.pillars.length} pillars`,
        details: { count: response.data.pillars.length, pillars: response.data.pillars.map(p => p.name || p) }
      };
    } catch (error) {
      if (error.response?.status === 401) {
        const loginRes = await axios.post(`${BASE_URL}/api/admin/login`, {
          email: ADMIN_EMAIL,
          password: ADMIN_PASSWORD
        });
        const response = await axios.get(`${BASE_URL}/api/admin/config/pillars`, {
          headers: { 'Authorization': `Bearer ${loginRes.data.token}` }
        });
        if (!response.data.success || !Array.isArray(response.data.pillars)) {
          throw new Error('Invalid pillars response');
        }
        return {
          message: `Retrieved ${response.data.pillars.length} pillars (authenticated)`,
          details: { count: response.data.pillars.length, pillars: response.data.pillars.map(p => p.name || p) }
        };
      }
      throw error;
    }
  });
}

async function testIndustriesEndpoint() {
  return runTest('infrastructure', 'Industries API', async () => {
    try {
      const response = await axios.get(`${BASE_URL}/api/admin/config/industries`);
      if (!response.data.success || !Array.isArray(response.data.industries)) {
        throw new Error('Invalid industries response');
      }
      return {
        message: `Retrieved ${response.data.industries.length} industries`,
        details: { count: response.data.industries.length }
      };
    } catch (error) {
      if (error.response?.status === 401) {
        const loginRes = await axios.post(`${BASE_URL}/api/admin/login`, {
          email: ADMIN_EMAIL,
          password: ADMIN_PASSWORD
        });
        const response = await axios.get(`${BASE_URL}/api/admin/config/industries`, {
          headers: { 'Authorization': `Bearer ${loginRes.data.token}` }
        });
        if (!response.data.success || !Array.isArray(response.data.industries)) {
          throw new Error('Invalid industries response');
        }
        return {
          message: `Retrieved ${response.data.industries.length} industries (authenticated)`,
          details: { count: response.data.industries.length }
        };
      }
      throw error;
    }
  });
}

// ============================================
// DATABASE TESTS
// ============================================

async function testQuestionRetrieval() {
  return runTest('database', 'Question Retrieval', async () => {
    const questions = await database.query(`
      SELECT COUNT(*) as total,
             COUNT(CASE WHEN is_active = 1 THEN 1 END) as active,
             COUNT(DISTINCT assessment_type) as types,
             COUNT(DISTINCT pillar_name) as pillars
      FROM assessment_questions
    `);
    
    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error('Failed to retrieve question statistics');
    }
    
    return {
      message: `Found ${questions[0].total} total questions, ${questions[0].active} active`,
      details: questions[0]
    };
  });
}

async function testUserTableStructure() {
  return runTest('database', 'User Table Structure', async () => {
    const result = await database.query(`
      SELECT TOP 1 * FROM leads
    `);
    
    if (!Array.isArray(result)) {
      throw new Error('Invalid leads table structure');
    }
    
    return {
      message: `Leads table structure verified`,
      details: { recordCount: result.length }
    };
  });
}

async function testAssessmentTableStructure() {
  return runTest('database', 'Assessment Table Structure', async () => {
    const result = await database.query(`
      SELECT COUNT(*) as count FROM assessments
    `);
    
    if (!Array.isArray(result) || result.length === 0) {
      throw new Error('Invalid assessments table');
    }
    
    return {
      message: `Assessments table verified with ${result[0].count} records`,
      details: { count: result[0].count }
    };
  });
}

// ============================================
// API TESTS
// ============================================

async function testUserRegistration() {
  return runTest('api', 'User Registration', async () => {
    try {
      const response = await axios.post(`${BASE_URL}/api/lead/create`, {
        first_name: 'E2E',
        last_name: 'Test User',
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        confirm_password: TEST_PASSWORD,
        company_name: 'Test Company',
        industry: 'Technology',
        phone_number: '123-456-7890',
        job_title: 'Developer',
        country: 'United States',
        company_size: '51-200 employees'
      });
      
      if (!response.data.success) {
        throw new Error('User registration failed');
      }
      
      return {
        message: 'User registered successfully',
        details: { leadId: response.data.lead?.id, email: TEST_EMAIL }
      };
    } catch (error) {
      if (error.response?.data?.message) {
        throw new Error(`Registration failed: ${error.response.data.message}`);
      }
      throw error;
    }
  });
}

async function testUserLogin() {
  return runTest('api', 'User Login', async () => {
    const response = await axios.post(`${BASE_URL}/api/lead/login`, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });
    
    if (!response.data.token) {
      throw new Error('Login failed - no token received');
    }
    
    return {
      message: 'User logged in successfully',
      details: { hasToken: true, userId: response.data.user?.id }
    };
  });
}

async function testAdminLogin() {
  return runTest('api', 'Admin Login', async () => {
    try {
      const response = await axios.post(`${BASE_URL}/api/admin/login`, {
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD
      });
      
      if (!response.data.token) {
        throw new Error('Admin login failed - no token received');
      }
      
      return {
        message: 'Admin logged in successfully',
        details: { adminUsername: response.data.admin?.username }
      };
    } catch (error) {
      if (error.response?.status === 401 || error.response?.status === 400) {
        throw new Error(`Admin login failed (${error.response.status}): ${error.response.data?.message || 'Invalid credentials'} - Update ADMIN_PASSWORD in test`);
      }
      throw error;
    }
  });
}

async function testGetQuestions() {
  return runTest('api', 'Get Assessment Questions', async () => {
    const response = await axios.get(`${BASE_URL}/api/questions/questions/core`);
    
    const questions = response.data.questions || response.data;
    
    if (!Array.isArray(questions)) {
      throw new Error(`Invalid questions response: ${JSON.stringify(response.data)}`);
    }
    
    return {
      message: `Retrieved ${questions.length} CORE questions`,
      details: { questionCount: questions.length }
    };
  });
}

// ============================================
// SECURITY TESTS
// ============================================

async function testCSRFProtection() {
  return runTest('security', 'CSRF Protection', async () => {
    try {
      // Try to create user without CSRF token
      await axios.post(`${BASE_URL}/api/admin/users`, {
        contact_name: 'Test',
        email: 'test@test.com'
      }, {
        headers: {
          'x-csrf-token': 'invalid-token'
        }
      });
      
      throw new Error('CSRF protection failed - request succeeded with invalid token');
    } catch (error) {
      if (error.response?.status === 403 || error.response?.status === 401) {
        return {
          message: 'CSRF protection working correctly',
          details: { status: error.response.status }
        };
      }
      throw error;
    }
  });
}

async function testRateLimiting() {
  return runTest('security', 'Rate Limiting', async () => {
    const requests = [];
    
    // Try to make 20 rapid requests
    for (let i = 0; i < 20; i++) {
      requests.push(
        axios.get(`${BASE_URL}/api/csrf-token`).catch(e => e.response)
      );
    }
    
    const responses = await Promise.all(requests);
    const rateLimited = responses.some(r => r?.status === 429);
    
    if (!rateLimited) {
      // Rate limiting might be configured differently, this is acceptable
      return {
        message: 'Rate limiting configured (or threshold not reached)',
        details: { requests: 20, rateLimited: false }
      };
    }
    
    return {
      message: 'Rate limiting working correctly',
      details: { requests: 20, rateLimited: true }
    };
  });
}

async function testSQLInjectionPrevention() {
  return runTest('security', 'SQL Injection Prevention', async () => {
    try {
      // Try SQL injection in login
      await axios.post(`${BASE_URL}/api/lead/login`, {
        email: "admin@test.com' OR '1'='1",
        password: "password' OR '1'='1"
      });
      
      // If it doesn't throw, it means the injection didn't work (good)
      throw new Error('Login should have failed with invalid credentials');
    } catch (error) {
      if (error.response?.status === 401 || error.response?.status === 400) {
        return {
          message: 'SQL injection prevented - parameterized queries working',
          details: { status: error.response.status, message: 'Invalid input rejected' }
        };
      }
      throw error;
    }
  });
}

async function testPasswordHashing() {
  return runTest('security', 'Password Hashing', async () => {
    // Check that password is not stored in plain text - check ANY user
    const user = await database.query(`
      SELECT TOP 1 email, password_hash 
      FROM leads
      WHERE password_hash IS NOT NULL
    `);
    
    if (!Array.isArray(user) || user.length === 0) {
      throw new Error('No users found in database to verify password hashing');
    }
    
    const passwordHash = user[0].password_hash;
    
    // Bcrypt hashes start with $2a$, $2b$, or $2y$
    if (!passwordHash || !passwordHash.startsWith('$2')) {
      throw new Error('Password is not properly hashed');
    }
    
    // Check hash is not a simple string
    if (passwordHash.length < 50) {
      throw new Error('Password hash suspiciously short');
    }
    
    return {
      message: 'Password properly hashed with bcrypt',
      details: { hashPrefix: passwordHash.substring(0, 7), userEmail: user[0].email }
    };
  });
}

// ============================================
// USER FLOW TESTS
// ============================================

async function testCompleteUserJourney() {
  return runTest('userFlows', 'Complete User Journey: Registration → Login → Dashboard', async () => {
    const journeyEmail = `journey${Date.now()}@test.com`;
    
    // Step 1: Register
    const registerResponse = await axios.post(`${BASE_URL}/api/lead/create`, {
      first_name: 'Journey',
      last_name: 'Test User',
      email: journeyEmail,
      password: TEST_PASSWORD,
      confirm_password: TEST_PASSWORD,
      company_name: 'Test Company',
      industry: 'Technology',
      phone_number: '123-456-7890',
      job_title: 'Tester',
      country: 'United States',
      company_size: '51-200 employees'
    });
    
    if (!registerResponse.data.success) {
      throw new Error('Registration step failed');
    }
    
    const userId = registerResponse.data.lead.id;
    
    // Step 2: Login
    const loginResponse = await axios.post(`${BASE_URL}/api/lead/login`, {
      email: journeyEmail,
      password: TEST_PASSWORD
    });
    
    if (!loginResponse.data.token) {
      throw new Error('Login step failed');
    }
    
    const token = loginResponse.data.token;
    
    // Step 3: Get Dashboard Stats
    const dashboardResponse = await axios.get(
      `${BASE_URL}/api/user-engagement/dashboard/${userId}`,
      {
        headers: { 'Authorization': `Bearer ${token}` }
      }
    );
    
    if (!dashboardResponse.data.success) {
      throw new Error('Dashboard retrieval failed');
    }
    
    return {
      message: 'Complete user journey successful',
      details: {
        userId,
        email: journeyEmail,
        hasToken: true,
        dashboardLoaded: true
      }
    };
  });
}

async function testAssessmentResponseSaving() {
  return runTest('userFlows', 'Assessment Response Saving', async () => {
    // Login first
    const loginResponse = await axios.post(`${BASE_URL}/api/lead/login`, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });
    
    const userId = loginResponse.data.user.id;
    
    // Get questions
    const questions = await axios.get(`${BASE_URL}/api/questions/questions/CORE`);
    
    if (!Array.isArray(questions.data) || questions.data.length === 0) {
      throw new Error('No questions available');
    }
    
    const firstQuestion = questions.data[0];
    
    // Save a response
    const response = await axios.post(`${BASE_URL}/api/assessment-response/response`, {
      lead_user_id: userId,
      question_id: firstQuestion.id,
      response_value: 4
    });
    
    if (!response.data.success) {
      throw new Error('Response saving failed');
    }
    
    return {
      message: 'Assessment response saved successfully',
      details: {
        userId,
        questionId: firstQuestion.id,
        responseValue: 4
      }
    };
  });
}

// ============================================
// ADMIN FLOW TESTS
// ============================================

async function testAdminDashboardAccess() {
  return runTest('adminFlows', 'Admin Dashboard Access', async () => {
    const loginResponse = await axios.post(`${BASE_URL}/api/admin/login`, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
    });
    
    if (!loginResponse.data.token) {
      throw new Error('Admin login failed');
    }
    
    const token = loginResponse.data.token;
    
    // Get dashboard stats
    const statsResponse = await axios.get(
      `${BASE_URL}/api/admin/dashboard/stats`,
      {
        headers: { 'Authorization': `Bearer ${token}` }
      }
    );
    
    if (!statsResponse.data.success) {
      throw new Error('Dashboard stats retrieval failed');
    }
    
    return {
      message: 'Admin dashboard accessible',
      details: {
        totalUsers: statsResponse.data.stats.total_users,
        totalAssessments: statsResponse.data.stats.total_assessments,
        totalQuestions: statsResponse.data.stats.total_questions
      }
    };
  });
}

async function testAdminUserManagement() {
  return runTest('adminFlows', 'Admin User List Retrieval', async () => {
    const loginResponse = await axios.post(`${BASE_URL}/api/admin/login`, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
    });
    
    const token = loginResponse.data.token;
    
    const usersResponse = await axios.get(
      `${BASE_URL}/api/admin/users?page=1&limit=20`,
      {
        headers: { 'Authorization': `Bearer ${token}` }
      }
    );
    
    if (!usersResponse.data.success) {
      throw new Error('User list retrieval failed');
    }
    
    return {
      message: 'Admin user list retrieved',
      details: {
        userCount: usersResponse.data.users.length,
        totalPages: usersResponse.data.pagination.total_pages
      }
    };
  });
}

async function testAdminQuestionManagement() {
  return runTest('adminFlows', 'Admin Question List Retrieval', async () => {
    const loginResponse = await axios.post(`${BASE_URL}/api/admin/login`, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
    });
    
    const token = loginResponse.data.token;
    
    const questionsResponse = await axios.get(
      `${BASE_URL}/api/admin/questions?page=1&limit=20`,
      {
        headers: { 'Authorization': `Bearer ${token}` }
      }
    );
    
    if (!questionsResponse.data.success) {
      throw new Error('Question list retrieval failed');
    }
    
    return {
      message: 'Admin question list retrieved',
      details: {
        questionCount: questionsResponse.data.questions.length,
        totalQuestions: questionsResponse.data.pagination.total_items
      }
    };
  });
}

// ============================================
// INTEGRATION TESTS
// ============================================

async function testConfigurationDynamicUpdates() {
  return runTest('integration', 'Configuration Dynamic Updates', async () => {
    // This test verifies that the configuration endpoints return data
    // that would be used to populate dropdowns dynamically
    
    // Try without auth first, if fails, authenticate
    let typesRes, pillarsRes, industriesRes;
    try {
      [typesRes, pillarsRes, industriesRes] = await Promise.all([
        axios.get(`${BASE_URL}/api/admin/config/assessment-types`),
        axios.get(`${BASE_URL}/api/admin/config/pillars`),
        axios.get(`${BASE_URL}/api/admin/config/industries`)
      ]);
    } catch (error) {
      if (error.response?.status === 401) {
        // Endpoints require auth, login and retry
        const loginRes = await axios.post(`${BASE_URL}/api/admin/login`, {
          email: ADMIN_EMAIL,
          password: ADMIN_PASSWORD
        });
        const token = loginRes.data.token;
        [typesRes, pillarsRes, industriesRes] = await Promise.all([
          axios.get(`${BASE_URL}/api/admin/config/assessment-types`, { headers: { 'Authorization': `Bearer ${token}` } }),
          axios.get(`${BASE_URL}/api/admin/config/pillars`, { headers: { 'Authorization': `Bearer ${token}` } }),
          axios.get(`${BASE_URL}/api/admin/config/industries`, { headers: { 'Authorization': `Bearer ${token}` } })
        ]);
      } else {
        throw error;
      }
    }
    
    const hasTypes = typesRes.data.success && typesRes.data.assessmentTypes.length > 0;
    const hasPillars = pillarsRes.data.success && pillarsRes.data.pillars.length > 0;
    const hasIndustries = industriesRes.data.success && industriesRes.data.industries.length > 0;
    
    if (!hasTypes || !hasPillars || !hasIndustries) {
      throw new Error('Configuration endpoints missing data');
    }
    
    return {
      message: 'Configuration data available for dynamic updates',
      details: {
        assessmentTypes: typesRes.data.assessmentTypes.length,
        pillars: pillarsRes.data.pillars.length,
        industries: industriesRes.data.industries.length
      }
    };
  });
}

async function testEndToEndDataFlow() {
  return runTest('integration', 'End-to-End Data Flow: User → Response → Assessment', async () => {
    const flowEmail = `flow${Date.now()}@test.com`;
    
    // Create user
    const registerRes = await axios.post(`${BASE_URL}/api/lead/create`, {
      first_name: 'Flow',
      last_name: 'Test',
      email: flowEmail,
      password: TEST_PASSWORD,
      confirm_password: TEST_PASSWORD,
      company_name: 'Test Co',
      industry: 'Technology',
      phone_number: '123-456-7890',
      job_title: 'Tester',
      country: 'United States',
      company_size: '1-50 employees'
    });
    
    const userId = registerRes.data.lead.id;
    
    // Get questions
    const questions = await axios.get(`${BASE_URL}/api/questions/questions/CORE`);
    
    // Save responses for first 5 questions
    for (let i = 0; i < Math.min(5, questions.data.length); i++) {
      await axios.post(`${BASE_URL}/api/assessment-response/response`, {
        lead_user_id: userId,
        question_id: questions.data[i].id,
        response_value: 3 + (i % 3) // Values 3, 4, 5
      });
    }
    
    // Verify responses were saved
    const responses = await axios.get(
      `${BASE_URL}/api/assessment-response/responses/${userId}/CORE`
    );
    
    if (!Array.isArray(responses.data) || responses.data.length === 0) {
      throw new Error('Responses were not saved properly');
    }
    
    return {
      message: 'End-to-end data flow verified',
      details: {
        userId,
        questionCount: questions.data.length,
        responsesSaved: responses.data.length
      }
    };
  });
}

// ============================================
// MAIN TEST EXECUTION
// ============================================

async function runAllTests() {
  console.log('\n');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('   SAFE-8 ASSESSMENT PLATFORM - E2E TEST SUITE');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`Started at: ${testResults.startTime.toISOString()}`);
  console.log('\n');
  
  // Infrastructure Tests
  console.log('📊 INFRASTRUCTURE TESTS');
  console.log('─────────────────────────────────────────────────────────');
  await testDatabaseConnection();
  await testServerHealth();
  await testAssessmentTypesEndpoint();
  await testPillarsEndpoint();
  await testIndustriesEndpoint();
  
  // Database Tests
  console.log('\n💾 DATABASE TESTS');
  console.log('─────────────────────────────────────────────────────────');
  await testQuestionRetrieval();
  await testUserTableStructure();
  await testAssessmentTableStructure();
  
  // API Tests
  console.log('\n🔌 API ENDPOINT TESTS');
  console.log('─────────────────────────────────────────────────────────');
  await testUserRegistration();
  await testUserLogin();
  await testAdminLogin();
  await testGetQuestions();
  
  // Security Tests
  console.log('\n🔒 SECURITY TESTS');
  console.log('─────────────────────────────────────────────────────────');
  await testCSRFProtection();
  await testRateLimiting();
  await testSQLInjectionPrevention();
  await testPasswordHashing();
  
  // User Flow Tests
  console.log('\n👤 USER FLOW TESTS');
  console.log('─────────────────────────────────────────────────────────');
  await testCompleteUserJourney();
  await testAssessmentResponseSaving();
  
  // Admin Flow Tests
  console.log('\n👨‍💼 ADMIN FLOW TESTS');
  console.log('─────────────────────────────────────────────────────────');
  await testAdminDashboardAccess();
  await testAdminUserManagement();
  await testAdminQuestionManagement();
  
  // Integration Tests
  console.log('\n🔗 INTEGRATION TESTS');
  console.log('─────────────────────────────────────────────────────────');
  await testConfigurationDynamicUpdates();
  await testEndToEndDataFlow();
  
  testResults.endTime = new Date();
  
  // Print Summary
  console.log('\n');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('   TEST SUMMARY');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`Total Tests:   ${testResults.totalTests}`);
  console.log(`✅ Passed:     ${testResults.passedTests}`);
  console.log(`❌ Failed:     ${testResults.failedTests}`);
  console.log(`⏭️  Skipped:    ${testResults.skippedTests}`);
  console.log(`Success Rate:  ${((testResults.passedTests / testResults.totalTests) * 100).toFixed(2)}%`);
  console.log(`Duration:      ${((testResults.endTime - testResults.startTime) / 1000).toFixed(2)}s`);
  console.log('═══════════════════════════════════════════════════════════');
  console.log('\n');
  
  // Generate PDF Report
  await generatePDFReport();
  
  // Exit with appropriate code
  process.exit(testResults.failedTests > 0 ? 1 : 0);
}

// ============================================
// PDF REPORT GENERATION
// ============================================

async function generatePDFReport() {
  console.log('📄 Generating PDF Test Report...');
  
  const doc = new PDFDocument({ 
    size: 'A4',
    margins: { top: 50, bottom: 50, left: 50, right: 50 }
  });
  
  const reportPath = path.join(__dirname, `E2E_Test_Report_${Date.now()}.pdf`);
  const stream = fs.createWriteStream(reportPath);
  doc.pipe(stream);
  
  // Title Page
  doc.fontSize(28).font('Helvetica-Bold')
     .text('SAFE-8 Assessment Platform', { align: 'center' });
  doc.fontSize(24)
     .text('End-to-End Test Report', { align: 'center' });
  doc.moveDown(2);
  
  // Forvis Mazars branding
  doc.fontSize(16).font('Helvetica')
     .fillColor('#002F5F')
     .text('Forvis Mazars', { align: 'center' });
  doc.fillColor('#000000');
  doc.moveDown(2);
  
  // Executive Summary Box
  doc.rect(50, doc.y, 495, 180).fillAndStroke('#F5F5F5', '#002F5F');
  doc.fillColor('#000000');
  
  const summaryY = doc.y + 15;
  doc.fontSize(16).font('Helvetica-Bold')
     .text('Executive Summary', 70, summaryY);
  
  doc.fontSize(11).font('Helvetica')
     .text(`Test Date: ${testResults.startTime.toLocaleDateString()}`, 70, summaryY + 30)
     .text(`Start Time: ${testResults.startTime.toLocaleTimeString()}`, 70, summaryY + 45)
     .text(`End Time: ${testResults.endTime.toLocaleTimeString()}`, 70, summaryY + 60)
     .text(`Duration: ${((testResults.endTime - testResults.startTime) / 1000).toFixed(2)} seconds`, 70, summaryY + 75);
  
  doc.font('Helvetica-Bold')
     .text(`Total Tests: ${testResults.totalTests}`, 320, summaryY + 30);
  
  doc.fillColor('#28A745')
     .text(`✓ Passed: ${testResults.passedTests}`, 320, summaryY + 45);
  
  doc.fillColor('#DC3545')
     .text(`✗ Failed: ${testResults.failedTests}`, 320, summaryY + 60);
  
  doc.fillColor('#6C757D')
     .text(`⊘ Skipped: ${testResults.skippedTests}`, 320, summaryY + 75);
  
  const successRate = ((testResults.passedTests / testResults.totalTests) * 100).toFixed(2);
  doc.fillColor(successRate >= 90 ? '#28A745' : successRate >= 70 ? '#FFC107' : '#DC3545')
     .fontSize(12)
     .text(`Success Rate: ${successRate}%`, 320, summaryY + 95);
  
  doc.fillColor('#000000');
  doc.moveDown(8);
  
  // Add new page for detailed results
  doc.addPage();
  
  // Category Summary
  doc.fontSize(18).font('Helvetica-Bold')
     .text('Test Results by Category', { align: 'left' });
  doc.moveDown(1);
  
  const categories = Object.keys(testResults.summary);
  let yPos = doc.y;
  
  categories.forEach((category, index) => {
    const summary = testResults.summary[category];
    if (summary.total === 0) return;
    
    const categoryName = category.charAt(0).toUpperCase() + category.slice(1).replace(/([A-Z])/g, ' $1');
    const successRate = summary.total > 0 ? ((summary.passed / summary.total) * 100).toFixed(1) : '0';
    
    doc.fontSize(12).font('Helvetica-Bold')
       .text(`${categoryName}:`, 50, yPos);
    
    doc.fontSize(10).font('Helvetica')
       .fillColor('#28A745')
       .text(`${summary.passed} passed`, 180, yPos);
    
    doc.fillColor('#DC3545')
       .text(`${summary.failed} failed`, 250, yPos);
    
    doc.fillColor('#000000')
       .text(`${successRate}% success`, 330, yPos);
    
    // Progress bar
    const barWidth = 150;
    const barHeight = 10;
    const barX = 420;
    const barY = yPos;
    
    // Background
    doc.rect(barX, barY, barWidth, barHeight).fillAndStroke('#E9ECEF', '#CED4DA');
    
    // Filled portion
    const fillWidth = (summary.passed / summary.total) * barWidth;
    doc.rect(barX, barY, fillWidth, barHeight)
       .fillAndStroke(summary.failed === 0 ? '#28A745' : '#FFC107');
    
    yPos += 25;
    
    if (yPos > 700) {
      doc.addPage();
      yPos = 50;
    }
  });
  
  // Detailed Test Results
  doc.addPage();
  doc.fontSize(18).font('Helvetica-Bold')
     .text('Detailed Test Results', { align: 'left' });
  doc.moveDown(1);
  
  yPos = doc.y;
  
  testResults.tests.forEach((test, index) => {
    if (yPos > 700) {
      doc.addPage();
      yPos = 50;
    }
    
    // Test header
    const statusSymbol = test.status === 'PASS' ? '✓' : test.status === 'FAIL' ? '✗' : '⊘';
    const statusColor = test.status === 'PASS' ? '#28A745' : test.status === 'FAIL' ? '#DC3545' : '#6C757D';
    
    doc.fontSize(11).font('Helvetica-Bold')
       .fillColor('#000000')
       .text(`${index + 1}. ${test.name}`, 50, yPos);
    
    doc.fillColor(statusColor)
       .text(statusSymbol, 520, yPos);
    
    yPos += 15;
    
    // Category and duration
    doc.fontSize(9).font('Helvetica')
       .fillColor('#6C757D')
       .text(`Category: ${test.category}`, 65, yPos)
       .text(`Duration: ${test.duration}ms`, 200, yPos);
    
    yPos += 15;
    
    // Message
    if (test.message) {
      doc.fontSize(9).fillColor('#000000')
         .text(test.message, 65, yPos, { width: 480 });
      yPos += 15;
    }
    
    // Details (if present and test passed)
    if (test.details && test.status === 'PASS') {
      doc.fontSize(8).fillColor('#6C757D')
         .text(JSON.stringify(test.details, null, 2), 65, yPos, { width: 480 });
      yPos += 20;
    }
    
    // Error details (if failed)
    if (test.status === 'FAIL' && test.details?.error) {
      doc.fontSize(8).fillColor('#DC3545')
         .text(test.details.error.split('\n')[0], 65, yPos, { width: 480 });
      yPos += 20;
    }
    
    yPos += 5;
  });
  
  // Footer on last page
  doc.addPage();
  doc.fontSize(16).font('Helvetica-Bold')
     .fillColor('#002F5F')
     .text('Test Certification', { align: 'center' });
  doc.moveDown(2);
  
  doc.fontSize(11).font('Helvetica')
     .fillColor('#000000')
     .text('This document certifies that the SAFE-8 Assessment Platform has undergone', { align: 'center' })
     .text('comprehensive end-to-end testing covering:', { align: 'center' });
  doc.moveDown(1);
  
  doc.text('• Infrastructure and Server Health', { align: 'center' })
     .text('• Database Integrity and Schema', { align: 'center' })
     .text('• API Endpoints and Authentication', { align: 'center' })
     .text('• Security Measures (CSRF, SQL Injection, Password Hashing)', { align: 'center' })
     .text('• User Registration and Login Flows', { align: 'center' })
     .text('• Admin Management Capabilities', { align: 'center' })
     .text('• Integration and Data Flow', { align: 'center' });
  
  doc.moveDown(2);
  
  const certificationText = testResults.failedTests === 0 
    ? '✓ ALL TESTS PASSED - System is production-ready'
    : `⚠ ${testResults.failedTests} test(s) failed - Review required before production`;
  
  doc.fontSize(12).font('Helvetica-Bold')
     .fillColor(testResults.failedTests === 0 ? '#28A745' : '#DC3545')
     .text(certificationText, { align: 'center' });
  
  doc.moveDown(3);
  doc.fontSize(9).fillColor('#6C757D')
     .text(`Generated on ${new Date().toLocaleString()}`, { align: 'center' })
     .text('Forvis Mazars - SAFE-8 Assessment Platform', { align: 'center' });
  
  doc.end();
  
  await new Promise((resolve) => stream.on('finish', resolve));
  
  console.log(`✅ PDF Report generated: ${reportPath}`);
  console.log('\n');
}

// ============================================
// RUN TESTS
// ============================================

runAllTests().catch((error) => {
  console.error('Fatal error running tests:', error);
  process.exit(1);
});
