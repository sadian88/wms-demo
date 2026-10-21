# WMS Decor Cerámicas — sitio estático (Vite + React) servido por nginx en el puerto 8080.
# Es una demostración sin servidor: los datos viven en el navegador de cada persona,
# así que NO necesita volumen ni variables de entorno en Easypanel.

# ---- 1) Compilar ----
# Se compila siempre en la arquitectura del runner (BUILDPLATFORM): el resultado son archivos
# estáticos que sirven igual en amd64 y arm64, y así no se pasa por la emulación lenta (QEMU).
FROM --platform=$BUILDPLATFORM node:22-alpine AS build
WORKDIR /app

# pnpm 11: es la versión que generó pnpm-lock.yaml y pnpm-workspace.yaml
RUN npm install -g pnpm@11

# Primero solo los archivos de dependencias: la capa se reutiliza mientras no cambien
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
ARG GIT_SHA=dev
# `pnpm build` = revisión de tipos + compilación. Si hay un error de tipos, la imagen no se publica.
RUN pnpm build && echo "$GIT_SHA" > dist/version.txt

# ---- 2) Servir ----
# nginx "unprivileged": corre sin root y escucha en 8080
FROM nginxinc/nginx-unprivileged:1.27-alpine

COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

# Marca de versión: /version.txt devuelve el commit desplegado
ARG GIT_SHA=dev
LABEL org.opencontainers.image.revision="$GIT_SHA"

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/healthz >/dev/null || exit 1
