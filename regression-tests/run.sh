#!/usr/bin/env bash

set -ex

NODE_ENV=test node lint.js './regression-tests/**/*.yaml' > ./regression-tests/test.log

diff -u ./regression-tests/ref.log ./regression-tests/test.log
