# SAFE-8 Local Database Setup

This folder contains scripts to set up a local SAFE-8 database for development and testing.

## 📋 Prerequisites

- SQL Server 2017 or later (Express Edition is fine)
- SQL Server Management Studio (SSMS) - Optional but recommended
- OR sqlcmd command-line tool

## 🚀 Quick Start

### Option 1: Using SQL Server Management Studio (SSMS)

1. Open SQL Server Management Studio
2. Connect to your local SQL Server instance (usually `localhost` or `.\SQLEXPRESS`)
3. Open the file: `create_local_database.sql`
4. Click **Execute** (or press F5)
5. Wait for completion message

### Option 2: Using sqlcmd (Command Line)

```powershell
# Using Windows Authentication (Recommended)
sqlcmd -S localhost -E -i create_local_database.sql

# OR using SQL Express
sqlcmd -S .\SQLEXPRESS -E -i create_local_database.sql

# With SQL Server Authentication
sqlcmd -S localhost -U sa -P YourPassword -i create_local_database.sql
```

## 📊 What Gets Created

The script creates:

### Database
- **Name**: `SAFE8_Local`
- **Collation**: Default SQL Server collation

### Tables
1. `admin_users` - Admin user accounts
2. `leads` - User/customer accounts  
3. `industries` - Industry categories
4. `pillars` - Assessment pillars (8 pillars)
5. `questions` - Assessment questions
6. `assessments` - Completed assessments
7. `assessment_answers` - Individual question responses
8. `assessment_type_configs` - Assessment type configurations
9. `pillar_weights` - Pillar weight configurations
10. `user_activity_log` - Activity tracking

### Sample Data Included

#### Admin Users
| Username | Email | Password | Role |
|----------|-------|----------|------|
| `admin` | admin@forvismazars.com | `Admin123!` | admin |
| `superadmin` | superadmin@forvismazars.com | `Admin123!` | super_admin |
| `jared` | jared.moodley@mazars.co.za | `Admin123!` | super_admin |

#### Pillars (8 pillars)
1. Strategy & Vision
2. Governance & Ethics
3. Data & Infrastructure
4. Talent & Culture
5. Technology & Tools
6. Process & Operations
7. Innovation & Experimentation
8. Risk & Security

#### Industries
- Technology
- Healthcare
- Financial Services
- Retail
- Manufacturing
- Education
- Government
- Other

#### Assessment Types
- Core Assessment (25 questions)
- Advanced Assessment (45 questions)
- Frontier Assessment (60 questions)

## ⚙️ Configure Your Application

After creating the database, update your `.env` file:

```env
# Local Database Configuration
DB_SERVER=localhost
DB_NAME=SAFE8_Local
DB_USER=
DB_PASSWORD=
DB_INTEGRATED_SECURITY=true

# OR for SQL Express
# DB_SERVER=.\SQLEXPRESS

# OR with SQL Authentication
# DB_SERVER=localhost
# DB_NAME=SAFE8_Local
# DB_USER=sa
# DB_PASSWORD=YourPassword
# DB_INTEGRATED_SECURITY=false
```

## 🔐 Login Credentials

### Admin Portal
- URL: `http://localhost:8080/admin/login`
- Username: `admin`
- Password: `Admin123!`

### Test User Account
You can create test user accounts through the admin portal or by inserting into the `leads` table.

## 🔧 Troubleshooting

### Cannot connect to SQL Server

Make sure SQL Server is running:
```powershell
# Check SQL Server services
Get-Service | Where-Object {$_.Name -like "*SQL*"}

# Start SQL Server if stopped
Start-Service MSSQLSERVER

# For SQL Express
Start-Service MSSQL$SQLEXPRESS
```

### Database already exists error

The script automatically drops and recreates the database. If you get an error:
1. Close all connections to `SAFE8_Local`
2. Try running the script again
3. Or manually drop the database first:
   ```sql
   USE master;
   DROP DATABASE SAFE8_Local;
   ```

### Authentication failures

For Windows Authentication issues:
- Make sure your Windows user has SQL Server permissions
- Try connecting as `sa` (SQL Server Admin) if available
- Check SQL Server is configured for Mixed Mode authentication

## 📝 Adding Questions

The database schema is ready but doesn't include questions by default. You need to:

1. **Use the Admin Portal** (Recommended)
   - Login to http://localhost:8080/admin/dashboard
   - Go to "Questions" tab
   - Add questions for each pillar and assessment type

2. **Import from Azure** (if you have access)
   - Run the backup script (see parent README)
   - Execute the generated SQL files

3. **Manual SQL Insert**
   ```sql
   INSERT INTO questions (question_text, pillar_id, assessment_type, question_order, is_active)
   VALUES (N'How mature is your AI strategy?', 1, N'core', 1, 1);
   ```

## 🔄 Resetting the Database

To start fresh:
```powershell
sqlcmd -S localhost -E -i create_local_database.sql
```

This will drop and recreate everything.

## 📊 Viewing Data

Using SSMS:
1. Connect to your server
2. Expand Databases → SAFE8_Local → Tables
3. Right-click a table → "Select Top 1000 Rows"

Using sqlcmd:
```powershell
sqlcmd -S localhost -E -d SAFE8_Local -Q "SELECT * FROM admin_users"
```

## 🆘 Need Help?

Common issues:
- **Port 1433 blocked**: Check Windows Firewall
- **TCP/IP disabled**: Enable in SQL Server Configuration Manager
- **Wrong instance name**: Check SQL Server instances with `Get-Service MSSQL*`

## 📁 Files in This Folder

- `create_local_database.sql` - Main database creation script
- `README.md` - This file
- `01_schema.sql` - (Generated by backup script) Database schema from Azure
- `02_data.sql` - (Generated by backup script) Data from Azure

## 🌐 Next Steps

1. Create the local database using the script above
2. Update your `.env` file with local connection details
3. Restart your Node.js server
4. Login to the admin portal
5. Add questions or import data
6. Start testing!

---

**Note**: The admin passwords in this script are bcrypt hashed. The actual password is `Admin123!` for all admin accounts.
