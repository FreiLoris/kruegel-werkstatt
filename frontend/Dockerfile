# ── Stufe 1: Bauen ────────────────────────────────────────────────
# Node wird nur zum Bauen gebraucht. Ergebnis sind statische Dateien in dist/.
FROM node:22-alpine AS build
WORKDIR /app

# Erst nur package*.json: Abhängigkeiten werden gecacht, solange sie sich nicht ändern.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ── Stufe 2: Ausliefern ───────────────────────────────────────────
# nginx liefert die statischen Dateien aus und leitet /api ans Backend weiter.
FROM nginx:1.30-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
