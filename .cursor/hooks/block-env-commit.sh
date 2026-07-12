#!/bin/bash
# Block git commit when staged files contain secrets or env files.
# Cursor hook: beforeShellExecution (matcher: git commit)

set -euo pipefail

input=$(cat)

# Only act inside a git repo
if ! git rev-parse --git-dir >/dev/null 2>&1; then
  echo '{ "permission": "allow" }'
  exit 0
fi

staged_files=$(git diff --cached --name-only 2>/dev/null || true)

if [ -z "$staged_files" ]; then
  echo '{ "permission": "allow" }'
  exit 0
fi

blocked_files=()

while IFS= read -r file; do
  [ -z "$file" ] && continue
  base=$(basename "$file")

  # Block .env files (except .env.example)
  if [[ "$base" == .env ]] || [[ "$base" == .env.* && "$base" != .env.example ]]; then
    blocked_files+=("$file")
    continue
  fi

  # Block sensitive filename patterns
  if [[ "$file" == *.pem ]] || \
     [[ "$base" == *credentials* ]] || \
     [[ "$base" == *secret* && "$base" != *secret.example* ]]; then
    blocked_files+=("$file")
  fi
done <<< "$staged_files"

if [ ${#blocked_files[@]} -gt 0 ]; then
  list=$(printf '%s, ' "${blocked_files[@]}")
  list=${list%, }
  msg="تم حظر commit: الملفات التالية تحتوي أسراراً أو ملفات بيئة: ${list}"
  python3 -c "
import json, sys
print(json.dumps({
    'permission': 'deny',
    'user_message': sys.argv[1],
    'agent_message': 'Hook blocked git commit because staged files include env or secret files. Unstage them with git reset HEAD.'
}, ensure_ascii=False))
" "$msg"
  exit 2
fi

# Scan staged diff for secret-like assignments
staged_diff=$(git diff --cached 2>/dev/null || true)

if [ -n "$staged_diff" ]; then
  if echo "$staged_diff" | grep -qE '^\+.*(BOT_API_KEY|DATABASE_URL|MEILI_MASTER_KEY|JWT_SECRET|N8N_WEBHOOK_SECRET|RABBITMQ_URL)=[^$\{][^[:space:]]+'; then
    msg="تم حظر commit: يبدو أن diff يحتوي على قيم أسرار (API keys, DATABASE_URL, ...). لا تلتزم الأسرار في Git."
    python3 -c "
import json, sys
print(json.dumps({
    'permission': 'deny',
    'user_message': sys.argv[1],
    'agent_message': 'Hook blocked git commit due to secret values in staged diff.'
}, ensure_ascii=False))
" "$msg"
    exit 2
  fi
fi

echo '{ "permission": "allow" }'
exit 0
