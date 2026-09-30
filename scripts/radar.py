#!/usr/bin/env python3
"""
Taste Radar - Automatic discovery & monitoring of developer taste files
(CLAUDE.md, .agent, .cursorrules) across GitHub trending and high-profile repos.

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


def detect_archetype(content: str) -> str:
    """Infer the vibe/taste archetype based on rules and keywords."""
    content_lower = content.lower()

    if any(k in content_lower for k in ["no apologies", "don't apologize", "no slop", "concise", "be brief", "no fluff"]):
        return "⚡ Anti-Slop / Minimalist (直击要害 / 极简主义)"
    elif any(k in content_lower for k in ["strict", "defensive", "mypy", "never use any", "invariant", "coverage"]):
        return "🛡️ Defensive Architect (防御洁癖 / 严苛架构)"
    elif any(k in content_lower for k in ["prototype", "hack", "mvp", "single-line", "fast", "speed"]):
        return "🤠 Hacker Velocity (单兵作战 / 极速狂飙)"
    elif any(k in content_lower for k in ["test", "gradle", "mvn", "spotless", "format", "lint"]):
        return "🏢 Engineering Craft (工程规范 / 工业标准)"
    return "🎨 Pragmatic Taste (实用主义 / 优雅品味)"


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
    ):
        self.api = api
        self.target_repo = target_repo
        self.db_path = Path(db_path)
        self.min_stars = min_stars
        self.dry_run = dry_run
        self.save_tastes = save_tastes
        self.db: Dict[str, Any] = self._load_db()

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

    def inspect_repo_taste_files(self, full_name: str) -> List[str]:
        """Efficiently check if a repository has taste files with minimal API roundtrips."""
        root_items = self.api.get_contents(full_name, "")
        if not root_items:
            return []

        found_files: List[str] = []
        dirs_to_check: Set[str] = set()

        for item in root_items:
            name = item.get("name", "")
            item_type = item.get("type", "")
            lower_name = name.lower()

            if item_type == "file":
                if lower_name in INTERESTING_ROOT_FILES:
                    found_files.append(name)
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
                        sub_lower = sub_name.lower()
                        if "claude" in sub_lower or "rule" in sub_lower or "plan" in sub_lower or "goal" in sub_lower or sub_lower.endswith(".md"):
                            found_files.append(sub_path)

        return found_files

    def scan_trending(self) -> List[Dict[str, Any]]:
        """Scan daily GitHub trending repositories for taste configs."""
        print("[Radar] 📡 Scanning GitHub Trending repositories...")
        trending_repos = fetch_trending_repos("daily")
        print(f"[Radar] Fetched {len(trending_repos)} trending repositories. Checking for taste files...")
        candidates: List[Dict[str, Any]] = []

        for full_name in trending_repos:
            if full_name in self.db:
                continue

            found_files = self.inspect_repo_taste_files(full_name)
            if found_files:
                print(f"[Radar] 🎯 Match found in trending repo {full_name}: {found_files}")
                candidates.append({"repo": full_name, "files": found_files, "source": "trending"})

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
                if not full_name or full_name in self.db:
                    continue
                found_files = self.inspect_repo_taste_files(full_name)
                if found_files:
                    stars = r.get("stargazers_count", 0)
                    print(f"[Radar] 🎯 Match found in high-star repo {full_name} (⭐️ {stars:,}): {found_files}")
                    candidates.append({
                        "repo": full_name,
                        "files": found_files,
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

    def process_candidate(self, candidate: Dict[str, Any]) -> bool:
        """Fetch details, optionally save content, and file an Issue."""
        full_name = candidate["repo"]
        files = candidate["files"]
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
            print(f"[Radar] ⏩ Skipping {full_name}: {stars} stars < minimum {self.min_stars}")
            return False

        # Fetch contents of the taste files
        file_contents: Dict[str, str] = {}
        for fpath in files:
            content = self.api.get_file_content(full_name, fpath)
            if content:
                file_contents[fpath] = content

        if not file_contents:
            print(f"[Radar] ⚠️ Failed to retrieve file contents for {full_name}.")
            return False

        primary_file = files[0]
        primary_content = file_contents[primary_file]
        archetype = detect_archetype(primary_content)
        snippet = extract_highlights(primary_content)

        # Save to local discovered folder if enabled
        if self.save_tastes and not self.dry_run:
            safe_dirname = full_name.replace("/", "__")
            save_dir = Path("discovered") / safe_dirname
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
                        "files": files,
                        "discovered_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                    },
                    f,
                    indent=2,
                    ensure_ascii=False,
                )

        issue_url = None
        if self.target_repo and not self.dry_run:
            issue_title = f"[Taste Radar] 🌟 {full_name} (⭐️ {stars}) - {primary_file}"
            issue_body = f"""### 📡 New Developer Taste Discovered!

A new project configuration has been captured by **Taste Radar**.

| Attribute | Details |
| :--- | :--- |
| **Repository** | [{full_name}]({repo_url}) |
| **Stars** | ⭐️ **{stars:,}** |
| **Language** | `{lang}` |
| **Source** | `{source.upper()}` |
| **Detected Files** | {', '.join(f'`{f}`' for f in files)} |
| **Detected Archetype** | **{archetype}** |

> **Description:** {desc}

---

### 🔍 Taste Preview (`{primary_file}`)

```markdown
{snippet}
```

---

### 📋 Maintainer Review Checklist
- [ ] Read the configuration file and verify relevance.
- [ ] Extract notable **Taste Highlights** (Anti-slop commands, engineering constraints, prompt gems).
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
            print(f"[Radar] [Dry-Run] Would create issue for {full_name} (⭐️ {stars})")
            print(f"      Archetype: {archetype}")
            print(f"      Preview:\n{snippet[:200]}...\n")

        # Record in DB
        self.db[full_name] = {
            "stars": stars,
            "language": lang,
            "description": desc,
            "files": files,
            "source": source,
            "archetype": archetype,
            "discovered_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "issue_url": issue_url,
            "status": "pending_review",
        }
        self._save_db()
        return True

    def run(self, max_new: int = 5) -> None:
        print("=" * 60)
        print(" Taste Your Taste - Radar Engine Launching ")
        print(f" Time: {datetime.datetime.now(datetime.timezone.utc).isoformat()}")
        print(f" Target Repo: {self.target_repo or '(None / Dry Run)'}")
        print(f" Min Stars: {self.min_stars} | Dry Run: {self.dry_run}")
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

    args = parser.parse_args()

    api = GitHubAPI(token=args.token)
    radar = TasteRadar(
        api=api,
        target_repo=args.repo,
        db_path=args.db,
        min_stars=args.min_stars,
        dry_run=args.dry_run,
        save_tastes=not args.no_save,
    )
    radar.run(max_new=args.limit)


if __name__ == "__main__":
    main()
