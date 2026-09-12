name: Extract Ride Bangla Tools

on:
  push:
    paths:
      - "ride-bangla-tools-site.zip"
      - ".github/workflows/eas-build.yml"
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

      - name: Extract ZIP into the correct locations
        shell: bash
        run: |
          set -euo pipefail

          ZIP_FILE="ride-bangla-tools-site.zip"

          if [ ! -f "$ZIP_FILE" ]; then
            echo "ZIP file not found: $ZIP_FILE"
            exit 1
          fi

          rm -rf .github/_ride_bangla_extract
          mkdir -p .github/_ride_bangla_extract

          unzip -q -o "$ZIP_FILE" -d .github/_ride_bangla_extract

          if [ ! -d ".github/_ride_bangla_extract/tools" ]; then
            echo "ERROR: Expected tools/ directory was not found inside the ZIP."
            exit 1
          fi

          # The ZIP contains everything under tools/.
          # Move its contents to the repository root while preserving
          # all subfolders such as assets/, pdf/, image/, calculator/, etc.
          cp -a .github/_ride_bangla_extract/tools/. .

          rm -rf .github/_ride_bangla_extract

          # The ZIP is only the source package; keep the extracted files
          # in GitHub and remove the package itself.
          rm -f "$ZIP_FILE"

      - name: Commit extracted files
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

          git commit -m "Extract Ride Bangla Tools [skip ci]"
          git push
