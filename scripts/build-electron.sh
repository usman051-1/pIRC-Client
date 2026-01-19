#!/bin/bash

echo "==================================="
echo "  pIRC Windows Installer Builder"
echo "==================================="
echo ""

# Step 1: Build the web application
echo "[1/3] Building web application..."
npm run build

if [ $? -ne 0 ]; then
    echo "Error: Web build failed!"
    exit 1
fi

echo "[2/3] Web application built successfully!"
echo ""

# Step 2: Build Windows installer
echo "[3/3] Building Windows installer..."
npx electron-builder --win --config electron-builder.json

if [ $? -ne 0 ]; then
    echo "Error: Electron build failed!"
    exit 1
fi

echo ""
echo "==================================="
echo "  Build Complete!"
echo "==================================="
echo ""
echo "Your Windows installer is ready at:"
echo "  release/pIRC-Setup-1.0.0.exe"
echo ""
