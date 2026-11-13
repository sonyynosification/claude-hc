#!/usr/bin/env bash
# Link the non-Claude parts of this repo into place: hc-trace CLI, the Herdr
# trace panel mod, and the worker templates. Safe to re-run. An existing
# file that is not already our symlink is moved to ~/.local/state/claude-hc/backup/
# (not left beside it: Herdr would load a mods/trace.bak folder as another mod).
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP="${XDG_STATE_HOME:-$HOME/.local/state}/claude-hc/backup/$(date +%Y%m%d-%H%M%S)"

link() {
  local src="$1" dst="$2"
  mkdir -p "$(dirname "$dst")"
  if [ -L "$dst" ] && [ "$(readlink "$dst")" = "$src" ]; then
    echo "ok       $dst"
    return
  fi
  if [ -e "$dst" ] || [ -L "$dst" ]; then
    mkdir -p "$BACKUP"
    mv "$dst" "$BACKUP/$(basename "$dst")"
    echo "backup   $dst -> $BACKUP/$(basename "$dst")"
  fi
  ln -s "$src" "$dst"
  echo "linked   $dst -> $src"
}

chmod +x "$REPO/hc-trace/hctrace.py"
link "$REPO/hc-trace/hctrace.py"     "$HOME/.local/bin/hc-trace"
link "$REPO/herdr/mods/trace"        "$HOME/.config/herdr-app/mods/trace"
TPL="$HOME/.config/herdr-core/templates"
for t in "$REPO"/herdr/templates/*.md; do
  link "$t" "$TPL/$(basename "$t")"
done
# Drop links to templates this repo no longer has (e.g. the old agy.md).
for l in "$TPL"/*.md; do
  if [ -L "$l" ] && [ ! -e "$l" ] && [[ "$(readlink "$l")" == "$REPO"/* ]]; then
    rm "$l"; echo "removed  $l (stale link)"
  fi
done

for cmd in hc agy herdr-app; do
  command -v "$cmd" >/dev/null || echo "warning  '$cmd' not found on PATH"
done
