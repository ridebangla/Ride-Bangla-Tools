name: Extract Ride Baon:
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
        id: extract
        shell: bash
        run: |
          set -euo pipefail

          ZIP_FILE="ride-bangla-tools-site.zip"
          TEMP_DIR=".ride-bangla-extract"

          echo "Looking for '$ZIP_FILE' at repo root..."
          echo "Repo root contents:"
          ls -la

          # This step's trigger fires on ANY change to the zip's path,
          # including its own deletion by a previous successful run of
          # this same workflow. That means a run can legitimately start
          # with no zip present. Treat that as "nothing to do" instead
          # of a failure, so the workflow is self-healing.
          if [ ! -f "$ZIP_FILE" ]; then
            echo "No '$ZIP_FILE' found in this checkout."
            echo "This usually means it was already extracted and removed by an earlier successful run."
            echo "Nothing to extract — exiting cleanly."
            echo "::warning::No ride-bangla-tools-site.zip found at the repo root — nothing was extracted this run. To update the tools, upload/commit ride-bangla-tools-site.zip to the repo root (GitHub web: Add file > Upload files); that push triggers extraction automatically."
            echo "skip=true" >> "$GITHUB_OUTPUT"
            exit 0
          fi

          echo "Found $ZIP_FILE ($(du -h "$ZIP_FILE" | cut -f1)). Verifying it's a valid zip..."
          if ! unzip -t "$ZIP_FILE" >/dev/null; then
            echo "ERROR: '$ZIP_FILE' exists but failed the zip integrity test (unzip -t)."
            echo "Re-upload the zip file — it may be corrupted or only partially uploaded."
            exit 1
          fi

          rm -rf "$TEMP_DIR"
          mkdir -p "$TEMP_DIR"
          unzip -q -o "$ZIP_FILE" -d "$TEMP_DIR"

          echo "Extracted top-level contents:"
          ls -la "$TEMP_DIR"

          if [ ! -d "$TEMP_DIR/tools" ]; then
            echo "ERROR: the zip did not contain a top-level 'tools/' folder."
            echo "Expected structure inside the zip: tools/index.html, tools/pdf/, tools/assets/, etc."
            echo "Found instead:"
            find "$TEMP_DIR" -maxdepth 2 -print
            exit 1
          fi

          if [ ! -f "$TEMP_DIR/tools/index.html" ]; then
            echo "ERROR: 'tools/index.html' is missing from the zip's tools/ folder."
            echo "Found in tools/:"
            find "$TEMP_DIR/tools" -maxdepth 1 -print
            exit 1
          fi

          # Replace only the generated tools folder so every file lands
          # at exactly the same path as inside the ZIP.
          rm -rf tools
          mkdir -p tools
          cp -a "$TEMP_DIR/tools/." tools/

          rm -rf "$TEMP_DIR"
          rm -f "$ZIP_FILE"

          echo "skip=false" >> "$GITHUB_OUTPUT"
          echo "Final tools/ structure ($(find tools -type f | wc -l) files):"
          find tools -type f -print | sort

      - name: Commit extracted files
        if: steps.extract.outputs.skip != 'true'
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
        if: steps.extract.outputs.skip != 'true'
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
