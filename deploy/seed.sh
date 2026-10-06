#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
DEPLOY_DIR="$ROOT_DIR/deploy"
COMPOSE=(docker compose --project-directory "$ROOT_DIR" --env-file "$DEPLOY_DIR/docker.env" -f "$DEPLOY_DIR/docker-compose.yml" -f "$DEPLOY_DIR/docker-compose.test.yml")

usage() {
  cat <<'EOF'
Usage: deploy/seed.sh [--docker]

Run the project seed commands.

Defaults to Docker when --docker is passed. Without --docker, runs the same
commands against the local backend environment.
EOF
}

USE_DOCKER=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --docker) USE_DOCKER=1 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown flag: $1" >&2; exit 1 ;;
  esac
  shift
done

if [[ "$USE_DOCKER" -eq 1 ]]; then
  "${COMPOSE[@]}" run --rm backend python manage.py seed_permissions --purge-legacy
  "${COMPOSE[@]}" run --rm backend python manage.py seed_demo_users
  "${COMPOSE[@]}" run --rm backend python manage.py seed_dataset
  company_ids="$("${COMPOSE[@]}" run --rm backend python -c 'import django; django.setup(); from apps.core.models import Company; print(" ".join(str(pk) for pk in Company.objects.values_list("id", flat=True)))')"
  for company_id in $company_ids; do
    "${COMPOSE[@]}" run --rm backend python manage.py seed_branch_scoped_defaults --company-id "$company_id"
  done
  "${COMPOSE[@]}" run --rm backend python manage.py seed_default_automations
  "${COMPOSE[@]}" run --rm backend python manage.py seed_document_template_variables
  "${COMPOSE[@]}" run --rm backend python manage.py seed_recurring_automations || true
  exit 0
fi

cd "$BACKEND_DIR"
DJANGO_SETTINGS_MODULE="${DJANGO_SETTINGS_MODULE:-config.settings.prod}" python manage.py seed_permissions --purge-legacy
DJANGO_SETTINGS_MODULE="${DJANGO_SETTINGS_MODULE:-config.settings.prod}" python manage.py seed_demo_users
DJANGO_SETTINGS_MODULE="${DJANGO_SETTINGS_MODULE:-config.settings.prod}" python manage.py seed_dataset
company_ids="$(DJANGO_SETTINGS_MODULE="${DJANGO_SETTINGS_MODULE:-config.settings.prod}" python -c 'import django; django.setup(); from apps.core.models import Company; print(" ".join(str(pk) for pk in Company.objects.values_list("id", flat=True)))')"
for company_id in $company_ids; do
  DJANGO_SETTINGS_MODULE="${DJANGO_SETTINGS_MODULE:-config.settings.prod}" python manage.py seed_branch_scoped_defaults --company-id "$company_id"
done
DJANGO_SETTINGS_MODULE="${DJANGO_SETTINGS_MODULE:-config.settings.prod}" python manage.py seed_default_automations
DJANGO_SETTINGS_MODULE="${DJANGO_SETTINGS_MODULE:-config.settings.prod}" python manage.py seed_document_template_variables
DJANGO_SETTINGS_MODULE="${DJANGO_SETTINGS_MODULE:-config.settings.prod}" python manage.py seed_recurring_automations || true
