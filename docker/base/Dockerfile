FROM alpine:3.22.1

ARG KILO_VERSION
ARG OPENCODE_VERSION

RUN test -n "$KILO_VERSION" && test -n "$OPENCODE_VERSION" \
 && apk add --no-cache bash zsh ca-certificates chromium curl gcompat git jq nodejs npm tini \
 && npm install --global "@kilocode/cli@$KILO_VERSION" "opencode-ai@$OPENCODE_VERSION" \
 && find /usr/local/lib/node_modules/@kilocode/cli/node_modules/@kilocode \
      -mindepth 1 -maxdepth 1 -type d -name 'cli-linux-*' ! -name '*-musl' -exec rm -rf '{}' + \
 && find /usr/local/lib/node_modules/opencode-ai/node_modules \
      -mindepth 1 -maxdepth 1 -type d -name 'opencode-linux-*' ! -name '*-musl' -exec rm -rf '{}' + \
 && npm cache clean --force \
 && addgroup -g 10001 workforce \
 && adduser -D -u 10001 -G workforce -h /home/workforce -s /sbin/nologin workforce

COPY --chmod=0555 workforce-entrypoint /usr/local/bin/workforce-entrypoint
COPY --chmod=0555 workforce-toolchain /usr/local/bin/workforce-toolchain
COPY --chmod=0555 workforce-mcp-probe /usr/local/bin/workforce-mcp-probe
RUN mkdir -p /work && chown 10001:10001 /work
WORKDIR /work
ENV CHROME_BIN=/usr/bin/chromium
USER 10001:10001
ENTRYPOINT ["/sbin/tini", "--", "/usr/local/bin/workforce-entrypoint"]
