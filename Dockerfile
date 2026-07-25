FROM node:alpine AS builder

WORKDIR /build

COPY package.json ./

RUN --mount=type=cache,target=/root/.npm npm install --no-audit --no-fund

COPY tsconfig.json ./
COPY src ./src
COPY resources ./resources

RUN npx tsc -p . --sourceMap false \
    && cp -r resources dist/ \
    && npm prune --omit=dev --omit=optional \
    && npm cache clean --force \
    && find node_modules/figlet/fonts -type f ! -name 'Standard.flf' -delete \
    && find node_modules -type f -regex '.*\.\(md\|markdown\|map\|cts\|mts\|ts\)$\|.*/\(CHANGELOG.*\|CHANGES\|HISTORY\.md\)$' -delete \
    && (find node_modules -type d -regex '.*/\(tests\?\|__tests__\|docs\?\|examples\?\|\.github\|coverage\)$' -exec rm -rf {} + 2>/dev/null || true)

FROM node:alpine

ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000

WORKDIR /app

COPY --from=builder /build/node_modules ./node_modules
COPY --from=builder /build/dist ./

RUN touch resources/accounts.txt resources/blocked_ips.txt \
    && mkdir -p logs/access logs/blocked \
    && chown -R node:node /app \
    && rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack /tmp/*

USER node

EXPOSE 3000

CMD ["node", "--max-old-space-size=4096", "src/app.js"]
