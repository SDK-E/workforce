#!/bin/sh
set -eu
echo "Resetting Workforce: companies, secrets, audit history, and artifacts will be deleted."
docker compose down --volumes --remove-orphans
if docker container inspect workforce-egress-proxy >/dev/null 2>&1; then
  docker container rm --force workforce-egress-proxy >/dev/null
fi
echo "Workforce state volume removed. The next 'pnpm start' begins with a clean database."
