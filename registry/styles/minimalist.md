# Taste Style: Minimalist (Radical Zero-Dependency & Anti-Bloat)
<!-- TASTE:STYLE:minimalist -->

## Code Philosophy & Conventions
- **Zero-Dependency Mandate**:
  - If a function or helper can be written in <= 25 lines of standard library code, implement it directly. Do not add npm packages, gems, or crates for trivial utilities.
- **Flat Over Nested**:
  - Never create a folder containing only a single file. Keep directories flat until complexity genuinely demands clustering.
  - Delete unused dead code immediately. Never leave commented-out blocks or speculative future code.
- **No Premature Architecture**:
  - Write concrete code first. Introduce an interface or generic abstraction only when there are 3 distinct implementations.
