<div align="center">

# 🍷 Taste Your Taste
### *Autonomous Developer Taste Curation & Vibe Stacking Engine for AI Agents*

**CLAUDE.md • .cursorrules • .cursor/rules/*.mdc • AGENTS.md • .agent/rules.md**

<p align="center">
  <a href="https://github.com/joe1chief/taste-your-taste/actions/workflows/radar.yml">
    <img src="https://github.com/joe1chief/taste-your-taste/actions/workflows/radar.yml/badge.svg" alt="Taste Radar Status">
  </a>
  <a href="https://github.com/joe1chief/taste-your-taste/actions/workflows/taste-roast.yml">
    <img src="https://img.shields.io/badge/taste--tested%20by-Linus%20Torvalds-crimson?style=flat&logo=linux" alt="Taste Tested">
  </a>
  <a href="https://www.npmjs.com/package/taste-code">
    <img src="https://img.shields.io/badge/npm-taste--code-blueviolet?style=flat&logo=npm" alt="npm package">
  </a>
  <a href="https://github.com/joe1chief/taste-your-taste/stargazers">
    <img src="https://img.shields.io/github/stars/joe1chief/taste-your-taste?style=flat&color=yellow" alt="GitHub Stars">
  </a>
  <a href="./LICENSE">
    <img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License">
  </a>
</p>

<p align="center">
  <b>"Code generation is cheap. Taste is rare."</b>
</p>

<p align="center">
  <img src="./taste-card.svg" alt="Developer Taste Card Preview" width="520">
</p>

```bash
# 🧙 Interactive 10-Second Setup Wizard:
npx taste-code init

# 🍸 Instant Vibe Stacking (Lego Bricks):
npx taste-code blend --style antfu --tone karpathy

# 💧 Token Compactor & De-slop Optimizer (Save 30-70% Context Tokens):
npx taste-code prune CLAUDE.md --write

# ⚖️ Engineering Philosophy Comparator (Antfu vs Karpathy):
npx taste-code diff antfu karpathy

# 🌶️ Savage Linus Torvalds Taste Roast Critic:
npx taste-code roast CLAUDE.md

# 🪪 Dynamic GitHub Profile Taste Badge Generator:
npx taste-code card --user yourname --output taste-card.svg
```

</div>

---

## 📖 The Manifesto

In the pre-AI era, developers loved exploring the `.dotfiles` (`.zshrc`, `.vimrc`, `tmux.conf`) of legendary hackers to see how they tuned their tools.

In the **Vibe Coding** era, human programmers don't write every line of syntax by hand. Instead, **developer taste** is captured in the behavioral guardrails, engineering constraints, and architectural temperaments we impart to our AI agents:

* How do world-class teams prevent AI slop (verbose apologies, gratuitous mocks, boilerplate)?
* How do high-velocity solo developers force AI to produce concise, elegant diffs?
* How do infrastructure projects like NVIDIA, Stripe, and tidyverse instruct Claude Code and Cursor?

**`taste-your-taste`** is an end-to-end, LLM-first developer ecosystem:
1. 🛠️ **`taste` CLI**: A zero-dependency Lego-brick stacking tool to blend master developer tastes into your repository.
2. 🧙 **`taste init` Wizard**: Interactive 10-second TUI to configure CLAUDE.md, Cursor MDC, or Antigravity rules.
3. 💧 **`taste prune` (De-slop Compactor)**: Strips out polite conversational filler and tautological fluff while preserving 100% of technical rules, reducing context window tax by 30-70%.
4. ⚖️ **`taste diff` (Philosophy Comparator)**: Side-by-side comparative analysis contrasting conflicting engineering temperaments (e.g., Antfu vs Karpathy).
5. 🌶️ **Taste Roast Critic**: Linus Torvalds-inspired LLM critic that audits your agent instructions with brutal technical honesty.
6. 🪪 **`taste card` & SVG Badge API**: Generates a sleek, embeddable GitHub Profile Taste Card showcasing your Archetype, Taste DNA, and Linus Verdict.
7. 🏛️ **Curated Star Rules ([`rules/`](./rules))**: Authentic, battle-tested configs harvested from top open-source projects organized in the top-level directory.
8. 📡 **Autonomous LLM Radar**: GitHub Action engine that monitors GitHub Trending and tracks Prompt Evolution via Git Blob SHAs.
9. 🌐 **[Interactive Web Gallery](https://joe1chief.github.io/taste-your-taste)**: Real-time explorer, Taste Blender, Pruner preview, and live Badge Studio.

---

## 🚀 Key Features

### 1. 🧙 Interactive Setup Wizard (`taste init`)
Configure your project in 10 seconds through an interactive terminal interface:
```bash
npx taste-code init
```
The wizard guides you through selecting:
* **Target Format**: `CLAUDE.md`, `.cursor/rules/*.mdc`, `.cursorrules`, `.agent/rules.md`, or `AGENTS.md`.
* **Engineering Style**: `antfu`, `karpathy`, `stripe`, `minimalist`, `defensive`, `hacker`.
* **Agent Tone**: `karpathy` (anti-slop diff-first), `linus` (anti-overengineering), `terse` (ultra-compact), `teacher` (edge-case pedagogy).

---

### 2. 🍸 Taste Stacking Engine (`taste add` & `taste blend`)
Copy-pasting someone else's 300-line prompt is clumsy and brittle. **`taste`** breaks master developer styles and agent tones into atomic, composable Lego bricks.

```bash
# View all available styles, tones, and presets
npx taste-code list

# Stack minimalist zero-dependency rules into CLAUDE.md
npx taste-code add minimalist

# Stack Antfu TypeScript rules into Modern Cursor MDC (.cursor/rules/taste.mdc)
npx taste-code add antfu --target mdc

# Blend Antfu's TypeScript strictness with Karpathy's terse, outcome-driven tone
npx taste-code blend --style antfu --tone karpathy
```

#### Non-Destructive Marker Boundaries
The CLI manages rules using non-destructive block boundaries (`<!-- TASTE:STYLE:... -->` and `<!-- TASTE:TONE:... -->`). You can re-run and re-stack at any time without duplicating content or overwriting your own custom rules.

#### Supported Rule Formats & Targets
| Target Flag | Generated File | Target Agent / IDE |
| :--- | :--- | :--- |
| *(default)* | `CLAUDE.md` | Claude Code (Root) |
| `--target dotclaude` | `.claude/CLAUDE.md` | Claude Code (Nested) |
| `--target mdc` | `.cursor/rules/<name>.mdc` | Modern Cursor (with YAML frontmatter) |
| `--target cursor` | `.cursorrules` | Legacy Cursor |
| `--target agent` | `.agent/rules.md` | Google Antigravity / Gemini Agent |
| `--target agents` | `AGENTS.md` | Multi-Agent Specification standard |

---

### 3. 💧 Token Compactor: `taste prune`
Agent instructions (`CLAUDE.md`, `.cursorrules`, `AGENTS.md`) are injected into the LLM context on **every single prompt or turn**. Verbose corporate platitudes, excessive politeness, and conversational slop silently inflate your API bills and dilute the model's attention.

**`taste prune`** strips conversational filler and tautological fluff while **preserving 100% of functional engineering commands, linters, and architectural invariants**:

```bash
# Preview token savings and distilled prompt
npx taste-code prune CLAUDE.md

# Prune and overwrite file in-place with automatic .bak backup
npx taste-code prune CLAUDE.md --write --backup
```

#### What It De-slops:
* 📉 **Politeness Tax**: Removes *"Please"*, *"Kindly"*, *"If you make a mistake apologize immediately"*.
* 🧽 **Tautological Fluff**: Cuts *"Always write clean, readable code and follow all best practices"*.
* 🛡️ **Zero Loss of Invariants**: Strictly preserves testing commands (`npm test`, `pytest`), linter commands (`eslint --fix`), and negative constraints (`never introduce 'any'`).
* ⚡ **Context Economy**: Reduces instruction token overhead by **30% to 70%**.

---

### 4. ⚖️ Taste Philosophy Differ: `taste diff`
Engineering cultures collide. Should an agent be an obsessive TypeScript perfectionist, or a single-file raw PyTorch hacker?

**`taste diff`** runs an architectural and philosophical contrast between two flavors or existing files:

```bash
# Compare two master archetypes
npx taste-code diff antfu karpathy

# Compare existing configs
npx taste-code diff CLAUDE.md .cursorrules
```

#### Sample Output:
```text
┌─ ⚡ TASTE PHILOSOPHY DIFF ─────────────────────────────────────────────────────────────────────────┐
│ 🥊 Comparing: antfu vs karpathy                                                               │
│                                                                                               │
│ 💥 The Philosophy Clash:                                                                      │
│   antfu demands rigorous type safety, modular packages, and modern ESM tooling.               │
│   karpathy prioritizes raw readability, single-file scripts, zero unnecessary dependencies,   │
│   and immediate algorithmic transparency over formal abstractions.                            │
│                                                                                               │
│ 🔍 Key Contrasts:                                                                             │
│   • antfu enforces strict TypeScript compilation and automated linting.                      │
│   • karpathy favors flat script simplicity and zero dependency overhead.                      │
│                                                                                               │
│ 🎯 When to choose antfu: Multi-package TS libraries, production enterprise codebases.          │
│ 🎯 When to choose karpathy: Machine learning experiments, proof-of-concepts, hackathons.      │
└───────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

### 5. 🌶️ Taste Roast: LLM-Driven Linus Torvalds Critique
How good are your agent instructions? Are you paying Anthropic or OpenAI to generate verbose corporate apologies?

Run the **Taste Roast**:
```bash
npx taste-code roast [path/to/CLAUDE.md]
```

#### What It Audits (Powered by LLM):
* 🧠 **LLM Semantic Evaluation**: Evaluates constraints, actionable commands, and token economics.
* 📉 **Fluff & Platitude Index**: Detects useless corporate clichés (*"write clean code"*, *"strive for excellence"*, *"be helpful"*).
* 💸 **Politeness Tax**: Calculates token budget wasted on polite greetings and apologies (*"please"*, *"kindly"*, *"sorry"*).
* 🛡️ **Negative Armor**: Verifies whether you gave the AI explicit boundaries (*"never"*, *"do not"*, *"prohibit"*).
* ⚙️ **Verifiable Tooling**: Checks whether the agent was given exact test/linter commands to verify its output.
* 💯 **Taste Score (0-100)**: From `CRIMINAL TOXIC WASTE` to `CHEF'S TASTE`.

#### Sample Output:
```text
┌─ 🌶️ TASTE ROAST REPORT ────────────────────────────────────────────────────────────────────────┐
│ Target File: CLAUDE.md                                                                        │
│ Lines: 7  |  Tokens: ~61  |  Words: 45  |  Engine: 🧠 LLM Reasoning                            │
│                                                                                               │
│ Taste Score: 12 / 100 [███░░░░░░░░░░░░░░░░░░░░░░░░░░░]                                        │
│ Verdict:     CRIMINAL TOXIC WASTE                                                             │
│                                                                                               │
│ 🔥 Sins & Pathology Detected:                                                                 │
│   ❌ Zero specificity — 'clean code' is undefined and unmeasurable                            │
│   ❌ 'Be helpful' is a vibe, not an operational instruction                                  │
│   ❌ No output contract or verifiable testing commands                                       │
│                                                                                               │
│ 🎙️ Linus Torvalds Roasts Your Taste:                                                         │
│   "This isn't a code review, it's a fortune cookie. 'Write clean code' is what every         │
│    professor says before assigning homework they won't grade."                                │
│                                                                                               │
│ 💊 Remedy & Prescription:                                                                     │
│   Run npx taste-code blend --style minimalist --tone terse to replace fluff with discipline. │
└───────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

### 6. 🪪 Dynamic Profile Taste Card: `taste card` & SVG Badge API
Showcase your developer taste DNA directly on your GitHub Profile README, project documentation, or website with dynamic, dark-mode SVG vector badges.

#### Local CLI Vector Card Generator
```bash
# Generate local taste-card.svg based on your active rules
npx taste-code card --user yourname --output taste-card.svg

# Customize styles and tones directly
npx taste-code card --user yourname --style antfu --tone karpathy
```

#### Live Dynamic Serverless SVG Badge API
You can embed your real-time Taste Card directly using the serverless Badge endpoint:
```markdown
[![My Developer Taste](https://taste-your-taste.vercel.app/api/card?user=antfu&style=antfu&tone=linus&score=96&archetype=Defensive+Architect)](https://github.com/joe1chief/taste-your-taste)
```

#### Badge API Query Parameters:
| Parameter | Default | Description |
| :--- | :--- | :--- |
| `user` | `developer` | GitHub username displayed on card |
| `style` | `antfu` | Active developer style module |
| `tone` | `karpathy` | Active persona / agent tone |
| `archetype` | `Engineering Craft` | Architectural archetype (Defensive Architect, Hacker Velocity, etc.) |
| `score` | `92` | Taste score (0 - 100) |
| `linus` | `Chef's taste.` | Custom Linus Torvalds verdict snippet |

---

## 🏛️ Curated Star Rules (`rules/`)

Organized directly in the top-level [`rules/`](./rules) directory:

| Rule File | Repository | Stars | Language | Taste Archetype | Key Highlight |
| :--- | :--- | :---: | :---: | :---: | :--- |
| [`nvidia-openshell.AGENTS.md`](./rules/nvidia-openshell.AGENTS.md) | [NVIDIA / OpenShell](https://github.com/NVIDIA/OpenShell) | ⭐️ 11.6k | Rust | Anti-Slop Minimalist | Injected on every prompt; strictly forbids unsolicited restructuring. |
| [`stripe-java.CLAUDE.md`](./rules/stripe-java.CLAUDE.md) | [Stripe / stripe-java](https://github.com/stripe/stripe-java) | ⭐️ 600+ | Java | Engineering Craft | Exact `just` test runners, Spotless formatting commands, and HTTP map. |
| [`tidyverse-readr.CLAUDE.md`](./rules/tidyverse-readr.CLAUDE.md) | [tidyverse / readr](https://github.com/tidyverse/readr) | ⭐️ 1.1k | R / C++ | Defensive Architect | Boundary between Edition 2 (lazy parsing) and Edition 1 (eager C++ parser). |
| [`securego-gosec.CLAUDE.md`](./rules/securego-gosec.CLAUDE.md) | [securego / gosec](https://github.com/securego/gosec) | ⭐️ 5.4k | Go | Defensive Architect | AST walking rules, rule ID stability, deterministic test invocation. |
| [`keras-cv.agent.md`](./rules/keras-cv.agent.md) | [keras_cv_attention_models](https://github.com/leondgarse/keras_cv_attention_models) | ⭐️ 1.7k | Python | Hacker Velocity | `black -l 160`, single-line multi-assignments, thin wrapper pattern. |
| [`voicestudio.CLAUDE.md`](./rules/voicestudio.CLAUDE.md) | [VoiceStudio](https://github.com/debpalash/VoiceStudio) | ⭐️ 49.8k | Python / TS | Anti-Slop Minimalist | Explicit token economy; default to shortest response; status 1 line max. |
| [`voicestudio.AGENTS.md`](./rules/voicestudio.AGENTS.md) | [VoiceStudio](https://github.com/debpalash/VoiceStudio) | ⭐️ 49.8k | Electron | Engineering Craft | Active desktop Electron only; strict deprecation boundary; local-first. |

---

## 📡 The Autonomous LLM Radar

Powered by **GitHub Actions** and [`scripts/radar.py`](./scripts/radar.py), this repository monitors trending open-source projects daily using large language models instead of rigid regex heuristics:

```mermaid
flowchart LR
    A["🔥 GitHub Trending & High-Star Repos (⭐️ >= 1000)"] --> B["🤖 GitHub Actions (Daily Cron)"]
    B --> C["🔍 scripts/radar.py Engine"]
    C --> D{"Taste Files Found?"}
    D -- Yes --> E["🧠 LLM Architectural & Taste Assessment"]
    E --> F["📬 Create Review Issue & Stage to rules/"]
    F --> G["🏆 Maintainer Curates to Hall of Fame"]
    D -- No --> H["Sleep until next cycle"]
```

* **Strict Quality Gate**: Only captures repositories that are **either on GitHub Trending** (Daily/Weekly) or **have ⭐️ 1,000+ Stars** (rejecting personal/low-impact repos).
* **⚡ Prompt Evolution Tracking**: Stores Git Blob SHAs to detect when authors iterate or revise their prompts. When an author updates their rules, Radar detects the diff and triggers an evolution report issue!
* **🚀 Automated PR Staging (`--create-pr`)**: Optionally creates git branches and automated Pull Requests to stage newly discovered tastes straight into the repository.
* **Zero Spam**: History is tracked in `data/seen_repos.json` to prevent duplicates.

---

## ⚙️ Configuration & Security

Both the **`taste` CLI** and **Radar Engine** natively leverage OpenAI-compatible LLM endpoints:

```bash
# Optional: Set your preferred LLM provider (defaults to standard OpenAI)
export OPENAI_API_KEY="your-api-key"
export OPENAI_BASE_URL="https://api.openai.com/v1"
export LLM_MODEL="gpt-4o-mini"
```

### Security & Privacy Guarantees:
* **Zero Credential Leaks**: API keys are never stored, printed, logged, or bundled.
* **Offline Deterministic Fallback**: If no API key is provided or the network is unavailable, all CLI commands (`prune`, `diff`, `roast`, `card`) fall back to deterministic local heuristic analyzers without crashing.
* **Zero Runtime Dependencies**: The entire CLI runs directly on native Node.js standard libraries.

---

## 🤝 Contributing

1. **Submit via Issue**: Click [**✨ Submit a Developer Taste**](https://github.com/joe1chief/taste-your-taste/issues/new?template=taste_submission.yml).
2. **Submit a Taste Lego Brick**: Add a new style or tone to `registry/styles/` or `registry/tones/` and submit a Pull Request!

---

## 📄 License

Distributed under the [MIT License](./LICENSE). All curated taste files in `rules/` remain the copyright of their respective authors under their original open-source licenses.
