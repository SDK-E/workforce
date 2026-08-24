ARG BASE_IMAGE=workforce-agent-base:0.1.0
FROM ${BASE_IMAGE}
USER root
RUN apt-get update \
 && apt-get install --yes --no-install-recommends git ca-certificates \
 && rm -rf /var/lib/apt/lists/*
USER 10001:10001

