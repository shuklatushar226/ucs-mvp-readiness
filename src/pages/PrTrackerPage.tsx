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

export function PrTrackerPage() {
  const { ledger, inReview, merged, blockedPrs, blockedLabel } = data;
  const rows = ledger?.rows ?? [];
  // Blocked is not a kind of failure — it is work that stopped needing compute
  // and started needing a person. It gets its own column so it cannot hide.
  const inProgress = rows.filter((r) => r.status !== "blocked");
  const blocked = rows.filter((r) => r.status === "blocked");

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
            PR Tracker
          </h1>
          <div style={{ fontSize: 12, color: T.textMuted, marginTop: 4 }}>
            {`${data.repo} · PRs labelled GRACE-auto`}
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
          <StatCard
            label="Blocked runs"
            value={ledger ? blocked.length : "—"}
            tone={blocked.length ? "bad" : "default"}
            hint="stopped before raising a PR"
          />
          <StatCard
            label="Blocked PRs"
            value={blockedPrs.length}
            tone={blockedPrs.length ? "bad" : "default"}
            hint={`labelled ${blockedLabel}`}
          />
          <StatCard label="In review" value={inReview.length} hint="open, labelled GRACE-auto" />
          <StatCard label="Merged" value={merged.length} tone="good" hint="labelled GRACE-auto" />
        </div>

        <Panel title="In progress" subtitle="connectors queued or running right now">
          {!ledger ? (
            <Empty note="No run ledger was present when this page was built. The ledger (task.json) is gitignored and lives on the machine running GRACE, so it is absent in CI — this is not the same as nothing being in progress." />
          ) : inProgress.length === 0 ? (
            <Empty note={`Ledger for run ${ledger.runId ?? "?"} has nothing queued or running.`} />
          ) : (
            inProgress.map((r) => (
              <div
                key={r.connector}
                style={{ display: "flex", alignItems: "baseline", gap: 10, padding: "8px 0", borderBottom: `1px solid ${T.border}` }}
              >
                <span style={{ fontSize: 12, fontWeight: 600, color: T.text, minWidth: 140 }}>{r.connector}</span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    color:
                      r.status === "running" ? T.accent : r.status === "blocked" ? T.error : T.textSubtle,
                  }}
                >
                  {r.status}
                </span>
                {r.slot != null && (
                  <span style={{ fontSize: 10, color: T.textSubtle }}>slot {r.slot}</span>
                )}
                {r.retries > 0 && <span style={{ fontSize: 11, color: T.warn }}>{r.retries} retries</span>}
                <span style={{ marginLeft: "auto", fontSize: 10.5, color: T.textSubtle }}>{fmtDay(r.startedAt)}</span>
              </div>
            ))
          )}
        </Panel>

        {blocked.length > 0 && (
          <Panel title="Blocked runs" subtitle="a run stopped before it raised a PR — not retried automatically">
            {blocked.map((r) => (
              <div
                key={r.connector}
                style={{ display: "flex", alignItems: "baseline", gap: 10, padding: "8px 0", borderBottom: `1px solid ${T.border}` }}
              >
                <span style={{ fontSize: 12, fontWeight: 600, color: T.text, minWidth: 140 }}>{r.connector}</span>
                {r.slot != null && <span style={{ fontSize: 10, color: T.textSubtle }}>slot {r.slot}</span>}
                <span style={{ fontSize: 11.5, color: T.warn, flex: 1, minWidth: 0 }}>{r.error ?? "no reason recorded"}</span>
              </div>
            ))}
          </Panel>
        )}

        <Panel
          title="Blocked PRs"
          subtitle={`open pull requests labelled ${blockedLabel}`}
        >
          {blockedPrs.length === 0 ? (
            <Empty note={`No open pull request carries the ${blockedLabel} label.`} />
          ) : (
            blockedPrs.map((p) => <PrRow key={p.number} pr={p} />)
          )}
        </Panel>

        <Panel title="In review" subtitle={`open PRs labelled GRACE-auto, excluding those marked ${blockedLabel}`}>
          {inReview.length === 0 ? <Empty note="No open GRACE pull requests." /> : inReview.map((p) => <PrRow key={p.number} pr={p} />)}
        </Panel>

        <Panel title="Merged" subtitle="labelled GRACE-auto">
          {merged.length === 0 ? <Empty note="No GRACE-auto pull request has merged yet." /> : merged.map((p) => <PrRow key={p.number} pr={p} />)}
        </Panel>

        <div style={{ fontSize: 11, color: T.textSubtle }}>
          {`Generated ${data.generatedAt}`}
        </div>
      </div>
    </SidebarLayout>
  );
}
