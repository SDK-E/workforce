#!/bin/sh
set -eu

volume="workforce-smoke-volume"
container="workforce-boundary-smoke"
cleanup() {
  docker rm -f "$container" >/dev/null 2>&1 || true
  docker volume rm "$volume" >/dev/null 2>&1 || true
}
trap cleanup EXIT INT TERM
cleanup
docker volume create "$volume" >/dev/null

docker run --rm --name "$container" \
  --read-only --user 10001:10001 --cap-drop ALL \
  --security-opt no-new-privileges:true --network none \
  --cpus 0.5 --memory 256m --pids-limit 32 \
  --tmpfs /tmp:rw,noexec,nosuid,size=16m \
  --mount "type=volume,src=$volume,dst=/work" \
  workforce-agent-builder:0.1.0 sh -eu -c '
    test "$(id -u)" = 10001
    if touch /etc/forbidden 2>/dev/null; then exit 21; fi
    printf SANDBOX_OK > /work/result.txt
    node -e "fetch(\"https://example.com\").then(()=>process.exit(22)).catch(()=>process.exit(0))"
  '

result="$(docker run --rm --user 10001:10001 --network none \
  --mount "type=volume,src=$volume,dst=/work" \
  workforce-agent-reviewer:0.1.0 sh -eu -c 'cat /work/result.txt')"
test "$result" = "SANDBOX_OK"

if docker ps -a --format '{{.Names}}' | grep -qx "$container"; then
  echo "container cleanup failed" >&2
  exit 23
fi
echo "Sandbox boundaries verified."

