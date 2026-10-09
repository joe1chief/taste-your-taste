#!/usr/bin/env python3
"""Build the public gallery and README activity feed from Radar's local records."""

import argparse
import datetime as dt
import hashlib
import json
from pathlib import Path
import re
from urllib.parse import quote


REPOSITORY = "joe1chief/taste-your-taste"
GITHUB = f"https://github.com/{REPOSITORY}"
START = "<!-- TASTE:LATEST:START -->"
END = "<!-- TASTE:LATEST:END -->"
IDENTITY = re.compile(r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+\Z")


def timestamp(value):
    if not value:
        return None
    parsed = dt.datetime.fromisoformat(value.replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        raise ValueError(f"Timestamp requires a timezone: {value}")
    return parsed.astimezone(dt.timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def repository_name(value):
    if not IDENTITY.fullmatch(value) or any(part in {".", ".."} for part in value.split("/")):
        raise ValueError(f"Invalid repository identity: {value}")
    return value


def local_directory(root, relative):
    path = Path(relative)
    if path.is_absolute() or ".." in path.parts:
        raise ValueError(f"Invalid archive path: {relative}")
    target = root / path
    if not target.resolve().is_relative_to(root.resolve()):
        raise ValueError(f"Archive escapes repository: {relative}")
    return target if target.is_dir() else None


def archive_url(directory, root):
    return f"{GITHUB}/tree/main/{quote(directory.relative_to(root).as_posix(), safe='/')}" if directory else None


def issue_url(value):
    if value and re.fullmatch(re.escape(GITHUB) + r"/issues/[0-9]+", value):
        return value
    return None


def build_catalog(root, scan=None):
    raw = (root / "data/seen_repos.json").read_bytes()
    database = json.loads(raw)
    projects = []
    identities = set()
    for name, row in database.items():
        repository_name(name)
        if name.lower() in identities:
            raise ValueError(f"Duplicate repository identity: {name}")
        identities.add(name.lower())
        status = row["status"]
        if status not in {"curated", "pending_review"}:
            raise ValueError(f"Unsupported review status for {name}: {status}")
        curated = local_directory(root, row["dir"]) if row.get("dir") else None
        discovered = local_directory(root, f"discovered/{name.lower()}")
        meta = {}
        if discovered:
            meta = json.loads((discovered / "META.json").read_text(encoding="utf-8"))
            if not isinstance(meta, dict) or meta.get("repo", "").lower() != name.lower():
                raise ValueError(f"Archive ownership mismatch: {name}")
        discovered_at = timestamp(row.get("discovered_at"))
        history = sorted(row.get("evolution_history", []), key=lambda e: timestamp(e["timestamp"]))
        evolution_at = timestamp(history[-1]["timestamp"]) if history else None
        updated_at = max(filter(None, [discovered_at, evolution_at]), default=None)
        evolved = bool(evolution_at and evolution_at == updated_at)
        files = row.get("files", [])
        highlights = meta.get("highlights") or []
        projects.append({
            "repo": name,
            "status": status,
            "stars": row.get("stars", 0),
            "language": row.get("language") or "General",
            "archetype": row.get("archetype") or "Unclassified",
            "vibe": row.get("vibe") or row.get("description") or "Maintainer-curated agent instructions.",
            "file": ", ".join(files) or "Agent skills",
            "highlight": highlights[0] if highlights else "Explore the source instructions and their review status.",
            "source_url": f"https://github.com/{name}",
            "archive_url": archive_url(discovered or curated, root),
            "curated_url": archive_url(curated, root),
            "issue_url": issue_url(row.get("issue_url")),
            "discovered_at": discovered_at,
            "updated_at": updated_at,
            "latest_change": "Rules updated" if evolved else "New discovery" if discovered_at else "Curated project",
        })
    projects.sort(key=lambda p: p["repo"].lower())
    projects.sort(key=lambda p: p["updated_at"] or "", reverse=True)
    counts = {"total": len(projects)}
    counts.update({status: sum(p["status"] == status for p in projects) for status in ("curated", "pending_review")})
    return {
        "schema_version": 1,
        "source_sha256": hashlib.sha256(raw).hexdigest(),
        "last_scan": scan,
        "latest_update": max((p["updated_at"] for p in projects if p["updated_at"]), default=None),
        "counts": counts,
        "projects": projects,
    }


def render_readme(catalog):
    counts = catalog["counts"]
    lines = [
        "## Latest Radar Activity", "",
        "Updated after each completed daily scan. Discoveries and rule changes are automated observations awaiting review; curated labels refer to project selection.", "",
        f"**{counts['total']} tracked projects** | **{counts['curated']} curated** | **{counts['pending_review']} pending review**", "",
    ]
    if catalog["last_scan"]:
        scan = catalog["last_scan"]
        date = timestamp(scan["completed_at"]).replace("T", " ").replace("Z", " UTC")
        lines.extend([f"Last completed scan: [{date}]({scan['run_url']}).", ""])
    else:
        lines.extend(["Scan timestamps will be recorded from the next Radar run.", ""])
    if catalog["latest_update"]:
        lines.extend([f"Latest content activity: **{catalog['latest_update'].replace('T', ' ').replace('Z', ' UTC')}**.", ""])
    lines.extend([
        "[Browse all projects in the gallery](https://joe1chief.github.io/taste-your-taste/) | [Review discoveries](https://github.com/joe1chief/taste-your-taste/issues?q=is%3Aissue+is%3Aopen+label%3Ataste-discovery)", "",
        "| Updated (UTC) | Project | Activity | Review status | Rules |",
        "| :--- | :--- | :--- | :--- | :--- |",
    ])
    latest = [p for p in catalog["projects"] if p["updated_at"]][:10]
    for project in latest:
        status = "Curated project" if project["status"] == "curated" else "Pending review"
        if project["issue_url"]:
            status = f"[{status}]({project['issue_url']})"
        rules = f"[Archive]({project['archive_url']})" if project["archive_url"] else f"[Source]({project['source_url']})"
        date = project["updated_at"].replace("T", " ").removesuffix("Z")
        lines.append(f"| {date} | [{project['repo']}]({project['source_url']}) | {project['latest_change']} | {status} | {rules} |")
    if not latest:
        lines.extend(["", "No discoveries or rule changes have been recorded yet."])
    return "\n".join(lines)


def update_readme(original, catalog):
    if original.count(START) != 1 or original.count(END) != 1:
        raise ValueError("README must contain exactly one Latest Radar Activity marker pair")
    before, tail = original.split(START)
    _, after = tail.split(END)
    return before + START + "\n" + render_readme(catalog) + "\n" + END + after


def generate(root, check=False, record_scan=False, run_url=None):
    state_path = root / "data/radar_status.json"
    scan = json.loads(state_path.read_text(encoding="utf-8")) if state_path.exists() else None
    if record_scan:
        if check or not run_url:
            raise ValueError("--record-scan requires --run-url and cannot be combined with --check")
        scan = {"completed_at": timestamp(dt.datetime.now(dt.timezone.utc).isoformat()), "run_url": run_url}
    if scan:
        timestamp(scan["completed_at"])
        if not re.fullmatch(re.escape(GITHUB) + r"/actions/runs/[0-9]+", scan["run_url"]):
            raise ValueError("Scan evidence must link to a workflow run in this repository")
    catalog = build_catalog(root, scan)
    outputs = {
        root / "docs/catalog.json": json.dumps(catalog, indent=2, ensure_ascii=True) + "\n",
        root / "README.md": update_readme((root / "README.md").read_text(encoding="utf-8"), catalog),
    }
    if record_scan:
        outputs[state_path] = json.dumps(scan, indent=2) + "\n"
    stale = [path for path, content in outputs.items() if not path.exists() or path.read_text(encoding="utf-8") != content]
    if check and stale:
        raise ValueError("Generated catalog is stale: " + ", ".join(str(p.relative_to(root)) for p in stale))
    if not check:
        for path in stale:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(outputs[path], encoding="utf-8")
    return catalog


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parent.parent)
    parser.add_argument("--check", action="store_true", help="Fail if generated files are stale; write nothing")
    parser.add_argument("--record-scan", action="store_true", help="Record a just-completed Radar scan")
    parser.add_argument("--run-url", help="GitHub Actions run that completed the scan")
    args = parser.parse_args()
    try:
        catalog = generate(args.root.resolve(), args.check, args.record_scan, args.run_url)
    except (ValueError, KeyError, OSError) as exc:
        parser.exit(1, f"Catalog build failed: {exc}\n")
    counts = catalog["counts"]
    print(f"Catalog verified: {counts['total']} projects, {counts['curated']} curated, {counts['pending_review']} pending review.")


if __name__ == "__main__":
    main()
