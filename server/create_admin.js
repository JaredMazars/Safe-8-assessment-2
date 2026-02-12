import bcrypt from 'bcrypt';
import database from './config/database.js';

const SALT_ROUNDS = 10;

async function createAdmin() {
  try {
    console.log('🔐 Creating admin user...\n');

    const username = 'admin';
    const email = 'admin@forvismazars.com';
    const password = 'Admin123!';
    const full_name = 'System Administrator';
    const role = 'admin';

    // Hash the password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    
    const sql = `
      INSERT INTO admin_users (
        username, email, password_hash, full_name, role, is_active, created_by
      ) 
      OUTPUT INSERTED.id, INSERTED.username, INSERTED.email
      VALUES (?, ?, ?, ?, ?, 1, 1);
    `;

    const result = await database.query(sql, [
      username, email, passwordHash, full_name, role
    ]);

    console.log('✅ Admin user created successfully!');
    console.log('\n📋 Admin Credentials:');
    console.log('   Username: admin');
    console.log('   Email:    admin@forvismazars.com');
    console.log('   Password: Admin123!');
    console.log('\n🔗 Login at: http://localhost:5173/admin/login\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin:', error.message);
    if (error.message.includes('duplicate') || error.message.includes('unique') || error.message.includes('Violation of UNIQUE KEY')) {
      console.log('\n⚠️  Admin user already exists. Use these credentials:');
      console.log('   Username: admin');
      console.log('   Email:    admin@forvismazars.com');
      console.log('   Password: Admin123!');
      console.log('\n🔗 Login at: http://localhost:5173/admin/login\n');
      process.exit(0);
    }
    process.exit(1);
  }
}

createAdmin();
