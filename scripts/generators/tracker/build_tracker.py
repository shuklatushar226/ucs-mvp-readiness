#!/usr/bin/env python3
"""Weekly connector tracker: in progress, in review, merged (Mon -> now).

Three columns, three sources:

  in progress  the GRACE batch ledger (task.json) — rows still queued/running
  in review    OPEN PRs labelled GRACE-auto
  merged       PRs labelled GRACE-auto merged since Monday 00:00 local

Every PR column filters on GRACE-auto. This tracker follows the pipeline's own
work, not the repository's overall throughput.

Both PR columns select on the `GRACE-auto` label and nothing else. `2.8_pr_run.md` applies it on every PR this pipeline
raises, so it marks intent rather than inference — a `feat/grace-*` branch
someone pushed by hand is not a tracked run.

The ledger is gitignored and lives on the machine that ran the batch, so in CI
it is simply absent. That is reported as `ledger: null`, never as "nothing in
progress" — the page must not imply a quiet week when it only lacks the file.

  build_tracker.py --repo juspay/hyperswitch-prism [--ledger ../hyperswitch-prism/task.json]
"""
import argparse, datetime, json, pathlib, subprocess, sys

OUT = pathlib.Path(__file__).resolve().parents[3] / "src" / "data" / "tracker.json"


WARNINGS: list[str] = []


def gh(args):
    """Run gh and parse JSON. Returns None when gh is unavailable or errors.

    Every failure is recorded in WARNINGS and surfaced on the page. An empty
    list that means "the query failed" must never render the same as one that
    means "nothing matched".
    """
    try:
        r = subprocess.run(["gh", *args], capture_output=True, text=True, timeout=180)
    except FileNotFoundError:
        WARNINGS.append("gh CLI not installed — PR columns could not be built")
        return None
    except subprocess.TimeoutExpired:
        WARNINGS.append(f"gh timed out: {' '.join(args[:4])}")
        return None
    if r.returncode != 0:
        msg = r.stderr.strip().splitlines()[-1][:160] if r.stderr.strip() else f"exit {r.returncode}"
        WARNINGS.append(f"gh failed ({' '.join(args[:4])}): {msg}")
        return None
    try:
        return json.loads(r.stdout)
    except json.JSONDecodeError:
        WARNINGS.append(f"gh returned unparseable JSON: {' '.join(args[:4])}")
        return None


def week_start():
    t = datetime.date.today()
    return t - datetime.timedelta(days=t.weekday())


GRACE_LABEL = "GRACE-auto"


def is_grace(pr):
    """Label only, by operator decision.

    Author 10xGRACE and the feat/grace-* branch glob would widen this from 10
    PRs to 36, but they also sweep in runs nobody chose to track. The label is
    the deliberate marker: 2.8_pr_run.md now applies it on every PR the pipeline
    raises, so it is authoritative going forward rather than a manual habit.
    """
    return any(l.get("name") == GRACE_LABEL for l in pr.get("labels") or [])


def connector_of(pr):
    """Best-effort connector name from a GRACE branch or a [Bracketed] title."""
    ref = pr.get("headRefName") or ""
    if ref.startswith("feat/grace-"):
        return ref[len("feat/grace-"):].rsplit("-", 1)[0] or None
    title = pr.get("title") or ""
    if "[" in title and "]" in title:
        return title[title.index("[") + 1: title.index("]")].strip().lower() or None
    return None


def slim(pr):
    return {
        "number": pr.get("number"),
        "title": pr.get("title"),
        "url": pr.get("url"),
        "branch": pr.get("headRefName"),
        "connector": connector_of(pr),
        "draft": pr.get("isDraft", False),
        "author": (pr.get("author") or {}).get("login"),
        "updatedAt": pr.get("updatedAt"),
        "mergedAt": pr.get("mergedAt"),
    }


def read_ledger(path):
    """Ledger rows still outstanding. None when the file is absent."""
    if not path or not path.exists():
        return None
    try:
        d = json.loads(path.read_text())
    except (json.JSONDecodeError, OSError):
        return None
    rows = [
        {
            "connector": i.get("connector") or (i.get("id") or "").replace("connector-agent-", ""),
            "status": i.get("status"),
            "startedAt": i.get("started_at"),
            "retries": i.get("retries") or 0,
            "error": i.get("error"),
        }
        for i in d.get("invocations") or []
        if isinstance(i, dict) and i.get("status") in ("queued", "running")
    ]
    return {"runId": d.get("run_id"), "updatedAt": d.get("updated_at"), "rows": rows}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--repo", default="juspay/hyperswitch-prism")
    ap.add_argument("--ledger", type=pathlib.Path)
    ap.add_argument("--out", type=pathlib.Path, default=OUT)
    a = ap.parse_args()

    since = week_start()
    fields = "number,title,url,headRefName,author,labels,isDraft,updatedAt,mergedAt"

    open_prs = gh(["pr", "list", "--repo", a.repo, "--state", "open",
                   "--limit", "200", "--json", fields])
    merged = gh(["pr", "list", "--repo", a.repo, "--state", "merged", "--limit", "200",
                 "--search", f"merged:>={since.isoformat()}", "--json", fields])
    prs_ok = open_prs is not None and merged is not None
    open_prs, merged = open_prs or [], merged or []

    in_review = [slim(p) for p in open_prs if is_grace(p)]
    in_review.sort(key=lambda p: p.get("updatedAt") or "", reverse=True)
    merged_rows = [slim(p) for p in merged if is_grace(p)]
    merged_rows.sort(key=lambda p: p.get("mergedAt") or "", reverse=True)

    payload = {
        "generatedAt": datetime.datetime.now().isoformat(timespec="seconds"),
        "repo": a.repo,
        "weekStart": since.isoformat(),
        "weekEnd": (since + datetime.timedelta(days=4)).isoformat(),
        "ledger": read_ledger(a.ledger),
        "prsOk": prs_ok,
        "warnings": WARNINGS,
        "inReview": in_review,
        "merged": merged_rows,
    }
    a.out.parent.mkdir(parents=True, exist_ok=True)
    a.out.write_text(json.dumps(payload, indent=2) + "\n")
    if WARNINGS:
        for w in WARNINGS:
            print(f"   warning: {w}", file=sys.stderr)
    led = payload["ledger"]
    print(f"✅ week {payload['weekStart']} → {payload['weekEnd']} → {a.out}")
    print(f"   in progress {len(led['rows']) if led else '— (no ledger on this machine)'} · "
          f"in review {len(in_review)} · merged {len(merged_rows)}"
          f"   (PR columns: label {GRACE_LABEL} only)")


if __name__ == "__main__":
    main()
