import { useMemo, useState } from "react";
import { SidebarLayout } from "../components/NavigationSidebar";
import { Panel, StatCard } from "../components/mvp/primitives";
import { T } from "../theme";
import type { MvpConnector } from "../types/mvp";
import { useMvpData } from "../lib/useMvpData";
import tracker from "../data/tracker.json";

/**
 * Why a connector is not moving, as one matrix.
 *
 * Three states, and they need completely different work:
 *
 *   no_docs   no public API documentation — nothing to implement from
 *   missing   no credentials — someone has to go and obtain them
 *   ready     nothing blocking it
 *
 * Credential SHAPE is not a state. An entry in the legacy
 * connector_account_details form holds real working credentials; converting it
 * is an engineering task, not a missing prerequisite.
 */
type Blocker = "no_docs" | "missing" | "ready";

function blockerOf(c: MvpConnector): Blocker {
  // Docs first: with no documentation, credentials are beside the point.
  if (c.tier === "no_docs") return "no_docs";
  if (c.credsState === "missing") return "missing";
  return "ready";
}

const BLOCKER_STYLE: Record<Blocker, { label: string; fg: string; bg: string; title: string }> = {
  ready:   { label: "ready",    fg: "#0f766e", bg: "#ccfbf1", title: "Credentials present — this connector can be run" },
  missing: { label: "no creds", fg: "#9f1239", bg: "#ffe4e6", title: "No credentials entry — a run aborts with ABORT_CREDS" },
  no_docs: { label: "no docs",      fg: "#3f3f46", bg: "#e4e4e7", title: "No public API documentation — there is nothing to implement from" },
};

/** PRs are per-connector, not per-flow: GRACE raises one PR covering many flows. */
type Pr = { number: number; url: string; connector: string | null; draft: boolean };

function prIndex() {
  const out = new Map<string, { pr: Pr; state: "review" | "blocked" | "merged" }>();
  const add = (rows: Pr[] | undefined, state: "review" | "blocked" | "merged") =>
    (rows ?? []).forEach((p) => p.connector && out.set(p.connector.toLowerCase(), { pr: p, state }));
  // Order matters: a PR that is both merged and labelled blocked reads as merged.
  add(tracker.inReview as Pr[], "review");
  add(tracker.blockedPrs as Pr[], "blocked");
  add(tracker.merged as Pr[], "merged");
  return out;
}

const chip = (active: boolean): React.CSSProperties => ({
  padding: "4px 10px", fontSize: 11, borderRadius: 999, cursor: "pointer",
  border: `1px solid ${active ? T.text : T.border}`,
  background: active ? T.text : "transparent",
  color: active ? T.bg : T.textMuted,
});

