#!/bin/bash
# Build script
set -eo pipefail
build_tag=$1
name=knowledge-mw-service
node=$2
org=$3

[[ -f ImageMagick-i386-pc-solaris2.11.tar.gz ]] || wget https://www.imagemagick.org/download/binaries/ImageMagick-i386-pc-solaris2.11.tar.gz
docker build -f ./Dockerfile --label commitHash=$(git rev-parse --short HEAD) -t ${org}/${name}:${build_tag} .
echo {\"image_name\" : \"${name}\", \"image_tag\" : \"${build_tag}\", \"node_name\" : \"$node\"} > metadata.json
