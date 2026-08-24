#!/bin/sh
set -eu
network_name="workforce-egress-internal"
proxy_name="workforce-egress-proxy"
proxy_image="workforce-egress-proxy:0.1.0"

docker network inspect "$network_name" >/dev/null 2>&1 || \
  docker network create --internal --label workforce.managed=true "$network_name" >/dev/null

if docker container inspect "$proxy_name" >/dev/null 2>&1; then
  managed=$(docker container inspect "$proxy_name" --format '{{index .Config.Labels "workforce.managed"}}')
  if [ "$managed" != "true" ]; then
    echo "Refusing to replace unmanaged container $proxy_name." >&2
    exit 1
  fi
  docker container rm --force "$proxy_name" >/dev/null
fi

docker run --detach --name "$proxy_name" \
  --label workforce.managed=true --label workforce.component=egress-proxy \
  --network "$network_name" --read-only --cap-drop ALL \
  --security-opt no-new-privileges:true --memory 64m --cpus 0.25 --pids-limit 64 \
  --tmpfs /var/run/tinyproxy:rw,noexec,nosuid,size=1m,mode=1777 "$proxy_image" >/dev/null

# Only the proxy is dual-homed; agents cannot bypass its connection log.
docker network connect bridge "$proxy_name"
echo "Audited egress proxy ready on $network_name."
