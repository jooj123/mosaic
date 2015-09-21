#!/bin/bash
set -eu
DIR=$(dirname "$0")

main() {
  node "${DIR}/server.js"
}

main "$@"

