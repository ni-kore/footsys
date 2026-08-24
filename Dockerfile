# footsys — self-hostable static build.
#
# The app is entirely client-side: all game data and images are bundled, and
# nothing is fetched at runtime. So the whole thing is a static site, built once
# and served by nginx. No database, no backend, no network access needed.

# ---------------------------------------------------------------- build stage
FROM node:20-bookworm-slim AS build
WORKDIR /repo

# Engine and root manifests first, so the dependency install is cached and does
# not repeat on every source change.
COPY package.json package-lock.json ./
COPY packages ./packages
RUN npm ci

# App dependencies (apps/mobile is not part of the npm workspaces).
COPY apps/mobile/package.json ./apps/mobile/package.json
RUN npm --prefix apps/mobile install

# The rest of the sources, data and assets (see .dockerignore for what is left
# out — the raw badge source and the unmapped trophy images are not bundled).
COPY . .

# Produce the static web bundle at apps/mobile/dist.
RUN npm --prefix apps/mobile run export:web

# -------------------------------------------------------------- runtime stage
FROM nginx:1.27-alpine AS runtime

# A tiny config: serve the static files, fall back to index.html, cache the
# hashed assets hard.
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/apps/mobile/dist /usr/share/nginx/html

EXPOSE 80

# A plain healthcheck so Unraid/Docker can tell the container is up.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost/ >/dev/null 2>&1 || exit 1
