# Deployment

Deployment assets live in this folder so the application root stays focused on source code.

## Build Production Images

Build local production images:

```bash
deploy/build.prod.sh --tag v1.0.0
```

Build and push images to a registry:

```bash
deploy/build.prod.sh --registry ghcr.io/your-org --tag v1.0.0 --push
```

This creates:

- `moverscrm-backend:<tag>`
- `moverscrm-frontend:<tag>`

With `--registry ghcr.io/your-org`, the images become:

- `ghcr.io/your-org/moverscrm-backend:<tag>`
- `ghcr.io/your-org/moverscrm-frontend:<tag>`

## Production Env

The build script reads `deploy/docker.env` by default.

Frontend build-time values:

- `VITE_API_URL`, default `/api`
- `VITE_GOOGLE_MAPS_API_KEY`, default empty

Backend settings such as `SECRET_KEY`, database credentials, Redis URL, and allowed hosts are runtime values. Do not bake secrets into images.

Override frontend build args directly:

```bash
deploy/build.prod.sh --tag v1.0.0 --vite-api-url https://crm.example.com/api
```

## Deploy With Compose

Run production Compose from the project root:

```bash
docker compose --project-directory . --env-file deploy/docker.env -f deploy/docker-compose.yml up -d
```

Build and run production Compose locally:

```bash
docker compose --project-directory . --env-file deploy/docker.env -f deploy/docker-compose.yml up -d --build
```

Stop production Compose:

```bash
docker compose --project-directory . --env-file deploy/docker.env -f deploy/docker-compose.yml down
```

### Test Environment (Caddy)

Use the stack helper script for Caddy-managed HTTPS in test:

```bash
deploy/stack.sh test up
```

Caddyfile location:

- `deploy/Caddyfile.test`

Routing in test:

- `/api/*`, `/admin*`, `/static/*`, `/media/*` -> Django backend
- all other paths -> frontend SPA

Certificates are automatically managed by Caddy and persisted in Docker volume `caddy_data`.

The script supports `--help` to list all available commands and options.

Useful checks:

```bash
deploy/stack.sh test caddy-check
deploy/stack.sh test logs caddy
```

For a smoke test:

```bash
curl -I http://test.kargoflow.net
curl -I https://test.kargoflow.net
curl -I https://test.kargoflow.net/api/health/
```

## Files

- `backend.Dockerfile`: backend Django/gunicorn image.
- `frontend.Dockerfile`: frontend Vite build served by Caddy.
- `docker-compose.yml`: production stack.
- `docker-compose.dev.yml`: Docker development overrides.
- `docker-compose.staging.yml`: staging/monitoring overrides.
- `docker.env`: local/prod env file template.
- `caddy-frontend.Caddyfile`: production frontend static server config.

## Notes

- Run all Compose commands from the project root.
- Use strong production values in `deploy/docker.env` before deploying.
- Use `--push` only after logging in to your target registry with `docker login`.
- For multi-architecture builds, pass `--platform`, for example `--platform linux/amd64`.
