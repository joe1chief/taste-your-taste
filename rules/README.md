# 🏛️ Curated Star Agent Rules Catalog (`rules/`)

This directory provides direct, organized access to real-world agent instruction files (`CLAUDE.md`, `AGENTS.md`, `.agent/rules.md`) collected from star open-source repositories.

Each file reflects authentic engineering philosophies, architectural guardrails, and anti-slop constraints established by top maintainers.

---

## 📋 The Rules Index

| Rule File | Source Repository | Stars | Language | Taste Archetype | Core Philosophy & Highlights |
| :--- | :--- | :---: | :---: | :---: | :--- |
| [`nvidia-openshell.AGENTS.md`](./nvidia-openshell.AGENTS.md) | [NVIDIA / OpenShell](https://github.com/NVIDIA/OpenShell) | ⭐️ 11.6k | Rust | **Anti-Slop Minimalist** | Injected on every prompt; strictly forbids unsolicited restructuring or stylistic churn. |
| [`stripe-java.CLAUDE.md`](./stripe-java.CLAUDE.md) | [Stripe / stripe-java](https://github.com/stripe/stripe-java) | ⭐️ 600+ | Java | **Engineering Craft** | Precise `just` test runners, Spotless format commands, and explicit HTTP abstraction maps. |
| [`tidyverse-readr.CLAUDE.md`](./tidyverse-readr.CLAUDE.md) | [tidyverse / readr](https://github.com/tidyverse/readr) | ⭐️ 1.1k | R / C++ | **Defensive Architect** | Enforces clean boundary between Edition 2 (lazy parsing) and Edition 1 (eager C++ parser). |
| [`securego-gosec.CLAUDE.md`](./securego-gosec.CLAUDE.md) | [securego / gosec](https://github.com/securego/gosec) | ⭐️ 5.4k | Go | **Defensive Architect** | AST node inspection invariants, rule ID stability, and deterministic test invocation. |
| [`keras-cv.agent.md`](./keras-cv.agent.md) | [leondgarse / keras_cv_attention_models](https://github.com/leondgarse/keras_cv_attention_models) | ⭐️ 1.7k | Python | **Hacker Velocity** | `black -l 160`, single-line multi-assignments, compact procedural clarity, thin wrapper pattern. |
| [`voicestudio.CLAUDE.md`](./voicestudio.CLAUDE.md) | [debpalash / VoiceStudio](https://github.com/debpalash/VoiceStudio) | ⭐️ 49.8k | Python / TS | **Anti-Slop Minimalist** | Radical token economy: status updates 1 line max, zero conversational filler, direct git diffs. |
| [`voicestudio.AGENTS.md`](./voicestudio.AGENTS.md) | [debpalash / VoiceStudio](https://github.com/debpalash/VoiceStudio) | ⭐️ 49.8k | Electron | **Engineering Craft** | Strict Electron runtime boundaries, elimination of deprecated legacy UI paths, local-first execution. |

---

## 🛠️ How to Use These Rules

### 1. Test or Roast Any Rule
Audit any rule's token efficiency and Linus Torvalds score:
```bash
npx taste-code roast rules/stripe-java.CLAUDE.md
```

### 2. Compare Engineering Philosophies
See how two world-class approaches contrast:
```bash
npx taste-code diff rules/stripe-java.CLAUDE.md rules/keras-cv.agent.md
```

### 3. De-slop & Compact
Distill any sprawling rule file to save context tokens:
```bash
npx taste-code prune rules/voicestudio.CLAUDE.md
```

### 4. Stack Into Your Own Repository
Blend modular styles and tones into your project:
```bash
npx taste-code blend --style stripe --tone terse
```
