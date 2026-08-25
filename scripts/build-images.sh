#!/bin/sh
set -eu

docker_desktop_bin="/Applications/Docker.app/Contents/Resources/bin"
if [ -x "$docker_desktop_bin/docker-credential-desktop" ]; then
  PATH="$docker_desktop_bin:$PATH"
  export PATH
fi

kilo_version="${KILO_VERSION:-7.4.23}"
opencode_version="${OPENCODE_VERSION:-1.18.20}"

docker build --build-arg "KILO_VERSION=$kilo_version" --build-arg "OPENCODE_VERSION=$opencode_version" -t workforce-agent:0.1.0 docker/base
docker build -t workforce-egress-proxy:0.1.0 docker/egress
KILO_VERSION="$kilo_version" OPENCODE_VERSION="$opencode_version" sh scripts/verify-engines.sh
sh scripts/verify-image-sizes.sh
