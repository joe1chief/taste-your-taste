/**
 * Taste Checker & Doctor Engine: Deterministic CI quality gate & secret-leak guard
 * for CLAUDE.md, AGENTS.md, .cursorrules, copilot-instructions.md, and agent configs.
 * Zero external dependencies.
 */

const fs = require('fs');
const { analyzeContentDeterministic } = require('./roaster');
const { calcStats } = require('./pruner');

const SECRET_PATTERNS = [
  { name: 'OpenAI API Key', regex: /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/ },
  { name: 'Anthropic API Key', regex: /\bsk-ant-[A-Za-z0-9_-]{20,}\b/ },
  { name: 'GitHub Token', regex: /\bgh[pousr]_[A-Za-z0-9]{24,}\b/ },
  { name: 'AWS Access Key', regex: /\bAKIA[0-9A-Z]{16}\b/ },
];

function checkContent(content, options = {}) {
  const minScore = typeof options.minScore === 'number' ? options.minScore : 70;
  const maxTokens = typeof options.maxTokens === 'number' ? options.maxTokens : 4000;

  const stats = calcStats(content);
  const roast = analyzeContentDeterministic(content);
  const checks = [];

  // 1. Secret leak scan
  const leakedTypes = SECRET_PATTERNS.filter((p) => p.regex.test(content)).map((p) => p.name);
  checks.push({
    id: 'zero-secrets',
    label: 'Zero Hardcoded Secrets',
    passed: leakedTypes.length === 0,
    detail: leakedTypes.length === 0 ? 'No token or key patterns detected' : `Detected potential secrets: ${leakedTypes.join(', ')}`,
  });

  // 2. Taste score threshold
  checks.push({
    id: 'taste-score',
    label: `Taste Score >= ${minScore}`,
    passed: roast.score >= minScore,
    detail: `Score ${roast.score}/100 (${roast.verdict})`,
  });

  // 3. Context token budget
  checks.push({
    id: 'token-budget',
    label: `Context Budget <= ${maxTokens} tokens`,
    passed: stats.tokens <= maxTokens,
    detail: `~${stats.tokens} est. tokens (${stats.lines} lines)`,
  });

  // 4. Negative constraints presence
  const hasNegative = /\b(never|do not|don't|prohibit|forbid|must not|disallow|avoid)\b/i.test(content);
  checks.push({
    id: 'negative-armor',
    label: 'Explicit Negative Guardrails',
    passed: hasNegative,
    detail: hasNegative ? 'Explicit boundary constraints present' : 'Missing explicit negative boundaries (never / do not)',
  });

  // 5. Verifiable command contract
  const hasTooling = /\b(pytest|cargo|npm|pnpm|yarn|bun|just|make|gradle|mvn|spotless|eslint|ruff|go test|vitest|tsc|node\s+--test)\b/i.test(content);
  checks.push({
    id: 'verifiable-commands',
    label: 'Executable Test / Lint Contract',
    passed: hasTooling,
    detail: hasTooling ? 'Verification runner commands detected' : 'No concrete test or lint runner command found',
  });

  const passed = checks.every((item) => item.passed);

  return {
    passed,
    score: roast.score,
    verdict: roast.verdict,
    stats,
    minScore,
    maxTokens,
    checks,
    sins: roast.sins,
  };
}

function checkFile(filePath, options = {}) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Target file not found: ${filePath}`);
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  return {
    filePath,
    ...checkContent(content, options),
  };
}

module.exports = {
  SECRET_PATTERNS,
  checkContent,
  checkFile,
};
