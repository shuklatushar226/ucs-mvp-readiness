"""UCS-only capability signals for the MVP dashboard.

HARD RULE: nothing in this file may read the separate hyperswitch repo. UCS and
hyperswitch are different codebases with different connector implementations, so
a hyperswitch capability says nothing about the UCS connector of the same name.
build_mvp.py asserts this.

Every signal here is derived from UCS source text. The field probe
(data/field_probe/) is deliberately NOT a scoring source — it records whether a
request could be BUILT, not what is implemented.
"""

from __future__ import annotations

import json
import os
import re
from pathlib import Path

# The UCS checkout to read. Set UCS_ROOT when the generator runs outside the
# prism tree (the CI refresh points it at a throwaway sparse clone). The
# parents[3] fallback keeps an in-repo run working with no environment at all.
REPO_ROOT = Path(os.environ.get("UCS_ROOT") or Path(__file__).resolve().parents[3])
CONNECTORS = REPO_ROOT / "crates/integrations/connector-integration/src/connectors"
SPECS = REPO_ROOT / "crates/internal/integration-tests/src/connector_specs"

YES, NO, UNKNOWN, NA = "yes", "no", "unknown", "na"


def connector_set() -> list:
    """The canonical connector set. `connector_specs/` dirs and `*.rs` files match
    exactly, and extract_flows.assert_healthy cross-checks that they still do."""
    return sorted(p.stem for p in CONNECTORS.glob("*.rs") if p.stem != "macros")


def _sources(name: str) -> str:
    """A connector's full source: its .rs plus everything in its subdirectory."""
    parts = []
    top = CONNECTORS / f"{name}.rs"
    if top.is_file():
        parts.append(top.read_text(errors="ignore"))
    sub = CONNECTORS / name
    if sub.is_dir():
        for f in sorted(sub.rglob("*.rs")):
            parts.append(f.read_text(errors="ignore"))
    return "\n".join(parts)


# --- trait-override signals ---------------------------------------------------

_STUB_MARKERS = ("NotImplemented", "not_implemented", "unimplemented!", "WebhooksNotImplemented")


def trait_override(method: str) -> dict:
    """{connector: yes|no} — overrides `method` with a REAL body.

    Overriding is not implementing. 2 of the 9 process_dispute_webhook overrides
    (phonepe, ppro) return WebhooksNotImplemented with every parameter
    underscore-prefixed. Counting those would overstate dispute support by 29%.
    """
    out = {}
    for c in connector_set():
        text = _sources(c)
        idx = text.find(f"fn {method}(")
        if idx < 0:
            out[c] = NO
            continue
        body = text[idx : idx + 1600]
        # Cut at the end of the fn so we don't read the next one.
        end = body.find("\n    }")
        if end > 0:
            body = body[:end]
        out[c] = NO if any(m in body for m in _STUB_MARKERS) else YES
    return out


# --- source-pattern signals ---------------------------------------------------

def code_signal(pattern: str, reject_pattern: str | None = None) -> dict:
    """{connector: yes|no|unknown} from source-text patterns.

    `pattern` proves support. `reject_pattern` proves the opposite. A connector
    matching neither is UNKNOWN — never silently NO, because "the source does
    not say" and "the source says no" are different facts.

    Rejection is checked FIRST and wins. A connector can both name a capability
    and refuse it: tsys binds the network transaction id and then assigns it to
    `_cit_reference`, never sending it — its own comment says "not sent to TSYS
    today". Checking the positive pattern first would score that as support.
    """
    rx = re.compile(pattern)
    rej = re.compile(reject_pattern) if reject_pattern else None
    out = {}
    for c in connector_set():
        text = _sources(c)
        if rej and rej.search(text):
            out[c] = NO
        elif rx.search(text):
            out[c] = YES
        else:
            out[c] = UNKNOWN
    return out


def flows_signal(flows: dict, wanted, mode: str = "any", buckets: dict | None = None) -> dict:
    """{connector: yes|no|na} from the extracted flow matrix.

    Flow declarations partition the whole fleet exhaustively, so absence is a
    provable answer rather than an unknown. But absence has TWO meanings, and the
    macro that generates these stubs distinguishes them in its own doc: flows the
    connector "does not yet implement (not_implemented)" versus ones it "does not
    support at all (not_supported)". They even raise different runtime errors —
    connector_flow_not_implemented vs connector_flow_not_supported.

    Only the first is work. The second is the processor lacking the capability, so
    it is reported NA and excluded from scoring: charging a connector effort for a
    refund API its processor does not have would make the backlog fiction.

    NA rules follow attainability:
      mode "any" — NA only if EVERY wanted flow is not_supported. If even one is
                   merely not_implemented, implementing that one satisfies it.
      mode "all" — NA if ANY wanted flow is not_supported, since the capability
                   can then never be completed however much work is done.
    """
    want = [wanted] if isinstance(wanted, str) else list(wanted)
    out = {}
    for c, have in flows.items():
        hit = [w in have for w in want]
        if all(hit) if mode == "all" else any(hit):
            out[c] = YES
            continue
        if buckets:
            unsup = {w: c in buckets.get(w, {}).get("not_sup", ()) for w in want}
            if mode == "all":
                blocked = any(unsup.values())
            else:
                missing = [w for w in want if w not in have]
                blocked = bool(missing) and all(unsup[w] for w in missing)
            if blocked:
                out[c] = NA
                continue
        out[c] = NO
    return out


