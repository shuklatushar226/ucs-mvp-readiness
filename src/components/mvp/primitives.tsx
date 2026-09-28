import type React from "react";
import { T } from "../../theme";
import type { MvpCellState, MvpTier } from "../../types/mvp";

/**
 * Shared visual primitives for the MVP dashboards.
 *
 * ponytail: charts are hand-rolled SVG/flex rather than a charting dependency.
 * A donut is one circle with stroke-dasharray and a bar is a div; adding
 * recharts (~500KB into an already 1.6MB bundle) only pays off if axes,
 * tooltips or time-series land here later.
 */

export const CELL_STYLE: Record<MvpCellState, { bg: string; fg: string; mark: string; label: string }> = {
  met: { bg: T.successSoft, fg: T.success, mark: "✓", label: "Implemented" },
  gap: { bg: T.warnSoft, fg: T.warn, mark: "⚠", label: "Not implemented" },
  // The processor does not offer this at all, so it is not work outstanding.
  // Excluded from the score rather than counted against the connector.
  na: { bg: T.bgRight, fg: T.textSubtle, mark: "—", label: "Not supported by the processor" },
  // Deliberately distinct from a gap: the source does not say either way.
  unknown: { bg: T.bgRight, fg: T.textMuted, mark: "?", label: "Unknown — source is silent" },
  // A rubric row duplicating another; shown for fidelity, never scored.
  alias: { bg: "transparent", fg: T.textSubtle, mark: "≡", label: "Alias of another field" },
};

/** Connector-level tier. Deliberately quiet: it sits on all 118 rows, so it
 *  marks the row without competing with the capability cells beside it. */
export const TIER_STYLE: Record<MvpTier, { fg: string; bg: string; label: string; title: string }> = {
  sandbox_tested: {
    fg: T.success,
    bg: T.successSoft,
    label: "sandbox",
    title: "Sandbox tested — credentials are held for this connector",
  },
  alpha: {
    fg: T.accentViolet,
    bg: "rgba(129, 97, 255, 0.14)",
    label: "alpha",
    title: "Alpha — no credentials held, not certified against a live sandbox",
  },
  no_docs: {
    fg: T.textSubtle,
    bg: "rgba(119, 126, 144, 0.14)",
    label: "no docs",
    title:
      "No docs — the field probe reports no supported flow, so the docs generator emits no page for this connector",
  },
};

export function TierBadge({ tier }: { tier: MvpTier }) {
  const t = TIER_STYLE[tier];
  if (!t) return null;
  return (
    <span
      title={t.title}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        fontSize: 9.5,
        fontWeight: 600,
        letterSpacing: 0.3,
        textTransform: "uppercase",
        // No fill or border: this sits on every one of 118 rows, so a filled
        // pill competes with the capability cells instead of annotating them.
        // A dot carries the colour; the word carries the meaning.
        color: T.textSubtle,
        flexShrink: 0,
      }}
    >
      <span
        style={{
          width: 5,
          height: 5,
          borderRadius: 999,
          background: t.fg,
          flexShrink: 0,
        }}
      />
      {t.label}
    </span>
  );
}

