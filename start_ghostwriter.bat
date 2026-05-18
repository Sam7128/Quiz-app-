@echo off
title GhostWriter Launcher
setlocal

echo ===========================================
echo   GhostWriter - Server + Radial Menu
echo ===========================================
echo.

set "VENV_DIR=.venv"
set "PYTHON_EXE=%VENV_DIR%\Scripts\python.exe"

if not exist "%PYTHON_EXE%" (
    echo [INFO] Creating virtual environment...
    python -m venv "%VENV_DIR%"
    if errorlevel 1 (
        echo [ERROR] Failed to create virtual environment.
        pause
        exit /b 1
    )
)

echo [INFO] Installing/updating dependencies...
"%PYTHON_EXE%" -m pip install -r ghostwriter/requirements.txt
if errorlevel 1 (
    echo [ERROR] Dependency installation failed.
    pause
    exit /b 1
)

echo [INFO] Stopping stale GhostWriter processes...
powershell -NoProfile -Command "$wd=[IO.Path]::GetFullPath('.'); Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'python.exe' -and $_.CommandLine -and $_.CommandLine.Contains($wd) -and ($_.CommandLine -match 'launcher.py|ghostwriter.server') } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }" > nul 2>&1

echo [INFO] Starting GhostWriter services...
echo [TIP] Use Ctrl + Middle Mouse to open radial menu.
echo.

"%PYTHON_EXE%" launcher.py
set "EXIT_CODE=%ERRORLEVEL%"

echo.
echo [INFO] launcher.py exited with code %EXIT_CODE%.
if not "%EXIT_CODE%"=="0" (
    echo [WARN] Program exited abnormally.
)
pause
exit /b %EXIT_CODE%
