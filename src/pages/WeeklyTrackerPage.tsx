import { Link } from "react-router-dom";
import { SidebarLayout } from "../components/NavigationSidebar";
import { Panel, StatCard } from "../components/mvp/primitives";
import { T } from "../theme";
import type { TrackerPr } from "../types/tracker";
import tracker from "../data/tracker.json";
import type { TrackerData } from "../types/tracker";

const data = tracker as unknown as TrackerData;

function fmtDay(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
}

function PrRow({ pr }: { pr: TrackerPr }) {
  return (
    <a
      href={pr.url}
      target="_blank"
      rel="noreferrer"
      style={{
        display: "flex",
        alignItems: "baseline",
        gap: 9,
        padding: "8px 0",
        borderBottom: `1px solid ${T.border}`,
        textDecoration: "none",
        color: "inherit",
      }}
    >
      <span style={{ color: T.textSubtle, fontSize: 11, fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>
        #{pr.number}
      </span>
      {pr.connector && (
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: 0.3,
            color: T.accent,
            flexShrink: 0,
          }}
        >
          {pr.connector}
        </span>
      )}
      <span style={{ fontSize: 12, color: T.textMuted, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {pr.title}
      </span>
      {pr.draft && (
        <span style={{ fontSize: 9.5, fontWeight: 600, textTransform: "uppercase", color: T.warn, flexShrink: 0 }}>
          draft
        </span>
      )}
      <span style={{ fontSize: 10.5, color: T.textSubtle, flexShrink: 0 }}>
        {fmtDay(pr.mergedAt ?? pr.updatedAt)}
      </span>
    </a>
  );
}

function Empty({ note }: { note: string }) {
  return <div style={{ fontSize: 12, color: T.textSubtle, padding: "10px 0" }}>{note}</div>;
}

export function WeeklyTrackerPage() {
  const { ledger, inReview, merged, mergedGrace, weekStart, weekEnd } = data;
  const inProgress = ledger?.rows ?? [];

  return (
    <SidebarLayout>
      <header
        style={{
          padding: "22px 32px",
          borderBottom: `1px solid ${T.border}`,
          background: T.bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 23, fontWeight: 700, letterSpacing: T.tight, color: T.text }}>
            Weekly Tracker
          </h1>
          <div style={{ fontSize: 12, color: T.textMuted, marginTop: 4 }}>
            {`${weekStart} → ${weekEnd} · ${data.repo}`}
          </div>
        </div>
        <Link
          to="/mvp"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            fontSize: 12.5,
            fontWeight: 600,
            color: T.accent,
            textDecoration: "none",
            border: `1px solid ${T.border}`,
            borderRadius: 8,
            padding: "8px 14px",
            background: T.bgElev,
          }}
        >
          Readiness matrix
        </Link>
      </header>

      <div style={{ padding: "20px 32px 40px", display: "flex", flexDirection: "column", gap: 18, minWidth: 0 }}>
        {(!data.prsOk || data.warnings?.length > 0) && (
          <div
            style={{
              border: `1px solid ${T.warn}55`,
              background: T.warnSoft,
              borderRadius: 10,
              padding: "12px 15px",
              fontSize: 12,
              color: T.warn,
            }}
          >
            <strong>PR data is incomplete.</strong> A GitHub query failed when this page was
            built, so the counts below undercount rather than reflect a quiet week.
            <ul style={{ margin: "7px 0 0", paddingLeft: 18 }}>
              {data.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </div>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(172px, 1fr))", gap: 14 }}>
          <StatCard
            label="In progress"
            value={ledger ? inProgress.length : "—"}
            hint={ledger ? `run ${ledger.runId ?? "?"}` : "no run ledger on the builder"}
          />
          <StatCard label="In review" value={inReview.length} hint="open, labelled GRACE-auto" />
          <StatCard label="Merged" value={merged.length} tone="good" hint="this week, all authors" />
          <StatCard label="Merged from GRACE" value={mergedGrace.length} hint="labelled GRACE-auto" />
        </div>

        <Panel title="In progress" subtitle="connectors the batch ledger still has queued or running">
          {!ledger ? (
            <Empty note="No run ledger was present when this page was built. The ledger (task.json) is gitignored and lives on the machine running GRACE, so it is absent in CI — this is not the same as nothing being in progress." />
          ) : inProgress.length === 0 ? (
            <Empty note={`Ledger for run ${ledger.runId ?? "?"} has no queued or running connectors.`} />
          ) : (
            inProgress.map((r) => (
              <div
                key={r.connector}
                style={{ display: "flex", alignItems: "baseline", gap: 10, padding: "8px 0", borderBottom: `1px solid ${T.border}` }}
              >
                <span style={{ fontSize: 12, fontWeight: 600, color: T.text, minWidth: 140 }}>{r.connector}</span>
                <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: r.status === "running" ? T.accent : T.textSubtle }}>
                  {r.status}
                </span>
                {r.retries > 0 && <span style={{ fontSize: 11, color: T.warn }}>{r.retries} retries</span>}
                <span style={{ marginLeft: "auto", fontSize: 10.5, color: T.textSubtle }}>{fmtDay(r.startedAt)}</span>
              </div>
            ))
          )}
        </Panel>

        <Panel title="In review" subtitle="open PRs labelled GRACE-auto">
          {inReview.length === 0 ? <Empty note="No open GRACE pull requests." /> : inReview.map((p) => <PrRow key={p.number} pr={p} />)}
        </Panel>

        <Panel title="Merged" subtitle={`merged between ${weekStart} and now`}>
          {merged.length === 0 ? <Empty note="Nothing merged yet this week." /> : merged.map((p) => <PrRow key={p.number} pr={p} />)}
        </Panel>

        <div style={{ fontSize: 11, color: T.textSubtle }}>
          {`Generated ${data.generatedAt}`}
        </div>
      </div>
    </SidebarLayout>
  );
}
