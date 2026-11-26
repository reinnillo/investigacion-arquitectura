#!/usr/bin/env bash
# Prepara el directorio de trabajo del caso. Lo usan correr.mjs y `claude plugin eval --scaffold`.
set -eu
cp -R "$(cd "$(dirname "$0")" && pwd)/files/." .
