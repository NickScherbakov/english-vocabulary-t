#!/bin/bash
set -e

REPO="NickScherbakov/english-vocabulary-t"
BRANCH="main"

echo "=== Collecting and uploading files ==="

TREE_JSON='[]'

while IFS=$'\t' read -r mode type sha path; do
  echo "  Uploading: $path"
  B64=$(base64 -w0 "$path")
  BLOB_SHA=$(gh api "repos/$REPO/git/blobs" \
    -f content="$B64" \
    -f encoding="base64" \
    -q '.sha')
  TREE_JSON=$(echo "$TREE_JSON" | jq \
    --arg p "$path" \
    --arg m "$mode" \
    --arg s "$BLOB_SHA" \
    '. + [{"path":$p,"mode":$m,"type":"blob","sha":$s}]')
done < <(git ls-tree -r HEAD | awk '{print $1"\t"$2"\t"$3"\t"$4}')

echo ""
echo "=== Creating tree ($(echo "$TREE_JSON" | jq length) files) ==="

TREE_SHA=$(echo "{\"tree\": $TREE_JSON}" | \
  gh api "repos/$REPO/git/trees" --input - -q '.sha')
echo "Tree SHA: $TREE_SHA"

echo ""
echo "=== Creating commit ==="

COMMIT_MSG=$(git log -1 --format="%s")
AUTHOR_NAME=$(git log -1 --format="%an")
AUTHOR_EMAIL=$(git log -1 --format="%ae")
COMMIT_DATE=$(git log -1 --format="%aI")

COMMIT_SHA=$(jq -n \
  --arg msg "$COMMIT_MSG" \
  --arg tree "$TREE_SHA" \
  --arg name "$AUTHOR_NAME" \
  --arg email "$AUTHOR_EMAIL" \
  --arg date "$COMMIT_DATE" \
  '{message:$msg, tree:$tree, author:{name:$name, email:$email, date:$date}}' | \
  gh api "repos/$REPO/git/commits" --input - -q '.sha')
echo "Commit SHA: $COMMIT_SHA"

echo ""
echo "=== Updating refs/heads/$BRANCH ==="

gh api "repos/$REPO/git/refs/heads/$BRANCH" \
  -X PATCH \
  -f sha="$COMMIT_SHA" \
  -F force=true

echo ""
echo "=== SUCCESS: Repository synced! ==="
