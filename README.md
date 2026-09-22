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

`.github/workflows/refresh.yml` runs daily at 03:17 UTC:

1. sparse-clones prism `main` (~25 MB of the ~160 MB repo),
2. regenerates `src/data/mvp.json`,
3. commits **only if the data moved** — `generatedAt` changes every run, so the
   comparison deliberately ignores it, otherwise the site would rebuild daily
   whether or not anything changed,
4. builds and deploys to Netlify.

The commit doubles as the repository activity that stops GitHub disabling the
schedule after 60 days idle. prism is public, so the clone needs no credentials.

The deploy uses two repo secrets, `NETLIFY_AUTH_TOKEN` and `NETLIFY_SITE_ID`,
rather than a Netlify↔GitHub link — that avoids the one-time UI authorization
and keeps the build on GitHub's runners. The workflow triggers on `schedule` and
`workflow_dispatch` only, never `pull_request`, so a fork PR can never reach
those secrets. If you would rather hold no token here, link the repo in the
Netlify UI instead and delete the last three steps; `netlify.toml` already
carries the build settings.

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
