#!/bin/bash

# Download PrimeThink JavaScript files

echo "Downloading primethink.js..."
curl -O https://app-dev.primethink.ai/static/primethink.js

echo "Downloading primethink_manage.js..."
curl -O https://app-dev.primethink.ai/static/primethink_manage.js

echo "Downloading primethink llms.txt as primethink_and_live_apps_documentation.txt..."
curl -o primethink_and_live_apps_documentation.txt https://help.primethink.ai/llms.txt

echo "Download complete!"
