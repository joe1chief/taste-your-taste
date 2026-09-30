# Taste Style: Antfu (Anthony Fu Strict TypeScript / Modern ESM)
<!-- TASTE:STYLE:antfu -->

## Code Philosophy & Conventions
- **TypeScript Strictness**:
  - Prefer `type` for pure data structures and unions; use `interface` only for public extensible contracts.
  - Strict null-checking: never use `any`. Use `unknown` with runtime type narrowing or guards.
  - Keep types clean and inferred where possible. Do not duplicate obvious type annotations.
- **Modern Standards & Zero Bloat**:
  - Modern ESM first (`import` / `export`). Prefer named exports over default exports.
  - Rely on native runtime primitives (`structuredClone`, `fetch`, `crypto.randomUUID`, `URLPattern`) instead of adding lodash/ramda dependencies.
- **Architecture**:
  - Composition over inheritance: write pure, tree-shakeable utility functions rather than giant service classes.
  - Clean, alphabetically grouped imports (built-ins -> third-party -> internal aliases -> types).
