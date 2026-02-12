/**
 * Create a test user account with known credentials for testing
 */

import bcrypt from 'bcrypt';
import database from './config/database.js';

const TEST_USER = {
  email: 'testuser@mazars.com',
  password: 'TestPass123!',
  contact_name: 'Test User',
  company_name: 'Forvis Mazars',
  job_title: 'QA Tester',
  phone_number: '+27123456789',
  industry: 'Technology',
  company_size: '1,001-10,000 employees',
  country: 'South Africa'
};

async function createTestUser() {
  try {
    console.log('🔐 Creating test user account...\n');

    // Hash the password
    const password_hash = await bcrypt.hash(TEST_USER.password, 10);

    // Check if user already exists
    const existingUser = await database.query(`
      SELECT id FROM leads WHERE email = '${TEST_USER.email}'
    `);

    const exists = Array.isArray(existingUser) 
      ? existingUser.length > 0 
      : existingUser.recordset.length > 0;

    if (exists) {
      console.log('⚠️  User already exists. Updating password...\n');
      await database.query(`
        UPDATE leads 
        SET password_hash = '${password_hash}',
            password_updated_at = GETUTCDATE()
        WHERE email = '${TEST_USER.email}'
      `);
      console.log('✅ Password updated successfully!\n');
    } else {
      // Insert new user
      await database.query(`
        INSERT INTO leads (
          email, password_hash, contact_name, company_name, job_title,
          phone_number, industry, company_size, country,
          lead_source, password_created_at
        ) VALUES (
          '${TEST_USER.email}',
          '${password_hash}',
          '${TEST_USER.contact_name}',
          '${TEST_USER.company_name}',
          '${TEST_USER.job_title}',
          '${TEST_USER.phone_number}',
          '${TEST_USER.industry}',
          '${TEST_USER.company_size}',
          '${TEST_USER.country}',
          'TEST',
          GETUTCDATE()
        )
      `);
      console.log('✅ User created successfully!\n');
    }

    console.log('═══════════════════════════════════════════════════');
    console.log('📋 TEST USER CREDENTIALS');
    console.log('═══════════════════════════════════════════════════');
    console.log(`Email:    ${TEST_USER.email}`);
    console.log(`Password: ${TEST_USER.password}`);
    console.log(`Name:     ${TEST_USER.contact_name}`);
    console.log(`Company:  ${TEST_USER.company_name}`);
    console.log('═══════════════════════════════════════════════════\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

createTestUser();
