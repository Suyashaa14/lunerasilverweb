#!/bin/bash

set -e

SOURCE_DIR="/home/luneraon/lunerasilverweb/dist"
TARGET_DIR="/home/luneraon/public_html/lunerasilverweb"

echo "🚀 Deploying frontend..."

echo "🧹 Removing old build files..."

find "$TARGET_DIR" -mindepth 1 \
    ! -name ".htaccess" \
    -exec rm -rf {} +

echo "📦 Copying new build..."

cp -R "$SOURCE_DIR/." "$TARGET_DIR/"

echo "✅ Deployment completed successfully!"