def code_unless(reject_pattern: str) -> dict:
    """{connector: yes|no} — YES unless the source explicitly refuses.

    For capabilities where the UCS default IS the capability. CaptureMethod
    defaults to Automatic in Rust, so "supports auto capture" is the absence of
    a rejection rather than a positive assertion — stated as such on the
    dashboard so nobody reads a near-total count as that many positive confirmations.
    """
    rej = re.compile(reject_pattern)
    return {c: (NO if rej.search(_sources(c)) else YES) for c in connector_set()}


def field_populated(field: str) -> dict:
    """{connector: yes|no} — does the connector ever set `field` to a real value?

    Written as code, not a regex: `field:\\s*(?!None)` looks right and is wrong,
    because `\\s*` can match zero characters and the lookahead then succeeds at
    the space before `None`. That scored nearly every connector as populating
    network_advice_code when the true number is 8.

    Two population idioms both count:
      - struct literal:  `network_advice_code: response.advice_code`
      - let binding then shorthand init, which is what checkout, cybersource,
        barclaycard and bankofamerica use:
            let network_advice_code = processor_information.as_ref()...;
            ... ErrorResponse { network_advice_code, .. }
        A struct-literal-only regex sees just the `: None` sites and scores all
        four as NO.

    JSON test fixtures (`"network_advice_code": null`) are excluded — razorpay's
    only occurrences are fixtures, so it is a NO despite three textual hits.
    """
    lit = re.compile(rf"(?<![\"']){re.escape(field)}\s*:\s*([A-Za-z_][\w:]*)")
    binding = re.compile(rf"\blet\s+{re.escape(field)}\s*=")
    out = {}
    for c in connector_set():
        src = _sources(c)
        vals = {m.group(1) for m in lit.finditer(src)}
        out[c] = YES if (vals - {"None"}) or binding.search(src) else NO
    return out


_AUTH_FLOWS = ("PreAuthenticate", "Authenticate", "PostAuthenticate")

# 3DS protocol artifacts — names that only appear when a connector actually
# speaks the 3DS protocol (not the generic word "authentication").
_TDS_ARTIFACT = re.compile(
    r"acs_url|acsUrl|\bpa_?req\b|\bpa_?res\b|three_?ds_server|threeDSServer"
    r"|\bcavv\b|ds_trans|challenge_?(?:url|request|mandated)|three_?ds|3ds",
    re.I,
)
_MIN_ARTIFACTS = 10


def native_three_ds(flows: dict) -> dict:
    """{connector: yes|no} — the connector PERFORMS the authentication itself.

    Two structural conditions, both required:

      1. it implements one of the 3DS RPCs (PreAuthenticate / Authenticate /
         PostAuthenticate), taken from the compiler-forced flow partition; and
      2. its source carries real 3DS protocol artifacts.

    Condition (2) is not decoration. The auth RPCs are a GENERIC pre/post-processing
    channel, not a 3DS-only one, and four connectors use them for something else:
    flywire runs a hosted-checkout iframe through Authenticate, grabpay a charge-init,
    globalpay a "Confirm Transaction", kount a risk check. Those four score 0-1
    artifacts against 38-370 for every genuine 3DS connector — a cliff, so the split
    is not a threshold judgement call.

    Deliberately NOT counted: connectors that fold 3DS into Authorize with no RPC
    (adyen, stripe, checkout...). Their artifact counts slide smoothly from 1 to 19
    with no cliff, so any cutoff would be a knob, not a measurement.
    """
    impl = flows_signal(flows, list(_AUTH_FLOWS), "any")
    out = {}
    for c in connector_set():
        real = len(_TDS_ARTIFACT.findall(_sources(c))) >= _MIN_ARTIFACTS
        out[c] = YES if impl.get(c) == YES and real else NO
    return out


def external_three_ds() -> dict:
    """{connector: yes|no} — the connector ACCEPTS a 3DS result authenticated
    elsewhere, rather than running the challenge itself.

    UCS carries that result in the typed proto message AuthenticationData
    (eci, cavv, threeds_server_transaction_id, ds_transaction_id, trans_status),
    so the signal is a read of that field off the request — e.g.
    `item.router_data.request.authentication_data` in checkout/transformers.rs.

    A typed field read, so this is exact: no keyword threshold, and requiring the
    `request.` receiver excludes both `ucaf_authentication_data` (Mastercard UCAF,
    an unrelated field) and `authentication_data: None` test fixtures.
    """
    pat = re.compile(r"request\s*\.\s*authentication_data\b")
    return {c: (YES if pat.search(_sources(c)) else NO) for c in connector_set()}


def git_provenance(root: Path) -> dict:
    """Branch / commit / dirtiness of the UCS checkout these numbers came from.

    `path` is the checkout's directory NAME, never its full path: this lands in
    a public build artifact, and the absolute path of whoever ran the generator
    is not something to publish.
    """
    import subprocess

    def git(*args):
        try:
            return subprocess.run(["git", "-C", str(root), *args],
                                  capture_output=True, text=True, timeout=10).stdout.strip()
        except Exception:
            return ""

    if not (root / ".git").exists():
        return {"path": root.name, "branch": "", "commit": "", "dirty": None}
    return {
        "path": root.name,
        "branch": git("rev-parse", "--abbrev-ref", "HEAD"),
        "commit": git("rev-parse", "--short", "HEAD"),
        "committedAt": git("log", "-1", "--format=%ad", "--date=short"),
        "dirty": bool(git("status", "--porcelain")),
    }
