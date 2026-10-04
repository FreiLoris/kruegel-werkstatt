# ── Stage 1: build ────────────────────────────────────────────────
# Node is only needed for building. The result is static files in dist/.
FROM node:22-alpine AS build
WORKDIR /app

# Only package*.json first: dependencies are cached as long as they do not change.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ── Stage 2: serve ────────────────────────────────────────────────
# nginx serves the static files and forwards /api to the backend.
FROM nginx:1.30-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
