#!/bin/bash

set -e

SOURCE_DIR="/home/luneraon/public_html/lunerasilverweb/dist"
TARGET_DIR="/home/luneraon/public_html"

echo "🚀 Starting frontend deployment..."

if [ ! -d "$SOURCE_DIR" ]; then
    echo "❌ Build directory not found:"
    echo "$SOURCE_DIR"
    exit 1
fi

echo "🧹 Cleaning old frontend files..."

find "$TARGET_DIR" -mindepth 1 \
    ! -name ".htaccess" \
    ! -path "$TARGET_DIR/lunerasilverweb" \
    ! -path "$TARGET_DIR/lunerasilverweb/*" \
    -exec rm -rf {} +

echo "📦 Copying new build..."

cp -R "$SOURCE_DIR/." "$TARGET_DIR/"

echo "✅ Frontend deployed successfully!"