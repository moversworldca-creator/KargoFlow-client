#!/usr/bin/env bash
set -Eeuo pipefail

DEPLOY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$DEPLOY_DIR/.." && pwd)"

ENV_FILE="$DEPLOY_DIR/docker.env"
IMAGE_PREFIX="${IMAGE_PREFIX:-moverscrm}"
TAG="${TAG:-}"
REGISTRY="${REGISTRY:-}"
PLATFORM="${PLATFORM:-}"
PUSH=0
LOAD=1
NO_CACHE=0
BUILD_BACKEND=1
BUILD_FRONTEND=1
VITE_API_URL_OVERRIDE=""
VITE_GOOGLE_MAPS_API_KEY_OVERRIDE=""

log() {
  printf '\033[1;34m==>\033[0m %s\n' "$*"
}

die() {
  printf '\033[1;31mError:\033[0m %s\n' "$*" >&2
  exit 1
}

usage() {
  cat <<'EOF'
Usage: deploy/build.prod.sh [flags]

Build production Docker images for deployment.

Flags:
  --env-file PATH              Env file to read build values from (default: deploy/docker.env).
  --image-prefix NAME          Image prefix/name (default: moverscrm).
  --registry REGISTRY          Optional registry/repository prefix, e.g. ghcr.io/acme.
  --tag TAG                    Image tag. Defaults to current git SHA, or timestamp if git is unavailable.
  --platform PLATFORM          Optional build platform, e.g. linux/amd64 or linux/arm64.
  --push                       Push images to the registry after build.
  --load                       Load images into local Docker after build (default unless --push is used).
  --no-load                    Do not load images locally.
  --no-cache                   Build without Docker layer cache.
  --backend-only               Build only the backend image.
  --frontend-only              Build only the frontend image.
  --vite-api-url URL           Override VITE_API_URL build arg for frontend.
  --google-maps-api-key KEY    Override VITE_GOOGLE_MAPS_API_KEY build arg for frontend.
  -h, --help                   Show this help.

Examples:
  deploy/build.prod.sh --tag v1.0.0
  deploy/build.prod.sh --registry ghcr.io/example --tag v1.0.0 --push
  deploy/build.prod.sh --platform linux/amd64 --tag prod-20260703
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --env-file) ENV_FILE="${2:?Missing value for --env-file}"; shift ;;
    --image-prefix) IMAGE_PREFIX="${2:?Missing value for --image-prefix}"; shift ;;
    --registry) REGISTRY="${2:?Missing value for --registry}"; shift ;;
    --tag) TAG="${2:?Missing value for --tag}"; shift ;;
    --platform) PLATFORM="${2:?Missing value for --platform}"; shift ;;
    --push) PUSH=1; LOAD=0 ;;
    --load) LOAD=1 ;;
    --no-load) LOAD=0 ;;
    --no-cache) NO_CACHE=1 ;;
    --backend-only) BUILD_BACKEND=1; BUILD_FRONTEND=0 ;;
    --frontend-only) BUILD_BACKEND=0; BUILD_FRONTEND=1 ;;
    --vite-api-url) VITE_API_URL_OVERRIDE="${2:?Missing value for --vite-api-url}"; shift ;;
    --google-maps-api-key) VITE_GOOGLE_MAPS_API_KEY_OVERRIDE="${2:?Missing value for --google-maps-api-key}"; shift ;;
    -h|--help) usage; exit 0 ;;
    *) die "Unknown flag: $1" ;;
  esac
  shift
done

command -v docker >/dev/null 2>&1 || die "Docker is required."
[[ -f "$ENV_FILE" ]] || die "Env file not found: $ENV_FILE"

if [[ -z "$TAG" ]]; then
  if git -C "$ROOT_DIR" rev-parse --short HEAD >/dev/null 2>&1; then
    TAG="$(git -C "$ROOT_DIR" rev-parse --short HEAD)"
  else
    TAG="$(date +%Y%m%d%H%M%S)"
  fi
fi

load_env_value() {
  local key="$1"
  local default="$2"
  local value="$default"
  local line
  line="$(grep -E "^${key}=" "$ENV_FILE" | tail -n 1 || true)"
  if [[ -n "$line" ]]; then
    value="${line#*=}"
    value="${value%\"}"
    value="${value#\"}"
    value="${value%\'}"
    value="${value#\'}"
  fi
  printf '%s\n' "$value"
}

trim_slashes() {
  local value="$1"
  value="${value#/}"
  value="${value%/}"
  printf '%s\n' "$value"
}

image_name() {
  local suffix="$1"
  local base="${IMAGE_PREFIX}-${suffix}:${TAG}"
  if [[ -n "$REGISTRY" ]]; then
    printf '%s/%s\n' "$(trim_slashes "$REGISTRY")" "$base"
  else
    printf '%s\n' "$base"
  fi
}

VITE_API_URL="${VITE_API_URL_OVERRIDE:-$(load_env_value VITE_API_URL /api)}"
VITE_GOOGLE_MAPS_API_KEY="${VITE_GOOGLE_MAPS_API_KEY_OVERRIDE:-$(load_env_value VITE_GOOGLE_MAPS_API_KEY "")}"

BACKEND_IMAGE="$(image_name backend)"
FRONTEND_IMAGE="$(image_name frontend)"

BUILD_ARGS=()
[[ "$NO_CACHE" -eq 1 ]] && BUILD_ARGS+=(--no-cache)
[[ -n "$PLATFORM" ]] && BUILD_ARGS+=(--platform "$PLATFORM")
[[ "$PUSH" -eq 1 ]] && BUILD_ARGS+=(--push)
[[ "$LOAD" -eq 1 ]] && BUILD_ARGS+=(--load)

build_backend() {
  log "Building backend image: $BACKEND_IMAGE"
  docker buildx build \
    "${BUILD_ARGS[@]}" \
    --file "$DEPLOY_DIR/backend.Dockerfile" \
    --tag "$BACKEND_IMAGE" \
    "$ROOT_DIR"
}

build_frontend() {
  log "Building frontend image: $FRONTEND_IMAGE"
  docker buildx build \
    "${BUILD_ARGS[@]}" \
    --file "$DEPLOY_DIR/frontend.Dockerfile" \
    --build-arg "VITE_API_URL=$VITE_API_URL" \
    --build-arg "VITE_GOOGLE_MAPS_API_KEY=$VITE_GOOGLE_MAPS_API_KEY" \
    --tag "$FRONTEND_IMAGE" \
    "$ROOT_DIR"
}

log "Production image tag: $TAG"
log "Using env file: $ENV_FILE"

if [[ "$BUILD_BACKEND" -eq 1 ]]; then
  build_backend
fi

if [[ "$BUILD_FRONTEND" -eq 1 ]]; then
  build_frontend
fi

log "Build complete"
if [[ "$BUILD_BACKEND" -eq 1 ]]; then
  printf 'Backend image:  %s\n' "$BACKEND_IMAGE"
fi
if [[ "$BUILD_FRONTEND" -eq 1 ]]; then
  printf 'Frontend image: %s\n' "$FRONTEND_IMAGE"
fi
