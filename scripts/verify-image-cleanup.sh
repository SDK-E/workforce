#!/bin/sh
set -eu

image="${WORKFORCE_AGENT_IMAGE:-workforce-agent:0.1.0}"

docker run --rm --user 0 --entrypoint /bin/sh "$image" -c '
  test ! -e /root/.cache
  test -z "$(find /var/cache/apk -mindepth 1 -print -quit 2>/dev/null)"
  test -z "$(find /tmp -mindepth 1 -print -quit 2>/dev/null)"
  test ! -e /root/.local/share/pnpm/store
  ! command -v npm >/dev/null
'

echo "Image cleanup verified: $image"
