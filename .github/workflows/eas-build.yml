name: Extract Ride Bangla Tools

on:
  push:
    paths:
      - "*.zip"
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

          TEMP_DIR=".ride-bangla-extract"

          echo "Looking for any *.zip file at repo root..."
          echo "Repo root contents:"
          ls -la

          # Find every top-level zip file (repo root only — not inside tools/,
          # .github/, etc.), sorted so the run is deterministic if more than
          # one somehow exists.
          mapfile -t ZIP_CANDIDATES < <(find . -maxdepth 1 -iname "*.zip" -type f | sed 's|^\./||' | sort)

          # This step's trigger fires on ANY change to a *.zip at repo root,
          # including a zip's own deletion by a previous successful run of
          # this same workflow. That means a run can legitimately start
          # with no zip present. Treat that as "nothing to do" instead
          # of a failure, so the workflow is self-healing.
          if [ "${#ZIP_CANDIDATES[@]}" -eq 0 ]; then
            echo "No *.zip file found at the repo root."
            echo "This usually means it was already extracted and removed by an earlier successful run."
            echo "Nothing to extract — exiting cleanly."
            echo "::warning::No .zip file found at the repo root — nothing was extracted this run. To update the tools, upload/commit a .zip file (any name) to the repo root (GitHub web: Add file > Upload files); that push triggers extraction automatically."
            echo "skip=true" >> "$GITHUB_OUTPUT"
            exit 0
          fi

          if [ "${#ZIP_CANDIDATES[@]}" -gt 1 ]; then
            echo "::warning::Found ${#ZIP_CANDIDATES[@]} zip files at repo root: ${ZIP_CANDIDATES[*]}. Using the first one alphabetically ('${ZIP_CANDIDATES[0]}') and leaving the rest untouched. Keep only one zip at the repo root to avoid ambiguity."
          fi

          ZIP_FILE="${ZIP_CANDIDATES[0]}"

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
