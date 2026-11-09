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
RUN apk upgrade --no-cache
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
COPY --from=build /app/dist ./dist
COPY server.mjs ./server.mjs
EXPOSE 3000
USER node
CMD ["node", "server.mjs"]
