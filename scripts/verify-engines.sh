#!/bin/sh
set -eu

kilo_version=$(docker run --rm --network none workforce-agent:0.1.0 kilo --version)
opencode_version=$(docker run --rm --network none workforce-agent:0.1.0 opencode --version)
toolchains=$(docker run --rm --network none workforce-agent:0.1.0 workforce-toolchain list)
test "$kilo_version" = "${KILO_VERSION:-7.4.23}"
test "$opencode_version" = "${OPENCODE_VERSION:-1.18.20}"
echo "$toolchains" | grep -q "python php laravel symfony go rust document office pdf image audio-video browser"
echo "Engine startup identities verified: kilo $kilo_version, opencode $opencode_version"
