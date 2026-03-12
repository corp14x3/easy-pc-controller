@echo off
chcp 65001 >nul
title PC Controller Server
color 0A

echo ========================================
echo    🚀 PC Controller Server
echo ========================================
echo.
echo 📦 Gerekli paketler kuruluyor...
pip install -r requirements.txt --break-system-packages 2>nul

echo.
echo 🌐 IP adresinizi öğrenmek için:
echo    ipconfig
echo.
echo ⚠️  Telefonda bu IP'yi kullanın!
echo.
echo ========================================
echo.

python app.py

pause
