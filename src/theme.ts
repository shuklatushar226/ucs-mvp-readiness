/**
 * Design tokens, measured from hyperswitch.io rather than estimated: a
 * getComputedStyle sweep over every element on the page, ranked by frequency.
 * Plus Jakarta Sans covered 3,095 elements; rgba(67,78,94,.4) was the only
 * border colour used in volume; #2298E7 the dominant accent.
 *
 * Token NAMES are unchanged from the previous warm palette so every call site
 * keeps working — only the values moved.
 */
export const T = {
  // Surfaces. Dark UIs separate planes with hairlines and lighter elevation,
  // not shadows — you cannot cast a shadow darker than #000.
  bg: "#000000",
  bgElev: "#0D0C0D",
  bgSidebar: "#080808",
  bgRight: "#121214",
  bgRightHeader: "#17171A",

  border: "rgba(67, 78, 94, 0.4)",
  borderStrong: "rgba(67, 78, 94, 0.85)",

  // 4-step text ramp, same as the site's.
  text: "#FFFFFF",
  textMuted: "#AFAFAF",
  textSubtle: "#777E90",

  accent: "#2298E7",
  accentSoft: "rgba(34, 152, 231, 0.14)",
  accentViolet: "#8161FF",

  // Status colours are ours — the site has no equivalent. Each is picked to
  // clear WCAG AA on #0D0C0D, which the old cream-tuned palette would not.
  success: "#3DD68C",
  successSoft: "rgba(61, 214, 140, 0.13)",
  warn: "#F5A524",
  warnSoft: "rgba(245, 165, 36, 0.13)",
  error: "#F31260",
  errorSoft: "rgba(243, 18, 96, 0.13)",

  codeBg: "#17171A",

  // Kept so call sites compile; on black these read as a faint lift, not a drop.
  shadow: "0 1px 2px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(67, 78, 94, 0.18)",
  shadowLg: "0 8px 30px rgba(0, 0, 0, 0.75)",

  // Typography
  font: '"Plus Jakarta Sans", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
  /** The signature look: -0.7px at 28px on hyperswitch.io. */
  tight: "-0.025em",
  tighter: "-0.03em",
};
