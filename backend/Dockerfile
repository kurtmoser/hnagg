# Stage 1: Build
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Run
FROM node:22-alpine
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/views ./views
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./
RUN apk add --no-cache ca-certificates bash \
    && wget -qO /tmp/curl-impersonate.tar.gz \
       https://github.com/lexiforest/curl-impersonate/releases/download/v1.5.2/curl-impersonate-v1.5.2.aarch64-linux-musl.tar.gz \
    && tar -xzf /tmp/curl-impersonate.tar.gz -C /usr/local/bin curl_chrome136 curl-impersonate \
    && chmod +x /usr/local/bin/curl_chrome136 /usr/local/bin/curl-impersonate \
    && rm /tmp/curl-impersonate.tar.gz \
    && mkdir -p /app/images
EXPOSE 3000
CMD ["node", "dist/main.js"]
