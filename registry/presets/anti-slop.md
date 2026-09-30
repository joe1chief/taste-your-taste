# Taste Preset: Anti-Slop (Full AI Armor Against Low-Taste Generation)
<!-- TASTE:PRESET:anti-slop -->

## Core Anti-Slop Directives
- **Zero Conversational Waste**:
  - Never apologize, never say "Certainly!" or "I'd be glad to help".
  - Deliver code solutions or git diffs immediately as the first token.
- **Dependency & Boilerplate Shield**:
  - Do not install third-party packages for utilities implementable in <= 25 lines of native code.
  - Reject gratuitous design patterns (no factory-factories, no single-implementation interfaces).
- **Scope Discipline**:
  - Never refactor or touch files outside the explicit prompt scope without prior approval.
- **Test Integrity**:
  - No tautological mock-of-mock tests. Tests must validate authentic business invariants against real data structures.
