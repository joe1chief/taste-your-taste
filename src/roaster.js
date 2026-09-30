/**
 * Taste Roast Engine (代码品味毒舌点评器)
 * Analyzes CLAUDE.md / .cursorrules / .agent files and roasts them in the persona
 * of Linus Torvalds or a Strict Architect.
 */

const fs = require('fs');
const { c, box } = require('./utils');

const FLUFF_PATTERNS = [
  /write clean code/i,
  /follow best practices/i,
  /be helpful/i,
  /ensure high quality/i,
  /maintainable and scalable/i,
  /as an ai/i,
  /clean and readable/i,
  /you are a helpful/i,
  /strive for excellence/i,
  /high performance/i,
  /well[- ]documented/i,
];

const POLITE_PATTERNS = [
  /\bplease\b/i,
  /\bkindly\b/i,
  /\bthank you\b/i,
  /\bapologize\b/i,
  /\bsorry\b/i,
  /\bif possible\b/i,
  /\bwould you\b/i,
  /\bcould you\b/i,
];

const CONSTRAINT_PATTERNS = [
  /\bnever\b/i,
  /\bdo not\b/i,
  /\bdon't\b/i,
  /\bprohibit\b/i,
  /\bforbid\b/i,
  /\bmust not\b/i,
  /\bdisallow\b/i,
  /\bno apologies\b/i,
  /\bzero\b/i,
];

const TOOLING_PATTERNS = [
  /\bpytest\b/i,
  /\bcargo\b/i,
  /\bnpm\b/i,
  /\bpnpm\b/i,
  /\bjust\b/i,
  /\bmake\b/i,
  /\bgradle\b/i,
  /\bspotless\b/i,
  /\beslint\b/i,
  /\bruff\b/i,
  /\bgo test\b/i,
  /\bvitest\b/i,
];

function analyzeContent(text) {
  const lines = text.split('\n');
  const lineCount = lines.length;
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const estimatedTokens = Math.round(wordCount * 1.35);

  const fluffHits = [];
  FLUFF_PATTERNS.forEach((p) => {
    const m = text.match(p);
    if (m) fluffHits.push(m[0]);
  });

  const politeHits = [];
  POLITE_PATTERNS.forEach((p) => {
    const m = text.match(p);
    if (m) politeHits.push(m[0]);
  });

  const constraintHits = [];
  CONSTRAINT_PATTERNS.forEach((p) => {
    const m = text.match(p);
    if (m) constraintHits.push(m[0]);
  });

  const toolingHits = [];
  TOOLING_PATTERNS.forEach((p) => {
    const m = text.match(p);
    if (m) toolingHits.push(m[0]);
  });

  const hasDiffDirective = /diff|patch|lead with|no explanation/i.test(text);

  // Score Calculation (Start at 80)
  let score = 80;

  // Penalties
  score -= Math.min(30, fluffHits.length * 10);
  score -= Math.min(25, politeHits.length * 8);

  if (lineCount > 250) score -= 25;
  else if (lineCount > 150) score -= 15;

  if (constraintHits.length === 0) score -= 25;
  if (toolingHits.length === 0) score -= 15;

  // Bonuses
  if (hasDiffDirective) score += 10;
  if (toolingHits.length >= 2) score += 10;
  if (constraintHits.length >= 3) score += 10;
  if (lineCount <= 60 && lineCount >= 15) score += 10;

  score = Math.max(8, Math.min(99, score));

  return {
    lineCount,
    wordCount,
    estimatedTokens,
    fluffHits,
    politeHits,
    constraintHits,
    toolingHits,
    hasDiffDirective,
    score,
  };
}

function getVerdict(score) {
  if (score >= 88) return { label: 'CHEF\'S TASTE (米其林级别)', color: c.green };
  if (score >= 70) return { label: 'ACCEPTABLE CRAFT (像个合格工程师)', color: c.cyan };
  if (score >= 50) return { label: 'MID-TIER NPC (标准平庸代码工人)', color: c.yellow };
  if (score >= 30) return { label: 'ENTERPRISE BUREAUCRACY SLOP (大企业油腻包装)', color: c.red };
  return { label: 'CRIMINAL TOXIC WASTE (上下文毒药)', color: c.red };
}

