# Azure App Service Deployment Guide (Node 24 LTS)

## Prerequisites
- Azure subscription
- Azure CLI installed
- Git repository

## Deployment Steps

### 1. Create Azure App Service

```bash
# Login to Azure
az login

# Create resource group
az group create --name safe8-rg --location canadacentral

# Create App Service Plan (Node 24 LTS)
az appservice plan create \
  --name safe8-plan \
  --resource-group safe8-rg \
  --sku B1 \
  --is-linux

# Create Web App with Node 24 LTS
az webapp create \
  --name safe8-app \
  --resource-group safe8-rg \
  --plan safe8-plan \
  --runtime "NODE:24-lts"
```

### 2. Configure Environment Variables

Add these to Azure App Service Configuration (Settings > Configuration > Application settings):

```
NODE_ENV=production
DB_SERVER=fm-sql-01.database.windows.net
DB_NAME=SAFE8-2026-2-4-13-5
DB_USER=admin1
DB_PASSWORD=_KH=q=[0s79+EJn
DB_ENCRYPT=yes
DB_TRUST_SERVER_CERTIFICATE=no
DB_PORT=1433
PORT=8080
JWT_SECRET=e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
JWT_EXPIRES_IN=1h
CSRF_SECRET=a7f8e9d1c2b3a4f5e6d7c8b9a0f1e2d3c4b5a6f7e8d9c0b1a2f3e4d5c6b7a8f9
SESSION_SECRET=e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
SESSION_DURATION_HOURS=8
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=jaredmoodley1212@gmail.com
SMTP_PASS=egwo becy ycxu apbn
```

### 3. Configure Startup Command

In Azure Portal > Configuration > General settings:
```
Startup Command: node server/index.js
```

### 4. Deploy via Git

```bash
# Add Azure remote
az webapp deployment source config-local-git \
  --name safe8-app \
  --resource-group safe8-rg

# Get deployment URL
az webapp deployment list-publishing-credentials \
  --name safe8-app \
  --resource-group safe8-rg \
  --query scmUri \
  --output tsv

# Add remote and push
git remote add azure <deployment-url>
git push azure main
```

### 5. Deploy via GitHub Actions (Recommended)

Create `.github/workflows/azure-deploy.yml`:

```yaml
name: Deploy to Azure App Service

on:
  push:
    branches: [ main ]
  workflow_dispatch:

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Set up Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '24'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Build frontend
      run: npm run build
    
    - name: Install server dependencies
      run: cd server && npm ci --production
    
    - name: Deploy to Azure Web App
      uses: azure/webapps-deploy@v2
      with:
        app-name: 'safe8-app'
        publish-profile: \${{ secrets.AZURE_WEBAPP_PUBLISH_PROFILE }}
        package: .
```

### 6. Deploy via VS Code Azure Extension

1. Install "Azure App Service" extension
2. Sign in to Azure
3. Right-click on the App Service
4. Select "Deploy to Web App"
5. Choose your project folder

## Post-Deployment

### Verify Deployment
```bash
# Check logs
az webapp log tail --name safe8-app --resource-group safe8-rg

# Test endpoint
curl https://safe8-app.azurewebsites.net/api/health
```

### Enable Application Insights (Optional)
```bash
az monitor app-insights component create \
  --app safe8-insights \
  --location canadacentral \
  --resource-group safe8-rg \
  --application-type web

# Link to Web App
az webapp config appsettings set \
  --name safe8-app \
  --resource-group safe8-rg \
  --settings APPINSIGHTS_INSTRUMENTATIONKEY=<key>
```

## Troubleshooting

### View Logs
- Azure Portal > App Service > Log stream
- Or: `az webapp log tail --name safe8-app --resource-group safe8-rg`

### Common Issues

1. **Port binding**: Azure expects port 8080 or from PORT env var
2. **Database connection**: Ensure Azure SQL firewall allows Azure services
3. **Build errors**: Check Node version matches (24 LTS)

## Cost Optimization

- Use B1 tier for development (~$13/month)
- Scale to S1 for production (~$74/month)
- Enable auto-scaling based on CPU/memory

## Your App Compatibility

✅ **Node 24 LTS Compatible**
- Package.json requires Node >=20.0.0
- All dependencies support Node 24
- ES Modules properly configured

✅ **Azure Ready**
- web.config configured
- Deployment scripts included
- Environment variables documented

## Next Steps

1. Push code to Git repository
2. Create Azure App Service with Node 24 runtime
3. Configure environment variables
4. Deploy using one of the methods above
