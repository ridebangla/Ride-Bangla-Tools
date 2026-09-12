name: Extract Ride Bangla Tools

on:
  push:
    paths:
      - "ride-bangla-tools-site.zip"
      - ".github/workflows/eas-build.yml"
  workflow_dispatch:

permissions:
  contents: write

concurrency:
  group: extract-ride-bangla-tools
  cancel-in-progress: true

jobs:
  extract-tools:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        with:
          fetch-depth: 0
          persist-credentials: true
          ref: main

      - name: Sync with latest main
        shell: bash
        run: |
          set -euo pipefail
          git fetch origin main
          git reset --hard origin/main

      - name: Extract ZIP into its exact tools/ structure
        shell: bash
        run: |
          set -euo pipefail

          ZIP_FILE="ride-bangla-tools-site.zip"
          TEMP_DIR=".ride-bangla-extract"

          test -f "$ZIP_FILE"
          unzip -t "$ZIP_FILE" >/dev/null

          rm -rf "$TEMP_DIR"
          mkdir -p "$TEMP_DIR"
          unzip -q -o "$ZIP_FILE" -d "$TEMP_DIR"

          # The ZIP contains tools/... . Replace only the generated tools folder
          # so every file remains in exactly the same path as inside the ZIP.
          test -d "$TEMP_DIR/tools"
          test -f "$TEMP_DIR/tools/index.html"

          rm -rf tools
          mkdir -p tools
          cp -a "$TEMP_DIR/tools/." tools/

          rm -rf "$TEMP_DIR"
          rm -f "$ZIP_FILE"

          echo "Final tools structure:"
          find tools -type f -print | sort

      - name: Commit extracted files
        shell: bash
        run: |
          set -euo pipefail

          git config user.name "github-actions[bot]"
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"

          # -f ensures the extracted tools are committed even if the repository
          # has a .gitignore rule that would otherwise ignore part of tools/.
          git add -A
          git add -f tools

          if git diff --cached --quiet; then
            echo "No changes to commit."
            exit 0
          fi

          git commit -m "Add Ride Bangla Tools"

      - name: Push extracted files
        shell: bash
        run: |
          set -euo pipefail

          # Rebase the new extraction commit onto anything that reached main
          # after checkout, then push. Retry once if another push races us.
          for attempt in 1 2; do
            git fetch origin main
            git rebase origin/main

            if git push origin HEAD:main; then
              exit 0
            fi

            if [ "$attempt" -eq 2 ]; then
              echo "ERROR: Could not push to main after retry."
              exit 1
            fi

            sleep 2
          done
