FROM node:22-alpine

ARG KILO_VERSION
ARG OPENCODE_VERSION
RUN test -n "$KILO_VERSION" && test -n "$OPENCODE_VERSION" \
 && apk add --no-cache ca-certificates git tini \
 && npm install --global "@kilocode/cli@$KILO_VERSION" "opencode-ai@$OPENCODE_VERSION" \
 && find /usr/local/lib/node_modules/@kilocode/cli/node_modules/@kilocode \
      -mindepth 1 -maxdepth 1 -type d -name 'cli-linux-*' ! -name '*-musl' -exec rm -rf '{}' + \
 && find /usr/local/lib/node_modules/opencode-ai/node_modules \
      -mindepth 1 -maxdepth 1 -type d -name 'opencode-linux-*' ! -name '*-musl' -exec rm -rf '{}' + \
 && npm cache clean --force \
 && addgroup -g 10001 workforce \
 && adduser -D -u 10001 -G workforce -h /home/workforce -s /sbin/nologin workforce

COPY --chmod=0555 workforce-entrypoint /usr/local/bin/workforce-entrypoint
RUN mkdir -p /work && chown 10001:10001 /work
WORKDIR /work
USER 10001:10001
ENTRYPOINT ["/sbin/tini", "--", "/usr/local/bin/workforce-entrypoint"]
