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
 *   no_docs   the field probe found not one supported flow, so the docs
 *             generator skips the connector and writes no doc file. This is a
 *             tier from build_mvp.py — an implementation signal, NOT a claim
 *             about whether the vendor publishes an API spec.
 *   missing   alpha tier: no credentials held. A run stops at preflight with
 *             ABORT_CREDS and is SKIPPED — there is no mock mode and no PR.
 *   ready     nothing blocking it
 *
 * Credential SHAPE is not a state. An entry in the legacy
 * connector_account_details form holds real working credentials; converting it
 * is an engineering task, not a missing prerequisite.
 */
type Blocker = "no_docs" | "gated_docs" | "missing" | "ready" | "pipeline";

/**
 * One row of the matrix. Implemented connectors and pipeline connectors share
 * it so they live in the same table: a pipeline row simply has no flows, which
 * is the honest rendering — nothing is implemented yet, so every cell is empty.
 */
type Row = {
  name: string;
  flows: string[];
  blocker: Blocker;
  docsUrl: string | null;
  merchant: string | null;
  notes: string | null;
};

function blockerOf(c: MvpConnector): Blocker {
  // Vendor documentation first: with no spec there is nothing to implement
  // from, and credentials would not help. This uses the RESEARCHED docsState,
  // not the no_docs tier — the tier reports whether our own generator wrote a
  // file, and all three connectors it flags do have vendor documentation.
  if (c.docsState === "none") return "no_docs";
  if (c.docsState === "gated") return "gated_docs";
  if (c.credsState === "missing") return "missing";
  return "ready";
}

