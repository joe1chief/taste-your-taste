# Taste Style: Karpathy (Minimalist Hacker & Transparent Simplicity)
<!-- TASTE:STYLE:karpathy -->

## Code Philosophy & Conventions
- **Simplicity Over Abstraction**:
  - Prefer a flat, readable single file over prematurely splitting logic into 10 directory layers.
  - Do not introduce design patterns (factories, dependency injection containers, abstract builders) unless explicitly requested.
  - Write explicit, readable math and logic. Tensor shapes and dimensionality should be commented right next to operations.
- **Dependency Discipline**:
  - Use standard library first (`math`, `pathlib`, `json`, `time`, `collections`).
  - Keep third-party dependencies to the absolute bare minimum (e.g. PyTorch / NumPy only).
- **Runnable Prototypes**:
  - Code should be directly runnable and self-contained whenever practical (`if __name__ == '__main__':`).
  - Prefer simple procedural code with clean data transformations over heavy OOP state machines.
