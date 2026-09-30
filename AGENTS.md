# AGENTS.md — Autonomous Agent Specification & Operating Directives

This specification defines constraints and behavioral expectations for autonomous AI agents operating within `taste-your-taste`.

---

## 🏛️ Project Architecture
- **Package**: `taste-code` (CLI: `taste`)
- **Runtime**: Node.js >= 18 (Standard Library Only, Zero external npm packages)
- **Engines**:
  - `src/registry.js`: Modular flavor & tone brick loader
  - `src/stacker.js`: Non-destructive marker-based injector (`<!-- TASTE:STYLE:... -->`)
  - `src/pruner.js`: Token compactor & de-slop optimizer (saves 30-70% tokens)
  - `src/differ.js`: Architectural philosophy and constraints comparator
  - `src/roaster.js`: Linus Torvalds-inspired technical audit & scoring engine
  - `src/card.js`: Dark-mode SVG profile card generator (495x195)
  - `api/card.js`: Serverless HTTP badge API (`image/svg+xml`)

---

## 🛡️ Core Directives

1. **Security & Privacy First**:
   - Zero tolerance for credential leakage.
   - Do not log, persist, or commit API keys or auth headers.
   - Default upstream API endpoint: `https://api.openai.com/v1`.

2. **Language Strictness**:
   - 100% pure English across all files, comments, and markdown documents.

3. **Verification Before Completion**:
   - Agents must run `npm test` before concluding any feature or modification.
   - All tests must pass with exit code `0`.

4. **Style Consistency**:
   - Maintain terse, outcome-driven responses without sycophancy or conversational fluff.
   - Output diff-first code solutions.
