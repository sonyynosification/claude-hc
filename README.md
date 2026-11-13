# claude-hc

Claude Code as the orchestrator of worker coding agents running in
`hc` (herdr) terminals.

| Part | Path | Installed by |
|---|---|---|
| `orchestrate` skill | `skills/orchestrate/SKILL.md` | Claude Code plugin |
| `hc-trace` (records who called whom, summarizes each turn, prices each session) | `hc-trace/hctrace.py` | `install.sh` → `~/.local/bin/hc-trace` |
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

### Cost

Each worker row shows what its session's tokens would cost at API list prices, and
each orchestrator the total (workers plus its own Claude session). On a Claude or
Google subscription that is an equivalent, not a bill. The tokens come from the
agents' own records, read when the trace is shown, so past runs are covered too:

- Claude Code: `usage` of each message in `~/.claude/projects/<folder>/<session>.jsonl`
  (subagent transcripts included), matched to the worker by folder and start time.
  The orchestrator's sessions are the ones whose `hc run` output names its workers;
  their whole cost counts, not just the delegating part.
- agy: the per-call usage in `~/.gemini/antigravity-cli/conversations/<id>.db`, found
  through the CLI log that agy wrote at the worker's start. This format is not
  documented and was read from the data, so a new agy version may break it (cost then
  shows nothing for that worker).

Prices are in `PRICES` in `hc-trace/hctrace.py` (checked 2026-11-13; Gemini 3.8 Flash
doubles on 2027-01-01). Override or add models in `~/.local/state/hc-trace/prices.json`:
`{"model-id": [input, output, cache_read, cache_write_5m, cache_write_1h]}` in $ per
1M tokens. A model without a price shows `$?`. `--no-cost` skips all of this.

## Update

Edit here, bump `version` in `.claude-plugin/plugin.json`, push. Elsewhere:
`git pull` (the symlinks pick it up) and `/plugin marketplace update claude-hc`.
