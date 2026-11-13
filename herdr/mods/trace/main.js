// Agent trace: which agent called which through hc, how long each worked, and a
// one-line summary of what it was asked and what it answered. Reads `hc-trace show
// --json` (the recorder in ~/tools/fm-agent/hctrace.py writes the trace). Read-only,
// except the button that starts the recorder. Click a live worker to go to it;
// click a question or answer to see the raw text.

import { View, div } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { exec, home, panes, run, terminals, theme } from "herdr";

const POLL_MS = 3000;
const SINCE = "24h";

function clock(ms) {
  const d = new Date(ms);
  const two = (n) => String(n).padStart(2, "0");
  return `${two(d.getHours())}:${two(d.getMinutes())}:${two(d.getSeconds())}`;
}

function shortPath(p) {
  const h = home();
  return p && h && p.startsWith(h) ? "~" + p.slice(h.length) : p ?? "";
}

export default class Trace extends View {
  init(_props, cx) {
    this.bin = `${home()}/.local/bin/hc-trace`;
    this.data = null;      // { recorder, roots }
    this.error = null;
    this.last = "";
    this.raw = new Set();  // turns shown as raw text: "<id>#<n>"
    cx.timer.every(POLL_MS, (cx) => this.refresh(cx));
    this.refresh(cx);
  }

  refresh(cx) {
    cx.spawn(async (cx) => {
      try {
        const r = await exec(this.bin, ["show", "--json", "--since", SINCE], { timeout: 10000 });
        if (r.code !== 0) throw new Error(r.stderr.trim() || `hc-trace exited ${r.code}`);
        if (r.stdout === this.last && !this.error) return;   // nothing new: no redraw
        this.last = r.stdout;
        this.data = JSON.parse(r.stdout);
        this.error = null;
      } catch (e) {
        const msg = String(e?.message ?? e);
        if (msg === this.error) return;
        this.error = msg;
      }
      cx.notify();
    });
  }

  startRecorder(cx) {
    cx.spawn(async (cx) => {
      try { await exec(this.bin, ["start"], { timeout: 10000 }); } catch (e) { this.error = String(e?.message ?? e); }
      this.last = "";
      this.refresh(cx);
    });
  }

  // A live worker's status comes from Herdr itself, so "working" shows while a turn is
  // still open (the trace only gets a turn when it ends).
  stateOf(n, live) {
    if (!n.live) return n.state;
    const t = live.get(n.addr);
    const st = t?.status;                       // a word, or { state, msg } straight from the core
    return (typeof st === "string" ? st : st?.state) ?? n.state;
  }

  color(t, state) {
    return { working: t.working, blocked: t.blocked, done: t.done, idle: t.idle, error: t.blocked, killed: t.dim }[state] ?? t.muted;
  }

  goTo(addr) {
    if (panes().some((p) => p.terminal === addr)) run("pane.focus", { terminal: addr });
    else run("terminal.peek", { terminal: addr });
  }

  line(t, key, tag, tagColor, summary, rawText) {
    const raw = this.raw.has(key);
    const text = raw ? rawText || summary : summary || rawText;
    if (!text) return null;
    return h_flex().id(key).gap(6).pl(4).pr(4).rounded(4).cursor_pointer()
      .hover((s) => s.bg(t.hover))
      .on_click((_e, cx) => { raw ? this.raw.delete(key) : this.raw.add(key); cx.notify(); })
      .child(div().flex_none().self_start().w(14).font_semibold().text_color(tagColor).child(tag))
      .child(div().flex_1().text_color(raw ? t.muted : t.foreground).child(text));
  }

  worker(t, n, depth, live) {
    const state = this.stateOf(n, live);
    const isLive = n.live && live.has(n.addr);
    const rows = [
      h_flex().id(`w-${n.id}`).gap(8).pl(4).pr(4).h(24).flex_none().items_center().rounded(4)
        .when(isLive, (el) => el.cursor_pointer().hover((s) => s.bg(t.hover)).on_click(() => this.goTo(n.addr)))
        .child(div().flex_none().text_color(t.dim).child(clock(n.start)))
        .child(div().flex_none().font_semibold().text_color(t.foreground).child(n.agent ?? "?"))
        .child(div().flex_1().truncate().text_color(t.muted).child(`${n.name ?? ""} (${n.addr})`))
        .child(div().flex_none().text_color(this.color(t, state)).child(state))
        .child(div().flex_none().text_color(t.dim).child(n.took ?? "")),
    ];
    for (const turn of n.turns) {
      const key = `${n.id}#${turn.n}`;
      if (n.turns.length > 1) {
        rows.push(div().pl(4).text_color(t.dim).child(`turn ${turn.n}: ${turn.took} → ${turn.state}`));
      }
      rows.push(this.line(t, `q-${key}`, "Q", t.accent, turn.q, turn.q_raw));
      rows.push(this.line(t, `a-${key}`, "A", t.done, turn.a, turn.a_raw));
    }
    return v_flex().pl(10 + depth * 14).gap(1)
      .children(rows.filter(Boolean))
      .children(n.children.map((c) => this.worker(t, c, depth + 1, live)));
  }

  root(t, r, live) {
    const count = r.children.length;
    return v_flex().gap(4).p(8).rounded(8).bg(t.surface).border(1).border_color(t.border)
      .child(h_flex().gap(8).items_center()
        .child(div().flex_none().font_semibold().text_color(t.foreground).child(`${r.agent ?? "terminal"} (${r.addr})`))
        .child(div().flex_1().truncate().text_color(t.muted).child(r.title || shortPath(r.cwd)))
        .child(div().flex_none().text_color(t.dim).child(`${count} worker${count === 1 ? "" : "s"} · ${r.span}`)))
      .children(r.children.map((c) => this.worker(t, c, 0, live)));
  }

  render() {
    const t = theme();
    const live = new Map(terminals().filter((x) => x.state === "live").map((x) => [x.address, x]));
    const d = this.data;
    const roots = d ? [...d.roots].reverse() : [];   // newest orchestration first
    return v_flex().size_full().bg(t.chrome).text_size(12).text_color(t.muted)
      .child(h_flex().flex_none().h(34).pl(12).pr(8).gap(8).items_center().border_b(1).border_color(t.border)
        .child(div().font_semibold().text_color(t.foreground).child("Agent trace"))
        .child(div().flex_1().text_color(t.dim).child(`last ${SINCE}`))
        .when(Boolean(d) && !d.recorder, (el) => el
          .child(div().text_color(t.blocked).child("recorder stopped"))
          .child(div().id("start").pl(8).pr(8).h(22).rounded(6).bg(t.raised).text_color(t.foreground).cursor_pointer()
            .hover((s) => s.bg(t.hover)).on_click((_e, cx) => this.startRecorder(cx))
            .child(h_flex().h(22).items_center().child("Start"))))
        .when(Boolean(d) && d.recorder, (el) => el.child(div().text_color(t.done).child("recording"))))
      .when(Boolean(this.error), (el) => el.child(div().p(12).text_color(t.blocked).child(`hc-trace: ${this.error}`)))
      .when(!this.error && !d, (el) => el.child(div().p(12).child("Loading…")))
      .when(!this.error && Boolean(d) && roots.length === 0, (el) => el.child(div().p(12)
        .child("No agent calls recorded yet. Workers started with hc run from an agent show up here.")))
      .child(v_flex().id("list").flex_1().p(8).gap(8).overflow_y_scrollbar()
        .children(roots.map((r) => this.root(t, r, live))));
  }
}
