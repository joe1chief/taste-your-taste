#!/usr/bin/env python3
"""
Taste Radar - Autonomous LLM-powered discovery & curation of developer taste files
(CLAUDE.md, .agent, .cursorrules, AGENTS.md) across GitHub Trending and high-star repos.

Part of: taste-your-taste (https://github.com/joe1chief/taste-your-taste)
"""

import argparse
import datetime
import json
import os
import re
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

# Try importing LLMTasteClient from local directory
try:
    from llm_client import LLMTasteClient
except ImportError:
    from scripts.llm_client import LLMTasteClient

# Candidate root files and directories to inspect
INTERESTING_ROOT_FILES = {
    "claude.md",
    ".cursorrules",
    "agents.md",
    ".windsurfrules",
}

INTERESTING_DIRS = {
    ".claude",
    ".agent",
    ".agents",
    ".cursor",
}

# GitHub Code Search Queries to poll
SEARCH_QUERIES = [
    "filename:CLAUDE.md",
    "path:.claude/ filename:CLAUDE.md",
    "path:.agent/ rules",
    "filename:.cursorrules",
]


class GitHubAPI:
    """Lightweight wrapper for GitHub REST API using urllib (zero external dependencies)."""

    def __init__(self, token: Optional[str] = None):
        self.token = token or self._detect_token()
        self.headers = {
            "Accept": "application/vnd.github+json",
            "User-Agent": "Taste-Your-Taste-Radar/1.0",
        }
        if self.token:
            self.headers["Authorization"] = f"Bearer {self.token}"

    @staticmethod
    def _detect_token() -> Optional[str]:
        token = os.environ.get("GITHUB_TOKEN") or os.environ.get("GH_TOKEN")
        if token:
            return token.strip()
        try:
            res = subprocess.run(
                ["gh", "auth", "token"],
                capture_output=True,
                text=True,
                check=False,
            )
            if res.returncode == 0 and res.stdout.strip():
                return res.stdout.strip()
        except Exception:
            pass
        return None

    def request(
        self,
        endpoint_or_url: str,
        params: Optional[Dict[str, Any]] = None,
        data: Optional[Dict[str, Any]] = None,
        method: Optional[str] = None,
        raw_response: bool = False,
        allow_404: bool = False,
    ) -> Any:
        if endpoint_or_url.startswith("http://") or endpoint_or_url.startswith("https://"):
            url = endpoint_or_url
        else:
            url = f"https://api.github.com{endpoint_or_url}"

        if params:
            query_string = urllib.parse.urlencode(params)
            sep = "&" if "?" in url else "?"
            url = f"{url}{sep}{query_string}"

        encoded_data = None
        headers = dict(self.headers)
        if raw_response:
            headers["Accept"] = "application/vnd.github.raw"

        if data is not None:
            encoded_data = json.dumps(data).encode("utf-8")
            headers["Content-Type"] = "application/json"
            if not method:
                method = "POST"

        req = urllib.request.Request(url, data=encoded_data, headers=headers, method=method)

        try:
            with urllib.request.urlopen(req, timeout=25) as resp:
                if raw_response:
                    return resp.read().decode("utf-8", errors="replace")
                content = resp.read().decode("utf-8")
                return json.loads(content) if content else {}
        except urllib.error.HTTPError as e:
            if e.code == 404 and allow_404:
                return None
            err_body = e.read().decode("utf-8", errors="replace")
            print(f"[API Error] HTTP {e.code} for {url}: {err_body[:180]}", file=sys.stderr)
            raise e

    def get_repo(self, full_name: str) -> Optional[Dict[str, Any]]:
        try:
            return self.request(f"/repos/{full_name}", allow_404=True)
        except Exception:
            return None

    def get_contents(self, full_name: str, path: str = "") -> Optional[List[Dict[str, Any]]]:
        """Fetch directory listing for a given path."""
        try:
            endpoint = f"/repos/{full_name}/contents/{urllib.parse.quote(path)}".rstrip("/")
            res = self.request(endpoint, allow_404=True)
            if isinstance(res, list):
                return res
            return None
        except Exception:
            return None

    def get_file_content(self, full_name: str, path: str) -> Optional[str]:
        try:
            return self.request(f"/repos/{full_name}/contents/{urllib.parse.quote(path)}", raw_response=True, allow_404=True)
        except Exception:
            return None

    def search_code(self, query: str, per_page: int = 10) -> List[Dict[str, Any]]:
        try:
            data = self.request("/search/code", params={"q": query, "per_page": per_page})
            return data.get("items", [])
        except Exception as e:
            print(f"[Search Notice] Query '{query}': {e}", file=sys.stderr)
            return []

    def create_issue(self, repo: str, title: str, body: str, labels: Optional[List[str]] = None) -> Optional[str]:
        payload: Dict[str, Any] = {"title": title, "body": body}
        if labels:
            payload["labels"] = labels
        try:
            res = self.request(f"/repos/{repo}/issues", data=payload)
            return res.get("html_url")
        except Exception as e:
            print(f"[Issue Error] Failed to create issue in {repo}: {e}", file=sys.stderr)
            return None


