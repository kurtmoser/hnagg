# Stage 1: Build
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npx ng build --configuration production

# Stage 2: Run SSR server
FROM node:22-alpine
RUN apk add --no-cache tzdata
WORKDIR /app
COPY --from=build /app/dist/frontend/ dist/frontend/
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
EXPOSE 4000
CMD ["node", "dist/frontend/server/server.mjs"]
