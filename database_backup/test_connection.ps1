# Test Local Database Connection
# This script helps verify your local SQL Server setup

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "SAFE-8 Local Database Connection Test" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Common SQL Server instance names
$instances = @(
    "localhost",
    ".\SQLEXPRESS",
    "(local)",
    ".\MSSQLSERVER",
    $env:COMPUTERNAME,
    "$env:COMPUTERNAME\SQLEXPRESS"
)

Write-Host "🔍 Searching for SQL Server instances..." -ForegroundColor Yellow
Write-Host ""

# Check SQL Server services
Write-Host "📋 SQL Server Services:" -ForegroundColor White
$services = Get-Service | Where-Object {$_.Name -like "*SQL*"} | Select-Object Name, Status, DisplayName

if ($services) {
    $services | Format-Table -AutoSize
} else {
    Write-Host "  ⚠️  No SQL Server services found!" -ForegroundColor Yellow
    Write-Host "  Please install SQL Server or SQL Server Express" -ForegroundColor Gray
    Write-Host ""
    exit
}

Write-Host ""
Write-Host "🔌 Testing connections..." -ForegroundColor Yellow
Write-Host ""

$workingInstance = $null

foreach ($instance in $instances) {
    Write-Host "Testing: $instance" -NoNewline
    
    try {
        $connectionString = "Server=$instance;Database=master;Integrated Security=True;Connection Timeout=3;"
        $connection = New-Object System.Data.SqlClient.SqlConnection($connectionString)
        $connection.Open()
        
        # Get SQL Server version
        $command = $connection.CreateCommand()
        $command.CommandText = 'SELECT @@VERSION'
        $version = $command.ExecuteScalar()
        
        $connection.Close()
        
        Write-Host " ✅ Connected!" -ForegroundColor Green
        Write-Host "  Version: $($version.Split([Environment]::NewLine)[0])" -ForegroundColor Gray
        
        # Check if SAFE8_Local exists
        $connection.Open()
        $command = $connection.CreateCommand()
        $command.CommandText = 'SELECT COUNT(*) FROM sys.databases WHERE name = ''SAFE8_Local'''
        $dbExists = $command.ExecuteScalar()
        $connection.Close()
        
        if ($dbExists -eq 1) {
            Write-Host "  Database: SAFE8_Local ✅ Exists" -ForegroundColor Green
            
            # Get table count
            $connectionString = "Server=$instance;Database=SAFE8_Local;Integrated Security=True;Connection Timeout=3;"
            $connection = New-Object System.Data.SqlClient.SqlConnection($connectionString)
            $connection.Open()
            $command = $connection.CreateCommand()
            $command.CommandText = 'SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = ''BASE TABLE'''
            $tableCount = $command.ExecuteScalar()
            
            # Get admin count
            $command.CommandText = 'SELECT COUNT(*) FROM admin_users'
            $adminCount = $command.ExecuteScalar()
            
            $connection.Close()
            
            Write-Host "  Tables: $tableCount" -ForegroundColor Gray
            Write-Host "  Admin Users: $adminCount" -ForegroundColor Gray
        } else {
            Write-Host "  Database: SAFE8_Local ⚠️  Not found" -ForegroundColor Yellow
            Write-Host "  Run create_local_database.sql to create it" -ForegroundColor Gray
        }
        
        $workingInstance = $instance
        Write-Host ""
        break
        
    } catch {
        Write-Host " ❌ Failed" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "RECOMMENDATION" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

if ($workingInstance) {
    Write-Host "✅ Use this configuration in your .env file:" -ForegroundColor Green
    Write-Host ""
    Write-Host "DB_SERVER=$workingInstance" -ForegroundColor White
    Write-Host "DB_NAME=SAFE8_Local" -ForegroundColor White
    Write-Host "DB_USER=" -ForegroundColor White
    Write-Host "DB_PASSWORD=" -ForegroundColor White
    Write-Host "DB_INTEGRATED_SECURITY=true" -ForegroundColor White
    Write-Host ""
    
    # Create .env.local file
    $envContent = @"
# Local Database Configuration
# Generated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

DB_SERVER=$workingInstance
DB_NAME=SAFE8_Local
DB_USER=
DB_PASSWORD=
DB_INTEGRATED_SECURITY=true

# Other settings (copy from .env as needed)
PORT=8080
NODE_ENV=development
SESSION_SECRET=your-secret-key-here
CSRF_SECRET=your-csrf-secret-key-here-at-least-32-chars-long
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
"@

    $envPath = Join-Path (Get-Location) '.env.local'
    $envContent | Out-File -FilePath $envPath -Encoding UTF8
    
    Write-Host "Created .env.local file with recommended settings" -ForegroundColor Green
    Write-Host "   Location: $envPath" -ForegroundColor Gray
    Write-Host ""
} else {
    Write-Host "❌ Could not connect to any SQL Server instance" -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 Troubleshooting steps:" -ForegroundColor Yellow
    Write-Host "  1. Check if SQL Server is running:" -ForegroundColor Gray
    Write-Host "     Get-Service | Where-Object {`$_.Name -like '*SQL*'}" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  2. Start SQL Server if stopped:" -ForegroundColor Gray
    Write-Host "     Start-Service MSSQLSERVER" -ForegroundColor Cyan
    Write-Host "     # OR for Express:" -ForegroundColor Gray
    Write-Host "     Start-Service MSSQL`$SQLEXPRESS" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  3. Enable TCP/IP in SQL Server Configuration Manager" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  4. Check Windows Firewall allows SQL Server (port 1433)" -ForegroundColor Gray
    Write-Host ""
}

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "NEXT STEPS" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. If SAFE8_Local doesn't exist, create it:" -ForegroundColor White
Write-Host "   sqlcmd -S $workingInstance -E -i create_local_database.sql" -ForegroundColor Cyan
Write-Host ""
Write-Host "2. Update your .env file with the configuration above" -ForegroundColor White
Write-Host ""
Write-Host "3. Restart your Node.js server:" -ForegroundColor White
Write-Host "   cd server" -ForegroundColor Cyan
Write-Host "   node index.js" -ForegroundColor Cyan
Write-Host ""
Write-Host "4. Login to admin portal:" -ForegroundColor White
Write-Host "   http://localhost:8080/admin/login" -ForegroundColor Cyan
Write-Host "   Username: admin" -ForegroundColor Cyan
Write-Host "   Password: Admin123!" -ForegroundColor Cyan
Write-Host ""
