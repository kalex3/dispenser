#
# SPDX-FileCopyrightText: 2024-2025 Aurora OSS
# SPDX-License-Identifier: GPL-3.0-or-later
#

# /bin/bash

# Cleanup
sh cleanup.sh

# Install dependencies
npm install

# Build
npx tsc -p .

cp -r resources dist/

echo "Build complete"
