---
description: Create a git worktree in .worktrees/<name> on a new branch from HEAD
---

Create a git worktree for `$1` in `.worktrees/<clean>` on a new branch `<clean>` from `HEAD`.

Do these steps in order:

1. Clean up the name to `<clean>`:
   - Trim whitespace, lowercase.
   - Replace runs of spaces/underscores with a single `-`.
   - Drop any char except `A-Za-z0-9._/-`.
   - Collapse `--` to `-`, `//` to `/`, remove `..`.
   - Strip leading `-/.` and trailing `/.`.
   - If empty after cleaning, stop and ask for a new name.
   - If cleaned name differs, state `"<orig>" -> "<clean>"`.
2. Verify and prepare:
   - `git rev-parse --is-inside-work-tree` must succeed, else stop and explain.
   - `mkdir -p .worktrees`.
   - If `.gitignore` missing or lacks `/.worktrees`, add it and note `FIXED: .gitignore now ignores /.worktrees.`
   - If `.worktrees/<clean>` exists or branch `<clean>` exists (`git show-ref --verify --quiet refs/heads/<clean>`), stop and ask for a fresh name.
3. Create and report:
   - `git worktree add ".worktrees/<clean>" -b "<clean>" HEAD`
   - `git worktree list`
   - Report path, branch, and worktree list. Mention `FIXED` if present.
