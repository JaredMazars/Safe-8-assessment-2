/**
 * Test sending email to a specific address
 * Usage: node test_specific_email.js test@example.com
 */

import emailService from './services/emailService.js';

const testEmail = process.argv[2] || 'test@example.com';

async function testSpecificEmail() {
  console.log(`🧪 Testing email to: ${testEmail}`);
  
  const testUserData = {
    email: testEmail,
    contact_name: 'Test User',
    first_name: 'Test',
    company_name: 'Test Company'
  };
  
  const testTempPassword = 'TempPass123!@#';
  
  console.log('\n📧 Email data:', JSON.stringify(testUserData, null, 2));
  console.log('🔑 Temp password:', testTempPassword);
  
  try {
    const result = await emailService.sendAdminCreatedUserEmail(testUserData, testTempPassword);
    
    console.log('\n📊 Email Result:');
    console.log(JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('\n✅ EMAIL SENT SUCCESSFULLY!');
      console.log('📬 Recipient:', result.recipient);
      console.log('📨 Message ID:', result.messageId);
      console.log('\n👉 CHECK YOUR INBOX AT:', testEmail);
    } else {
      console.log('\n❌ EMAIL FAILED');
      console.log('Error:', result.error);
    }
    
    process.exit(result.success ? 0 : 1);
  } catch (error) {
    console.error('\n❌ Test failed with exception:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testSpecificEmail();
