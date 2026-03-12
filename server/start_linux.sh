#!/bin/bash

echo "========================================"
echo "   🚀 PC Controller Server"
echo "========================================"
echo ""
echo "📦 Gerekli paketler kuruluyor..."
pip3 install -r requirements.txt --break-system-packages 2>/dev/null

echo ""
echo "🌐 IP adresinizi öğrenmek için:"
echo "   ifconfig veya ip addr"
echo ""
echo "⚠️  Telefonda bu IP'yi kullanın!"
echo ""
echo "========================================"
echo ""

python3 app.py
