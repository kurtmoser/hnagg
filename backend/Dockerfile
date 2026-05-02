# Stage 1: Build
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
ARG TARGETARCH
RUN npm ci --include=optional \
    && SHARP_CPU=$(case "$TARGETARCH" in arm64) echo arm64;; *) echo x64;; esac) \
    && npm install --os=linux --libc=musl --cpu=$SHARP_CPU sharp
COPY . .
RUN npm run build

# Stage 2: Run
FROM node:22-alpine
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/views ./views
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./
ARG TARGETARCH
RUN apk add --no-cache ca-certificates bash \
    && ARCH=$(case "$TARGETARCH" in arm64) echo aarch64;; *) echo x86_64;; esac) \
    && wget -qO /tmp/curl-impersonate.tar.gz \
       "https://github.com/lexiforest/curl-impersonate/releases/download/v1.5.2/curl-impersonate-v1.5.2.${ARCH}-linux-musl.tar.gz" \
    && tar -xzf /tmp/curl-impersonate.tar.gz -C /usr/local/bin curl_chrome136 curl-impersonate \
    && chmod +x /usr/local/bin/curl_chrome136 /usr/local/bin/curl-impersonate \
    && rm /tmp/curl-impersonate.tar.gz \
    && mkdir -p /app/images /app/favicons
EXPOSE 3000
CMD ["node", "dist/main.js"]
