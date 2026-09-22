# UCS MVP Readiness

Connector × capability readiness matrix for [juspay/hyperswitch-prism][prism] (UCS),
derived from Rust source and rebuilt daily.

**Live:** https://ucs-mvp-readiness.netlify.app

- `/mvp` — the matrix: 119 connectors × 14 capabilities
- `/mvp/metrics` — numeric rollup

## Where the numbers come from

Everything is read out of the UCS Rust source. Nothing is hand-maintained, and
nothing is read from the separate `hyperswitch` repo — UCS and hyperswitch have
different connector implementations, so a hyperswitch capability says nothing
about the UCS connector of the same name. `build_mvp.py` asserts this.

The backbone is `ConnectorServiceTrait`, which has **no default methods**. The
compiler therefore forces every connector into exactly one of three buckets per
flow — implemented, `not_implemented:`, or `not_supported:` — and those buckets
must account for the entire fleet. `extract_flows.py` asserts that they do, which
is what caught the fleet growing 108 → 113 → 119 without anyone noticing.

**12 of 14 capabilities are `proven`** (a compiler-enforced declaration or a typed
field read) and only those are scored. The other 2 are `best-effort`: shown
because they are useful, excluded from scoring so they cannot contaminate a
provable number.

The field probe (`data/field_probe/`) is deliberately **not** a scoring source. It
records whether a request could be *built*, not whether the processor accepts it —
four connectors with permissive builders falsely probe as supporting 103 payment
methods.

## Refresh

`.github/workflows/refresh.yml` runs daily at 03:17 UTC: sparse-clones prism
`main` (~25 MB of the ~160 MB repo), regenerates `src/data/mvp.json`, and commits
only if the data moved. That push triggers the Netlify build.

No secrets and no manual step — prism is public, and the commit doubles as the
repository activity that stops GitHub disabling the schedule after 60 days idle.

To run it by hand: **Actions → Refresh MVP data from prism main → Run workflow**.

## Local development

```bash
npm install
npm run dev                                   # serves the committed data

UCS_ROOT=/path/to/hyperswitch-prism npm run refresh   # regenerate from a checkout
npm run build                                 # tsc -b && vite build -> dist/
```

`UCS_ROOT` selects the UCS checkout to read; it defaults to this repo's parent,
which is only useful if you dropped it inside a prism tree. Output always goes to
this repo's `src/data/mvp.json`, never into `UCS_ROOT`.

[prism]: https://github.com/juspay/hyperswitch-prism
