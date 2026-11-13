# claude-hc

Claude Code as the orchestrator of worker coding agents running in
`hc` (herdr) terminals.

| Part | Path | Installed by |
|---|---|---|
| `orchestrate` skill | `skills/orchestrate/SKILL.md` | Claude Code plugin |
| `hc-trace` (records who called whom, summarizes each turn) | `hc-trace/hctrace.py` | `install.sh` → `~/.local/bin/hc-trace` |
| Agent trace panel for the Herdr app | `herdr/mods/trace/` | `install.sh` → `~/.config/herdr-app/mods/trace` |
| Worker templates: `flash`, `hydrogen`, `sonnet` | `herdr/templates/*.md` | `install.sh` → `~/.config/herdr-core/templates/` |

## Prerequisites

- `hc` / herdr and the Herdr app (`herdr-app`)
- `agy` (Antigravity CLI) for the `flash` and `hydrogen` workers
- `claude` CLI for the `sonnet` worker
- `claude` CLI also runs the default Haiku summarizer (`hc-trace summarizer` to change)
- Python 3

## Install

```sh
git clone <this repo> ~/projects/claude-hc
~/projects/claude-hc/install.sh
```

In Claude Code:

```
/plugin marketplace add ~/projects/claude-hc        # or <github-user>/claude-hc
/plugin install hc@claude-hc
```

The skill is then available as `hc:orchestrate`. If you also have a personal copy
at `~/.claude/skills/orchestrate`, remove it so there is only one.

Optional, to have Claude delegate on its own initiative, add to `~/.claude/CLAUDE.md`:

```md
## Worker agents (hc)

Worker agents are available through `hc` (herdr): `flash` (Gemini 3.8 Flash - high-volume
and browser tasks), `hydrogen` (Gemini 4 Hydrogen) and `sonnet` (Claude Sonnet 5.5) for
medium-to-hard tasks. When a task has independent parts, high-volume or browser work, or a
long chunk that can run alongside your own work, delegate on your own initiative: load the
`orchestrate` skill and follow it. Prefer a mix of models over several copies of one.
```

## Use

```sh
hc-trace start     # recorder (the skill starts it too)
hc-trace view      # open the Agent trace panel in Herdr
hc-trace show      # the same tree in the terminal (--raw, --root, --since)
```

## Update

Edit here, bump `version` in `.claude-plugin/plugin.json`, push. Elsewhere:
`git pull` (the symlinks pick it up) and `/plugin marketplace update claude-hc`.
