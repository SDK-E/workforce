FROM alpine:3.22.1
RUN apk add --no-cache ca-certificates tinyproxy \
 && mkdir -p /var/run/tinyproxy \
 && chown tinyproxy:tinyproxy /var/run/tinyproxy
COPY --chmod=0444 tinyproxy.conf /etc/tinyproxy/tinyproxy.conf
USER tinyproxy:tinyproxy
EXPOSE 8888
ENTRYPOINT ["tinyproxy", "-d", "-c", "/etc/tinyproxy/tinyproxy.conf"]
