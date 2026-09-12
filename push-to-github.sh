#!/usr/bin/env bash
# Ride Bangla Tools — one-shot setup + push script
#
# কী করে এই স্ক্রিপ্টটা:
#   1) এই স্ক্রিপ্টের পাশে থাকা ride-bangla-tools-site.zip খুঁজে বের করে
#   2) সেটা unzip করে একটা রিপো ফোল্ডারে রাখে (প্রতিটা ফাইল তার নিজের জায়গায় বসে যায়)
#   3) git init করে, .gitignore বানায়, প্রথম কমিট করে, ব্রাঞ্চ main-এ রাখে
#   4) আপনি যদি রিমোট URL দেন, remote add করে সরাসরি push-ও করে দেয়
#
# ব্যবহার:
#   ./push-to-github.sh                                   -> শুধু লোকাল রিপো রেডি করবে (push করবে না)
#   ./push-to-github.sh https://github.com/you/repo.git   -> রেডি করে সরাসরি push করবে
#
# শর্ত: zip ফাইল আর এই স্ক্রিপ্ট একই ফোল্ডারে থাকতে হবে। git ইনস্টল থাকতে হবে।

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ZIP_NAME="ride-bangla-tools-site.zip"
ZIP_PATH="${SCRIPT_DIR}/${ZIP_NAME}"
REPO_DIR="${SCRIPT_DIR}/ride-bangla-tools"
REMOTE_URL="${1:-}"

echo "== Ride Bangla Tools: setup + push =="

if ! command -v git >/dev/null 2>&1; then
  echo "ERROR: git ইনস্টল নেই। আগে git ইনস্টল করে আবার চালান।" >&2
  exit 1
fi

if ! command -v unzip >/dev/null 2>&1; then
  echo "ERROR: unzip ইনস্টল নেই। আগে unzip ইনস্টল করে আবার চালান।" >&2
  exit 1
fi

if [ ! -f "$ZIP_PATH" ]; then
  echo "ERROR: '$ZIP_NAME' পাওয়া যায়নি এই ফোল্ডারে: $SCRIPT_DIR" >&2
  echo "স্ক্রিপ্ট আর zip ফাইল একই ফোল্ডারে রাখুন।" >&2
  exit 1
fi

if [ -d "$REPO_DIR" ]; then
  echo "ERROR: '$REPO_DIR' আগে থেকেই আছে। মুছে দিন অথবা অন্য জায়গা থেকে স্ক্রিপ্ট চালান।" >&2
  exit 1
fi

echo "-> unzip করছি: $ZIP_NAME"
mkdir -p "$REPO_DIR"
unzip -q "$ZIP_PATH" -d "$SCRIPT_DIR/__extract_tmp__"
# zip-এর ভেতরে সবকিছু tools/ ফোল্ডারে আছে — সেটার ভেতরের কনটেন্ট রিপোর রুটে নিয়ে আসছি
mv "$SCRIPT_DIR/__extract_tmp__/tools/"* "$REPO_DIR/"
mv "$SCRIPT_DIR/__extract_tmp__/tools/".[!.]* "$REPO_DIR/" 2>/dev/null || true
rm -rf "$SCRIPT_DIR/__extract_tmp__"

cd "$REPO_DIR"

if [ ! -f ".gitignore" ]; then
  cat > .gitignore << 'EOF'
.DS_Store
.vercel
*.log
node_modules/
EOF
fi

echo "-> git init + first commit"
git init -q
git checkout -q -b main 2>/dev/null || git branch -m main
git add -A
git -c user.email="dev@ridebangla.bd" -c user.name="Ride Bangla" commit -q -m "Ride Bangla Tools: initial 21-tool static site"

echo "-> রিপো রেডি: $REPO_DIR"
echo "   ফাইল সংখ্যা: $(git ls-files | wc -l | tr -d ' ')"

if [ -n "$REMOTE_URL" ]; then
  echo "-> remote যোগ করছি এবং push করছি: $REMOTE_URL"
  git remote add origin "$REMOTE_URL"
  git push -u origin main
  echo "== হয়ে গেছে — GitHub-এ push হয়ে গেছে =="
else
  echo ""
  echo "এখন push করতে চাইলে:"
  echo "  cd \"$REPO_DIR\""
  echo "  git remote add origin <আপনার-repo-URL>"
  echo "  git push -u origin main"
  echo ""
  echo "অথবা পরের বার এভাবে চালালে এক কমান্ডেই push হয়ে যাবে:"
  echo "  ./push-to-github.sh <আপনার-repo-URL>"
fi
