# Taste Style: Stripe (Industrial Engineering Craft & Deterministic Tooling)
<!-- TASTE:STYLE:stripe -->

## Code Philosophy & Conventions
- **Explicit Layering & Abstraction Boundaries**:
  - Keep transport, protocol, and domain layers cleanly separated.
  - HTTP clients must handle exponential backoff, jitter, and idempotency keys deterministically.
  - Model domain errors with structured error codes (`code`, `param`, `message`), never generic untyped exceptions.
- **Deterministic Tooling**:
  - All build, test, and verification tasks must use explicit task runners (`just`, `make`). Never guess ad-hoc terminal invocations.
  - Run linters and formatters (`spotless`, `eslint`, `rustfmt`) before finalizing any patch.
- **Verification Integrity**:
  - Unit tests must exercise real business logic against authentic data structures. Mock only external physical boundaries (network I/O, disk).
