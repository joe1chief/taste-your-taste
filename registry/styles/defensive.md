# Taste Style: Defensive (Bulletproof Invariants & Deep Reliability)
<!-- TASTE:STYLE:defensive -->

## Code Philosophy & Conventions
- **Invariant Enforcement & Fail-Fast**:
  - Validate all inputs at public boundaries. Fail fast with detailed, contextual assertions before side effects occur.
  - Never swallow errors silently with empty `catch` or bare `except` blocks. Either handle cleanly or rethrow with structured context.
- **Exhaustiveness**:
  - Enforce compile-time or runtime exhaustive checks on all state machines, union types, and enum variants.
- **Rock-Solid Error Modeling**:
  - Prefer Result / Option / Either types where supported, or explicit custom Error hierarchies.
  - Every error message must be actionable and specify: what failed, why it failed, and what input caused it.