def fetch_trending_repos(since: str = "daily") -> List[str]:
    """Scrape GitHub trending page for trending repositories."""
    url = f"https://github.com/trending?since={since}"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"})
    repos: List[str] = []
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            html = resp.read().decode("utf-8")
            matches = re.findall(r'href="/([a-zA-Z0-9_.-]+/[a-zA-Z0-9_.-]+)"[^>]*class="Link"', html)
            if not matches:
                matches = re.findall(
                    r'<h2 class="h3 lh-condensed">\s*<a href="/([a-zA-Z0-9_.-]+/[a-zA-Z0-9_.-]+)"',
                    html,
                )
            for m in matches:
                if "/" in m and not m.startswith("trending/") and not m.startswith("features/"):
                    if m not in repos:
                        repos.append(m)
    except Exception as e:
        print(f"[Warning] Failed to fetch trending ({since}): {e}", file=sys.stderr)
    return repos


def extract_highlights(content: str, max_lines: int = 15) -> str:
    """Extract snippet highlights or first non-empty lines."""
    lines = [line for line in content.splitlines() if line.strip()]
    snippet = "\n".join(lines[:max_lines])
    if len(lines) > max_lines:
        snippet += f"\n\n... ({len(lines) - max_lines} more lines)"
    return snippet


class TasteRadar:
    def __init__(
        self,
        api: GitHubAPI,
        target_repo: Optional[str] = None,
        db_path: str = "data/seen_repos.json",
        min_stars: int = 1000,
        dry_run: bool = False,
        save_tastes: bool = True,
        create_pr: bool = False,
    ):
        self.api = api
        self.target_repo = target_repo
        self.db_path = Path(db_path)
        self.min_stars = min_stars
        self.dry_run = dry_run
        self.save_tastes = save_tastes
        self.create_pr = create_pr
        self.db: Dict[str, Any] = self._load_db()
        self.llm = LLMTasteClient()

    def _load_db(self) -> Dict[str, Any]:
        if self.db_path.exists():
            try:
                with open(self.db_path, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception:
                return {}
        return {}

    def _save_db(self) -> None:
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        with open(self.db_path, "w", encoding="utf-8") as f:
            json.dump(self.db, f, indent=2, ensure_ascii=False)

    def inspect_repo_taste_files(self, full_name: str) -> Dict[str, str]:
        """Efficiently check if a repository has taste files with minimal API roundtrips.
        Returns mapping of {file_path: git_blob_sha}.
        """
        root_items = self.api.get_contents(full_name, "")
        if not root_items:
            return {}

        found_files: Dict[str, str] = {}
        dirs_to_check: Set[str] = set()

        for item in root_items:
            name = item.get("name", "")
            item_type = item.get("type", "")
            sha = item.get("sha", "")
            lower_name = name.lower()

            if item_type == "file":
                if lower_name in INTERESTING_ROOT_FILES:
                    found_files[name] = sha
            elif item_type == "dir":
                if name in INTERESTING_DIRS:
                    dirs_to_check.add(name)

        # Inspect subdirectories only if found
        for d in dirs_to_check:
            sub_items = self.api.get_contents(full_name, d)
            if sub_items:
                for sub in sub_items:
                    if sub.get("type") == "file":
                        sub_name = sub.get("name", "")
                        sub_path = f"{d}/{sub_name}"
                        sub_sha = sub.get("sha", "")
                        sub_lower = sub_name.lower()
                        # Strictly match actual Agent instruction files
                        if (
                            sub_lower in {"claude.md", "agents.md", "rules.md"}
                            or "cursor" in sub_lower
                            or sub_lower.endswith(".mdc")
                            or sub_name.startswith("CLAUDE")
                            or sub_name.startswith("AGENTS")
                        ):
                            found_files[sub_path] = sub_sha

        return found_files

    def check_and_handle_evolution(self, full_name: str, current_files: Dict[str, str]) -> bool:
        """Check if known repository has updated its taste instructions (Git Blob SHA mismatch)."""
        existing = self.db.get(full_name)
        if not existing:
            return False

        old_shas = existing.get("file_shas", {})
        if not old_shas:
            # If repo was tracked before SHA tracking was introduced, populate current shas
            existing["file_shas"] = current_files
            self._save_db()
            return False

        changed_files = []
        for fpath, new_sha in current_files.items():
            old_sha = old_shas.get(fpath)
            if old_sha and new_sha and old_sha != new_sha:
                changed_files.append((fpath, old_sha, new_sha))

        if not changed_files:
            return False

        print(f"[Radar] ⚡ Taste Evolution detected in {full_name}! Changed: {[f[0] for f in changed_files]}")

        # Process primary changed file
        fpath, old_sha, new_sha = changed_files[0]
        safe_dirname = full_name.replace("/", "__")
        old_file = Path("discovered") / safe_dirname / os.path.basename(fpath)
        old_content = old_file.read_text(encoding="utf-8") if old_file.exists() else ""
        new_content = self.api.get_file_content(full_name, fpath) or ""

        if not new_content:
            return False

        # Run LLM evolution analysis
        print(f"[Radar] 🧠 Analyzing prompt evolution for {full_name} ({fpath})...")
        evo_analysis = self.llm.analyze_evolution(full_name, fpath, old_content, new_content)
        summary = evo_analysis.get("evolution_summary", "Updated instructions.")
        vibe_shift = evo_analysis.get("vibe_shift", "Iterative prompt evolution.")
        key_changes = evo_analysis.get("key_changes", [])
        changes_md = "\n".join(f"- {c}" for c in key_changes) if key_changes else "- Rules modified."

        # Save new content locally
        if self.save_tastes and not self.dry_run:
            dest_dir = Path("discovered") / safe_dirname
            dest_dir.mkdir(parents=True, exist_ok=True)
            (dest_dir / os.path.basename(fpath)).write_text(new_content, encoding="utf-8")

        # Open GitHub Issue
        if self.target_repo and not self.dry_run:
            issue_title = f"[Taste Evolution] ⚡ {full_name} updated `{fpath}`"
            issue_body = f"""### ⚡ Developer Taste Evolution Detected!

[{full_name}](https://github.com/{full_name}) has updated their agent instructions (`{fpath}`).

| Attribute | Details |
| :--- | :--- |
| **Repository** | [{full_name}](https://github.com/{full_name}) |
| **File** | `{fpath}` |
| **Old Blob SHA** | `{old_sha[:10] if old_sha else 'unknown'}` |
| **New Blob SHA** | `{new_sha[:10] if new_sha else 'unknown'}` |
| **Vibe Shift** | **{vibe_shift}** |

---

### 🧠 LLM Evolution Analysis
{summary}

### 🔄 Key Directives Changed / Added
{changes_md}

---

### 📋 Maintainer Action
- Review updated prompt in `discovered/{safe_dirname}/{os.path.basename(fpath)}`.
- Sync latest insights into modular Lego bricks.
"""
            issue_url = self.api.create_issue(
                self.target_repo,
                issue_title,
                issue_body,
                labels=["taste-evolution", "prompt-iteration"],
            )
            print(f"[Radar] ✅ Created Evolution Issue: {issue_url}")

        # Update DB
        existing["file_shas"] = current_files
        if "evolution_history" not in existing:
            existing["evolution_history"] = []
        existing["evolution_history"].append({
            "file": fpath,
            "old_sha": old_sha,
            "new_sha": new_sha,
            "vibe_shift": vibe_shift,
            "summary": summary,
            "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        })
        self._save_db()
        return True

    def scan_trending(self) -> List[Dict[str, Any]]:
        """Scan daily GitHub trending repositories for taste configs."""
        print("[Radar] 📡 Scanning GitHub Trending repositories...")
        trending_repos = fetch_trending_repos("daily")
        print(f"[Radar] Fetched {len(trending_repos)} trending repositories. Checking for taste files...")
        candidates: List[Dict[str, Any]] = []

        for full_name in trending_repos:
            found_files = self.inspect_repo_taste_files(full_name)
            if found_files:
                if full_name in self.db:
                    self.check_and_handle_evolution(full_name, found_files)
                    continue

                print(f"[Radar] 🎯 Match found in trending repo {full_name}: {list(found_files.keys())}")
                candidates.append({
                    "repo": full_name,
                    "files": list(found_files.keys()),
                    "file_shas": found_files,
                    "source": "trending",
                })

        return candidates

    def scan_popular_repos(self, max_check: int = 20) -> List[Dict[str, Any]]:
        """Scan recently active high-star repositories for taste configurations."""
        print(f"[Radar] ⭐ Scanning recently active high-star repositories (stars >= {self.min_stars})...")
        candidates: List[Dict[str, Any]] = []

        # Find recently pushed repos with high stars
        pushed_since = (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=14)).strftime("%Y-%m-%d")
        query = f"stars:>={self.min_stars} pushed:>={pushed_since}"

        try:
            data = self.api.request(
                "/search/repositories",
                params={"q": query, "sort": "updated", "order": "desc", "per_page": max_check},
            )
            items = data.get("items", [])
            print(f"[Radar] Checking {len(items)} popular active repos for taste files...")
            for r in items:
                full_name = r.get("full_name")
                if not full_name:
                    continue
                found_files = self.inspect_repo_taste_files(full_name)
                if found_files:
                    if full_name in self.db:
                        self.check_and_handle_evolution(full_name, found_files)
                        continue

                    stars = r.get("stargazers_count", 0)
                    print(f"[Radar] 🎯 Match found in high-star repo {full_name} (⭐️ {stars:,}): {list(found_files.keys())}")
                    candidates.append({
                        "repo": full_name,
                        "files": list(found_files.keys()),
                        "file_shas": found_files,
                        "source": "popular_stars",
                    })
        except Exception as e:
            print(f"[Radar] Failed scanning popular repos: {e}", file=sys.stderr)

        return candidates

    def scan_code_search(self, max_results: int = 15) -> List[Dict[str, Any]]:
        """Search GitHub Code Search for taste files, strictly filtering for high-star repositories."""
        print(f"[Radar] 🔍 Scanning GitHub Code Search for taste files (min stars >= {self.min_stars})...")
        candidates: Dict[str, Dict[str, Any]] = {}

        for query in SEARCH_QUERIES:
            items = self.api.search_code(query, per_page=10)
            for item in items:
                repo_info = item.get("repository", {})
                full_name = repo_info.get("full_name")
                if not full_name or full_name in self.db or full_name in candidates:
                    continue

                # Query repo metadata to verify star threshold before admitting
                repo_meta = self.api.get_repo(full_name)
                if not repo_meta:
                    continue
                stars = repo_meta.get("stargazers_count", 0)
                if stars < self.min_stars:
                    continue

                path = item.get("path")
                candidates[full_name] = {
                    "repo": full_name,
                    "files": [path] if path else [],
                    "source": "code_search",
                }

                if len(candidates) >= max_results:
                    break

            if len(candidates) >= max_results:
                break
            time.sleep(1.0)

        return list(candidates.values())

    def create_pull_request(
        self,
        full_name: str,
        lang: str,
        file_contents: Dict[str, str],
        analysis: Dict[str, Any],
        stars: int,
    ) -> Optional[str]:
        """Automatically create a git branch, commit curated taste, and open a Pull Request."""
        repo_shortname = full_name.split("/")[-1]
        branch_name = f"taste-radar/{full_name.replace('/', '-')}"
        target_dir = Path(repo_shortname)
        target_dir.mkdir(parents=True, exist_ok=True)

        for fpath, raw_text in file_contents.items():
            dest = target_dir / os.path.basename(fpath)
            dest.write_text(raw_text, encoding="utf-8")

        meta = {
            "repo": full_name,
            "stars": stars,
            "language": lang,
            "archetype": analysis.get("archetype", "Pragmatic Systems"),
            "vibe": analysis.get("one_line_vibe", ""),
            "curated_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        }
        (target_dir / "META.json").write_text(json.dumps(meta, indent=2, ensure_ascii=False), encoding="utf-8")

        try:
            subprocess.run(["git", "checkout", "-B", branch_name], check=True, capture_output=True)
            subprocess.run(["git", "add", str(target_dir)], check=True, capture_output=True)
            commit_msg = f"feat(taste): curate developer taste from {full_name} (⭐️ {stars:,})"
            subprocess.run(["git", "commit", "-m", commit_msg], check=True, capture_output=True)
            push_res = subprocess.run(["git", "push", "-u", "origin", branch_name], capture_output=True, text=True, check=False)
            if push_res.returncode != 0:
                print(f"[Radar] Git push note: {push_res.stderr.strip()}", file=sys.stderr)

            pr_title = f"[Taste Discovery] {full_name} (⭐️ {stars:,})"
            pr_body = f"""### 🍷 Automated Taste Curation

Captured and structured developer taste from [{full_name}](https://github.com/{full_name}).

- **Stars**: ⭐️ **{stars:,}**
- **Archetype**: **{analysis.get('archetype', 'Pragmatic Systems')}**
- **Vibe**: *{analysis.get('one_line_vibe', '')}*
- **Language**: `{lang}`

All raw rule files and metadata have been staged under `tastes/{lang_dir}/{safe_dirname}/`.
"""
            pr_cmd = [
                "gh", "pr", "create",
                "--repo", self.target_repo,
                "--title", pr_title,
                "--body", pr_body,
                "--base", "main",
                "--head", branch_name,
            ]
            pr_res = subprocess.run(pr_cmd, capture_output=True, text=True, check=False)
            subprocess.run(["git", "checkout", "main"], capture_output=True)

            if pr_res.returncode == 0:
                pr_url = pr_res.stdout.strip()
                print(f"[Radar] 🚀 Created Pull Request: {pr_url}")
                return pr_url
            else:
                print(f"[Radar] PR creation note: {pr_res.stderr.strip()}", file=sys.stderr)
                return None
        except Exception as e:
            subprocess.run(["git", "checkout", "main"], capture_output=True)
            print(f"[Radar] Failed to create PR: {e}", file=sys.stderr)
            return None

    def process_candidate(self, candidate: Dict[str, Any]) -> bool:
        """Fetch details, run LLM analysis, save content, and file a GitHub Issue."""
        full_name = candidate["repo"]
        files = candidate["files"]
        file_shas = candidate.get("file_shas", {})
        source = candidate.get("source", "unknown")

        print(f"\n[Radar] 🚀 Processing: {full_name} ({', '.join(files)})")

        repo_meta = self.api.get_repo(full_name)
        if not repo_meta:
            print(f"[Radar] ⚠️ Could not get repo metadata for {full_name}, skipping.")
            return False

        stars = repo_meta.get("stargazers_count", 0)
        desc = repo_meta.get("description") or "No description provided."
        lang = repo_meta.get("language") or "General"
        repo_url = repo_meta.get("html_url")

        if source != "trending" and stars < self.min_stars:
            print(f"[Radar] ⏩ Skipping {full_name}: {stars} stars < minimum {self.min_stars} (only trending or stars >= {self.min_stars} allowed)")
            return False

        # Fetch contents of the taste files (strictly requiring non-empty Agent rules)
        file_contents: Dict[str, str] = {}
        for fpath in files:
            content = self.api.get_file_content(full_name, fpath)
            if content and len(content.strip()) >= 50:
                file_contents[fpath] = content

        if not file_contents:
            print(f"[Radar] ⚠️ No valid Agent rule file contents (>= 50 chars) found for {full_name}, strictly skipping.")
            return False

        primary_file = files[0]
        primary_content = file_contents[primary_file]
        snippet = extract_highlights(primary_content)

        # Run LLM-driven taste analysis (no hardcoded heuristics!)
        print(f"[Radar] 🧠 Running LLM analysis on {full_name}...")
        analysis = self.llm.analyze_taste(
            repo=full_name,
            stars=stars,
            description=desc,
            filename=primary_file,
            content=primary_content,
        )

        archetype = analysis.get("archetype", "Pragmatic Systems")
        vibe = analysis.get("one_line_vibe", "")
        highlights = analysis.get("highlights", [])
        assessment = analysis.get("engineering_assessment", "")

        # Save to top-level project directory if enabled
        if self.save_tastes and not self.dry_run:
            repo_shortname = full_name.split("/")[-1]
            save_dir = Path(repo_shortname)
            save_dir.mkdir(parents=True, exist_ok=True)
            for fpath, raw_text in file_contents.items():
                dest_file = save_dir / os.path.basename(fpath)
                with open(dest_file, "w", encoding="utf-8") as f:
                    f.write(raw_text)

            with open(save_dir / "META.json", "w", encoding="utf-8") as f:
                json.dump(
                    {
                        "repo": full_name,
                        "stars": stars,
                        "language": lang,
                        "description": desc,
                        "url": repo_url,
                        "archetype": archetype,
                        "vibe": vibe,
                        "highlights": highlights,
                        "assessment": assessment,
                        "files": files,
                        "file_shas": file_shas,
                        "discovered_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                    },
                    f,
                    indent=2,
                    ensure_ascii=False,
                )

        highlights_md = "\n".join(f"- {h}" for h in highlights) if highlights else "- Standard operational instructions."

        issue_url = None
        pr_url = None

        if self.create_pr and self.target_repo and not self.dry_run:
            pr_url = self.create_pull_request(full_name, lang, file_contents, analysis, stars)

        if self.target_repo and not self.dry_run:
            issue_title = f"[Taste Radar] 🌟 {full_name} (⭐️ {stars:,}) - {primary_file}"
            issue_body = f"""### 📡 New Developer Taste Discovered!

A high-profile repository configuration has been captured and evaluated by **Taste Radar**.

| Attribute | Details |
| :--- | :--- |
| **Repository** | [{full_name}]({repo_url}) |
| **Stars** | ⭐️ **{stars:,}** |
| **Language** | `{lang}` |
| **Discovery Source** | `{source.upper()}` |
| **Detected Files** | {', '.join(f'`{f}`' for f in files)} |
| **Taste Archetype** | **{archetype}** |

> **Vibe:** *{vibe}*

---

### 🧠 LLM Architectural Assessment
{assessment}

### ⚡ Taste Highlights
{highlights_md}

---

### 🔍 Taste Preview (`{primary_file}`)

```markdown
{snippet}
```

---

### 📋 Maintainer Review Checklist
- [ ] Review the configuration file and verify relevance.
- [ ] Confirm the extracted **Taste Highlights** and key directives.
- [ ] Move into `tastes/{lang.lower() if lang else 'general'}/{full_name.replace('/', '__')}/`.
- [ ] Add an entry into the main `README.md` Hall of Fame!
"""
            issue_url = self.api.create_issue(
                self.target_repo,
                issue_title,
                issue_body,
                labels=["taste-discovery", "needs-review"],
            )
            print(f"[Radar] ✅ Created Issue: {issue_url}")
        else:
            print(f"[Radar] [Dry-Run] Would create issue for {full_name} (⭐️ {stars:,})")
            print(f"      Archetype: {archetype}")
            print(f"      Vibe: {vibe}")
            print(f"      Preview:\n{snippet[:200]}...\n")

        # Record in DB
        self.db[full_name] = {
            "stars": stars,
            "language": lang,
            "description": desc,
            "files": files,
            "file_shas": file_shas,
            "source": source,
            "archetype": archetype,
            "vibe": vibe,
            "discovered_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "issue_url": issue_url,
            "pr_url": pr_url,
            "status": "pending_review",
        }
        self._save_db()
        return True

    def run(self, max_new: int = 5) -> None:
        print("=" * 60)
        print(" Taste Your Taste - LLM Radar Engine Launching ")
        print(f" Time: {datetime.datetime.now(datetime.timezone.utc).isoformat()}")
        print(f" Target Repo: {self.target_repo or '(None / Dry Run)'}")
        print(f" Min Stars: {self.min_stars} | Dry Run: {self.dry_run}")
        print(f" LLM Active: {self.llm.is_enabled} ({self.llm.model})")
        print(f" Create PR: {self.create_pr}")
        print("=" * 60)

        candidates = self.scan_trending()
        if len(candidates) < max_new:
            popular_candidates = self.scan_popular_repos(max_check=20)
            candidates.extend(popular_candidates)
        if len(candidates) < max_new:
            search_candidates = self.scan_code_search()
            candidates.extend(search_candidates)

        processed_count = 0
        for candidate in candidates:
            if processed_count >= max_new:
                print(f"[Radar] Reached batch limit of {max_new} new candidates.")
                break
            if self.process_candidate(candidate):
                processed_count += 1

        print("\n" + "=" * 60)
        print(f"[Radar] Run completed! Processed {processed_count} new tastes.")
        print("=" * 60)


def main():
    parser = argparse.ArgumentParser(description="Taste Radar - Track CLAUDE.md and agent rules")
    parser.add_argument("--token", help="GitHub Personal Access Token or GITHUB_TOKEN")
    parser.add_argument(
        "--repo",
        help="Target repository where issues are opened (e.g. joe1chief/taste-your-taste)",
        default=os.environ.get("GITHUB_REPOSITORY"),
    )
    parser.add_argument("--db", default="data/seen_repos.json", help="Path to database tracking seen repos")
    parser.add_argument("--min-stars", type=int, default=1000, help="Minimum stars for non-trending candidate repositories")
    parser.add_argument("--limit", type=int, default=5, help="Maximum number of items to process in one run")
    parser.add_argument("--dry-run", action="store_true", help="Print candidates without modifying state or creating issues")
    parser.add_argument("--no-save", action="store_true", help="Do not save raw files into discovered/")
    parser.add_argument("--create-pr", action="store_true", help="Automatically create git branch and PR for discovered tastes")

    args = parser.parse_args()

    api = GitHubAPI(token=args.token)
    radar = TasteRadar(
        api=api,
        target_repo=args.repo,
        db_path=args.db,
        min_stars=args.min_stars,
        dry_run=args.dry_run,
        save_tastes=not args.no_save,
        create_pr=args.create_pr,
    )
    radar.run(max_new=args.limit)


if __name__ == "__main__":
    main()
