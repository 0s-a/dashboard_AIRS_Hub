#!/bin/bash
# Ask user to confirm Bugbot review before creating a PR.
# Cursor hook: beforeShellExecution (matcher: gh pr create)

set -euo pipefail

input=$(cat)

python3 -c "
import json
print(json.dumps({
    'permission': 'ask',
    'user_message': 'هل شغّلت Bugbot review على تغييرات الفرع؟ استخدم /review-bugbot أو اطلب من الوكيل مراجعة branch changes قبل إنشاء PR.',
    'agent_message': 'Before gh pr create: run Bugbot review on branch changes, fix valid findings, then npm run lint and npm run build.'
}, ensure_ascii=False))
"
exit 0
