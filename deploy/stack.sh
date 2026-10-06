#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEPLOY_DIR="$ROOT_DIR/deploy"
ENV_FILE_DEFAULT="$DEPLOY_DIR/docker.env"
CADDY_TEST_CONF_FILE="$DEPLOY_DIR/Caddyfile.test"

usage() {
cat <<'EOF_USAGE'
Usage: deploy/stack.sh <environment> [action] [options]

Environment:
  local   Use deploy/docker-compose.dev.yml
  test    Use deploy/docker-compose.test.yml (Caddy reverse proxy + HTTPS)
  prod    Use deploy/docker-compose.yml

Actions:
  up              Start services (default) [--build]
  down            Stop and remove services [--volumes]
  restart         Down then up
  ps              Show compose services status
  logs            Tail logs (optionally specify a service as extra arg)
  caddy-check     Validate Caddyfile in running Caddy container

  check-only       Run preflight checks and exit

Options:
  --build             Use --build for up
  --volumes           Include --volumes for down
  --check             Run preflight checks before running the action (or only perform checks if no action-specific flags require start/stop)
  --check-only        Run preflight checks and exit
  -h, --help          Show this help

Examples:
  deploy/stack.sh local up
  deploy/stack.sh local up --build
  deploy/stack.sh test up --check --build
  deploy/stack.sh test --check-only
  deploy/stack.sh test down --volumes
  deploy/stack.sh test logs caddy
  deploy/stack.sh test caddy-check
  deploy/stack.sh prod logs backend
EOF_USAGE
}

if [[ $# -ge 1 && ("$1" == "-h" || "$1" == "--help") ]]; then
  usage
  exit 0
fi

if [[ $# -lt 1 ]]; then
  usage
  exit 1
fi

ENVIRONMENT="$1"
shift

case "${1:-}" in
  --check-only|--check)
    ACTION="check-only"
    ;;
  *)
    if [[ $# -lt 1 ]]; then
      usage
      exit 1
    fi
    ACTION="$1"
    shift
    ;;
esac

case "$ENVIRONMENT" in
  local|test|prod)
    ;;
  *)
    echo "Unknown environment: $ENVIRONMENT" >&2
    usage
    exit 1
    ;;
esac

BASE_FILE="$DEPLOY_DIR/docker-compose.yml"
OVERRIDE_FILE=""

case "$ENVIRONMENT" in
  local)
    OVERRIDE_FILE="$DEPLOY_DIR/docker-compose.dev.yml"
    ;;
  test)
    OVERRIDE_FILE="$DEPLOY_DIR/docker-compose.test.yml"
    ;;
  prod)
    OVERRIDE_FILE=""
    ;;
esac

ENV_FILE="$ENV_FILE_DEFAULT"
if [[ -f "$DEPLOY_DIR/docker.${ENVIRONMENT}.env" ]]; then
  ENV_FILE="$DEPLOY_DIR/docker.${ENVIRONMENT}.env"
fi

BUILD_FLAG=0
DOWN_VOLUMES=0
LOG_SERVICE=""
CHECK_FLAG=0
CHECK_ONLY=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help)
      usage
      exit 0
      ;;
    --build)
      BUILD_FLAG=1
      ;;
    --volumes)
      DOWN_VOLUMES=1
      ;;
    --check)
      CHECK_FLAG=1
      ;;
    --check-only)
      CHECK_ONLY=1
      ;;
    *)
      if [[ "$ACTION" == "logs" && -z "$LOG_SERVICE" ]]; then
        LOG_SERVICE="$1"
      else
        echo "Unknown option/argument: $1" >&2
        usage
        exit 1
      fi
      ;;
  esac
  shift

done

run_compose() {
  local -a cmd=(sudo docker compose --project-directory "$ROOT_DIR" --env-file "$ENV_FILE" -f "$BASE_FILE")
  if [[ -n "$OVERRIDE_FILE" ]]; then
    cmd+=("-f" "$OVERRIDE_FILE")
  fi
  cmd+=("$@")
  "${cmd[@]}"
}

run_docker() {
  sudo docker "$@"
}

check_sanity() {
  if ! command -v sudo >/dev/null 2>&1; then
    echo "Required command 'sudo' is not installed." >&2
    return 1
  fi

  if ! command -v docker >/dev/null 2>&1; then
    echo "Required command 'docker' is not installed." >&2
    return 1
  fi

  if [[ ! -f "$ENV_FILE" ]]; then
    echo "Environment file not found: $ENV_FILE" >&2
    return 1
  fi

  if [[ ! -f "$BASE_FILE" ]]; then
    echo "Compose file not found: $BASE_FILE" >&2
    return 1
  fi

  if [[ -n "$OVERRIDE_FILE" && ! -f "$OVERRIDE_FILE" ]]; then
    echo "Compose override file not found: $OVERRIDE_FILE" >&2
    return 1
  fi

  echo "Running preflight checks..."
  if ! run_compose config >/dev/null; then
    echo "Compose file validation failed. Run docker compose config for details." >&2
    return 1
  fi

  if [[ "$ENVIRONMENT" == "test" ]]; then
    if [[ ! -f "$CADDY_TEST_CONF_FILE" ]]; then
      echo "Caddyfile for test environment not found: $CADDY_TEST_CONF_FILE" >&2
      return 1
    fi

    if ! grep -Eq '^[[:space:]]*reverse_proxy' "$CADDY_TEST_CONF_FILE"; then
      echo "Test Caddyfile does not contain proxy directives. This stack expects Caddy to be the TLS/proxy edge." >&2
      return 1
    fi
  fi

  echo "Preflight checks passed."
  return 0
}

if [[ "$CHECK_ONLY" -eq 1 ]]; then
  if ! check_sanity; then
    exit 1
  fi
  exit 0
fi

if [[ "$CHECK_FLAG" -eq 1 ]]; then
  if ! check_sanity; then
    exit 1
  fi
fi

case "$ACTION" in
  check-only)
    if ! check_sanity; then
      exit 1
    fi
    ;;

  up)
    if [[ "$BUILD_FLAG" -eq 1 ]]; then
      run_compose up -d --build
    else
      run_compose up -d
    fi
    ;;

  down)
    if [[ "$DOWN_VOLUMES" -eq 1 ]]; then
      run_compose down --volumes
    else
      run_compose down
    fi
    ;;

  restart)
    run_compose down
    run_compose up -d
    ;;

  ps)
    run_compose ps
    ;;

  logs)
    if [[ -n "$LOG_SERVICE" ]]; then
      run_compose logs -f "$LOG_SERVICE"
    else
      run_compose logs -f
    fi
    ;;

  caddy-check)
    if [[ "$ENVIRONMENT" != "test" ]]; then
      echo "caddy-check is only available for test environment." >&2
      exit 1
    fi
    run_compose exec caddy caddy validate --config /etc/caddy/Caddyfile
    ;;

  *)
    echo "Unknown action: $ACTION" >&2
    usage
    exit 1
    ;;
esac
