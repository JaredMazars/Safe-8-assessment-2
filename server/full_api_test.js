import axios from 'axios';

async function testEndpoints() {
  try {
    console.log('='.repeat(60));
    console.log('TESTING API ENDPOINTS');
    console.log('='.repeat(60));

    // Login first
    console.log('\n1. LOGIN');
    const loginRes = await axios.post('http://localhost:5000/api/admin/login', {
      email: 'admin@safe8.com',
      password: 'admin123'
    }, { withCredentials: true });

    if (!loginRes.data.success) {
      console.error('❌ Login failed');
      process.exit(1);
    }

    const token = loginRes.data.token;
    console.log('✅ Login successful');

    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    // Test each endpoint
    console.log('\n2. GET ASSESSMENT TYPES');
    const typesRes = await axios.get('http://localhost:5000/api/admin/config/assessment-types', {
      headers,
      withCredentials: true
    });
    console.log('Response:', JSON.stringify(typesRes.data, null, 2));

    console.log('\n3. GET INDUSTRIES');
    const industriesRes = await axios.get('http://localhost:5000/api/admin/config/industries', {
      headers,
      withCredentials: true
    });
    console.log('Response:', JSON.stringify(industriesRes.data, null, 2));

    console.log('\n4. GET PILLARS');
    const pillarsRes = await axios.get('http://localhost:5000/api/admin/config/pillars', {
      headers,
      withCredentials: true
    });
    console.log('Response:', JSON.stringify(pillarsRes.data, null, 2));

    // Get CSRF token
    console.log('\n5. GET CSRF TOKEN');
    const csrfRes = await axios.get('http://localhost:5000/api/csrf-token', {
      headers,
      withCredentials: true
    });
    console.log('Response:', JSON.stringify(csrfRes.data, null, 2));

    if (!csrfRes.data.csrfToken) {
      console.error('❌ No csrfToken in response!');
      process.exit(1);
    }

    const csrfToken = csrfRes.data.csrfToken;
    console.log('✅ CSRF Token obtained');

    // Test CREATE operations
    console.log('\n6. CREATE INDUSTRY');
    try {
      const createIndustryRes = await axios.post('http://localhost:5000/api/admin/config/industries', 
        { name: 'Agriculture Test' },
        {
          headers: {
            ...headers,
            'x-csrf-token': csrfToken
          },
          withCredentials: true
        }
      );
      console.log('✅ Industry created:', JSON.stringify(createIndustryRes.data, null, 2));
    } catch (error) {
      console.error('❌ Failed to create industry');
      console.error('Status:', error.response?.status);
      console.error('Error:', JSON.stringify(error.response?.data, null, 2));
    }

    console.log('\n7. CREATE PILLAR');
    try {
      const createPillarRes = await axios.post('http://localhost:5000/api/admin/config/pillars', 
        { name: 'Innovation Test', shortName: 'InnovTest' },
        {
          headers: {
            ...headers,
            'x-csrf-token': csrfToken
          },
          withCredentials: true
        }
      );
      console.log('✅ Pillar created:', JSON.stringify(createPillarRes.data, null, 2));
    } catch (error) {
      console.error('❌ Failed to create pillar');
      console.error('Status:', error.response?.status);
      console.error('Error:', JSON.stringify(error.response?.data, null, 2));
    }

    console.log('\n8. VERIFY DATA AFTER CREATES');
    const verifyIndustriesRes = await axios.get('http://localhost:5000/api/admin/config/industries', {
      headers,
      withCredentials: true
    });
    console.log('Industries count:', verifyIndustriesRes.data.industries?.length);
    console.log('Industries:', verifyIndustriesRes.data.industries);

    const verifyPillarsRes = await axios.get('http://localhost:5000/api/admin/config/pillars', {
      headers,
      withCredentials: true
    });
    console.log('Pillars count:', verifyPillarsRes.data.pillars?.length);
    console.log('Pillars:', verifyPillarsRes.data.pillars);

    console.log('\n' + '='.repeat(60));
    console.log('✅ ALL TESTS COMPLETE');
    console.log('='.repeat(60));

    process.exit(0);
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    process.exit(1);
  }
}

testEndpoints();
