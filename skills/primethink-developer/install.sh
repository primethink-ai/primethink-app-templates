#!/usr/bin/env bash
set -euo pipefail

skill_name="primethink-developer"
canonical_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
links=(
  "$HOME/.kiro/skills/$skill_name"
  "$HOME/.claude/skills/$skill_name"
)

# Never replace user-owned directories or files. Stale symlinks are safe to repair.
for link in "${links[@]}"; do
  if [[ -e "$link" && ! -L "$link" ]]; then
    printf 'Refusing to replace non-symlink path: %s\n' "$link" >&2
    exit 1
  fi
done

for link in "${links[@]}"; do
  mkdir -p -- "$(dirname -- "$link")"
  if [[ -L "$link" ]]; then
    rm -- "$link"
  fi
  ln -s -- "$canonical_dir" "$link"
  printf 'Linked %s -> %s\n' "$link" "$canonical_dir"
done

printf '\n%s is now the canonical save location for both assistants.\n' "$canonical_dir"
