# 🧠 Curated Agent Skills Library (`skills/`)

This directory houses battle-tested, modular **Agent Skills** (`SKILL.md`) collected from star open-source repositories.

Each skill adheres to the modern Agent Skills standard (YAML frontmatter with `name` and `description`, followed by actionable instructions) compatible with **Claude Code**, **Google Antigravity / Gemini CLI**, **Cursor 2.0**, and **OpenAI Codex**.

---

## 📋 The Skills Index

| Skill Name | Directory | Source Repository | Stars | Purpose & Capability |
| :--- | :--- | :--- | :---: | :--- |
| **`karpathy-guidelines`** | [`skills/karpathy-guidelines/`](./karpathy-guidelines/SKILL.md) | [multica-ai/andrej-karpathy-skills](https://github.com/multica-ai/andrej-karpathy-skills) | ⭐️ 216k | Behavioral guardrails derived from Andrej Karpathy: simplicity first, surgical diffs, no premature abstractions. |
| **`offensive-ai-security`** | [`skills/offensive-ai-security/`](./offensive-ai-security/SKILL.md) | [SnailSploit/Claude-Red](https://github.com/SnailSploit/Claude-Red) | ⭐️ 7.1k | Red-teaming & offensive security testing: API abuse analysis, secret leak audits, and exploit assessment. |
| **`agentic-design`** | [`skills/agentic-design/`](./agentic-design/SKILL.md) | [bergside/awesome-design-skills](https://github.com/bergside/awesome-design-skills) | ⭐️ 2.9k | Generative UI & design tokens: design system consistency, typography grids, and component architecture. |
| **`sepia-hemingway`** | [`skills/sepia-hemingway/`](./sepia-hemingway/SKILL.md) | [Nanako0129/sepia](https://github.com/Nanako0129/sepia) | ⭐️ 2.9k | De-AI humanized writing: eliminates synthetic filler, corporate platitudes, and conversational sycophancy. |
| **`claude-osint`** | [`skills/claude-osint/`](./claude-osint/SKILL.md) | [elementalsouls/Claude-OSINT](https://github.com/elementalsouls/Claude-OSINT) | ⭐️ 2.7k | Open-source intelligence gathering: automated asset discovery, cloud recon, and public footprint inspection. |
| **`markit`** | [`skills/markit/`](./markit/SKILL.md) | [shift-labs-ai/markit](https://github.com/shift-labs-ai/markit) | ⭐️ 1.3k | Multi-format markdown converter: transforms messy PDFs, docs, and web pages into clean LLM context. |
| **`repo-task-proof-loop`** | [`skills/repo-task-proof-loop/`](./repo-task-proof-loop/SKILL.md) | [DenisSergeevitch/repo-task-proof-loop](https://github.com/DenisSergeevitch/repo-task-proof-loop) | ⭐️ 732 | Spec-driven task proof loop with autonomous subagent spawning and deterministic exit verification. |

---

## 🛠️ How to Use These Skills in Your Agent

### 1. In Claude Code (`.claude/skills/` or `CLAUDE.md`)
Copy any skill folder into your project's `.claude/skills/` directory:
```bash
mkdir -p .claude/skills
cp -r skills/karpathy-guidelines .claude/skills/
```

### 2. In Google Antigravity / Gemini CLI (`.agent/skills/`)
```bash
mkdir -p .agent/skills
cp -r skills/karpathy-guidelines .agent/skills/
```

### 3. In Cursor / Windsurf (`.cursor/skills/` or `.cursorrules`)
Directly reference the `SKILL.md` path inside your rules:
```markdown
# Included Skills:
@skills/karpathy-guidelines/SKILL.md
```
