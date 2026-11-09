# Swayam Swasti Spirituality — customer app
# Multi-stage build: compile the Vite bundle, then serve it from a small
# dependency-free Node server that supports SPA deep links on port 3000.

FROM node:26-alpine AS build
RUN apk upgrade --no-cache
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
# Copy only application sources so the host node_modules never enters the image.
COPY index.html vite.config.ts tsconfig.json ./
COPY public ./public
COPY src ./src
RUN npm run build

FROM node:26-alpine AS runtime
# Refresh OS packages and explicitly upgrade zlib so the final image carries the
# patched build (ALPINE-CVE-2026-4738: 1.3.2-r1 -> 1.4-r0) rather than the copy
# shipped in the base layer.
RUN apk upgrade --no-cache \
 && apk add --no-cache --upgrade 'zlib>=1.4-r0'
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
COPY --from=build /app/dist ./dist
COPY server.mjs ./server.mjs
EXPOSE 3000
USER node
CMD ["node", "server.mjs"]
