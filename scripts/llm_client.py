"""
LLM Client for Taste Radar
OpenAI-compatible LLM integration (OpenAI, DeepSeek, vLLM, Ollama).
Zero external dependencies (uses standard urllib and difflib).
"""

import difflib
import json
import os
import re
import urllib.error
import urllib.request
from typing import Any, Dict, List, Optional

DEFAULT_BASE_URL = "https://api.openai.com/v1"
DEFAULT_MODEL = "gpt-4o-mini"


def _clean_json_markdown(text: str) -> str:
    """Strip markdown code fences if present."""
    text = text.strip()
    match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    if match:
        return match.group(1).strip()
    return text


def _extract_meaningful_lines(content: str, limit: int = 8) -> List[str]:
    """Extract crisp rule directives from markdown text without frontmatter noise."""
    directives: List[str] = []
    in_frontmatter = False
    in_code_block = False

    for idx, raw in enumerate(content.splitlines()):
        stripped = raw.strip()
        if idx == 0 and stripped == "---":
            in_frontmatter = True
            continue
        if in_frontmatter:
            if stripped == "---":
                in_frontmatter = False
            continue
        if stripped.startswith("```"):
            in_code_block = not in_code_block
            continue
        if in_code_block or not stripped:
            continue
        if stripped.startswith(("<!--", "| :---", "|---")):
            continue

        cleaned = re.sub(r"^[-*+]\s+|^\d+\.\s+|^#+\s+", "", stripped).strip()
        cleaned = re.sub(r"\*\*([^*]+)\*\*", r"\1", cleaned)
        if len(cleaned) >= 16 and not cleaned.lower().startswith(("http://", "https://")):
            directives.append(cleaned[:180])
            if len(directives) >= limit:
                break
    return directives


def analyze_evolution_deterministic(
    filename: str,
    old_content: str,
    new_content: str,
) -> Dict[str, Any]:
    """Compute a concrete structural diff summary when LLM analysis is unavailable."""
    old_norm = "\n".join(line.rstrip() for line in old_content.splitlines()).strip()
    new_norm = "\n".join(line.rstrip() for line in new_content.splitlines()).strip()

    if old_norm == new_norm or old_content.split() == new_content.split():
        return {
            "evolution_summary": f"Whitespace or formatting normalization in {filename} with no rule changes.",
            "key_changes": ["Formatting/whitespace adjustment only."],
            "vibe_shift": "Formatting cleanup (no behavioral shift).",
            "trivial": True,
            "llm_powered": False,
        }

    old_lines = [line.rstrip() for line in old_content.splitlines()]
    new_lines = [line.rstrip() for line in new_content.splitlines()]

    added_raw: List[str] = []
    removed_raw: List[str] = []
    for diff_line in difflib.unified_diff(old_lines, new_lines, n=0, lineterm=""):
        if diff_line.startswith(("+++", "---", "@@")):
            continue
        if diff_line.startswith("+"):
            val = diff_line[1:].strip()
            if val:
                added_raw.append(val)
        elif diff_line.startswith("-"):
            val = diff_line[1:].strip()
            if val:
                removed_raw.append(val)

    added_count = len(added_raw)
    removed_count = len(removed_raw)
    net_lines = len(new_lines) - len(old_lines)
    old_tokens = max(1, round(len(old_content) / 3.8)) if old_content.strip() else 0
    new_tokens = max(1, round(len(new_content) / 3.8))
    token_delta = new_tokens - old_tokens

    def _pick_notable(lines: List[str], prefix: str, max_items: int = 3) -> List[str]:
        items: List[str] = []
        for raw in lines:
            if raw.startswith(("```", "---", "| :---", "<!--")):
                continue
            if raw.startswith("#"):
                heading = raw.lstrip("#").strip()
                if len(heading) >= 3:
                    items.append(f"{prefix} section: `{heading[:90]}`")
            elif raw.startswith(("-", "*", "+")) or re.match(r"^\d+\.\s+", raw):
                rule = re.sub(r"^[-*+]\s+|^\d+\.\s+", "", raw).strip()
                rule = re.sub(r"\*\*([^*]+)\*\*", r"\1", rule)
                if len(rule) >= 12:
                    items.append(f"{prefix} rule: {rule[:140]}")
            elif len(raw) >= 24:
                items.append(f"{prefix}: {raw[:140]}")
            if len(items) >= max_items:
                break
        return items

    key_changes = _pick_notable(added_raw, "Added", 4) + _pick_notable(removed_raw, "Removed", 2)
    if not key_changes:
        key_changes = [
            f"Modified {added_count} added and {removed_count} removed non-empty lines in `{filename}`."
        ]

    added_blob = " ".join(added_raw).lower()
    if not old_content.strip():
        vibe_shift = f"Established initial `{filename}` agent contract (~{new_tokens} tokens)."
    elif any(k in added_blob for k in ("token economy", "concise", "shortest response", "no preamble", "no slop")):
        vibe_shift = "Tightened token economy and anti-slop response brevity."
    elif any(k in added_blob for k in ("never", "do not", "must not", "forbid", "prohibit", "invariant")):
        vibe_shift = "Strengthened negative guardrails and architectural invariants."
    elif any(k in added_blob for k in ("pytest", "vitest", "cargo test", "npm test", "ruff", "eslint", "ci")):
        vibe_shift = "Expanded deterministic test, lint, and verification gates."
    elif token_delta <= -80:
        vibe_shift = f"Compacted prompt footprint ({token_delta} tokens) for leaner context."
    elif token_delta >= 120:
        vibe_shift = f"Expanded operational specification (+{token_delta} tokens)."
    else:
        vibe_shift = f"Surgical rule refinement (+{added_count} / -{removed_count} lines)."

    sign = "+" if net_lines >= 0 else ""
    tok_sign = "+" if token_delta >= 0 else ""
    evolution_summary = (
        f"Updated `{filename}` with {added_count} added and {removed_count} removed non-empty lines "
        f"(net {sign}{net_lines} lines, {tok_sign}{token_delta} est. tokens)."
    )

    return {
        "evolution_summary": evolution_summary,
        "key_changes": key_changes[:6],
        "vibe_shift": vibe_shift,
        "trivial": False,
        "llm_powered": False,
    }


