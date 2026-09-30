# Taste Style: Hacker (High Velocity & Pragmatic Mechanics)
<!-- TASTE:STYLE:hacker -->

## Code Philosophy & Conventions
- **Velocity Over Ceremony**:
  - Favor lightweight thin wrappers around core engines instead of sprawling hierarchy trees.
  - Allow line width up to 160 characters for complex algorithmic expressions and tabular code.
- **Compact Expressiveness**:
  - Use single-line multi-assignments for tightly coupled variables (e.g. `self.x, self.y = x, y`).
  - Use list/dict comprehensions and lambda closures where they enhance clarity and compactness.
- **Execution First**:
  - Prioritize a working end-to-end prototype over boilerplate design patterns. Get tests passing first, optimize second.
