import axios from 'axios';

const BASE_URL = 'http://localhost:5000';

async function quickTest() {
  try {
    // Step 1: Login
    console.log('🔐 Logging in...');
    const loginRes = await axios.post(`${BASE_URL}/api/admin/login`, {
      email: 'admin@safe8.com',
      password: 'admin123'
    }, { withCredentials: true });

    if (!loginRes.data.success) {
      console.error('❌ Login failed');
      process.exit(1);
    }

    const token = loginRes.data.token;
    console.log('✅ Logged in\n');

    // Step 2: Get CSRF token
    console.log('🔑 Getting CSRF token...');
    const csrfRes = await axios.get(`${BASE_URL}/api/csrf-token`, {
      withCredentials: true,
      headers: { 'Authorization': `Bearer ${token}` }
    });

    console.log('CSRF Response:', csrfRes.data);
    const csrfToken = csrfRes.data.csrfToken;
    
    if (!csrfToken) {
      console.error('❌ No CSRF token in response!');
      console.log('Full response:', csrfRes.data);
      process.exit(1);
    }
    
    console.log('✅ CSRF Token:', csrfToken.substring(0, 20) + '...\n');

    // Step 3: Try to create industry
    console.log('📝 Creating industry...');
    const industryRes = await axios.post(`${BASE_URL}/api/admin/config/industries`, 
      { name: 'API Test Industry' },
      {
        withCredentials: true,
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-csrf-token': csrfToken,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ Industry created:', industryRes.data);

    // Step 4: Verify
    console.log('\n🔍 Verifying...');
    const verifyRes = await axios.get(`${BASE_URL}/api/admin/config/industries`, {
      withCredentials: true,
      headers: { 'Authorization': `Bearer ${token}` }
    });

    console.log('Industries:', verifyRes.data.industries);

    console.log('\n✅ Test complete!');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error:', error.response?.data || error.message);
    process.exit(1);
  }
}

quickTest();
