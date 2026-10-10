# syntax=docker/dockerfile:1

# ---- build: compile TypeScript ----
FROM node:22-alpine AS build
WORKDIR /app
# mongodb-memory-server is a test-only dependency; don't download a MongoDB binary during the image build.
ENV MONGOMS_DISABLE_POSTINSTALL=1
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build && npm prune --omit=dev

# ---- runtime: only compiled JS and production dependencies ----
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build --chown=node:node /app/package.json ./
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
# Writable folder for STORAGE_DRIVER=local (use S3 on hosts whose disk is wiped on redeploy).
RUN mkdir -p uploads && chown node:node uploads
USER node
EXPOSE 4000
CMD ["node", "dist/server.js"]