export function PrReadinessPage() {
  const { data: DATA } = useMvpData();
  const { connectors } = DATA;
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Blocker | "all">("all");

  const prs = useMemo(prIndex, []);

  /**
   * Flow columns come from the fleet itself rather than a hardcoded list, so a
   * flow added to prism shows up here without anyone editing this file.
   * Ordered by how many connectors implement it — the common flows read left to
   * right, the long tail trails off.
   */
  const flows = useMemo(() => {
    const n = new Map<string, number>();
    connectors.forEach((c) => c.flows.forEach((f) => n.set(f, (n.get(f) ?? 0) + 1)));
    return [...n.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([f]) => f);
  }, [connectors]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return connectors
      .filter((c) => (filter === "all" ? true : blockerOf(c) === filter))
      .filter((c) => (q ? c.name.toLowerCase().includes(q) : true))
      .sort((a, b) => b.flows.length - a.flows.length || a.name.localeCompare(b.name));
  }, [connectors, query, filter]);

  const totals = useMemo(() => {
    const by = { ready: 0, missing: 0, no_docs: 0 } as Record<Blocker, number>;
    connectors.forEach((c) => by[blockerOf(c)]++);
    const withPr = connectors.filter((c) => prs.has(c.name.toLowerCase())).length;
    return { ...by, withPr };
  }, [connectors, prs]);

  return (
    <SidebarLayout>
      <header style={{ padding: "22px 32px", borderBottom: `1px solid ${T.border}` }}>
        <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: T.text }}>PR Readiness</h1>
        <p style={{ margin: "6px 0 0", fontSize: 12, color: T.textMuted, maxWidth: 760 }}>
          Which flows each connector implements, and what is stopping the ones that are not moving.
          A PR covers a whole connector, not a single flow — nothing records flow-to-PR — so the PR
          badge is per row and the ticks are per flow.
        </p>
      </header>

      <div style={{ padding: "18px 32px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(172px, 1fr))", gap: 14 }}>
          <StatCard label="Ready to run" value={totals.ready} tone="good" hint="credentials present" />
          <StatCard label="No creds" value={totals.missing} tone={totals.missing ? "bad" : "default"} hint="aborts with ABORT_CREDS" />
          <StatCard label="No docs" value={totals.no_docs} hint="nothing to implement from" />
          <StatCard label="PR open" value={totals.withPr} hint="from the GRACE-auto label" />
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center", margin: "18px 0 10px", flexWrap: "wrap" }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="filter connectors…"
            style={{
              padding: "6px 10px", fontSize: 12, borderRadius: 6, minWidth: 200,
              border: `1px solid ${T.border}`, background: T.bg, color: T.text,
            }}
          />
          {(["all", "ready", "missing", "no_docs"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)} style={chip(filter === f)}>
              {f === "all" ? `all ${connectors.length}` : `${BLOCKER_STYLE[f].label} ${totals[f]}`}
            </button>
          ))}
        </div>

        <Panel title="Connectors × flows" subtitle={`${rows.length} shown · ${flows.length} flows · ● implemented`}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ borderCollapse: "collapse", fontSize: 11, width: "100%" }}>
              <thead>
                <tr>
                  <th style={{ ...th, textAlign: "left", position: "sticky", left: 0, background: T.bg, zIndex: 2 }}>Connector</th>
                  <th style={{ ...th, textAlign: "left" }}>Status</th>
                  {flows.map((f) => (
                    <th key={f} style={{ ...th, writingMode: "vertical-rl", transform: "rotate(180deg)", height: 92 }} title={f}>
                      {f}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => {
                  const b = BLOCKER_STYLE[blockerOf(c)];
                  const pr = prs.get(c.name.toLowerCase());
                  const has = new Set(c.flows);
                  return (
                    <tr key={c.name}>
                      <td style={{ ...td, position: "sticky", left: 0, background: T.bg, fontWeight: 600, whiteSpace: "nowrap" }}>
                        {c.name}
                      </td>
                      <td style={{ ...td, whiteSpace: "nowrap" }}>
                        <span title={b.title} style={{ padding: "2px 7px", borderRadius: 999, fontSize: 10, color: b.fg, background: b.bg }}>
                          {b.label}
                        </span>
                        {pr && (
                          <a
                            href={pr.pr.url}
                            target="_blank"
                            rel="noreferrer"
                            title={`PR #${pr.pr.number} — ${pr.state}`}
                            style={{ marginLeft: 6, fontSize: 10, color: T.textMuted, textDecoration: "none" }}
                          >
                            #{pr.pr.number}
                            {pr.pr.draft ? " draft" : ""}
                          </a>
                        )}
                      </td>
                      {flows.map((f) => (
                        <td key={f} style={{ ...td, textAlign: "center", color: has.has(f) ? T.text : T.border }}>
                          {has.has(f) ? "●" : "·"}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </SidebarLayout>
  );
}

const th: React.CSSProperties = {
  padding: "6px 5px", fontSize: 10, fontWeight: 600, color: T.textMuted,
  borderBottom: `1px solid ${T.border}`, verticalAlign: "bottom",
};
const td: React.CSSProperties = { padding: "5px", borderBottom: `1px solid ${T.border}` };
