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

const pool = await sql.connect(dbConfig);

// Check which admin table exists
const tables = await pool.request().query(`
  SELECT TABLE_NAME 
  FROM INFORMATION_SCHEMA.TABLES 
  WHERE TABLE_NAME IN ('admins', 'admin_users')
`);

console.log('Admin tables found:', tables.recordset);

// Check superadmin in both tables
const admins = await pool.request().query(`
  SELECT 'admins' as tbl, username, email, is_active 
  FROM admins 
  WHERE username = 'superadmin' OR email = 'superadmin@forvismazars.com'
`);

const adminUsers = await pool.request().query(`
  SELECT 'admin_users' as tbl, username, email, is_active 
  FROM admin_users 
  WHERE username = 'superadmin' OR email = 'superadmin@forvismazars.com'
`).catch(() => ({ recordset: [] }));

console.log('\nSuperadmin in admins:', admins.recordset);
console.log('Superadmin in admin_users:', adminUsers.recordset);

await pool.close();
