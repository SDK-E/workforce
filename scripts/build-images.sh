#!/bin/sh
set -eu

docker_desktop_bin="/Applications/Docker.app/Contents/Resources/bin"
if [ -x "$docker_desktop_bin/docker-credential-desktop" ]; then
  PATH="$docker_desktop_bin:$PATH"
  export PATH
fi

kilo_version="${KILO_VERSION:-7.4.23}"
opencode_version="${OPENCODE_VERSION:-1.18.20}"

docker build --build-arg "KILO_VERSION=$kilo_version" --build-arg "OPENCODE_VERSION=$opencode_version" -t workforce-agent-base:0.1.0 docker/base
docker build -t workforce-egress-proxy:0.1.0 docker/egress
docker build -f docker/profiles/builder.Dockerfile --build-arg BASE_IMAGE=workforce-agent-base:0.1.0 -t workforce-agent-builder:0.1.0 .
docker build -f docker/profiles/reviewer.Dockerfile --build-arg BASE_IMAGE=workforce-agent-base:0.1.0 -t workforce-agent-reviewer:0.1.0 .
docker build -f docker/profiles/document.Dockerfile --build-arg BASE_IMAGE=workforce-agent-base:0.1.0 -t workforce-agent-document:0.1.0 .
docker build -f docker/profiles/research.Dockerfile --build-arg BASE_IMAGE=workforce-agent-base:0.1.0 -t workforce-agent-research:0.1.0 .
docker build -f docker/profiles/browser.Dockerfile --build-arg BASE_IMAGE=workforce-agent-base:0.1.0 -t workforce-agent-browser:0.1.0 .
sh scripts/verify-image-sizes.sh
