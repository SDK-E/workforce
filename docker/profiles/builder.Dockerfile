ARG BASE_IMAGE=workforce-agent-base:0.1.0
FROM ${BASE_IMAGE}
USER root
RUN apk add --no-cache bash build-base curl openssh-client python3
USER 10001:10001
