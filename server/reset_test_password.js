import database from './config/database.js';
import bcrypt from 'bcrypt';

async function resetTestUserPassword() {
  try {
    const password = 'Test123!';
    const salt = await bcrypt.genSalt(4);
    const hash = await bcrypt.hash(password, salt);
    
    const sql = `
      UPDATE leads
      SET password_hash = '${hash}',
          password_updated_at = GETDATE(),
          login_attempts = 0,
          account_locked = 0,
          locked_until = NULL
      WHERE email = 'test@example.com'
    `;
    
    await database.query(sql);
    console.log('✅ Password reset for test@example.com');
    console.log('📧 Email: test@example.com');
    console.log('🔑 Password: Test123!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

resetTestUserPassword();
