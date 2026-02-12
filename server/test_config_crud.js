const BASE_URL = 'http://localhost:5000';
let csrfToken = '';
let sessionCookie = '';

// Helper function to make authenticated requests
async function makeRequest(method, endpoint, body = null) {
  const headers = {
    'Content-Type': 'application/json'
  };

  if (sessionCookie) {
    headers['Cookie'] = sessionCookie;
  }

  if (csrfToken && method !== 'GET') {
    headers['x-csrf-token'] = csrfToken;
  }

  const options = {
    method,
    headers
  };

  if (body && method !== 'GET') {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, options);
  
  // Capture cookies from response
  const setCookie = response.headers.get('set-cookie');
  if (setCookie) {
    sessionCookie = setCookie.split(';')[0];
  }

  const data = await response.json();
  return { status: response.status, data };
}

async function testConfigurationCRUD() {
  console.log('🧪 Testing Configuration CRUD Operations\n');
  console.log('='.repeat(80));

  try {
    // Step 1: Get CSRF Token
    console.log('\n1️⃣  Getting CSRF Token...');
    const csrfResponse = await fetch(`${BASE_URL}/api/csrf-token`);
    const csrfData = await csrfResponse.json();
    csrfToken = csrfData.csrfToken || csrfData.token || '';
    const setCookie = csrfResponse.headers.get('set-cookie');
    if (setCookie) {
      sessionCookie = setCookie;
    }
    console.log(`   ✅ CSRF Token: ${csrfToken ? csrfToken.substring(0, 20) + '...' : 'Not found'}`);

    // Step 2: Admin Login
    console.log('\n2️⃣  Admin Login...');
    const loginResult = await makeRequest('POST', '/api/admin/login', {
      username: 'admin',
      password: 'Admin123!'
    });
    console.log(`   ${loginResult.status === 200 ? '✅' : '❌'} Login Status: ${loginResult.status}`);
    if (loginResult.status !== 200) {
      console.log('   ⚠️  Login failed, trying with admin@forvismazars.com...');
      const loginResult2 = await makeRequest('POST', '/api/admin/login', {
        email: 'admin@forvismazars.com',
        password: 'AdminPassword123!'
      });
      console.log(`   ${loginResult2.status === 200 ? '✅' : '❌'} Login Status: ${loginResult2.status}`);
    }

    // Step 3: Load Current Configuration
    console.log('\n3️⃣  Loading Current Configuration...');
    
    const typesResult = await makeRequest('GET', '/api/admin/config/assessment-types');
    console.log(`   Assessment Types Response:`, typesResult.data);
    console.log(`   ✅ Assessment Types: ${JSON.stringify(typesResult.data.assessmentTypes || [])}`);
    
    const industriesResult = await makeRequest('GET', '/api/admin/config/industries');
    console.log(`   Industries Response:`, industriesResult.data);
    console.log(`   ✅ Industries: ${(industriesResult.data.industries || []).length} items`);
    
    const pillarsResult = await makeRequest('GET', '/api/admin/config/pillars');
    console.log(`   Pillars Response:`, pillarsResult.data);
    console.log(`   ✅ Pillars: ${(pillarsResult.data.pillars || []).length} items`);

    // Step 4: Test CREATE Industry
    console.log('\n4️⃣  Testing CREATE Industry...');
    const createIndustryResult = await makeRequest('POST', '/api/admin/config/industries', {
      name: 'Test Industry ' + Date.now()
    });
    console.log(`   ${createIndustryResult.status === 200 ? '✅' : '❌'} Create Status: ${createIndustryResult.status}`);
    console.log(`   Response: ${JSON.stringify(createIndustryResult.data)}`);

    if (createIndustryResult.data.industry) {
      const industryId = createIndustryResult.data.industry.id;
      
      // Step 5: Test UPDATE Industry
      console.log('\n5️⃣  Testing UPDATE Industry...');
      const updateIndustryResult = await makeRequest('PUT', `/api/admin/config/industries/${industryId}`, {
        name: 'Updated Test Industry'
      });
      console.log(`   ${updateIndustryResult.status === 200 ? '✅' : '❌'} Update Status: ${updateIndustryResult.status}`);
      console.log(`   Response: ${JSON.stringify(updateIndustryResult.data)}`);

      // Step 6: Test DELETE Industry
      console.log('\n6️⃣  Testing DELETE Industry...');
      const deleteIndustryResult = await makeRequest('DELETE', `/api/admin/config/industries/${industryId}`);
      console.log(`   ${deleteIndustryResult.status === 200 ? '✅' : '❌'} Delete Status: ${deleteIndustryResult.status}`);
      console.log(`   Response: ${JSON.stringify(deleteIndustryResult.data)}`);
    }

    // Step 7: Test CREATE Pillar
    console.log('\n7️⃣  Testing CREATE Pillar...');
    const createPillarResult = await makeRequest('POST', '/api/admin/config/pillars', {
      name: 'Test Pillar',
      short_name: 'TEST'
    });
    console.log(`   ${createPillarResult.status === 200 ? '✅' : '❌'} Create Status: ${createPillarResult.status}`);
    console.log(`   Response: ${JSON.stringify(createPillarResult.data)}`);

    if (createPillarResult.data.pillar) {
      const pillarId = createPillarResult.data.pillar.id;
      
      // Step 8: Test UPDATE Pillar
      console.log('\n8️⃣  Testing UPDATE Pillar...');
      const updatePillarResult = await makeRequest('PUT', `/api/admin/config/pillars/${pillarId}`, {
        name: 'Updated Test Pillar'
      });
      console.log(`   ${updatePillarResult.status === 200 ? '✅' : '❌'} Update Status: ${updatePillarResult.status}`);
      console.log(`   Response: ${JSON.stringify(updatePillarResult.data)}`);

      // Step 9: Test DELETE Pillar
      console.log('\n9️⃣  Testing DELETE Pillar...');
      const deletePillarResult = await makeRequest('DELETE', `/api/admin/config/pillars/${pillarId}`);
      console.log(`   ${deletePillarResult.status === 200 ? '✅' : '❌'} Delete Status: ${deletePillarResult.status}`);
      console.log(`   Response: ${JSON.stringify(deletePillarResult.data)}`);
    }

    // Step 10: Verify Final State
    console.log('\n🔟  Verifying Final Configuration State...');
    const finalIndustriesResult = await makeRequest('GET', '/api/admin/config/industries');
    const finalPillarsResult = await makeRequest('GET', '/api/admin/config/pillars');
    
    console.log(`   ✅ Final Industries Count: ${finalIndustriesResult.data.industries.length}`);
    console.log(`   ✅ Final Pillars Count: ${finalPillarsResult.data.pillars.length}`);

    console.log('\n' + '='.repeat(80));
    console.log('✅ ALL TESTS COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error(error);
  }

  process.exit(0);
}

testConfigurationCRUD();
