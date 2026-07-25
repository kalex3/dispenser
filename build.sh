#!/bin/bash

#
# SPDX-FileCopyrightText: 2024-2025 Aurora OSS
# SPDX-License-Identifier: GPL-3.0-or-later
#

# Cleanup
sh cleanup.sh

# Install dependencies
npm install

# Generate protos
[ ! -e src/compiled-proto.js ] && npm run compile-proto

# Build
npx tsc -p .

cp -r resources dist/

echo "Build complete"
