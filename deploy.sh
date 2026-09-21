#!/bin/bash

set -e

SOURCE_DIR="$(pwd)/dist"
TARGET_DIR="/home/luneraon/public_html"

echo "🚀 Starting frontend deployment..."

if [ ! -d "$SOURCE_DIR" ]; then
    echo "❌ Build directory not found:"
    echo "$SOURCE_DIR"
    exit 1
fi

echo "📦 Build found:"
echo "$SOURCE_DIR"

echo "🧹 Removing old deployed files..."

find "$TARGET_DIR" -mindepth 1 -maxdepth 1 \
    ! -name ".htaccess" \
    ! -name "lunerasilverweb" \
    -exec rm -rf {} +

echo "📦 Copying build to public_html..."

cp -a "$SOURCE_DIR/." "$TARGET_DIR/"

echo "✅ Frontend deployed successfully!"