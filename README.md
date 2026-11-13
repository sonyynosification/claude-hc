# claude-hc

Claude Code as the orchestrator of worker coding agents running in
`hc` (herdr) terminals.

| Part | Path | Installed by |
|---|---|---|
| `orchestrate` skill | `skills/orchestrate/SKILL.md` | Claude Code plugin |
| `hc-trace` (records who called whom, summarizes each turn) | `hc-trace/hctrace.py` | `install.sh` → `~/.local/bin/hc-trace` |
| Agent trace panel for the Herdr app | `herdr/mods/trace/` | `install.sh` → `~/.config/herdr-app/mods/trace` |
| `agy` worker template | `herdr/templates/agy.md` | `install.sh` → `~/.config/herdr-core/templates/agy.md` |

## Prerequisites

- `hc` / herdr and the Herdr app (`herdr-app`)
- `agy` (Antigravity CLI) for the worker template
- `claude` CLI if you keep the default Haiku summarizer (`hc-trace summarizer` to change)
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

Another coding agent is available as a worker through `hc` (herdr): `agy` (Gemini 3.8
Flash, auto mode - long, medium-complexity tasks). When a task has independent parts or
a long medium-complexity chunk that can run alongside your own work, delegate on your
own initiative: load the `orchestrate` skill and follow it.
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
