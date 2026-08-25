#!/bin/sh
set -eu
docker compose exec workforce-engine node dist/src/tui-client.js
