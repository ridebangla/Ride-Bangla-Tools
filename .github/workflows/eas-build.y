name: Extract Ride Bangla Tools

on:
  push:
    paths:
      - "ride-bangla-tools-site.zip"
  workflow_dispatch:

permissions:
  contents: write

jobs:
  extract-tools:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        with:
          fetch-depth: 0
          persist-credentials: true

      - name: Extract tools package
        shell: bash
        run: |
          set -euo pipefail

          ZIP_FILE="ride-bangla-tools-site.zip"

          echo "Checking ZIP file..."
          test -f "$ZIP_FILE" || { echo "ERROR: $ZIP_FILE not found."; exit 1; }

          echo "Checking ZIP integrity..."
          unzip -t "$ZIP_FILE"

          echo "Extracting package to repository root..."
          unzip -q -o "$ZIP_FILE" -d .

          echo "Checking extracted tools directory..."
          test -d "tools" || { echo "ERROR: tools/ directory was not created."; exit 1; }
          test -f "tools/index.html" || { echo "ERROR: tools/index.html not found."; exit 1; }

          echo "Extracted files:"
          find tools -type f | sort

          echo "Removing source ZIP..."
          rm -f "$ZIP_FILE"

      - name: Commit and push extracted files
        shell: bash
        run: |
          set -euo pipefail

          git config user.name "github-actions[bot]"
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"

          git add -A

          if git diff --cached --quiet; then
            echo "No changes to commit."
            exit 0
          fi

          git commit -m "Add Ride Bangla Tools"
          git push origin HEAD:${GITHUB_REF_NAME}
