#!/bin/sh
set -eu

limit_bytes=$((500 * 1024 * 1024))
images="workforce-agent-base:0.1.0 workforce-agent-builder:0.1.0 workforce-agent-reviewer:0.1.0 workforce-agent-document:0.1.0 workforce-agent-research:0.1.0 workforce-agent-browser:0.1.0 workforce-egress-proxy:0.1.0"

for image in $images; do
  size=$(docker image inspect "$image" --format '{{.Size}}')
  if [ "$size" -ge "$limit_bytes" ]; then
    echo "Image $image is $size bytes; production images must be smaller than $limit_bytes bytes." >&2
    exit 1
  fi
  echo "Image size verified: $image ($size bytes)"
done
