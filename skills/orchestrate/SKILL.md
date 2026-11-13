---
name: orchestrate
description: Delegate work to worker coding agents (Gemini Flash, Gemini Hydrogen, Claude Sonnet) running in hc terminals, with Claude Code as the orchestrator. Use when a task splits into independent parts, when a long medium-complexity chunk can run in parallel with your own work, when there is high-volume or browser work to hand off, or when the user asks to spawn, delegate to, or orchestrate agents/workers via hc.
---

# Orchestrating worker agents with hc

You are the main executor. You plan, delegate, verify and integrate. Workers run in
`hc` terminals as your children; the user can watch or take over any of them with
`hc attach <name>`.

## Workers

Run `hc templates` for the live list. Current roster:

| Template | Agent / model | Use for | Do not use for |
|---|---|---|---|
| `flash` | agy, Gemini 3.8 Flash, auto mode | **High-volume** work: many similar items (pages, components, fixtures, translations), bulk mechanical edits, broad sweeps. **Browser interaction**: checking a page, clicking through a flow, screenshots. | Anything needing careful judgment. |
| `hydrogen` | agy, Gemini 4 Hydrogen, auto mode | Medium-to-hard tasks: multi-file implementation, refactors, test writing, codebase research. Sonnet-class. | Hard design or subtle debugging. |
| `sonnet` | Claude Code, Claude Sonnet 5.5, auto permission mode | Same tier as `hydrogen`: multi-file implementation, refactors, test writing, codebase research. | Hard design or subtle debugging. |

Keep for yourself: architecture decisions, anything ambiguous, hard debugging, final
review and integration. Don't delegate a task that is quicker to do than to brief.

### Choosing workers

- **Mix models.** When you run two or more workers, give them different templates
  rather than several copies of one, e.g. one `hydrogen` and one `sonnet`, plus
  `flash` for the bulk part. Different models make different mistakes, and a mix
  shows which one handles this codebase best.
- **Route by kind of work**, not just size: high-volume or browser work goes to
  `flash`; a substantial piece that needs real reasoning goes to `hydrogen` or
  `sonnet`. If two pieces are equal, split them across `hydrogen` and `sonnet`.
- **Cross-check with a different model.** When a worker's result is risky enough to
  want a second look, have a worker on a different model review it (read-only),
  then verify yourself as usual.
- Say in your update to the user which template each worker runs.

## How results reach you

Nothing is pushed to you. `hc wait` only tells you *that* a worker finished, blocked,
errored or exited; it returns no output. `hc read` returns a snapshot of the worker's
screen (plus `--lines N` of scrollback), including its UI chrome - a long report can
scroll out of it. So every brief asks the worker to **write its report to a file**,
and you read that file. Use `hc read` for blocked or error screens and as a fallback.

## Loop

1. **Split** the work into pieces that don't touch the same files. Workers share the
   working directory; give each one an explicit, non-overlapping set of files. If
   pieces must overlap, run them one after another, or give each its own git worktree
   (`--cwd`).
2. **Start the trace recorder** once, before the first spawn: `hc-trace start` (does
   nothing if it is already running). It records every worker's spawn, turns, time
   worked and time blocked, and has a small model (Claude Haiku by default;
   `hc-trace summarizer` switches it) summarize each brief and answer. Briefs are sent
   to that model, so keep secrets out of them.
3. **Spawn** each worker in the background with a unique name:

   ```sh
   hc run --bg --name api-tests hydrogen "<brief>"
   hc run --bg --name fixtures  flash    "<brief>"
   ```

   Add `--cwd <dir>` when the work is not in your current directory.

   Check the JSON that `hc run` prints. If `first_message.sent` is `false`, the brief
   was **not delivered**: the worker opened on a dialog. Both agy and Claude Code show
   a "trust this folder?" prompt the first time they run in a directory. Read the
   screen (`hc read <name>`); if it is that prompt and the folder is the user's
   project or one you created, accept with `hc keys <name> enter`, then deliver the
   brief yourself with `hc send <name> "<brief>"`.
4. **Keep working** on your own part, and wait without blocking yourself. Run the wait
   with the Bash tool's `run_in_background`, so you are re-invoked when it ends:

   ```sh
   hc wait --children any     # next child to finish, block, or error
   hc wait --children all     # until none is working
   ```

   If you wait in the foreground instead, pass `--timeout 100`: the default (180s) is
   longer than the Bash tool's default timeout (120s), which would kill the wait.
   A wait that times out just checks in; the workers keep running. Wait again.
5. **Read** the result: `cat .hc-reports/<name>.md`. If the file is missing, fall back
   to `hc read <name> --lines 120` and ask the worker (`hc send`) to write it.
6. **Handle the status** (`hc ls` / `hc get <name>`):
   - `done` - read the report, then verify it yourself (see below).
   - `blocked` - read the screen first. agy workers (`flash`, `hydrogen`) approve their
     own tool calls, so a block there is usually a dialog (folder trust) or a question.
     A `sonnet` worker in auto mode can still stop on a permission prompt for a risky
     command; judge it as below. Answer
     a question with `hc send <name> "<answer>"`; accept a safe, in-scope prompt with
     `hc send <name> y` or `hc keys <name> enter`; refuse with `n`. If it is
     destructive, out of scope, or you are unsure, ask the user.
   - `error` - read it; fix the brief and re-send, or take the task back.
7. **Follow up** on the same worker rather than spawning a new one when it already has
   the context: `hc send <name> "<correction or next step>"`, then wait again.
8. **Verify and integrate.** Never trust a worker's report: look at the diff of the
   files it listed (`git diff -- <files>`), and check nothing else changed outside its
   scope. Run the tests or the command yourself. Fix small gaps directly.
9. **Clean up** workers you started when their work is integrated:
   `hc kill <name>`, then `hc rm <name>`, and delete `.hc-reports/<name>.md` (remove
   `.hc-reports/` when it is empty). Never touch terminals you did not start.
10. **Show the trace** when the work is done: run `hc-trace show --root <your terminal>`
    (your address is the `parent` in the JSON `hc run` printed) and include its output
    in your final report. The user can also open it in Herdr with `hc-trace view`. The
    summaries come from a small model and can be vague or wrong; your own verified
    account of the results is the one that counts.

## Writing a brief

A worker knows nothing about this conversation. Each brief must stand alone:

- the goal and why it matters, in one or two sentences;
- exact paths to read and the files it may change (and that it must change no others);
- constraints: conventions, commands to run, things not to touch;
- what "done" means;
- the report: "When done, write your report to `.hc-reports/<name>.md` (create the
  folder if needed): every file you changed, what you verified and how, and anything
  left undone or uncertain. Then print the same report."

## Limits

- At most 3-4 workers at once, unless the user asks for more.
- Workers must not commit, push, deploy, or delete outside their scope unless the user
  asked for that; say so in the brief when it is a risk.
- Tell the user which workers you started and what each is doing, and report their
  results honestly, including failures.
