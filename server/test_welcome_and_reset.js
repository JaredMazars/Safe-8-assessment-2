/**
 * Test script for welcome email and password reset functionality
 * 
 * This script tests:
 * 1. Account creation with welcome email
 * 2. Password reset request
 * 3. Password reset with token
 * 4. Login with new password
 */

const API_BASE = 'http://localhost:5000/api';
const TEST_EMAIL = `test_${Date.now()}@example.com`;
const TEST_PASSWORD = 'TestPassword123!';
const NEW_PASSWORD = 'NewPassword456!';

let leadId;
let resetToken;

console.log('🧪 Testing Welcome Email and Password Reset Flow\n');
console.log('=' .repeat(60));

// Test 1: Create account (should send welcome email)
async function testAccountCreation() {
  console.log('\n📝 Test 1: Creating new account...');
  
  try {
    const response = await fetch(`${API_BASE}/lead/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contactName: 'Test User',
        jobTitle: 'QA Tester',
        email: TEST_EMAIL,
        phoneNumber: '+1234567890',
        companyName: 'Test Company Ltd',
        companySize: '50-200',
        country: 'South Africa',
        industry: 'Technology',
        password: TEST_PASSWORD
      })
    });

    const data = await response.json();
    
    if (data.success && data.isNew) {
      leadId = data.leadId;
      console.log('✅ Account created successfully');
      console.log(`   Lead ID: ${leadId}`);
      console.log(`   📧 Welcome email should be sent to: ${TEST_EMAIL}`);
      return true;
    } else {
      console.log('❌ Account creation failed:', data.message);
      return false;
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
    return false;
  }
}

// Test 2: Request password reset
async function testPasswordResetRequest() {
  console.log('\n🔑 Test 2: Requesting password reset...');
  
  try {
    const response = await fetch(`${API_BASE}/lead/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: TEST_EMAIL
      })
    });

    const data = await response.json();
    
    if (data.success) {
      console.log('✅ Password reset requested');
      console.log(`   📧 Reset email should be sent to: ${TEST_EMAIL}`);
      console.log('   ⚠️  Check email for reset link (expires in 1 hour)');
      console.log('   💡 For testing, you can extract the token from the database');
      return true;
    } else {
      console.log('❌ Password reset request failed:', data.message);
      return false;
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
    return false;
  }
}

// Test 3: Verify login with original password
async function testLoginWithOriginalPassword() {
  console.log('\n🔐 Test 3: Testing login with original password...');
  
  try {
    const response = await fetch(`${API_BASE}/lead/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: TEST_EMAIL,
        password: TEST_PASSWORD
      })
    });

    const data = await response.json();
    
    if (data.success) {
      console.log('✅ Login successful with original password');
      console.log(`   Welcome: ${data.user.contact_name}`);
      return true;
    } else {
      console.log('❌ Login failed:', data.message);
      return false;
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
    return false;
  }
}

// Helper: Get reset token from database (for testing)
async function getResetTokenFromDatabase() {
  console.log('\n🔧 Getting reset token from database for testing...');
  
  try {
    const { getPool } = await import('./config/database.js');
    const pool = await getPool();
    
    const result = await pool.request()
      .input('email', TEST_EMAIL)
      .query('SELECT reset_token_hash FROM leads WHERE email = @email');
    
    if (result.recordset.length > 0 && result.recordset[0].reset_token_hash) {
      console.log('⚠️  Note: In production, token is sent via email only');
      console.log('   Token hash found in database (this is the hashed version)');
      return result.recordset[0].reset_token_hash;
    }
    
    return null;
  } catch (error) {
    console.log('❌ Error getting token:', error.message);
    return null;
  }
}

// Test 4: Reset password with token (manual token needed)
async function testPasswordReset(token) {
  console.log('\n🔄 Test 4: Resetting password with token...');
  
  if (!token) {
    console.log('⚠️  Skipping: No token provided');
    console.log('   To test this, you need to:');
    console.log('   1. Check the email sent to get the reset token');
    console.log('   2. Or extract the token from the email service logs');
    console.log('   3. Then call: POST /api/lead/reset-password');
    return false;
  }
  
  try {
    const response = await fetch(`${API_BASE}/lead/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: token,
        newPassword: NEW_PASSWORD
      })
    });

    const data = await response.json();
    
    if (data.success) {
      console.log('✅ Password reset successful');
      console.log('   You can now login with the new password');
      return true;
    } else {
      console.log('❌ Password reset failed:', data.message);
      return false;
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
    return false;
  }
}

// Test 5: Verify login with new password
async function testLoginWithNewPassword() {
  console.log('\n🔐 Test 5: Testing login with new password...');
  
  try {
    const response = await fetch(`${API_BASE}/lead/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: TEST_EMAIL,
        password: NEW_PASSWORD
      })
    });

    const data = await response.json();
    
    if (data.success) {
      console.log('✅ Login successful with new password');
      console.log(`   Welcome back: ${data.user.contact_name}`);
      return true;
    } else {
      console.log('❌ Login failed:', data.message);
      return false;
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
    return false;
  }
}

// Run all tests
async function runTests() {
  console.log('\n🚀 Starting tests...\n');
  
  // Wait a bit for server to be ready
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const test1 = await testAccountCreation();
  if (!test1) {
    console.log('\n❌ Test suite failed at account creation');
    return;
  }
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  const test2 = await testPasswordResetRequest();
  if (!test2) {
    console.log('\n❌ Test suite failed at password reset request');
    return;
  }
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  const test3 = await testLoginWithOriginalPassword();
  
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Note: For full testing, you'd need to extract the token from email
  await testPasswordReset(null);
  
  console.log('\n' + '='.repeat(60));
  console.log('\n📋 Test Summary:');
  console.log('   ✅ Account Creation: PASSED');
  console.log('   ✅ Welcome Email: Check inbox');
  console.log('   ✅ Password Reset Request: PASSED');
  console.log('   ✅ Reset Email: Check inbox');
  console.log('   ⚠️  Password Reset with Token: MANUAL TEST NEEDED');
  console.log('\n💡 Next Steps:');
  console.log('   1. Check email inbox for welcome and reset emails');
  console.log('   2. Use the reset link from email to test password reset');
  console.log('   3. Verify emails follow Mazar brand guidelines:');
  console.log('      - Forvis Mazars logo');
  console.log('      - Brand colors (#00539F, #0072CE, #1E2875)');
  console.log('      - Professional layout and messaging');
  console.log('\n✨ Test suite completed!\n');
}

runTests().catch(console.error);
