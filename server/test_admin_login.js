import axios from 'axios';

const API_URL = 'http://localhost:5000';

async function testAdminLogin() {
  console.log('🧪 Testing Admin Login...\n');

  // Test 1: Login with username
  console.log('Test 1: Login with USERNAME');
  try {
    const response1 = await axios.post(`${API_URL}/api/admin/login`, {
      username: 'admin',
      password: 'Admin123!'
    });
    console.log('✅ SUCCESS - Login with username worked!');
    console.log('   Admin:', response1.data.admin.username);
    console.log('   Email:', response1.data.admin.email);
    console.log('   Role:', response1.data.admin.role);
    console.log('   Session Token:', response1.data.sessionToken.substring(0, 20) + '...\n');
  } catch (error) {
    console.error('❌ FAILED - Login with username');
    console.error('   Error:', error.response?.data?.message || error.message);
    console.error('   Details:', error.response?.data?.errors || '');
    console.log('');
  }

  // Test 2: Login with email
  console.log('Test 2: Login with EMAIL');
  try {
    const response2 = await axios.post(`${API_URL}/api/admin/login`, {
      username: 'admin@forvismazars.com',
      password: 'Admin123!'
    });
    console.log('✅ SUCCESS - Login with email worked!');
    console.log('   Admin:', response2.data.admin.username);
    console.log('   Email:', response2.data.admin.email);
    console.log('   Role:', response2.data.admin.role);
    console.log('   Session Token:', response2.data.sessionToken.substring(0, 20) + '...\n');
  } catch (error) {
    console.error('❌ FAILED - Login with email');
    console.error('   Error:', error.response?.data?.message || error.message);
    console.error('   Details:', error.response?.data?.errors || '');
    console.log('');
  }

  // Test 3: Wrong password
  console.log('Test 3: WRONG PASSWORD (should fail)');
  try {
    await axios.post(`${API_URL}/api/admin/login`, {
      username: 'admin',
      password: 'WrongPassword123!'
    });
    console.log('❌ UNEXPECTED - Login should have failed');
  } catch (error) {
    console.log('✅ CORRECT - Login failed as expected');
    console.log('   Error:', error.response?.data?.message || error.message);
    console.log('');
  }

  console.log('═══════════════════════════════════════');
  console.log('📋 ADMIN LOGIN CREDENTIALS:');
  console.log('═══════════════════════════════════════');
  console.log('Option 1 (Username):');
  console.log('  Username: admin');
  console.log('  Password: Admin123!');
  console.log('');
  console.log('Option 2 (Email):');
  console.log('  Username: admin@forvismazars.com');
  console.log('  Password: Admin123!');
  console.log('');
  console.log('Login URL: http://localhost:5173/admin/login');
  console.log('═══════════════════════════════════════\n');
}

testAdminLogin();
