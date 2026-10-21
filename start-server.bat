@echo off
title IT 211 RAM Systems Analyst Training Server
echo Starting IT 211 RAM Training Arena Local Web Server...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0serve.ps1"
pause
