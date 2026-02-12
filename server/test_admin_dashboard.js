import axios from 'axios';

const API_URL = 'http://localhost:5000';

async function testAdminDashboard() {
  console.log('🧪 Testing Admin Dashboard Data Population...\n');

  try {
    // Step 1: Login as admin
    console.log('Step 1: Logging in as admin...');
    const loginResponse = await axios.post(`${API_URL}/api/admin/login`, {
      username: 'admin',
      password: 'Admin123!'
    });

    if (!loginResponse.data.success) {
      console.error('❌ Login failed');
      return;
    }

    const token = loginResponse.data.sessionToken;
    console.log('✅ Login successful\n');

    // Configure axios with auth token
    const authApi = axios.create({
      baseURL: API_URL,
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    // Step 2: Test Dashboard Stats
    console.log('Step 2: Fetching Dashboard Statistics...');
    const statsResponse = await authApi.get('/api/admin/dashboard/stats');
    const stats = statsResponse.data.stats || statsResponse.data;
    
    console.log('✅ Dashboard Stats Retrieved:');
    console.log(`   📊 Total Users: ${stats.total_users}`);
    console.log(`   📋 Total Assessments: ${stats.total_assessments}`);
    console.log(`   ❓ Total Questions: ${stats.total_questions}`);
    console.log(`   📈 Average Score: ${stats.avg_score ? stats.avg_score.toFixed(2) + '%' : 'N/A'}`);
    
    if (stats.assessment_type_breakdown && stats.assessment_type_breakdown.length > 0) {
      console.log('\n   Assessment Type Breakdown:');
      stats.assessment_type_breakdown.forEach(type => {
        console.log(`     • ${type.assessment_type}: ${type.count} assessments (Avg: ${type.avg_score?.toFixed(1)}%)`);
      });
    }
    
    if (stats.recent_activity && stats.recent_activity.length > 0) {
      console.log(`\n   Recent Activity: ${stats.recent_activity.length} items`);
      stats.recent_activity.slice(0, 3).forEach(activity => {
        console.log(`     • ${activity.admin_username}: ${activity.description}`);
      });
    }
    console.log('');

    // Step 3: Test Users List
    console.log('Step 3: Fetching Users List...');
    const usersResponse = await authApi.get('/api/admin/users?page=1&limit=5');
    console.log(`✅ Users Retrieved: ${usersResponse.data.users.length} users (Page 1)`);
    if (usersResponse.data.users.length > 0) {
      console.log(`   First user: ${usersResponse.data.users[0].full_name} (${usersResponse.data.users[0].email})`);
    }
    console.log('');

    // Step 4: Test Questions List
    console.log('Step 4: Fetching Questions List...');
    const questionsResponse = await authApi.get('/api/admin/questions?page=1&limit=5');
    console.log(`✅ Questions Retrieved: ${questionsResponse.data.questions.length} questions (Page 1)`);
    if (questionsResponse.data.questions.length > 0) {
      const q = questionsResponse.data.questions[0];
      console.log(`   First question: [${q.assessment_type}] ${q.pillar_name} - ${q.question_text.substring(0, 50)}...`);
    }
    console.log('');

    // Step 5: Test Assessments List
    console.log('Step 5: Fetching Assessments List...');
    const assessmentsResponse = await authApi.get('/api/admin/assessments?page=1&limit=5');
    console.log(`✅ Assessments Retrieved: ${assessmentsResponse.data.assessments.length} assessments (Page 1)`);
    if (assessmentsResponse.data.assessments.length > 0) {
      const a = assessmentsResponse.data.assessments[0];
      console.log(`   First assessment: ${a.user_name} - ${a.assessment_type} (Score: ${a.overall_score?.toFixed(1)}%)`);
    }
    console.log('');

    // Step 6: Test Activity Logs
    console.log('Step 6: Fetching Activity Logs...');
    const activityResponse = await authApi.get('/api/admin/activity-logs/detailed?page=1&limit=5');
    console.log(`✅ Activity Logs Retrieved: ${activityResponse.data.logs.length} logs (Page 1)`);
    if (activityResponse.data.logs.length > 0) {
      const log = activityResponse.data.logs[0];
      console.log(`   Latest activity: ${log.admin_username} - ${log.action_type} ${log.entity_type}`);
    }
    console.log('');

    // Summary
    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ ALL ADMIN DASHBOARD ENDPOINTS WORKING!');
    console.log('═══════════════════════════════════════════════════════');
    console.log('Data Summary:');
    console.log(`  • ${stats.total_users} Users`);
    console.log(`  • ${stats.total_assessments} Assessments`);
    console.log(`  • ${stats.total_questions} Questions`);
    console.log(`  • ${stats.recent_activity?.length || 0} Recent Activities`);
    console.log('');
    console.log('Admin Dashboard URL: http://localhost:5173/admin/dashboard');
    console.log('Login with: admin / Admin123!');
    console.log('═══════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    if (error.response?.data?.errors) {
      console.error('   Validation errors:', error.response.data.errors);
    }
  }
}

testAdminDashboard();
