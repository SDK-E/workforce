#!/bin/sh
set -eu
provider=${1:-}
company_id=${2:-}
employee_id=${3:-ceo}
task_id=${4:-*}
if [ "$provider" = credential ]; then
  secret_name=${2:-}
  company_id=${3:-}
  employee_id=${4:-ceo}
  task_id=${5:-*}
fi
if [ -z "$provider" ] || [ -z "$company_id" ]; then
  echo "Usage: pnpm secrets:import -- <github|vercel> <company> [employee] [task]" >&2
  echo "   or: printf value | pnpm secrets:import -- credential NAME <company> [employee] [task]" >&2
  exit 1
fi
if [ "$provider" = github ]; then
  gh auth token | docker compose exec -T workforce-engine node dist/src/secrets-cli.js \
    github-stdin "$company_id" "$employee_id" "$task_id"
elif [ "$provider" = vercel ]; then
  docker compose exec -T workforce-engine node dist/src/secrets-cli.js \
    vercel "$company_id" "$employee_id" "$task_id"
elif [ "$provider" = credential ]; then
  docker compose exec -T workforce-engine node dist/src/secrets-cli.js \
    stdin "$company_id" "$employee_id" "$task_id" "$secret_name"
else
  echo "Unsupported credential provider: $provider" >&2
  exit 1
fi
