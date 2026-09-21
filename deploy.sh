#!/bin/bash

set -e

SOURCE_DIR="$(pwd)/dist"
TARGET_DIR="/home/luneraon/public_html/lunerasilverweb"

echo "🚀 Deploying frontend..."

find "$TARGET_DIR" -mindepth 1 \
    ! -name ".htaccess" \
    -exec rm -rf {} +

cp -R "$SOURCE_DIR/." "$TARGET_DIR/"

echo "✅ Deployment completed successfully!"