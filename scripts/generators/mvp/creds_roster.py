#!/usr/bin/env python3
"""Snapshot which connectors we hold credentials for.

The dashboard regenerates in GitHub Actions from a sparse clone of the UCS repo
(.github/workflows/refresh.yml), so it can never see a local credentials file.
This writes a committed, names-only snapshot that the generator reads instead.

Values are NEVER read. Only the connector name and whether its entry is
non-empty leave this script — run it with --verify to prove that.

  python3 creds_roster.py [--creds ~/.hyperswitch/creds.json] [--verify]
"""
import argparse, datetime, json, pathlib, re, sys

HERE = pathlib.Path(__file__).resolve().parent
OUT = HERE / "creds-roster.json"
EXTRA = HERE / "creds-extra.json"
DEFAULT_CREDS = pathlib.Path.home() / ".hyperswitch" / "creds.json"

# Anything that looks like a credential. Used to prove the output is clean.
SECRETISH = re.compile(
    r"api_key|api_secret|secret|password|passwd|token|private|public_key|"
    r"auth_type|key1|key2|certificate|merchant_id|connector_account_details",
    re.I,
)


def has_creds(entry) -> bool:
    """True when the entry actually carries credentials.

    A bare {} is a placeholder, not a credential (datatrans, jpmorgan). Multi
    account entries nest under connector_1/connector_2; one non-empty account is
    enough. Presence is the whole test — the operator's rule is that holding
    creds means the connector works, so nothing here validates their shape.
    """
    if not isinstance(entry, dict) or not entry:
        return False
    accounts = [v for k, v in entry.items() if k.startswith("connector_")] or [entry]
    for acct in accounts:
        if not isinstance(acct, dict):
            continue
        inner = acct.get("connector_account_details", acct)
        if isinstance(inner, dict) and any(k for k in inner if not k.startswith("_")):
            return True
    return False


def extra_names() -> tuple:
    """Connectors credentialed on the box but absent from the local creds file.

    Some credentials only exist in the prism checkouts on the Linux host, so a
    roster built purely from ~/.hyperswitch/creds.json under-reports. The extra
    file carries names and slot numbers, never values.
    """
    try:
        d = json.loads(EXTRA.read_text())
    except (json.JSONDecodeError, OSError):
        return (), {}
    conns = d.get("connectors") or {}
    return tuple(sorted(conns)), {k: (v or {}).get("slots") for k, v in conns.items()}


def build(creds_path: pathlib.Path) -> dict:
    creds = json.loads(creds_path.read_text())
    local = {n for n, e in creds.items() if has_creds(e)}
    extra, slots = extra_names()
    names = sorted(local | set(extra))
    return {
        "_comment": [
            "Connectors we hold credentials for. Names only — no values, ever.",
            "Presence is the signal: holding creds means the connector works.",
            "Regenerate with: python3 scripts/generators/mvp/creds_roster.py",
        ],
        "source": str(creds_path).replace(str(pathlib.Path.home()), "~"),
        "captured_at": datetime.date.today().isoformat(),
        "count": len(names),
        "with_creds": names,
        "from_local_file": sorted(local),
        "from_checkouts": {n: slots.get(n) for n in extra},
    }


def verify(path: pathlib.Path) -> int:
    """Fail loudly if anything credential-shaped reached the snapshot."""
    text = path.read_text()
    hits = sorted(set(SECRETISH.findall(text)))
    data = json.loads(text)
    bad = [n for n in data["with_creds"] if not re.fullmatch(r"[a-z0-9_]+", n)]
    print(f"{path.name}: {data['count']} connectors, {len(text)} bytes")
    print(f"  credential-shaped tokens : {hits or 'none'}")
    print(f"  malformed names          : {bad or 'none'}")
    ok = not hits and not bad
    print("  VERDICT:", "clean" if ok else "DIRTY — do not commit")
    return 0 if ok else 1


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--creds", type=pathlib.Path, default=DEFAULT_CREDS)
    ap.add_argument("--verify", action="store_true")
    a = ap.parse_args()
    if a.verify:
        sys.exit(verify(OUT))
    if not a.creds.exists():
        sys.exit(f"no creds file at {a.creds}")
    OUT.write_text(json.dumps(build(a.creds), indent=2) + "\n")
    print(f"wrote {OUT}")
    sys.exit(verify(OUT))