export function Panel({
  title,
  subtitle,
  right,
  children,
  pad = 18,
}: {
  title?: string;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  pad?: number;
}) {
  return (
    <section
      style={{
        background: T.bgElev,
        border: `1px solid ${T.border}`,
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      {(title || right) && (
        <header
          style={{
            padding: "13px 18px",
            borderBottom: `1px solid ${T.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div>
            {title && (
              <h2 style={{ margin: 0, fontSize: 13.5, fontWeight: 600, letterSpacing: T.tight, color: T.text }}>
                {title}
              </h2>
            )}
            {subtitle && (
              <div style={{ fontSize: 11, color: T.textMuted, marginTop: 3 }}>{subtitle}</div>
            )}
          </div>
          {right}
        </header>
      )}
      <div style={{ padding: pad }}>{children}</div>
    </section>
  );
}

export function StatCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "default" | "good" | "warn" | "bad";
}) {
  const color =
    tone === "good" ? T.success : tone === "warn" ? T.warn : tone === "bad" ? T.error : T.text;
  return (
    <div
      style={{
        background: T.bgElev,
        border: `1px solid ${T.border}`,
        borderRadius: 12,
        padding: "17px 20px 19px",
        flex: "1 1 170px",
        minWidth: 150,
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: T.textSubtle,
          textTransform: "uppercase",
          letterSpacing: 0.9,
        }}
      >
        {label}
      </div>
      {/* Oversized numeral under a small uppercase label — the site's own
          stat treatment ("99.999% Reliability", "2000 TPS"). */}
      <div
        style={{
          fontSize: 38,
          fontWeight: 700,
          color,
          marginTop: 9,
          lineHeight: 1.05,
          letterSpacing: T.tighter,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </div>
      {hint && <div style={{ fontSize: 11, color: T.textSubtle, marginTop: 7 }}>{hint}</div>}
    </div>
  );
}

/** Percentage ring. One SVG circle, stroke-dasharray does the work. */
export function Donut({
  pct,
  size = 132,
  stroke = 13,
  caption,
}: {
  pct: number;
  size?: number;
  stroke?: number;
  caption?: string;
}) {
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const color = pct >= 80 ? T.success : pct >= 50 ? T.warn : T.accent;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      <div style={{ position: "relative", width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={T.border} strokeWidth={stroke} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${(pct / 100) * circumference} ${circumference}`}
          />
        </svg>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span
            style={{
              fontSize: 30,
              fontWeight: 700,
              color: T.text,
              letterSpacing: T.tighter,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {pct}%
          </span>
        </div>
      </div>
      {caption && (
        <div style={{ fontSize: 11, color: T.textMuted, textAlign: "center" }}>{caption}</div>
      )}
    </div>
  );
}

/** Thin progress bar used inside table rows. */
export function ProgressBar({ pct, width = 84 }: { pct: number; width?: number }) {
  const color = pct >= 80 ? T.success : pct >= 50 ? T.warn : T.accent;
  return (
    <div
      style={{
        width,
        height: 6,
        background: "rgba(255,255,255,0.09)",
        borderRadius: 999,
        overflow: "hidden",
        flexShrink: 0,
      }}
    >
      <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 999 }} />
    </div>
  );
}

/** Labelled horizontal bar; `max` scales the fill. */
export function BarRow({
  label,
  value,
  max,
  suffix,
  color,
  onClick,
  title,
}: {
  label: string;
  value: number;
  max: number;
  suffix?: string;
  color?: string;
  onClick?: () => void;
  title?: string;
}) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div
      title={title}
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "3px 0",
        cursor: onClick ? "pointer" : "default",
      }}
    >
      <div
        style={{
          width: 186,
          fontSize: 11.5,
          color: T.text,
          textAlign: "right",
          flexShrink: 0,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </div>
      <div style={{ flex: 1, height: 15, background: T.bgRight, borderRadius: 4, overflow: "hidden" }}>
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: color ?? T.accent,
            borderRadius: 4,
            transition: "width .3s ease",
          }}
        />
      </div>
      <div
        style={{
          width: 62,
          fontSize: 11.5,
          fontWeight: 600,
          color: T.textMuted,
          flexShrink: 0,
        }}
      >
        {value}
        {suffix}
      </div>
    </div>
  );
}

export function Legend({ states }: { states?: MvpCellState[] }) {
  // Only legend the states actually present. Every cell is now a provable
  // met/gap, so advertising "unknown" and "alias" invited the reader to look
  // for grey cells that no longer exist.
  const shown: MvpCellState[] = states ?? ["met", "gap", "na"];
  return (
    <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
      {shown.map((s) => (
        <span key={s} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: T.textMuted }}>
          <span
            style={{
              width: 15,
              height: 15,
              borderRadius: 3,
              background: CELL_STYLE[s].bg,
              color: CELL_STYLE[s].fg,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 10,
              fontWeight: 700,
            }}
          >
            {CELL_STYLE[s].mark}
          </span>
          {CELL_STYLE[s].label}
        </span>
      ))}
    </div>
  );
}


