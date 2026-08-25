FROM alpine:3.22 AS build
RUN apk add --no-cache nodejs pnpm
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY scripts ./scripts
RUN pnpm install --frozen-lockfile
COPY tsconfig.json eslint.config.mjs .prettierrc.json ./
COPY src ./src
COPY test ./test
RUN pnpm build && pnpm prune --prod

FROM alpine:3.22
RUN apk add --no-cache ca-certificates docker-cli nodejs su-exec tini
RUN addgroup -S workforce && adduser -S -G workforce -u 10001 workforce
WORKDIR /app
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
RUN mkdir -p /var/lib/workforce && chown -R workforce:workforce /var/lib/workforce
COPY docker/control-plane/entrypoint /usr/local/bin/workforce-control-plane-entrypoint
VOLUME ["/var/lib/workforce"]
ENTRYPOINT ["/sbin/tini", "--", "/usr/local/bin/workforce-control-plane-entrypoint"]
CMD ["node", "dist/src/daemon.js"]
