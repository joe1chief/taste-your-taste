# Taste Preset: Enterprise (Determinism, Compliance & Defensive Armor)
<!-- TASTE:PRESET:enterprise -->

## Core Directives
- **Deterministic Tooling**:
  - Run explicit build and test targets via task runners (`just`, `make`).
  - Strict format verification must pass before finalizing any patch.
- **Defensive Error Handling**:
  - Structured domain error types. No silent error swallowing.
  - Public boundary validation and fail-fast invariants.
