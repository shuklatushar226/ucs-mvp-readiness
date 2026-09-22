import { Link, useLocation } from "react-router-dom";
import { T } from "../theme";
import mvpData from "../data/mvp.json";

// mvp.json (~100 KB) rather than connectors.json (1,657 KB): the shared layout
// pulled the larger file into every route just to print two integers.
const CONNECTOR_COUNT = (mvpData as { connectors: unknown[] }).connectors.length;
const CAPABILITY_COUNT = (mvpData as { capabilities: unknown[] }).capabilities.length;

const SIDEBAR_WIDTH = 240;

// Inline SVG rather than emoji: emoji are rendered by the OS, so they change
// shape per platform, ignore the theme colour, and read as a hobby page.
const Icon = {
  matrix: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="3" width="7" height="7" rx="1.6" stroke="currentColor" strokeWidth="1.7" />
      <rect x="14" y="3" width="7" height="7" rx="1.6" stroke="currentColor" strokeWidth="1.7" />
      <rect x="3" y="14" width="7" height="7" rx="1.6" stroke="currentColor" strokeWidth="1.7" />
      <rect x="14" y="14" width="7" height="7" rx="1.6" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  ),
  metrics: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  ),
};

interface NavItem {
  id: string;
  label: string;
  icon: JSX.Element;
  path: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: "mvp", label: "MVP Readiness", icon: Icon.matrix, path: "/mvp" },
  { id: "mvp-metrics", label: "MVP Metrics", icon: Icon.metrics, path: "/mvp/metrics" },
];

export function NavigationSidebar() {
  const location = useLocation();
  const currentPath = location.pathname;

  // The nav entry that owns the current route: an exact match, else the longest
  // path the route sits under. Without the "longest" rule, /mvp/metrics would
  // highlight both "MVP Readiness" (/mvp) and "MVP Metrics".
  const activePath = NAV_ITEMS.map((i) => i.path)
    .filter((path) => currentPath === path || (path !== "/" && currentPath.startsWith(path + "/")))
    .sort((a, b) => b.length - a.length)[0];

  return (
    <aside
      style={{
        width: SIDEBAR_WIDTH,
        background: T.bgSidebar,
        borderRight: `1px solid ${T.border}`,
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        position: "fixed",
        left: 0,
        top: 0,
        zIndex: 10,
      }}
    >
      <div style={{ padding: "22px 20px 18px", borderBottom: `1px solid ${T.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 9,
              background: T.accent,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden>
              <circle cx="12" cy="12" r="8.4" stroke="#fff" strokeWidth="2.4" />
              <path d="M12 3.6a8.4 8.4 0 0 1 0 16.8" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
            </svg>
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 14.5, fontWeight: 700, color: T.text, letterSpacing: T.tight, lineHeight: 1.2 }}>
              UCS MVP
            </div>
            <div style={{ fontSize: 10.5, color: T.textSubtle, marginTop: 2 }}>connector readiness</div>
          </div>
        </div>
      </div>

      <nav style={{ flex: 1, padding: "16px 12px" }}>
        {NAV_ITEMS.map((item) => {
          // Longest matching path wins, so a nested item (/mvp/metrics) does not
          // also light up its parent (/mvp).
          const isActive = item.path === activePath;
          return (
            <Link
              key={item.id}
              to={item.path}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 11,
                padding: "9px 12px",
                marginBottom: 3,
                borderRadius: 8,
                textDecoration: "none",
                fontSize: 13,
                fontWeight: isActive ? 600 : 500,
                color: isActive ? T.text : T.textMuted,
                background: isActive ? T.accentSoft : "transparent",
                boxShadow: isActive ? `inset 0 0 0 1px ${T.border}` : undefined,
                transition: "background 120ms ease, color 120ms ease",
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.background = "rgba(255,255,255,0.04)";
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.background = "transparent";
              }}
            >
              <span style={{ display: "flex", color: isActive ? T.accent : T.textSubtle }}>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div style={{ padding: "16px 20px", borderTop: `1px solid ${T.border}`, fontSize: 11, color: T.textSubtle }}>
        <div style={{ color: T.textMuted, fontWeight: 500 }}>hyperswitch-prism</div>
        <div style={{ marginTop: 4 }}>
          {`${CONNECTOR_COUNT} connectors · ${CAPABILITY_COUNT} capabilities`}
        </div>
      </div>
    </aside>
  );
}

export function SidebarLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: T.bg }}>
      <NavigationSidebar />
      <main
        style={{
          marginLeft: SIDEBAR_WIDTH,
          flex: 1,
          // A flex item defaults to min-width:auto, so a wide child (the MVP
          // matrix) stretches main past the viewport instead of scrolling
          // inside its own panel, which clipped the header and stat cards.
          minWidth: 0,
          minHeight: "100vh",
        }}
      >
        {children}
      </main>
    </div>
  );
}
