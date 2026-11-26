/**
 * Taste DNA Engine (src/dna.js)
 * Offline Git history & codebase genome scanner that computes a developer's
 * 3-part Master Archetype blend (summing to 100%), 4-axis Code Genotype (MBTI),
 * reverse-engineers a personalized CLAUDE.md / AGENTS.md operational contract,
 * and renders a shareable Wrapped-style Genome Sequencer HUD SVG card.
 *
 * Zero external runtime dependencies. 100% offline deterministic execution.
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { THEMES, computeHexSig } = require('./card');

const IGNORED_DIRS = new Set([
  '.git',
  'node_modules',
  'dist',
  'build',
  'out',
  'coverage',
  '.next',
  '.nuxt',
  '.cache',
  'venv',
  '.venv',
  '__pycache__',
  'target',
  'vendor',
  'discovered',
  '.idea',
  '.vscode',
]);

const SOURCE_EXT_LANG = {
  '.ts': 'TypeScript',
  '.tsx': 'TypeScript',
  '.js': 'JavaScript',
  '.mjs': 'JavaScript',
  '.cjs': 'JavaScript',
  '.jsx': 'JavaScript',
  '.py': 'Python',
  '.rs': 'Rust',
  '.go': 'Go',
  '.java': 'Java',
  '.kt': 'Kotlin',
  '.c': 'C',
  '.h': 'C/C++',
  '.cpp': 'C++',
  '.cc': 'C++',
  '.swift': 'Swift',
  '.rb': 'Ruby',
  '.sh': 'Shell',
};

const MASTER_PERSONAS = {
  karpathy: {
    id: 'karpathy',
    name: 'Karpathy',
    tagline: 'Single-File Minimalist',
    color: '#38bdf8',
    styleKey: 'karpathy',
    toneKey: 'karpathy',
    trait: 'Flat files, stdlib-first primitives, transparent logic, zero premature OOP.',
  },
  antfu: {
    id: 'antfu',
    name: 'Antfu',
    tagline: 'Strict Type Purist',
    color: '#10b981',
    styleKey: 'antfu',
    toneKey: 'terse',
    trait: 'Strict typing without any, conventional commits, modern modular hygiene.',
  },
  linus: {
    id: 'linus',
    name: 'Linus',
    tagline: 'Kernel Pragmatist',
    color: '#f59e0b',
    styleKey: 'defensive',
    toneKey: 'linus',
    trait: 'Explicit invariants, defensive boundaries, zero tolerance for over-abstraction.',
  },
  stripe: {
    id: 'stripe',
    name: 'Stripe',
    tagline: 'Industrial Architect',
    color: '#a855f7',
    styleKey: 'stripe',
    toneKey: 'terse',
    trait: 'High test density, deterministic CI runners, ironclad interface contracts.',
  },
  goblin: {
    id: 'goblin',
    name: 'Night Owl',
    tagline: '2AM Velocity Hacker',
    color: '#f43f5e',
    styleKey: 'hacker',
    toneKey: 'karpathy',
    trait: 'Late-night shipping surges, dense expressive lines, rapid MVP velocity.',
  },
};

function escapeXml(unsafe) {
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function median(values) {
  if (!values || values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    : sorted[mid];
}

/**
 * Parse up to `maxCommits` from local git history safely without shell interpolation.
 */
function scanGitHistory(cwd, maxCommits = 100) {
  const result = {
    hasGit: false,
    commitCount: 0,
    topAuthor: 'developer',
    nightCommitRatio: 0,
    conventionalRatio: 0,
    terseMsgRatio: 0,
    medianChangedLines: 40,
    peakHour: 15,
  };

  try {
    const rawLog = execFileSync(
      'git',
      ['log', `-n`, String(maxCommits), '--pretty=format:COMMIT|%ai|%an|%s', '--shortstat'],
      { cwd, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 5000 }
    );
    if (!rawLog || !rawLog.trim()) return result;
    return parseGitLogText(rawLog);
  } catch {
    return result;
  }
}

function isAutomatedBotAuthor(name) {
  return /\[bot\]$|^github-actions|^dependabot|^renovate|^semantic-release|^codecov/i.test(String(name || '').trim());
}

/**
 * Pure parser for git log text (also used by browser client-side DNA sandbox!).
 * Automatically prioritizes human commits over CI/bot commits when present.
 */
