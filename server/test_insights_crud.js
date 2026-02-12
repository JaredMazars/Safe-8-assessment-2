// Quick test to verify the Insights Management system is working
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';

// Test admin credentials (you'll need to use real admin creds)
const ADMIN_EMAIL = 'admin@safe8.ai';
const ADMIN_PASSWORD = 'Admin123!';

let authToken = '';

async function login() {
  console.log('🔐 Logging in as admin...\n');
  const response = await fetch(`${BASE_URL}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
  });
  
  const data = await response.json();
  if (data.success && data.token) {
    authToken = data.token;
    console.log('✓ Admin logged in successfully\n');
    return true;
  } else {
    console.error('✗ Login failed:', data.message);
    return false;
  }
}

async function testGet(endpoint, label) {
  console.log(`📥 GET ${endpoint}`);
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    headers: { 'Authorization': `Bearer ${authToken}` }
  });
  
  const data = await response.json();
  if (response.ok) {
    console.log(`✓ ${label}: ${data.length} items`);
    if (data.length > 0) {
      console.log(`  First item:`, JSON.stringify(data[0], null, 2).substring(0, 200) + '...');
    }
  } else {
    console.error(`✗ ${label} failed:`, data.message);
  }
  console.log('');
  return data;
}

async function testCreate(endpoint, payload, label) {
  console.log(`➕ POST ${endpoint}`);
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  
  const data = await response.json();
  if (response.ok && data.success) {
    console.log(`✓ ${label} created: ID ${data.id || data.data?.id}`);
  } else {
    console.error(`✗ ${label} failed:`, data.message);
  }
  console.log('');
  return data;
}

async function runTests() {
  try {
    console.log('🧪 Testing Insights Management System\n');
    console.log('='.repeat(60) + '\n');
    
    // Login first
    const loggedIn = await login();
    if (!loggedIn) {
      console.error('Cannot proceed without authentication');
      return;
    }
    
    // Test 1: Get all insights
    console.log('TEST 1: Fetch all insights');
    console.log('-'.repeat(60));
    await testGet('/api/admin/insights', 'Insights');
    
    // Test 2: Get all recommendations
    console.log('TEST 2: Fetch all recommendations');
    console.log('-'.repeat(60));
    await testGet('/api/admin/recommendations', 'Recommendations');
    
    // Test 3: Get all benchmarks
    console.log('TEST 3: Fetch all benchmarks');
    console.log('-'.repeat(60));
    await testGet('/api/admin/benchmarks', 'Benchmarks');
    
    // Test 4: Filter insights by assessment type
    console.log('TEST 4: Filter insights by assessment type');
    console.log('-'.repeat(60));
    await testGet('/api/admin/insights?assessmentType=FRONTIER', 'Filtered Insights');
    
    // Test 5: Create a new insight
    console.log('TEST 5: Create new insight');
    console.log('-'.repeat(60));
    await testCreate('/api/admin/insights', {
      assessment_type: 'FRONTIER',
      industry: 'healthcare',
      min_score: 50,
      max_score: 70,
      status_text: 'Healthcare-specific insight for mid-range scores',
      level: 'good',
      display_order: 10
    }, 'New Insight');
    
    // Test 6: Create a new recommendation
    console.log('TEST 6: Create new recommendation');
    console.log('-'.repeat(60));
    await testCreate('/api/admin/recommendations', {
      assessment_type: 'FRONTIER',
      industry: null,
      title: 'AI Ethics Framework',
      description: 'Develop ethical AI guidelines and governance structures',
      icon: 'fas fa-balance-scale',
      badge_text: 'Essential for responsible AI',
      priority: 'high',
      min_score: 0,
      max_score: 100
    }, 'New Recommendation');
    
    // Test 7: Test public API - get insights for assessment
    console.log('TEST 7: Public API - Get insights for score 65');
    console.log('-'.repeat(60));
    console.log('📥 GET /api/assessment/insights/FRONTIER/65');
    const publicResponse = await fetch(`${BASE_URL}/api/assessment/insights/FRONTIER/65`);
    const publicData = await publicResponse.json();
    if (publicResponse.ok && publicData.success) {
      console.log('✓ Public API works:');
      console.log('  Status Text:', publicData.data.status_text);
      console.log('  Level:', publicData.data.level);
    } else {
      console.error('✗ Public API failed:', publicData.message);
    }
    console.log('');
    
    console.log('='.repeat(60));
    console.log('🎉 All tests completed!\n');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

runTests();
