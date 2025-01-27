# /bin/bash

# Cleanup
sh cleanup.sh

# Install dependencies
npm install

# Build
npx tsc -p .

cp -r resources dist/

echo "Build complete"