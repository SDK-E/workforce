#!/bin/sh
set -eu
docker compose stop workforce-engine
if docker container inspect workforce-egress-proxy >/dev/null 2>&1; then
  docker container rm --force workforce-egress-proxy >/dev/null
fi
echo "Workforce daemon stopped; persistent state remains in volume workforce-state."
