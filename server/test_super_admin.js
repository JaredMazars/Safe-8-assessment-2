// Test Super Admin Feature
// This script tests the super admin functionality

import sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config();

const dbConfig = {
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  options: {
    encrypt: true,
    trustServerCertificate: false
  }
};

async function checkSuperAdmin() {
  try {
    console.log('🔐 Active Admin Login Credentials\n');
    
    const pool = await sql.connect(dbConfig);
    
    const result = await pool.request().query(`
      SELECT id, username, email, full_name, role, is_active, created_at
      FROM admins
      WHERE is_active = 1
      ORDER BY role DESC, username
    `);
    
    console.log('📊 Active Admin Accounts:');
    console.log('=====================================');
    result.recordset.forEach(admin => {
      const roleEmoji = admin.role === 'super_admin' ? '👑' : '👤';
      console.log(`${roleEmoji} Username: ${admin.username}`);
      console.log(`   Email: ${admin.email}`);
      console.log(`   Role: ${admin.role.toUpperCase()}`);
      console.log(`   Full Name: ${admin.full_name || 'N/A'}`);
      console.log('-------------------------------------');
    });
    
    console.log(`\n⚠️  IMPORTANT:`);
    console.log(`   Passwords are hashed in the database for security.`);
    console.log(`   Use the password you set when creating these accounts.\n`);
    console.log(`💡 Common default credentials:`);
    console.log(`   superadmin / (your password)`);
    console.log(`   admin / (your password)\n`);
    
    const superAdmins = result.recordset.filter(a => a.role === 'super_admin');
    const regularAdmins = result.recordset.filter(a => a.role === 'admin');
    
    console.log(`\n📈 Summary:`);
    console.log(`   Super Admins: ${superAdmins.length}`);
    console.log(`   Regular Admins: ${regularAdmins.length}`);
    console.log(`   Total: ${result.recordset.length}`);
    
    if (superAdmins.length === 0) {
      console.log('\n⚠️  No super_admin accounts found!');
      console.log('💡 To test the feature, you can:');
      console.log('   1. Update an existing admin to super_admin role');
      console.log('   2. Run: UPDATE admins SET role = \'super_admin\' WHERE username = \'your_username\'');
    }
    
    await pool.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkSuperAdmin();
