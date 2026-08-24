FROM node:22-bookworm-slim

ARG KILO_VERSION
ARG OPENCODE_VERSION
RUN test -n "$KILO_VERSION" && test -n "$OPENCODE_VERSION" \
 && npm install --global "@kilocode/cli@$KILO_VERSION" "opencode-ai@$OPENCODE_VERSION" \
 && npm cache clean --force \
 && useradd --uid 10001 --create-home --shell /usr/sbin/nologin workforce

COPY --chmod=0555 workforce-entrypoint /usr/local/bin/workforce-entrypoint
RUN mkdir -p /work && chown 10001:10001 /work
WORKDIR /work
USER 10001:10001
ENTRYPOINT ["/usr/local/bin/workforce-entrypoint"]