function generateLinusRoast(analysis) {
  const roasts = [];

  if (analysis.politeHits.length > 0) {
    roasts.push(
      `"You actually wrote '${analysis.politeHits[0]}' in a file meant for an LLM? What is this, a Victorian tea party? Computers don't have feelings, and Claude doesn't care about your manners. You are literally burning token budget paying Anthropic to say 'You're very welcome!'."`
    );
  }

  if (analysis.fluffHits.length > 0) {
    roasts.push(
      `"Saying '${analysis.fluffHits[0]}' to an AI is like telling water to be wet. What does that even mean? Where are your compiler flags? Where are your line limits? It's hand-waving garbage designed to make non-programmers feel productive."`
    );
  }

  if (analysis.constraintHits.length === 0) {
    roasts.push(
      `"You have zero negative constraints. NONE. You basically handed a toddler an electric chainsaw inside your repo and forgot to say 'don't cut the load-bearing beams'. It will rewrite your entire architecture while apologizing to you."`
    );
  }

  if (analysis.toolingHits.length === 0) {
    roasts.push(
      `"You didn't give the agent a single concrete command to run tests or linters. How the hell is it supposed to verify its hallucinations? By squinting at the screen? Give it a test command or don't complain when your main branch burns."`
    );
  }

  if (analysis.lineCount > 150) {
    roasts.push(
      `"Your prompt is ${analysis.lineCount} lines long (~${analysis.estimatedTokens} tokens). Claude reads this novel on every single keystroke and has already forgotten what repository it's in by line 80. This is context poisoning."`
    );
  }

  if (roasts.length === 0) {
    roasts.push(
      `"Surprisingly... this doesn't make me want to throw my workstation out the window. Clean constraints, actual commands, and minimal fluff. You might actually understand how code works."`
    );
  }

  return roasts;
}

function roastFile(filePath, persona = 'linus') {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const analysis = analyzeContent(content);
  const verdict = getVerdict(analysis.score);
  const roasts = generateLinusRoast(analysis);

  // Render Bar
  const barLen = 30;
  const filled = Math.round((analysis.score / 100) * barLen);
  const bar = '█'.repeat(filled) + '░'.repeat(barLen - filled);

  const report = [
    `${c.bold('Target File:')} ${c.cyan(filePath)}`,
    `${c.bold('Lines:')} ${analysis.lineCount}  |  ${c.bold('Tokens:')} ~${analysis.estimatedTokens}  |  ${c.bold('Words:')} ${analysis.wordCount}`,
    '',
    `${c.bold('Taste Score:')} ${verdict.color(c.bold(`${analysis.score} / 100`))} [${verdict.color(bar)}]`,
    `${c.bold('Verdict:')} ${verdict.color(c.bold(verdict.label))}`,
    '',
    c.bold('🔥 Sins & Pathology Detected:'),
    analysis.fluffHits.length
      ? `  ${c.red('❌ Platitude Fluff:')} Found ${analysis.fluffHits.length} buzzwords (${analysis.fluffHits.slice(0, 3).join(', ')})`
      : `  ${c.green('✅ Platitude Free:')} No empty corporate buzzwords detected`,
    analysis.politeHits.length
      ? `  ${c.red('❌ Politeness Tax:')} ${analysis.politeHits.length} polite words draining context and money`
      : `  ${c.green('✅ Zero Flattery:')} Cold, direct, professional communication`,
    analysis.constraintHits.length
      ? `  ${c.green('✅ Negative Armor:')} ${analysis.constraintHits.length} explicit boundaries/teeth detected`
      : `  ${c.red('❌ Spineless Prompt:')} Zero negative constraints (AI will run wild)`,
    analysis.toolingHits.length
      ? `  ${c.green('✅ Verifiable Tooling:')} Contains real execution commands (${analysis.toolingHits.slice(0, 3).join(', ')})`
      : `  ${c.red('❌ Flying Blind:')} No test/linter commands provided for feedback loops`,
    '',
    c.bold(`🎙️ Linus Torvalds Roasts Your Taste:`),
    ...roasts.map((r) => `  ${c.yellow(c.italic(r))}`),
    '',
    c.bold('💊 Remedy & Prescription:'),
    analysis.score < 75
      ? `  Run ${c.cyan('npx taste blend --style minimalist --tone terse')} to replace fluff with pure discipline.`
      : `  Keep your instructions sharp. Pin test runners and check diffs before every commit.`,
  ].join('\n');

  return {
    analysis,
    verdict,
    report,
  };
}

module.exports = {
  analyzeContent,
  roastFile,
};
