﻿@echo off
:: 設定編碼為 UTF-8 以便在命令提示字元中正常顯示繁體中文與圖標
chcp 65001 >nul
title MindSpark - 一鍵啟動開發伺服器

echo ================================================================
echo     __  ____           __ ____                      __          
echo    /  ^|/  (_)___  ____/ /  ___/____  ____ ______/ /__        
echo   / /^|_/ / / __ \/ __  /\___ \/ __ \/ __ `/ ___/ //_/        
echo  / /  / / / / / / /_/ /____/ / /_/ / /_/ / /  / , ^<         
echo /_/  /_/_/_/ /_/\__,_/ /____/ .___/\__,_/_/  /_/\_\         
echo                            /_/                              
echo ================================================================
echo [系統] 歡迎使用 MindSpark 一鍵啟動與測試工具！
echo [系統] 本腳本將自動為您檢查環境、啟動伺服器，並開啟瀏覽器進行測試。
echo ----------------------------------------------------------------

:: 1. 檢查是否存在 node_modules
if exist "node_modules\" goto :CHECK_PORT
echo [警告] 偵測到 node_modules 資料夾不存在！
echo [步驟] 系統將自動執行 npm install 安裝相依套件...
echo ----------------------------------------------------------------
call npm install
if errorlevel 1 goto :INSTALL_FAILED
echo [成功] 相依套件安裝完成！
echo ----------------------------------------------------------------

:CHECK_PORT
:: 2. 檢查 Port 5173 是否被佔用
echo [步驟] 正在檢查 Port 5173 是否已被佔用...
set "PORT_OCCUPIED=0"
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5173') do (
    set "PORT_OCCUPIED=1"
    set "PID_OCCUPIED=%%a"
)

if "%PORT_OCCUPIED%"=="1" goto :PORT_CONFLICT
goto :START_SERVER

:PORT_CONFLICT
echo [提示] 偵測到 Port 5173 目前已被 PID: %PID_OCCUPIED% 佔用。
echo [選項] 請選擇處理方式：
echo      [1] 強制結束佔用 Port 5173 的程序並重新啟動
echo      [2] 略過 Port 檢查，直接嘗試啟動
echo      [3] 僅開啟瀏覽器至 http://localhost:5173 並退出
echo      [4] 取消啟動
echo.
set "choice="
set /p choice="請輸入選項 (1-4): "

if "%choice%"=="1" goto :KILL_PROCESS
if "%choice%"=="2" goto :START_SERVER
if "%choice%"=="3" goto :OPEN_BROWSER_ONLY
if "%choice%"=="4" goto :CANCEL_LAUNCH
echo [錯誤] 無效的選項，請重新輸入。
echo ----------------------------------------------------------------
goto :PORT_CONFLICT

:KILL_PROCESS
echo [步驟] 正在強制終止 PID %PID_OCCUPIED%...
taskkill /F /PID %PID_OCCUPIED% >nul 2>&1
echo [成功] 已成功釋放 Port 5173。
echo ----------------------------------------------------------------
goto :START_SERVER

:OPEN_BROWSER_ONLY
echo [步驟] 正在開啟瀏覽器測試頁面...
start http://localhost:5173
exit /b 0

:CANCEL_LAUNCH
echo [提示] 已取消啟動。
exit /b 0

:INSTALL_FAILED
echo [錯誤] 套件安裝失敗，請檢查網路連線或手動執行 npm install。
pause
exit /b 1

:START_SERVER
:: 3. 啟動瀏覽器 (在背景稍作等待後開啟，避免伺服器尚未就緒)
echo [系統] 正在啟動預設瀏覽器開啟測試頁面...
:: 使用 cmd 背景啟動來執行 timeout 並開啟網址，避免阻塞主程序
start "" cmd /c "timeout /t 3 /nobreak >nul && start http://localhost:5173"

:: 4. 啟動 Vite 開發伺服器
echo [系統] 正在啟動 Vite 開發伺服器 (npm run dev)...
echo [提示] 若要關閉伺服器，請在此視窗中按下 Ctrl + C
echo ================================================================
npm run dev

pause