class LLMTasteClient:
    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        model: Optional[str] = None,
    ):
        self.api_key = api_key or os.environ.get("OPENAI_API_KEY") or os.environ.get("LLM_API_KEY")
        raw_base = base_url or os.environ.get("OPENAI_BASE_URL") or os.environ.get("LLM_BASE_URL") or DEFAULT_BASE_URL
        self.base_url = raw_base.rstrip("/")
        self.model = model or os.environ.get("LLM_MODEL") or DEFAULT_MODEL

    @property
    def is_enabled(self) -> bool:
        return bool(self.api_key)

    def analyze_taste(
        self,
        repo: str,
        stars: int,
        description: str,
        filename: str,
        content: str,
    ) -> Dict[str, Any]:
        """Analyze agent instruction file using LLM to extract archetype and taste highlights."""
        if not self.is_enabled:
            return self._fallback_analysis(filename, content)

        sample_content = content[:12000]

        system_prompt = (
            "You are an expert AI code architecture critic. Analyze this repository's agent instruction file (e.g. CLAUDE.md / AGENTS.md). "
            "Evaluate its engineering taste, constraints, tone, and anti-slop rules. "
            "Return ONLY a valid JSON object with the following keys:\n"
            "- archetype: string (one of 'Anti-Slop Minimalist', 'Defensive Architect', 'Hacker Velocity', 'Engineering Craft', 'Pragmatic Systems')\n"
            "- one_line_vibe: string (a punchy, memorable one-line summary of this developer's coding vibe)\n"
            "- highlights: list of strings (3 to 5 key constraints, gems, or architectural rules)\n"
            "- engineering_assessment: string (2-3 sentences evaluating why this taste is effective or notable)\n"
            "- key_directives: list of strings (3 to 6 verbatim or near-verbatim rules from the file)\n"
            "All responses must be in pure English. Do not include markdown code fences or conversational text."
        )

        user_prompt = (
            f"Repository: {repo} (⭐️ {stars:,})\n"
            f"Description: {description}\n"
            f"Target File: {filename}\n\n"
            f"<UNTRUSTED_SOURCE>\n{sample_content}\n</UNTRUSTED_SOURCE>"
        )

        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": 0.1,
            "max_tokens": 1000,
        }

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "User-Agent": "Taste-Your-Taste-LLM/2.0",
        }

        url = f"{self.base_url}/chat/completions"
        req = urllib.request.Request(url, data=json.dumps(payload).encode("utf-8"), headers=headers)

        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                choice = data.get("choices", [{}])[0]
                content_text = choice.get("message", {}).get("content", "")
                parsed = json.loads(_clean_json_markdown(content_text))
                return {
                    "archetype": parsed.get("archetype", "Pragmatic Systems"),
                    "one_line_vibe": parsed.get("one_line_vibe", "Pragmatic developer instructions."),
                    "highlights": parsed.get("highlights", []),
                    "engineering_assessment": parsed.get("engineering_assessment", ""),
                    "key_directives": parsed.get("key_directives", []),
                    "llm_powered": True,
                }
        except Exception as e:
            print(f"[LLM Warning] LLM analysis failed for {repo}: {e}. Using deterministic fallback.")
            return self._fallback_analysis(filename, content)

    @staticmethod
    def _fallback_analysis(filename: str, content: str) -> Dict[str, Any]:
        """Deterministic fallback when LLM is unavailable."""
        lower = content.lower()
        if any(k in lower for k in ["no apologies", "don't apologize", "no slop", "token economy", "concise", "shortest response"]):
            archetype = "Anti-Slop Minimalist"
            vibe = "Ruthless conciseness, outcome-first execution, and zero conversational waste."
        elif any(k in lower for k in ["strict", "defensive", "mypy", "invariant", "coverage", "memory safety", "never"]):
            archetype = "Defensive Architect"
            vibe = "Deep invariant verification, strict typing, and defensive boundary guarantees."
        elif any(k in lower for k in ["prototype", "hack", "mvp", "single-line", "fast", "velocity"]):
            archetype = "Hacker Velocity"
            vibe = "Rapid iteration, thin wrappers, and high developer velocity."
        elif any(k in lower for k in ["pytest", "gradle", "mvn", "spotless", "format", "lint", "vitest", "cargo test"]):
            archetype = "Engineering Craft"
            vibe = "Deterministic task runners, disciplined formatting, and modular consistency."
        else:
            archetype = "Pragmatic Systems"
            vibe = "Clean and practical instructions tailored for real-world development."

        directives = _extract_meaningful_lines(content, limit=6)
        tokens = max(1, round(len(content) / 3.8))
        return {
            "archetype": archetype,
            "one_line_vibe": vibe,
            "highlights": directives[:4],
            "engineering_assessment": (
                f"Structured `{filename}` specification (~{tokens} est. tokens) codifying "
                f"{archetype.lower()} guardrails and repository conventions."
            ),
            "key_directives": directives[:5],
            "llm_powered": False,
        }

    def analyze_evolution(
        self,
        repo: str,
        filename: str,
        old_content: str,
        new_content: str,
    ) -> Dict[str, Any]:
        """Analyze how developer taste and agent instructions evolved between two revisions."""
        deterministic = analyze_evolution_deterministic(filename, old_content, new_content)
        if deterministic.get("trivial") or not self.is_enabled:
            return deterministic

        system_prompt = (
            "You are an expert AI prompt engineer and code taste critic. Compare two versions of an agent rule file "
            "(e.g., CLAUDE.md / .cursorrules). Analyze how the author's prompt engineering taste and constraints evolved. "
            "Return ONLY a valid JSON object with the following keys:\n"
            "- evolution_summary: string (2-3 sentences explaining what changed and why)\n"
            "- key_changes: list of strings (bullet points of new rules or deleted rules)\n"
            "- vibe_shift: string (one sentence describing the direction of the prompt shift, e.g. 'Shifted towards stricter type boundaries')\n"
            "All responses must be in pure English. Do not include markdown code fences or conversational text."
        )

        user_prompt = (
            f"Repository: {repo}\n"
            f"File: {filename}\n\n"
            f"=== PREVIOUS VERSION ===\n{old_content[:6000]}\n\n"
            f"=== NEW VERSION ===\n{new_content[:6000]}\n"
        )

        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": 0.1,
            "max_tokens": 800,
        }

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "User-Agent": "Taste-Your-Taste-LLM/2.0",
        }

        url = f"{self.base_url}/chat/completions"
        req = urllib.request.Request(url, data=json.dumps(payload).encode("utf-8"), headers=headers)

        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                choice = data.get("choices", [{}])[0]
                content_text = choice.get("message", {}).get("content", "")
                parsed = json.loads(_clean_json_markdown(content_text))
                return {
                    "evolution_summary": parsed.get("evolution_summary") or deterministic["evolution_summary"],
                    "key_changes": parsed.get("key_changes") or deterministic["key_changes"],
                    "vibe_shift": parsed.get("vibe_shift") or deterministic["vibe_shift"],
                    "trivial": False,
                    "llm_powered": True,
                }
        except Exception as e:
            print(f"[LLM Warning] Evolution analysis failed for {repo}: {e}. Falling back to structural diff.")
            return deterministic
