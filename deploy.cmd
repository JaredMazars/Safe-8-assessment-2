@echo off
setlocal enabledelayedexpansion

:: Azure Custom Deployment Script for Node 24 LTS

echo ========================================
echo SAFE-8 Azure Deployment (Node 24 LTS)
echo ========================================

:: Verify Node version
node --version
npm --version

:: Setup deployment variables
IF NOT DEFINED DEPLOYMENT_SOURCE (
  SET DEPLOYMENT_SOURCE=%~dp0%.
)

IF NOT DEFINED DEPLOYMENT_TARGET (
  SET DEPLOYMENT_TARGET=%ARTIFACTS%\wwwroot
)

IF NOT DEFINED NEXT_MANIFEST_PATH (
  SET NEXT_MANIFEST_PATH=%ARTIFACTS%\manifest
)

IF NOT DEFINED PREVIOUS_MANIFEST_PATH (
  SET PREVIOUS_MANIFEST_PATH=%ARTIFACTS%\manifest
)

IF NOT DEFINED KUDU_SYNC_CMD (
  :: Install Kudu Sync
  echo Installing Kudu Sync
  call npm install -g kudusync
  IF !ERRORLEVEL! NEQ 0 goto error

  :: Set Kudu Sync command
  SET KUDU_SYNC_CMD=%appdata%\npm\kuduSync.cmd
)

echo Deployment source: %DEPLOYMENT_SOURCE%
echo Deployment target: %DEPLOYMENT_TARGET%

:: 1. KuduSync - Copy files
echo.
echo === Syncing files to Azure ===
call :ExecuteCmd "%KUDU_SYNC_CMD%" -v 50 -f "%DEPLOYMENT_SOURCE%" -t "%DEPLOYMENT_TARGET%" -n "%NEXT_MANIFEST_PATH%" -p "%PREVIOUS_MANIFEST_PATH%" -i ".git;.gitignore;.deployment;node_modules"
IF !ERRORLEVEL! NEQ 0 goto error

:: 2. Install root dependencies and build frontend
cd /d "%DEPLOYMENT_TARGET%"
echo.
echo === Installing root dependencies ===
call npm install --production=false
IF !ERRORLEVEL! NEQ 0 goto error

echo.
echo === Building frontend ===
call npm run build
IF !ERRORLEVEL! NEQ 0 goto error

:: 3. Install server dependencies
echo.
echo === Installing server dependencies ===
cd /d "%DEPLOYMENT_TARGET%\server"
call npm install --production
IF !ERRORLEVEL! NEQ 0 goto error

:: 4. Cleanup
echo.
echo === Cleaning up ===
cd /d "%DEPLOYMENT_TARGET%"
call npm prune --production 2>nul

echo.
echo ========================================
echo Deployment completed successfully!
echo ========================================

goto end

:ExecuteCmd
setlocal
set _CMD_=%*
call %_CMD_%
if "%ERRORLEVEL%" NEQ "0" echo Failed exitCode=%ERRORLEVEL%, command=%_CMD_%
exit /b %ERRORLEVEL%

:error
echo An error occurred during deployment.
exit /b 1

:end
echo Finished successfully.
