#!/usr/bin/env bash
# Cursor stop 钩子：Agent 本轮结束后，若有未提交变更则 add + commit + push。
# 依赖：git、python3（解析 stdin JSON）；须已配置 user.name / user.email 与 origin 远程。

set -euo pipefail

INPUT="$(cat || true)"
if ! printf '%s' "$INPUT" | python3 -c "
import json, sys
raw = sys.stdin.read() or '{}'
try:
    d = json.loads(raw)
except json.JSONDecodeError:
    sys.exit(1)
# 仅在本轮正常结束后再同步；aborted / error 不提交
status = d.get('status')
if status is not None and status != 'completed':
    sys.exit(1)
sys.exit(0)
" 2>/dev/null; then
  exit 0
fi

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [[ -z "$REPO_ROOT" ]]; then
  exit 0
fi
cd "$REPO_ROOT"

if ! git rev-parse --git-dir >/dev/null 2>&1; then
  exit 0
fi

if ! git remote get-url origin >/dev/null 2>&1; then
  printf '%s\n' '{"followup_message":"未配置 git remote origin，已跳过自动推送。"}'
  exit 0
fi

if [[ -z "$(git status --porcelain 2>/dev/null)" ]]; then
  printf '%s\n' '{"followup_message":"Git 工作区无变更，已跳过提交与推送。"}'
  exit 0
fi

if [[ -z "$(git config user.email 2>/dev/null)" ]]; then
  printf '%s\n' '{"followup_message":"未设置 git user.email / user.name，无法自动 commit，已跳过。"}'
  exit 0
fi

git add -A

if git diff --cached --quiet; then
  printf '%s\n' '{"followup_message":"无有效暂存变更（可能均为忽略文件），已跳过 commit。"}'
  exit 0
fi

MSG="chore: auto-sync from Cursor ($(date -u +"%Y-%m-%dT%H:%M:%SZ")')"
git commit -m "$MSG" || {
  printf '%s\n' '{"followup_message":"自动 git commit 失败（查看 Hooks 输出通道或终端）。"}'
  exit 0
}

BRANCH="$(git branch --show-current 2>/dev/null || echo main)"
if git push -u origin "$BRANCH" 2>/dev/null; then
  printf '%s\n' "{\"followup_message\":\"已自动提交并推送到 origin/$BRANCH。\"}"
else
  printf '%s\n' '{"followup_message":"已自动 commit，但 git push 失败（鉴权/网络/分支保护）；请手动 push。"}'
fi
exit 0
