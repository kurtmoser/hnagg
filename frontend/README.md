# Frontend

Angular app served by Nginx. Proxies `/api` requests to the backend service.

## Local Development

### With Docker (recommended)

From the project root:

```bash
docker compose up -d
```

The override file (`docker-compose.override.yml`) is loaded automatically — no Traefik required. Frontend is available at `http://localhost:50141`.

### Without Docker

```bash
npm install
ng serve
```

Available at `http://localhost:4200`.

## Production

On the production server, the override file is skipped so the frontend joins the external `traefik-network` and Traefik picks up the routing labels automatically.

```bash
docker compose -f docker-compose.yml up -d --build
```

Served at `https://hnagg.com` via Traefik with auto-provisioned Let's Encrypt TLS.

## Build

```bash
ng build
```

Production artifacts go to `dist/`.

## Tests

```bash
ng test
```