function parseGitLogText(rawLog) {
  const lines = String(rawLog || '').split('\n');
  let allCommitCount = 0;
  let humanCommitCount = 0;
  let allNight = 0;
  let humanNight = 0;
  let allConv = 0;
  let humanConv = 0;
  let allTerse = 0;
  let humanTerse = 0;
  const allAuthors = {};
  const humanAuthors = {};
  const allHours = new Array(24).fill(0);
  const humanHours = new Array(24).fill(0);
  const allChanged = [];
  const humanChanged = [];
  let lastCommitWasHuman = true;

  const convRegex = /^(feat|fix|chore|refactor|docs|test|perf|ci|build|style)(\([^)]+\))?!?:\s+/i;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    if (line.startsWith('COMMIT|')) {
      const parts = line.split('|');
      const dateStr = parts[1] || '';
      const author = (parts[2] || 'developer').trim();
      const subject = parts.slice(3).join('|').trim();
      const isHuman = !isAutomatedBotAuthor(author);
      lastCommitWasHuman = isHuman;

      allCommitCount++;
      allAuthors[author] = (allAuthors[author] || 0) + 1;
      if (isHuman) {
        humanCommitCount++;
        humanAuthors[author] = (humanAuthors[author] || 0) + 1;
      }

      const hourMatch = dateStr.match(/\s(\d{2}):\d{2}:\d{2}/);
      if (hourMatch) {
        const hr = parseInt(hourMatch[1], 10);
        if (hr >= 0 && hr < 24) {
          allHours[hr]++;
          if (hr >= 22 || hr < 5) allNight++;
          if (isHuman) {
            humanHours[hr]++;
            if (hr >= 22 || hr < 5) humanNight++;
          }
        }
      }

      const isConv = convRegex.test(subject);
      const wordCount = subject.split(/\s+/).filter(Boolean).length;
      const isTerse = wordCount <= 5 || subject.length <= 32;

      if (isConv) {
        allConv++;
        if (isHuman) humanConv++;
      }
      if (isTerse) {
        allTerse++;
        if (isHuman) humanTerse++;
      }
    } else if (/files?\s+changed/.test(line)) {
      const ins = line.match(/(\d+)\s+insertions?/);
      const del = line.match(/(\d+)\s+deletions?/);
      const total = (ins ? parseInt(ins[1], 10) : 0) + (del ? parseInt(del[1], 10) : 0);
      if (total > 0) {
        allChanged.push(total);
        if (lastCommitWasHuman) humanChanged.push(total);
      }
    } else {
      // Support plain `git log --oneline` lines pasted in browser
      const onelineMatch = line.match(/^[0-9a-f]{6,12}\s+(.+)$/i);
      if (onelineMatch) {
        allCommitCount++;
        humanCommitCount++;
        const subj = onelineMatch[1].trim();
        if (convRegex.test(subj)) {
          allConv++;
          humanConv++;
        }
        if (subj.split(/\s+/).length <= 5) {
          allTerse++;
          humanTerse++;
        }
      }
    }
  }

  if (allCommitCount === 0) {
    return {
      hasGit: false,
      commitCount: 0,
      topAuthor: 'developer',
      nightCommitRatio: 0,
      conventionalRatio: 0,
      terseMsgRatio: 0,
      medianChangedLines: 40,
      peakHour: 15,
    };
  }

  const useHuman = humanCommitCount > 0;
  const effCount = useHuman ? humanCommitCount : allCommitCount;
  const effNight = useHuman ? humanNight : allNight;
  const effConv = useHuman ? humanConv : allConv;
  const effTerse = useHuman ? humanTerse : allTerse;
  const effHours = useHuman ? humanHours : allHours;
  const effChanged = useHuman && humanChanged.length ? humanChanged : allChanged;
  const effAuthors = useHuman ? humanAuthors : allAuthors;

  const topAuthor = Object.entries(effAuthors).sort((a, b) => b[1] - a[1])[0]?.[0] || 'developer';
  let peakHour = 14;
  let maxHrCount = -1;
  effHours.forEach((cnt, hr) => {
    if (cnt > maxHrCount) {
      maxHrCount = cnt;
      peakHour = hr;
    }
  });

  return {
    hasGit: true,
    commitCount: allCommitCount,
    humanCommitCount: effCount,
    topAuthor,
    nightCommitRatio: Number((effNight / effCount).toFixed(3)),
    conventionalRatio: Number((effConv / effCount).toFixed(3)),
    terseMsgRatio: Number((effTerse / effCount).toFixed(3)),
    medianChangedLines: effChanged.length ? median(effChanged) : 36,
    peakHour,
  };
}

/**
 * Walk repository tree (bounded) to measure structure, tooling, dependencies, and code style.
 */
