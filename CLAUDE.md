# CLAUDE.md — Project Taste & Operating Invariants

This file guides AI agents (Claude Code, Cursor, Windsurf, Copilot, Codex, Antigravity, Gemini CLI) working on the `taste-your-taste` repository.

---

## 🎯 Project Mission
**Taste Your Taste (v2.0)** is an autonomous developer taste curation and vibe-stacking engine for AI agents. It provides a zero-dependency CLI (`taste`), a modular `SKILL.md` installer (`taste skill`), a CI prompt quality gate (`taste check`), an LLM-driven Linus Torvalds critic (`taste roast`), a prompt token compactor (`taste prune`), a philosophy comparator (`taste diff`), dynamic SVG badges (`taste card` / `taste badge`), and an autonomous trending radar (`scripts/radar.py`).

---

## 🛡️ Critical Invariants & Rules

### 1. Zero Secret Leaks (Strict Security Policy)
* **NEVER** hardcode, echo, print, or commit API keys (`OPENAI_API_KEY`, `GITHUB_TOKEN`, or any bearer tokens).
* Always read credentials from environment variables (`process.env.OPENAI_API_KEY` or `os.environ.get("OPENAI_API_KEY")`).
* Default OpenAI-compatible base URL must strictly be `https://api.openai.com/v1`. Do not expose proprietary third-party proxy URLs in source code.

### 2. Pure English Only (Zero Non-English Characters)
* All source code, comments, documentation, commit messages, test cases, and CLI outputs must be 100% pure English.
* Strictly zero Chinese characters (`[\u4e00-\u9fff]`) in any tracked file.

### 3. Zero External Runtime Dependencies
* The core CLI (`taste`) and engines (`src/*.js`) must remain **100% dependency-free**.
* Use only Node.js built-in standard libraries (`fs`, `path`, `https`, `http`, `crypto`, `child_process`, `url`, `readline`).
* Python radar and catalog scripts (`scripts/*.py`) must use standard libraries (`urllib`, `difflib`, `json`, `os`, `re`, `subprocess`, `pathlib`, `hashlib`, `datetime`, `argparse`).

### 4. Deterministic Offline Fallbacks
* Every feature utilizing LLM reasoning (`roast`, `prune`, `diff`, `radar`) must gracefully fall back to a deterministic offline analyzer when `OPENAI_API_KEY` is absent or network requests fail.
* The toolchain must never crash on network failure.

---

## 🧪 Testing & Verification Commands

```bash
# Run full CLI, Skills, and Quality Gate suite
npm test

# Run Web Gallery and Radar/Catalog offline regression tests
node --test test/gallery.test.js
python3 -m unittest discover -s test -p "test_*.py"
python3 scripts/build_catalog.py --check

# Self-audit repository agent contracts
node bin/taste.js check CLAUDE.md --min-score 75
node bin/taste.js check AGENTS.md --min-score 75
```

---

## 📁 Repository Organization
* `openclaw/`, `VoiceStudio/`, `stripe-java/`, ...: 26 curated open-source projects organized as top-level directories.
* `discovered/<owner>/<repo>/`: Isolated automated Radar archives verified by `META.json`.
* `registry/`: Modular Lego bricks (`styles/`, `tones/`, `presets/`) for taste stacking.
* `skills/`: Modular `SKILL.md` agent playbooks installable via `npx taste-code skill add <id>`.
* `src/`: Core engines (`stacker.js`, `skills.js`, `checker.js`, `pruner.js`, `differ.js`, `roaster.js`, `card.js`).
* `api/`: Serverless HTTP SVG card & badge endpoints (`api/card.js`, `api/badge.js`).
* `scripts/`: Autonomous trending radar (`radar.py`), structural diff analyzer (`llm_client.py`), and catalog builder (`build_catalog.py`).
* `docs/`: Interactive Web Gallery v2.0 with inline rule preview, Skills Explorer, Token Pruner, and Badge Studio.
* `test/`: Zero-dependency Node.js and Python test suites.