const BLOCKER_STYLE: Record<Blocker, { label: string; fg: string; bg: string; title: string }> = {
  ready:   { label: "ready",    fg: "#0f766e", bg: "#ccfbf1", title: "Credentials present — this connector can be run" },
  missing: { label: "alpha",    fg: "#9f1239", bg: "#ffe4e6", title: "Alpha tier: no credentials are held for this connector. A GRACE run stops at preflight with ABORT_CREDS and is recorded as SKIPPED — there is no mock or degraded mode, and no PR is raised." },
  gated_docs: { label: "docs gated", fg: "#1e40af", bg: "#dbeafe", title: "The vendor publishes API documentation but it is behind registration, a partner agreement or an NDA. An access request, not engineering work." },
  no_docs:    { label: "no docs",    fg: "#3f3f46", bg: "#e4e4e7", title: "No vendor API documentation could be found. Mostly wallet and voucher schemes that are only integrable through an aggregator." },
  pipeline:   { label: "not built",  fg: "#7c2d12", bg: "#ffedd5", title: "A merchant has asked for this connector but no module exists in prism yet, so there is nothing to show per flow." },
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

export function ConnectorReadinessPage() {
  const { data: DATA } = useMvpData();
  const { connectors } = DATA;
  // Wanted by merchants, not yet in prism. Its own array because these rows
  // have no cells, flows or score to show in the matrix.
  const pipeline = DATA.pipeline ?? [];
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

  /** Implemented and pipeline connectors in one list, so they share a table. */
  const allRows = useMemo<Row[]>(() => [
    ...connectors.map((c) => ({
      name: c.name, flows: c.flows, blocker: blockerOf(c),
      docsUrl: c.docsUrl, merchant: c.merchant, notes: null,
    })),
    ...pipeline.map((p) => ({
      // No flows: nothing is implemented, so every cell is empty. That is the
      // point of showing them here rather than in a separate list.
      name: p.name, flows: [], blocker: "pipeline" as Blocker,
      docsUrl: p.docsUrl, merchant: p.merchant, notes: p.notes,
    })),
  ], [connectors, pipeline]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allRows
      .filter((r) => (filter === "all" ? true : r.blocker === filter))
      .filter((r) => (q ? r.name.toLowerCase().includes(q)
                        || (r.merchant ?? "").toLowerCase().includes(q) : true))
      // Implemented first, most flows first; pipeline rows trail with 0 flows.
      .sort((a, b) => b.flows.length - a.flows.length || a.name.localeCompare(b.name));
  }, [allRows, query, filter]);

  const totals = useMemo(() => {
    const by = { ready: 0, missing: 0, gated_docs: 0, no_docs: 0, pipeline: pipeline.length } as Record<Blocker, number>;
    connectors.forEach((c) => by[blockerOf(c)]++);
    const withPr = connectors.filter((c) => prs.has(c.name.toLowerCase())).length;
    return { ...by, withPr };
  }, [connectors, prs]);

  return (
    <SidebarLayout>
      <header style={{ padding: "22px 32px", borderBottom: `1px solid ${T.border}` }}>
        <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: T.text }}>Connector Readiness</h1>
        <p style={{ margin: "6px 0 0", fontSize: 12, color: T.textMuted, maxWidth: 760 }}>
          Which flows each connector implements, and what is stopping the ones that are not moving.
          A PR covers a whole connector, not a single flow — nothing records flow-to-PR — so the PR
          badge is per row and the ticks are per flow.
        </p>
      </header>

      <div style={{ padding: "18px 32px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(172px, 1fr))", gap: 14 }}>
          <StatCard label="Ready to run" value={totals.ready} tone="good" hint="credentials present" />
          <StatCard label="Alpha" value={totals.missing} tone={totals.missing ? "bad" : "default"} hint="no credentials held" />
          <StatCard label="Docs gated" value={totals.gated_docs} hint="registration or partner access" />
          <StatCard label="No docs" value={totals.no_docs} hint="vendor publishes none" />
          <StatCard label="PR open" value={totals.withPr} hint="from the GRACE-auto label" />
          <StatCard label="Not built" value={pipeline.length} hint="merchant wants it, no module yet" />
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
          {(["all", "ready", "missing", "gated_docs", "no_docs", "pipeline"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)} style={chip(filter === f)}>
              {f === "all" ? `all ${allRows.length}` : `${BLOCKER_STYLE[f].label} ${totals[f]}`}
            </button>
          ))}
        </div>

        <Panel title="Connectors × flows" subtitle={`${rows.length} shown · ${flows.length} flows · ● implemented · faded rows are not built yet`}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ borderCollapse: "collapse", fontSize: 11, width: "100%" }}>
              <thead>
                <tr>
                  <th style={{ ...th, textAlign: "left", position: "sticky", left: 0, background: T.bg, zIndex: 2 }}>Connector</th>
                  <th style={{ ...th, textAlign: "left" }}>Status</th>
                  <th style={{ ...th, textAlign: "left" }}>Merchant</th>
                  {flows.map((f) => (
                    <th key={f} style={{ ...th, writingMode: "vertical-rl", transform: "rotate(180deg)", height: 92 }} title={f}>
                      {f}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const b = BLOCKER_STYLE[r.blocker];
                  const pr = prs.get(r.name.toLowerCase());
                  const has = new Set(r.flows);
                  return (
                    <tr key={r.name} style={{ opacity: r.blocker === "pipeline" ? 0.72 : 1 }}>
                      <td style={{ ...td, position: "sticky", left: 0, background: T.bg, fontWeight: 600, whiteSpace: "nowrap" }}
                          title={r.notes ?? undefined}>
                        {r.name}
                      </td>
                      <td style={{ ...td, whiteSpace: "nowrap" }}>
                        <span title={b.title} style={{ padding: "2px 7px", borderRadius: 999, fontSize: 10, color: b.fg, background: b.bg }}>
                          {b.label}
                        </span>
                        {r.docsUrl && (
                          <a href={r.docsUrl} target="_blank" rel="noreferrer" title={r.docsUrl}
                             style={{ marginLeft: 6, fontSize: 10, color: T.textMuted, textDecoration: "none" }}>docs</a>
                        )}
                        {pr && (
                          <a href={pr.pr.url} target="_blank" rel="noreferrer"
                             title={`PR #${pr.pr.number} — ${pr.state}`}
                             style={{ marginLeft: 6, fontSize: 10, color: T.textMuted, textDecoration: "none" }}>
                            #{pr.pr.number}{pr.pr.draft ? " draft" : ""}
                          </a>
                        )}
                      </td>
                      <td style={{ ...td, whiteSpace: "nowrap", fontSize: 10, color: T.textMuted }}>
                        {r.merchant ?? ""}
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
