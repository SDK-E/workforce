ARG BASE_IMAGE=workforce-agent-base:0.1.0
FROM ${BASE_IMAGE}
USER root
RUN apk add --no-cache chromium font-liberation nss
ENV CHROME_BIN=/usr/bin/chromium
USER 10001:10001
