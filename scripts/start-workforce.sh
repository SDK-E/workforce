#!/bin/sh
set -eu
docker_desktop_bin="/Applications/Docker.app/Contents/Resources/bin"
if [ -d "$docker_desktop_bin" ]; then
  PATH="$docker_desktop_bin:$PATH"
  export PATH
fi
docker build --tag workforce-egress-proxy:0.1.0 docker/egress
sh scripts/setup-egress.sh
docker compose up --detach --build workforce-engine
echo "Workforce daemon is starting. Run 'pnpm status' or 'pnpm tui'."
