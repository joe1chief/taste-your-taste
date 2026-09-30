"""
LLM Client for Taste Radar
Provider-neutral LLM integration compatible with OpenAI / YiCloud / DashScope.
Zero external dependencies (uses standard urllib).
"""

import json
import os
import re
import urllib.error
import urllib.request
from typing import Any, Dict, List, Optional

DEFAULT_BASE_URL = "https://token-api.yicloud.com/v1"
DEFAULT_MODEL = "DeepSeek-V4.1-Flash"


def _clean_json_markdown(text: str) -> str:
    """Strip markdown code fences if present."""
    text = text.strip()
    match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    if match:
        return match.group(1).strip()
    return text


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

        # Truncate content to avoid exceeding context window
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
            "User-Agent": "Taste-Your-Taste-LLM/1.0",
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
        if any(k in lower for k in ["no apologies", "don't apologize", "no slop", "concise", "be brief"]):
            archetype = "Anti-Slop Minimalist"
            vibe = "Ruthless conciseness, outcome-first execution, and zero conversational waste."
        elif any(k in lower for k in ["strict", "defensive", "mypy", "invariant", "coverage"]):
            archetype = "Defensive Architect"
            vibe = "Deep invariant verification, strict typing, and defensive boundary guarantees."
        elif any(k in lower for k in ["prototype", "hack", "mvp", "single-line", "fast"]):
            archetype = "Hacker Velocity"
            vibe = "Rapid iteration, thin wrappers, and high developer velocity."
        elif any(k in lower for k in ["test", "gradle", "mvn", "spotless", "format", "lint"]):
            archetype = "Engineering Craft"
            vibe = "Deterministic task runners, disciplined formatting, and modular consistency."
        else:
            archetype = "Pragmatic Systems"
            vibe = "Clean and practical instructions tailored for real-world development."

        lines = [line.strip("- *# \t") for line in content.splitlines() if len(line.strip()) > 10]
        return {
            "archetype": archetype,
            "one_line_vibe": vibe,
            "highlights": lines[:4],
            "engineering_assessment": "Standard operational configuration for agentic pair programming.",
            "key_directives": lines[:5],
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
        if not self.is_enabled:
            return {
                "evolution_summary": f"Updated {filename} instructions.",
                "key_changes": ["File revision detected via Git SHA update."],
                "vibe_shift": "Iterative refinements.",
            }

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
            "User-Agent": "Taste-Your-Taste-LLM/1.0",
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
                    "evolution_summary": parsed.get("evolution_summary", "Updated instructions."),
                    "key_changes": parsed.get("key_changes", []),
                    "vibe_shift": parsed.get("vibe_shift", "Iterative prompt evolution."),
                }
        except Exception as e:
            print(f"[LLM Warning] Evolution analysis failed for {repo}: {e}")
            return {
                "evolution_summary": f"Updated {filename} instructions.",
                "key_changes": ["File revision detected via Git SHA update."],
                "vibe_shift": "Iterative refinements.",
            }

