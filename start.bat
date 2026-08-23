@echo off
title PolyBeam Web - Analytical Beam Calculator
echo Starting PolyBeam Web Server...
python server.py
if %ERRORLEVEL% NEQ 0 (
    echo Python not found in standard PATH, attempting via python launcher...
    py server.py
)
pause
