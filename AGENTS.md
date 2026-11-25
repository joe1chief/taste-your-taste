# AGENTS.md — Autonomous Agent Specification & Operating Directives

This specification defines constraints and behavioral expectations for autonomous AI agents operating within `taste-your-taste`.

---

## 🏛️ Project Architecture
- **Package**: `taste-code` v2.0.0 (CLI: `taste` / `taste-code`)
- **Runtime**: Node.js >= 18 and Python >= 3.9 (Standard Library Only, Zero external runtime packages)
- **Engines**:
  - `src/registry.js`: Modular flavor, style, tone, and preset brick loader
  - `src/stacker.js`: Non-destructive marker-based injector across 11 agent formats (`CLAUDE.md`, `AGENTS.md`, Cursor MDC, Copilot, Windsurf, Cline, Antigravity, Gemini)
  - `src/skills.js`: Modular `SKILL.md` playbook browser and cross-agent installer (`taste skill`)
  - `src/checker.js`: Deterministic CI prompt quality gate & secret-leak guard (`taste check`)
  - `src/pruner.js`: Token compactor & de-slop optimizer (saves 30-70% tokens)
  - `src/differ.js`: Architectural philosophy and constraints comparator
  - `src/roaster.js`: Linus Torvalds-inspired technical audit & scoring engine
  - `src/card.js` & `api/`: Dark-mode SVG profile card (495x195) and micro-badge generator

---

## 🛡️ Core Directives

1. **Security & Privacy First**:
   - Zero tolerance for credential leakage.
   - Never log, persist, or commit API keys (`OPENAI_API_KEY`, `GITHUB_TOKEN`) or auth headers.
   - Default upstream API endpoint: `https://api.openai.com/v1`.

2. **Language Strictness**:
   - 100% pure English across all tracked files, comments, commit messages, and markdown documents.

3. **Verification Before Completion**:
   - Agents must run `npm test`, `node --test test/gallery.test.js`, `python3 -m unittest discover -s test -p "test_*.py"`, and `python3 scripts/build_catalog.py --check` before concluding any modification.
   - All suites must exit `0`.

4. **Style Consistency**:
   - Maintain terse, outcome-driven responses without sycophancy or conversational fluff.
   - Output diff-first code solutions.
