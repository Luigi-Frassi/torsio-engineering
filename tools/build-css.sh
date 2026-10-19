#!/bin/sh
# Compiles the calculator's Tailwind CSS (v3.4.17, same as the CDN it replaces) into vendor/tailwind/app.css.
# Needs the Tailwind standalone CLI: https://github.com/tailwindlabs/tailwindcss/releases/tag/v3.4.17
# (e.g. tailwindcss-linux-x64 or tailwindcss-macos-arm64), passed as TAILWIND or found in PATH as "tailwindcss".
# Run from the repository root. tests/css_check.py tells when a rebuild is needed.
set -e
TW="${TAILWIND:-tailwindcss}"
"$TW" -c tailwind.config.js -i tools/tailwind.in.css -o vendor/tailwind/app.css --minify
