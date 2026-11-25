# VoiceStudio

> Curated developer taste from [debpalash/VoiceStudio](https://github.com/debpalash/VoiceStudio).

- **Repository**: [debpalash/VoiceStudio](https://github.com/debpalash/VoiceStudio)
- **Stars**: ⭐️ **49,880+**
- **Primary Language**: Python / Electron / Swift / Kotlin
- **Taste Archetype**: **Anti-Slop Minimalist**

## 💡 Taste Highlights
- **Strict Token Economy**: Default to the shortest response that fully answers; outlines and tables over prose; 1-line status updates; never restate diffs or re-derive what CI/review bots already computed.
- **Mechanical Rules Belong in Tests**: Enforces changelog style, 21-locale i18n parity, version lockstep, and mobile contract drift via deterministic pytest suites rather than LLM prose reminders.
- **Honest Offline CI Simulation**: Runs tests with `HF_HUB_OFFLINE=1` and an empty `HF_HUB_CACHE` so populated local developer caches cannot mask missing network gates.
- **Cross-Platform Behaviour Parity**: Distinguishes user-visible behaviour parity across macOS, Windows, Linux, iOS, and Android from host-specific hardware acceleration (`CUDA`/`MPS`/`DirectML`).
- **Clean Git Attribution & Merge Discipline**: Prohibits agent `Co-authored-by:` trailer noise, enforces pre-merge fixes directly on PR branches, and watches post-merge `main` runs to green.

## 📁 Rule Files in This Directory
- [`CLAUDE.md`](./CLAUDE.md)
- [`AGENTS.md`](./AGENTS.md)