function scanCodebaseStructure(cwd) {
  const sourceFiles = [];
  const testFiles = [];
  const depths = [];
  const langCounts = {};

  function walk(dir, depth) {
    if (depth > 6 || sourceFiles.length + testFiles.length > 400) return;
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (IGNORED_DIRS.has(entry.name)) continue;
      if (entry.name.startsWith('.') && entry.name !== '.github') continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full, depth + 1);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        const lang = SOURCE_EXT_LANG[ext];
        if (!lang) continue;

        depths.push(depth);
        langCounts[lang] = (langCounts[lang] || 0) + 1;
        const rel = path.relative(cwd, full).replace(/\\/g, '/');
        const lowerRel = rel.toLowerCase();
        const isTest =
          lowerRel.startsWith('test/') ||
          lowerRel.startsWith('tests/') ||
          lowerRel.includes('/__tests__/') ||
          lowerRel.includes('.test.') ||
          lowerRel.includes('.spec.') ||
          lowerRel.includes('_test.') ||
          path.basename(lowerRel).startsWith('test_');

        if (isTest) {
          testFiles.push(full);
        } else {
          sourceFiles.push(full);
        }
      }
    }
  }

  walk(cwd, 1);

  // Inspect manifests & configs
  let runtimeDeps = 0;
  let hasZeroDeps = false;
  let strictTypes = false;
  const detectedCommands = {
    test: null,
    lint: null,
    build: null,
  };

  const pkgPath = path.join(cwd, 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      runtimeDeps = Object.keys(pkg.dependencies || {}).length;
      if (runtimeDeps === 0) hasZeroDeps = true;
      const scripts = pkg.scripts || {};
      if (scripts.test && !scripts.test.includes('no test specified')) {
        detectedCommands.test = 'npm test';
      }
      if (scripts.lint) detectedCommands.lint = 'npm run lint';
      if (scripts.typecheck) detectedCommands.lint = detectedCommands.lint || 'npm run typecheck';
      if (scripts.build) detectedCommands.build = 'npm run build';
    } catch {
      // ignore malformed package.json
    }
  }

  const tsconfigPath = path.join(cwd, 'tsconfig.json');
  if (fs.existsSync(tsconfigPath)) {
    try {
      const rawTs = fs.readFileSync(tsconfigPath, 'utf-8');
      if (/"strict"\s*:\s*true/.test(rawTs)) strictTypes = true;
    } catch {
      // ignore
    }
  }

  const pyprojPath = path.join(cwd, 'pyproject.toml');
  if (fs.existsSync(pyprojPath)) {
    try {
      const rawPy = fs.readFileSync(pyprojPath, 'utf-8');
      if (/pytest/.test(rawPy)) detectedCommands.test = detectedCommands.test || 'pytest -q';
      if (/ruff/.test(rawPy)) detectedCommands.lint = detectedCommands.lint || 'ruff check .';
      if (/mypy|pyright/.test(rawPy)) strictTypes = true;
    } catch {
      // ignore
    }
  }

  if (fs.existsSync(path.join(cwd, 'Cargo.toml'))) {
    detectedCommands.test = detectedCommands.test || 'cargo test';
    detectedCommands.lint = detectedCommands.lint || 'cargo clippy -- -D warnings';
    strictTypes = true;
  }
  if (fs.existsSync(path.join(cwd, 'go.mod'))) {
    detectedCommands.test = detectedCommands.test || 'go test ./...';
    strictTypes = true;
  }
  if (!detectedCommands.test && testFiles.some((f) => f.endsWith('.py'))) {
    detectedCommands.test = 'python3 -m unittest discover -s test -p "test_*.py"';
  }

  // Sample up to 30 source files to measure function length, line width, defensive checks, and typing
  const sampled = sourceFiles.slice(0, 30);
  const fnLengths = [];
  let longLines = 0;
  let totalCodeLines = 0;
  let defensiveHits = 0;
  let anyHits = 0;
  let typeAnnotationHits = 0;
  let classHits = 0;
  let funcHits = 0;
  let camelHits = 0;
  let snakeHits = 0;

  const fnStartRegex = /^\s*(?:export\s+)?(?:async\s+)?(?:function\s+\w+|def\s+\w+|fn\s+\w+|func\s+(?:\([^)]+\)\s*)?\w+|const\s+\w+\s*=\s*(?:async\s*)?\([^)]*\)\s*=>)/;

  for (const file of sampled) {
    let content;
    try {
      content = fs.readFileSync(file, 'utf-8').slice(0, 16000);
    } catch {
      continue;
    }
    const lines = content.split('\n');
    let currentFnLines = null;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('#') || trimmed.startsWith('*')) continue;
      totalCodeLines++;
      if (line.length > 115) longLines++;

      if (fnStartRegex.test(line)) {
        funcHits++;
        if (currentFnLines !== null && currentFnLines > 1) {
          fnLengths.push(Math.min(180, currentFnLines));
        }
        currentFnLines = 1;
      } else if (currentFnLines !== null) {
        currentFnLines++;
      }

      if (/\bclass\s+[A-Z]\w*/.test(line)) classHits++;
      if (/\b(assert|throw\s+new|raise\s+\w+|typeof\s+\w+\s*[!=]==|Array\.isArray|Number\.isNaN)\b/.test(line)) {
        defensiveHits++;
      }
      if (/:\s*any\b|<any>|\bas\s+any\b/.test(line)) anyHits++;
      if (/:\s*(string|number|boolean|Record<|Promise<|Optional\[|Dict\[|List\[|int\b|str\b)|->\s*\w+/.test(line)) {
        typeAnnotationHits++;
      }
      if (/\b[a-z]+[A-Z][a-zA-Z0-9]*\b/.test(line)) camelHits++;
      if (/\b[a-z]+_[a-z0-9_]+\b/.test(line)) snakeHits++;
    }
    if (currentFnLines !== null && currentFnLines > 1) {
      fnLengths.push(Math.min(180, currentFnLines));
    }
  }

  const primaryLanguage = Object.entries(langCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'JavaScript';
  if ((primaryLanguage === 'TypeScript' || primaryLanguage === 'Rust' || primaryLanguage === 'Go') && anyHits === 0) {
    strictTypes = true;
  }
  if (!fs.existsSync(pkgPath) && (primaryLanguage === 'Python' || primaryLanguage === 'C' || primaryLanguage === 'Go')) {
    if (!fs.existsSync(path.join(cwd, 'requirements.txt'))) hasZeroDeps = true;
  }

  const totalTrackedFiles = sourceFiles.length + testFiles.length;
  const testRatio = totalTrackedFiles > 0 ? Number((testFiles.length / totalTrackedFiles).toFixed(3)) : 0;
  const medianFnLoc = fnLengths.length ? median(fnLengths) : 24;
  const medianDepth = depths.length ? median(depths) : 2;
  const maxDepth = depths.length ? Math.max(...depths) : 2;
  const defensiveDensity = totalCodeLines > 0 ? defensiveHits / totalCodeLines : 0.02;
  const longLineRatio = totalCodeLines > 0 ? longLines / totalCodeLines : 0.03;

  return {
    primaryLanguage,
    langCounts,
    sourceFileCount: sourceFiles.length,
    testFileCount: testFiles.length,
    testRatio,
    runtimeDeps,
    hasZeroDeps,
    strictTypes,
    anyHits,
    typeAnnotationHits,
    medianFnLoc,
    medianDepth,
    maxDepth,
    defensiveDensity: Number(defensiveDensity.toFixed(4)),
    longLineRatio: Number(longLineRatio.toFixed(4)),
    prefersFunctional: funcHits >= classHits * 2,
    namingStyle: camelHits >= snakeHits ? 'camelCase' : 'snake_case',
    detectedCommands,
  };
}

/**
 * Compute normalized 3-gene persona mix (exact 100% sum) and 4-letter Code Genotype (MBTI).
 */
function computeDnaProfile(gitStats, codeStats, repoName = 'repository') {
  const weights = {
    karpathy: 18,
    antfu: 14,
    linus: 14,
    stripe: 12,
    goblin: 8,
  };

  // Karpathy signals: zero-dep, flat tree, functional/procedural over OOP, concise diffs
  if (codeStats.hasZeroDeps) weights.karpathy += 34;
  else if (codeStats.runtimeDeps <= 3) weights.karpathy += 18;
  if (codeStats.medianDepth <= 2) weights.karpathy += 18;
  if (codeStats.prefersFunctional) weights.karpathy += 14;
  if (codeStats.medianFnLoc <= 32) weights.karpathy += 10;
  if (gitStats.medianChangedLines <= 80) weights.karpathy += 8;

  // Antfu signals: TypeScript / strict types, zero any, conventional commits, lint hygiene
  if (codeStats.strictTypes) weights.antfu += 24;
  if (codeStats.primaryLanguage === 'TypeScript' && codeStats.anyHits === 0) weights.antfu += 22;
  if (codeStats.typeAnnotationHits >= 8) weights.antfu += 12;
  if (gitStats.conventionalRatio >= 0.35) weights.antfu += 20;
  if (codeStats.detectedCommands.lint) weights.antfu += 10;

  // Linus signals: defensive invariants, C/Rust/systems or high guard density, anti-OOP
  if (codeStats.defensiveDensity >= 0.025) weights.linus += 26;
  else if (codeStats.defensiveDensity >= 0.012) weights.linus += 14;
  if (['Rust', 'C', 'C++', 'C/C++', 'Go'].includes(codeStats.primaryLanguage)) weights.linus += 22;
  if (codeStats.prefersFunctional) weights.linus += 8;

  // Stripe signals: strong test coverage, deterministic runner scripts, structured modules
  if (codeStats.testRatio >= 0.22) weights.stripe += 28;
  else if (codeStats.testRatio >= 0.12) weights.stripe += 16;
  if (codeStats.detectedCommands.test) weights.stripe += 14;
  if (codeStats.medianDepth >= 3) weights.stripe += 10;

  // Night Owl / Velocity Goblin signals: late-night commits, wide lines, terse fast commits
  if (gitStats.nightCommitRatio >= 0.25) weights.goblin += 32;
  else if (gitStats.nightCommitRatio >= 0.1) weights.goblin += 16;
  if (codeStats.longLineRatio >= 0.06) weights.goblin += 14;
  if (gitStats.terseMsgRatio >= 0.6 && gitStats.conventionalRatio < 0.25) weights.goblin += 12;

  const ranked = Object.entries(weights)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  const topSum = ranked.reduce((acc, [, v]) => acc + v, 0) || 1;
  const p0 = Math.round((ranked[0][1] / topSum) * 100);
  const p1 = Math.round((ranked[1][1] / topSum) * 100);
  const p2 = Math.max(1, 100 - p0 - p1);
  const adjustedP0 = 100 - p1 - p2;

  const genes = [
    { ...MASTER_PERSONAS[ranked[0][0]], percent: adjustedP0 },
    { ...MASTER_PERSONAS[ranked[1][0]], percent: p1 },
    { ...MASTER_PERSONAS[ranked[2][0]], percent: p2 },
  ];

  // 4-Axis Developer Code Genotype (MBTI-style)
  // 1. S (Surgical Flat) vs A (Architectural Layered)
  const a1 = codeStats.medianDepth <= 2 ? 'S' : 'A';
  // 2. T (Type/Invariant-Strict) vs D (Dynamic Pragmatic)
  const a2 = codeStats.strictTypes || codeStats.defensiveDensity >= 0.02 || codeStats.typeAnnotationHits >= 6 ? 'T' : 'D';
  // 3. P (Proof-Driven Tests) vs V (Velocity-First)
  const a3 = codeStats.testRatio >= 0.14 || Boolean(codeStats.detectedCommands.test) ? 'P' : 'V';
  // 4. Z (Zero-Dep Stdlib) vs E (Ecosystem Stacker)
  const a4 = codeStats.hasZeroDeps || codeStats.runtimeDeps <= 2 ? 'Z' : 'E';

  const genotype = `${a1}${a2}${a3}${a4}`;
  const mbtiTitles = {
    STPZ: 'INTJ-A // Surgical Stdlib Purist',
    STPE: 'ISTJ-A // Ironclad Type Architect',
    SDPZ: 'INTP-A // Minimalist Systems Hacker',
    SDVZ: 'ISTP-A // Raw Velocity Lone Wolf',
    ATPZ: 'ENTJ-A // Zero-Bloat Sovereign',
    ATPE: 'ENTJ-T // Industrial Platform Builder',
    STVZ: 'INTJ-T // Sharp-Edged Prototyper',
    SDPE: 'ENTP-A // Pragmatic Feature Alchemist',
  };
  const mbtiTitle = mbtiTitles[genotype] || 'INTJ-A // Pragmatic Code Craftsman';

  const chronotype =
    gitStats.nightCommitRatio >= 0.25
      ? `NIGHT OWL (${Math.round(gitStats.nightCommitRatio * 100)}% late-night commits)`
      : `DAYLIGHT BUILDER (peak ${String(gitStats.peakHour).padStart(2, '0')}:00)`;

  const oneLineSummary = `${genes[0].percent}% ${genes[0].name} (${genes[0].tagline}) + ${genes[1].percent}% ${genes[1].name} (${genes[1].tagline}) + ${genes[2].percent}% ${genes[2].name} (${genes[2].tagline})`;

  return {
    repoName,
    author: gitStats.topAuthor || 'developer',
    genotype,
    mbtiTitle,
    chronotype,
    oneLineSummary,
    genes,
    git: gitStats,
    code: codeStats,
  };
}

/**
 * Reverse-engineer a personalized, zero-slop CLAUDE.md / AGENTS.md operational contract
 * directly from the developer's measured repository DNA.
 */
function synthesizePersonalRules(profile) {
  const { genes, code, git, genotype, mbtiTitle, repoName } = profile;
  const primary = genes[0];
  const secondary = genes[1];

  const lines = [
    `# Operational Agent Contract — ${repoName}`,
    '',
    `<!-- TASTE:DNA:${genotype}:START -->`,
    `> **Code DNA Profile**: \`${genotype}\` (${mbtiTitle}) — ${profile.oneLineSummary}`,
    '',
    '## 1. Architecture & Dependency Invariants',
  ];

  if (code.hasZeroDeps) {
    lines.push('- **Zero External Runtime Dependencies**: Strictly use native standard library modules only; never add third-party packages without explicit owner approval.');
  } else {
    lines.push(`- **Dependency Restraint**: Keep external dependencies lean (currently ${code.runtimeDeps} runtime deps). Prefer standard library primitives for helpers under 30 lines.`);
  }

  lines.push(
    `- **Directory Topology**: Match existing flat hierarchy (median depth: ${code.medianDepth}). Do not invent nested boilerplate folders or speculative wrapper layers.`
  );

  if (code.prefersFunctional) {
    lines.push(
      `- **Function-First Modularity**: Favor pure functions and explicit data structures over OOP class hierarchies. Target ~${code.medianFnLoc} lines per function.`
    );
  } else {
    lines.push(
      `- **Focused Units**: Keep methods and functions surgical (repo median: ~${code.medianFnLoc} lines) with single clear responsibilities.`
    );
  }

  lines.push(
    `- **Naming & Idioms**: Follow existing \`${code.namingStyle}\` conventions in ${code.primaryLanguage}. Never reformat unrelated files.`
  );

  if (code.strictTypes || code.anyHits === 0) {
    lines.push('- **Type & Boundary Discipline**: Enforce explicit types and boundary assertions; never introduce `any`, silent catch blocks, or unchecked inputs.');
  }

  lines.push('', '## 2. Verification & Commit Protocol');
  if (code.detectedCommands.test) {
    lines.push(`- **Mandatory Test Gate**: Run \`${code.detectedCommands.test}\` before concluding any modification; all suites must exit \`0\`.`);
  } else {
    lines.push('- **Verification First**: Add or execute targeted regression checks for every behavioral change before finishing.');
  }
  if (code.detectedCommands.lint) {
    lines.push(`- **Static Check Gate**: Run \`${code.detectedCommands.lint}\` and resolve all warnings.`);
  }
  if (git.conventionalRatio >= 0.3) {
    lines.push('- **Commit Hygiene**: Format commit headlines using Conventional Commits (`feat:`, `fix:`, `refactor:`, `chore:`) with surgical diffs.');
  } else {
    lines.push(`- **Surgical Diffs**: Keep changesets tight (repo median: ~${git.medianChangedLines} LOC/commit). Touch only lines required by the task.`);
  }

  lines.push(
    '',
    `## 3. Response & Token Economy (${primary.name} × ${secondary.name} Blend)`,
    '- **Lead With the Outcome**: Output minimal diffs and concrete findings immediately; zero conversational preamble, apologies, or filler praise.',
    '- **No Speculative Bloat**: Solve the exact problem requested; never invent unrequested configuration flags or dead abstractions.',
    `<!-- TASTE:DNA:${genotype}:END -->`,
    ''
  );

  return lines.join('\n');
}

/**
 * Render a Spotify-Wrapped-style Developer Code DNA & MBTI SVG Card (540x310).
 */
function generateDnaCardSvg(profile, options = {}) {
  const themeKey = options.theme && THEMES[options.theme] ? options.theme : 'cyber';
  const th = THEMES[themeKey];
  const author = escapeXml(String(profile.author || 'developer').replace(/^@/, '').slice(0, 22));
  const repoName = escapeXml(String(profile.repoName || 'repository').slice(0, 24));
  const genotype = escapeXml(profile.genotype || 'STPZ');
  const mbtiTitle = escapeXml(profile.mbtiTitle || 'INTJ-A // Surgical Purist');
  const genes = profile.genes || [
    { ...MASTER_PERSONAS.karpathy, percent: 74 },
    { ...MASTER_PERSONAS.antfu, percent: 19 },
    { ...MASTER_PERSONAS.goblin, percent: 7 },
  ];

  const sig = computeHexSig(`${author}:${genotype}:${genes.map((g) => `${g.id}${g.percent}`).join('-')}`);

  // Stacked 496px genome bar
  const totalBarW = 496;
  const w0 = Math.max(24, Math.round((genes[0].percent / 100) * totalBarW));
  const w1 = Math.max(18, Math.round((genes[1].percent / 100) * totalBarW));
  const w2 = Math.max(12, totalBarW - w0 - w1);

  const commits = profile.git ? profile.git.commitCount : 100;
  const depsLabel = profile.code && profile.code.hasZeroDeps ? '0 (STDLIB)' : String(profile.code ? profile.code.runtimeDeps : 0);
  const fnLoc = profile.code ? profile.code.medianFnLoc : 22;
  const testPct = profile.code ? `${Math.round(profile.code.testRatio * 100)}%` : '25%';

  const geneRowsSvg = genes
    .map((g, idx) => {
      const ry = idx * 30;
      const barFillW = Math.max(8, Math.round((g.percent / 100) * 150));
      return `<g transform="translate(0, ${ry})">
      <circle cx="6" cy="9" r="4.5" fill="${g.color}"/>
      <text x="18" y="13" class="mono" font-size="11.5" font-weight="800" fill="#f8fafc">${String(g.percent).padStart(2, ' ')}%</text>
      <text x="54" y="13" class="sans" font-size="12" font-weight="700" fill="${g.color}">${escapeXml(g.name)}</text>
      <text x="128" y="13" class="mono" font-size="10.5" fill="#94a3b8">${escapeXml(g.tagline)}</text>
      <rect x="336" y="4" width="160" height="9" rx="4.5" fill="#131c2e"/>
      <rect x="336" y="4" width="${barFillW}" height="9" rx="4.5" fill="${g.color}"/>
    </g>`;
    })
    .join('\n    ');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="540" height="310" viewBox="0 0 540 310" fill="none" role="img" aria-label="Developer Code DNA Card for @${author}">
  <defs>
    <clipPath id="dnaClip"><rect x="0.5" y="0.5" width="539" height="309" rx="14"/></clipPath>
    <linearGradient id="dnaBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${th.bg0}"/>
      <stop offset="55%" stop-color="${th.bg1}"/>
      <stop offset="100%" stop-color="${th.bg2}"/>
    </linearGradient>
    <linearGradient id="dnaRim" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${th.primary}" stop-opacity="0.9"/>
      <stop offset="50%" stop-color="${th.secondary}" stop-opacity="0.4"/>
      <stop offset="100%" stop-color="${th.accent}" stop-opacity="0.9"/>
    </linearGradient>
    <pattern id="dnaGrid" width="36" height="36" patternUnits="userSpaceOnUse">
      <path d="M 36 0 L 0 0 0 36" fill="none" stroke="#94a3b8" stroke-width="0.5" stroke-opacity="0.06"/>
      <circle cx="18" cy="18" r="0.8" fill="#e2e8f0" fill-opacity="0.12"/>
    </pattern>
  </defs>

  <style>
    .mono { font-family: 'JetBrains Mono', 'SFMono-Regular', ui-monospace, Menlo, Monaco, Consolas, monospace; }
    .sans { font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, sans-serif; }
  </style>

  <g clip-path="url(#dnaClip)">
    <rect width="540" height="310" fill="url(#dnaBg)"/>
    <rect width="540" height="310" fill="url(#dnaGrid)"/>
    <rect width="540" height="34" fill="${th.chrome}" fill-opacity="0.92"/>
    <line x1="0" y1="34" x2="540" y2="34" stroke="#1e293b"/>
    <rect y="280" width="540" height="30" fill="${th.chrome}" fill-opacity="0.94"/>
    <line x1="0" y1="280" x2="540" y2="280" stroke="#1e293b"/>
  </g>

  <rect x="0.6" y="0.6" width="538.8" height="308.8" rx="14" stroke="url(#dnaRim)" stroke-width="1.2"/>

  <!-- Titlebar -->
  <g transform="translate(16, 11)">
    <circle cx="5" cy="6" r="4" fill="#ff5f56" fill-opacity="0.85"/>
    <circle cx="17" cy="6" r="4" fill="#ffbd2e" fill-opacity="0.85"/>
    <circle cx="29" cy="6" r="4" fill="#27c93f" fill-opacity="0.85"/>
    <text x="50" y="10" class="mono" font-size="11" font-weight="700" fill="#94a3b8">~/dna-sequencer/<tspan fill="#f8fafc">@${author}</tspan><tspan fill="#64748b"> (${repoName})</tspan></text>
    <text x="508" y="10" text-anchor="end" class="mono" font-size="9.5" font-weight="700" fill="${th.accent}">GENOME:0x${sig}</text>
  </g>

  <!-- Genotype MBTI Banner -->
  <g transform="translate(22, 48)">
    <rect width="496" height="48" rx="8" fill="${th.panel}" stroke="${th.primary}" stroke-opacity="0.45"/>
    <rect x="10" y="9" width="68" height="30" rx="5" fill="${th.primary}" fill-opacity="0.18" stroke="${th.primary}"/>
    <text x="44" y="29" text-anchor="middle" class="mono" font-size="15" font-weight="800" fill="${th.primary}" letter-spacing="1.5">${genotype}</text>
    <text x="90" y="23" class="sans" font-size="13" font-weight="800" fill="#f8fafc">${mbtiTitle}</text>
    <text x="90" y="39" class="mono" font-size="9.5" font-weight="600" fill="#94a3b8">${escapeXml(profile.chronotype || 'DAYLIGHT BUILDER')}</text>
  </g>

  <!-- Stacked 100% Genome Spectrum Bar -->
  <g transform="translate(22, 108)">
    <text x="0" y="9" class="mono" font-size="8.5" font-weight="700" fill="${th.primary}" letter-spacing="1.1">01 // MASTER DEVELOPER SIMILARITY SPECTRUM</text>
    <g transform="translate(0, 16)">
      <rect x="0" y="0" width="${w0}" height="12" rx="3" fill="${genes[0].color}"/>
      <rect x="${w0 + 2}" y="0" width="${Math.max(4, w1 - 2)}" height="12" rx="3" fill="${genes[1].color}"/>
      <rect x="${w0 + w1 + 2}" y="0" width="${Math.max(4, w2 - 2)}" height="12" rx="3" fill="${genes[2].color}"/>
    </g>
  </g>

  <!-- Top 3 Archetype Rows -->
  <g transform="translate(22, 146)">
    ${geneRowsSvg}
  </g>

  <!-- 4 Measured Repo Telemetry Chips -->
  <g transform="translate(22, 242)">
    <rect x="0" y="0" width="118" height="26" rx="5" fill="#0b1120" stroke="#1e293b"/>
    <text x="59" y="16.5" text-anchor="middle" class="mono" font-size="9.5" font-weight="700" fill="#cbd5e1">COMMITS: <tspan fill="${th.accent}">${commits}</tspan></text>

    <rect x="126" y="0" width="124" height="26" rx="5" fill="#0b1120" stroke="#1e293b"/>
    <text x="188" y="16.5" text-anchor="middle" class="mono" font-size="9.5" font-weight="700" fill="#cbd5e1">DEPS: <tspan fill="#10b981">${escapeXml(depsLabel)}</tspan></text>

    <rect x="258" y="0" width="118" height="26" rx="5" fill="#0b1120" stroke="#1e293b"/>
    <text x="317" y="16.5" text-anchor="middle" class="mono" font-size="9.5" font-weight="700" fill="#cbd5e1">FN LOC: <tspan fill="#f59e0b">~${fnLoc}</tspan></text>

    <rect x="384" y="0" width="112" height="26" rx="5" fill="#0b1120" stroke="#1e293b"/>
    <text x="440" y="16.5" text-anchor="middle" class="mono" font-size="9.5" font-weight="700" fill="#cbd5e1">TESTS: <tspan fill="#c084fc">${escapeXml(testPct)}</tspan></text>
  </g>

  <!-- Footer -->
  <g transform="translate(18, 299)">
    <text x="0" y="0" class="mono" font-size="10.5" font-weight="700" fill="${th.primary}">❯</text>
    <text x="12" y="0" class="mono" font-size="10" font-weight="600" fill="#cbd5e1">npx taste-code dna --write</text>
    <text x="504" y="0" text-anchor="end" class="mono" font-size="9" font-weight="800" fill="${th.primary}" letter-spacing="1.2">CODE GENOME WRAPPED</text>
  </g>
</svg>`;
}

function analyzeRepoDna(cwd = process.cwd(), options = {}) {
  const maxCommits = typeof options.maxCommits === 'number' ? options.maxCommits : 100;
  const gitStats = scanGitHistory(cwd, maxCommits);
  const codeStats = scanCodebaseStructure(cwd);
  const repoName = options.repoName || path.basename(path.resolve(cwd)) || 'repository';
  const profile = computeDnaProfile(gitStats, codeStats, repoName);
  if (options.user) {
    profile.author = options.user;
  }
  const synthesizedRules = synthesizePersonalRules(profile);
  return {
    ...profile,
    synthesizedRules,
  };
}

function renderDnaCardToFile(outputPath, profile, options = {}) {
  const svg = generateDnaCardSvg(profile, options);
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(outputPath, svg, 'utf-8');
  return { outputPath, svg };
}

module.exports = {
  MASTER_PERSONAS,
  parseGitLogText,
  scanGitHistory,
  scanCodebaseStructure,
  computeDnaProfile,
  synthesizePersonalRules,
  generateDnaCardSvg,
  analyzeRepoDna,
  renderDnaCardToFile,
};
