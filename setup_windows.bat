@echo off
cd /d "%~dp0"
py -3.12 -m venv .venv
if errorlevel 1 goto error
.venv\Scripts\python.exe -m pip install -r requirements.txt
if errorlevel 1 goto error
echo Installation complete. Open run_windows.bat to play.
pause
exit /b
:error
echo Installation failed. Install Python 3.11 64-bit and check Internet.
pause
