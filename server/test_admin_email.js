/**
 * Test script for admin-created user email
 */

import emailService from './services/emailService.js';

async function testAdminEmail() {
  console.log('🧪 Testing admin-created user email...');
  
  const testUserData = {
    email: 'jaredmoodley1212@gmail.com', // Using the SMTP user email for testing
    contact_name: 'Test User',
    first_name: 'Test',
    company_name: 'Test Company'
  };
  
  const testTempPassword = 'Test123!@#';
  
  try {
    const result = await emailService.sendAdminCreatedUserEmail(testUserData, testTempPassword);
    
    console.log('\n📊 Email Test Result:');
    console.log('Success:', result.success);
    
    if (result.success) {
      console.log('✅ Email sent successfully!');
      console.log('Message ID:', result.messageId);
      console.log('Recipient:', result.recipient);
    } else {
      console.log('❌ Email failed to send');
      console.log('Error:', result.error);
    }
    
    process.exit(result.success ? 0 : 1);
  } catch (error) {
    console.error('❌ Test failed with exception:', error);
    process.exit(1);
  }
}

testAdminEmail();
