#!/usr/bin/env bash
# Writes _data/ama.json: closed issues labeled `ask` that have an answer from
# the repo owner. Declined questions (closed as "not planned") are skipped, so
# nothing is published unless it was answered.
set -euo pipefail
: "${REPO:?set REPO=owner/name}"
mkdir -p _data

issues=$(gh api --paginate "repos/$REPO/issues?state=closed&labels=ask&per_page=100" \
  --jq '.[] | select(.pull_request == null and .state_reason != "not_planned")
        | {number, question: .body, closed_at}' | jq -s '.')

result='[]'
for n in $(jq -r '.[].number' <<<"$issues"); do
  answer=$(gh api --paginate "repos/$REPO/issues/$n/comments" \
    --jq '.[] | select(.author_association == "OWNER") | {body}' | jq -s 'map(.body) | join("\n\n")')
  [ "$answer" = '""' ] && continue
  result=$(jq --argjson i "$(jq ".[] | select(.number == $n)" <<<"$issues")" --argjson a "$answer" \
    '. + [$i + {answer: $a}]' <<<"$result")
done

jq 'sort_by(.closed_at) | reverse' <<<"$result" > _data/ama.json
echo "ama.json: $(jq length _data/ama.json) answered"
