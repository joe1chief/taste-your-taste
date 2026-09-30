# CLAUDE.md — Project Taste & Operating Invariants

This file guides AI agents (Claude Code, Cursor, Windsurf, Antigravity) working on the `taste-your-taste` repository.

---

## 🎯 Project Mission
**Taste Your Taste** is an autonomous developer taste curation and vibe-stacking engine for AI agents. It provides a zero-dependency CLI (`taste`), an LLM-driven Linus Torvalds critic (`taste roast`), a prompt token compactor (`taste prune`), a philosophy comparator (`taste diff`), a dynamic GitHub profile badge generator (`taste card`), and an autonomous trending radar (`scripts/radar.py`).

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
* Use only Node.js built-in standard libraries (`fs`, `path`, `https`, `http`, `crypto`, `child_process`, `url`).
* Python radar scripts (`scripts/*.py`) must use standard libraries (`urllib.request`, `json`, `os`, `re`, `subprocess`).

### 4. Deterministic Offline Fallbacks
* Any feature utilizing LLM reasoning (`roast`, `prune`, `diff`, `radar`) must gracefully fall back to a deterministic offline heuristic when `OPENAI_API_KEY` is absent or network requests time out.
* The toolchain must never crash on network failure.

---

## 🧪 Testing & Verification Commands

```bash
# Run full unit and integration test suite (must pass 100%)
npm test

# Test taste CLI locally
node bin/taste.js --help
node bin/taste.js list
node bin/taste.js blend --style antfu --tone karpathy
node bin/taste.js prune rules/stripe-java.CLAUDE.md
node bin/taste.js diff antfu karpathy
node bin/taste.js card --user testuser --output taste-card.svg
```

---

## 📁 Repository Organization
* `rules/`: Curated agent rule files (`CLAUDE.md`, `AGENTS.md`) harvested from star open-source projects.
* `registry/`: Modular Lego bricks (`styles/`, `tones/`, `presets/`) for taste stacking.
* `src/`: Core engines (`stacker.js`, `pruner.js`, `differ.js`, `roaster.js`, `card.js`).
* `api/`: Serverless HTTP badge API endpoint (`api/card.js`).
* `scripts/`: Autonomous trending radar and prompt evolution engine (`radar.py`, `llm_client.py`).
* `docs/`: Interactive Web Gallery and Badge Studio (GitHub Pages).
* `test/`: Zero-dependency test suites (`test/cli.test.js`).
