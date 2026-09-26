---
description: Create a git worktree in .worktrees/<name> on a new branch from HEAD
---

Create a git worktree `$1` in `.worktrees/$1` on a new branch `$1` from `HEAD`.

The checks and creation below already ran. Do not run `git worktree add` again.

!`set -eu
NAME='$1'
[ -n "$NAME" ] || { echo "ERROR: usage: /worktree <name>"; exit 1; }
case "$NAME" in
  -*|.*|/*|*/|*//*|*..*|*[!A-Za-z0-9._/-]*)
    echo "ERROR: invalid name. Use letters, numbers, dot, underscore, hyphen, slash; no leading -/., no trailing /, no .. or //."
    exit 1
    ;;
esac
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || { echo "ERROR: not a git repository."; exit 1; }
mkdir -p .worktrees
if [ ! -f .gitignore ]; then
  printf '/.worktrees\n' > .gitignore
  echo "FIXED: .gitignore now ignores /.worktrees."
elif ! grep -Eq '^/?\.worktrees/?$' .gitignore; then
  printf '/.worktrees\n' >> .gitignore
  echo "FIXED: .gitignore now ignores /.worktrees."
fi
if [ -e ".worktrees/$NAME" ]; then
  echo "ERROR: worktree path already exists."
  exit 1
fi
if git show-ref --verify --quiet "refs/heads/$NAME"; then
  echo "ERROR: branch already exists; pick a fresh name."
  exit 1
fi
git worktree add ".worktrees/$NAME" -b "$NAME" HEAD
git worktree list`

On `ERROR`, stop and explain. On success, report the path, branch, and worktree list. Mention `FIXED` if present.
