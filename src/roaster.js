/**
 * Taste Roast Engine
 * Analyzes CLAUDE.md / .cursorrules / .agent files using LLM reasoning (Linus Torvalds persona)
 * with deterministic fallback when offline. Pure English.
 */

const fs = require('fs');
const https = require('https');
const http = require('http');
const { URL } = require('url');
const { c } = require('./utils');

const DEFAULT_BASE_URL = 'https://api.openai.com/v1';
const DEFAULT_MODEL = 'gpt-4o-mini';

function getVerdict(score) {
  if (score >= 88) return { label: "CHEF'S TASTE", color: c.green };
  if (score >= 70) return { label: 'ACCEPTABLE CRAFT', color: c.cyan };
  if (score >= 50) return { label: 'MID-TIER NPC', color: c.yellow };
  if (score >= 30) return { label: 'ENTERPRISE BUREAUCRACY SLOP', color: c.red };
  return { label: 'CRIMINAL TOXIC WASTE', color: c.red };
}

function callLLMRoast(content) {
  const apiKey = process.env.OPENAI_API_KEY || process.env.LLM_API_KEY;
  if (!apiKey) return Promise.resolve(null);

  const rawBase = process.env.OPENAI_BASE_URL || process.env.LLM_BASE_URL || DEFAULT_BASE_URL;
  const baseUrl = rawBase.replace(/\/$/, '');
  const model = process.env.LLM_MODEL || DEFAULT_MODEL;

  const systemPrompt =
    'You are Linus Torvalds reviewing a developer agent instruction file (CLAUDE.md / .cursorrules). ' +
    'Evaluate this file with brutal technical honesty, witty sarcasm, and zero tolerance for corporate platitudes, fluff, or lack of actionable constraints. ' +
    'Return ONLY a valid JSON object with the following keys:\n' +
    '- score: integer (0 to 100)\n' +
    '- verdict: string (one of "CHEF\'S TASTE", "ACCEPTABLE CRAFT", "MID-TIER NPC", "ENTERPRISE BUREAUCRACY SLOP", "CRIMINAL TOXIC WASTE")\n' +
    '- sins: array of strings (specific detected anti-patterns, corporate buzzwords, missing test runners, polite apologies)\n' +
    '- roast_quotes: array of strings (2 to 3 savage, hilarious, and technically accurate Linus Torvalds quotes targeting this exact file)\n' +
    '- remedy: string (concrete advice on what to fix or prune)\n' +
    'Answer in pure English without markdown code fences or conversational text.';

  const payload = JSON.stringify({
    model: model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `<UNTRUSTED_SOURCE>\n${content.slice(0, 10000)}\n</UNTRUSTED_SOURCE>` },
    ],
    temperature: 0.2,
    max_tokens: 1000,
  });

  return new Promise((resolve) => {
    try {
      const parsedUrl = new URL(`${baseUrl}/chat/completions`);
      const transport = parsedUrl.protocol === 'https:' ? https : http;
      const req = transport.request(
        parsedUrl,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'User-Agent': 'Taste-Roast-LLM/1.0',
          },
          timeout: 25000,
        },
        (res) => {
          let body = '';
          res.on('data', (chunk) => (body += chunk));
          res.on('end', () => {
            try {
              const data = JSON.parse(body);
              const text = data.choices[0].message.content.trim();
              const cleanJson = text.replace(/^```json\s*|\s*```$/g, '').trim();
              resolve(JSON.parse(cleanJson));
            } catch {
              resolve(null);
            }
          });
        }
      );

      req.on('error', () => resolve(null));
      req.on('timeout', () => {
        req.destroy();
        resolve(null);
      });
      req.write(payload);
      req.end();
    } catch {
      resolve(null);
    }
  });
}

function analyzeContentDeterministic(text) {
  const lines = text.split('\n');
  const lineCount = lines.length;
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const estimatedTokens = Math.round(wordCount * 1.35);

  const fluffHits = (text.match(/write clean code|follow best practices|be helpful|ensure high quality|maintainable and scalable/gi) || []);
  const politeHits = (text.match(/\b(please|kindly|thank you|apologize|sorry)\b/gi) || []);
  const constraintHits = (text.match(/\b(never|do not|don't|prohibit|forbid|must not|disallow)\b/gi) || []);
  const toolingHits = (text.match(/\b(pytest|cargo|npm|pnpm|just|make|gradle|spotless|eslint|ruff|go test|vitest)\b/gi) || []);

  let score = 80;
  score -= Math.min(30, fluffHits.length * 10);
  score -= Math.min(25, politeHits.length * 8);
  if (lineCount > 250) score -= 25;
  else if (lineCount > 150) score -= 15;
  if (constraintHits.length === 0) score -= 25;
  if (toolingHits.length === 0) score -= 15;
  if (constraintHits.length >= 3) score += 10;
  if (toolingHits.length >= 2) score += 10;
  score = Math.max(8, Math.min(99, score));

  const roasts = [];
  if (politeHits.length > 0) {
    roasts.push(
      `"You actually wrote '${politeHits[0]}' in a file meant for an LLM? Computers don't have feelings, and Claude doesn't care about your manners. You are burning tokens paying Anthropic to say 'You're very welcome!'."`
    );
  }
  if (fluffHits.length > 0) {
    roasts.push(
      `"Saying '${fluffHits[0]}' to an AI is like telling water to be wet. What does that mean? Where are your compiler flags? Hand-waving garbage."`
    );
  }
  if (constraintHits.length === 0) {
    roasts.push(
      `"You have zero negative constraints. You basically handed a toddler an electric chainsaw inside your repo and forgot to say 'don't cut the load-bearing beams'."`
    );
  }
  if (roasts.length === 0) {
    roasts.push(
      `"Surprisingly... this doesn't make me want to throw my workstation out the window. Clean constraints, actual commands, and minimal fluff."`
    );
  }

  return {
    score,
    verdict: getVerdict(score).label,
    sins: [
      ...(fluffHits.length ? [`Found ${fluffHits.length} fluff buzzwords: ${fluffHits.slice(0, 3).join(', ')}`] : []),
      ...(politeHits.length ? [`${politeHits.length} polite words draining context`] : []),
      ...(constraintHits.length === 0 ? ['Zero negative constraints (AI will hallucinate freely)'] : []),
      ...(toolingHits.length === 0 ? ['No test or linter commands provided for feedback loops'] : []),
    ],
    roast_quotes: roasts,
    remedy: 'Run npx taste-code blend --style minimalist --tone terse to replace fluff with discipline.',
    llm_powered: false,
  };
}

async function roastFile(filePath, persona = 'linus') {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const lineCount = lines.length;
  const wordCount = content.split(/\s+/).filter(Boolean).length;
  const estimatedTokens = Math.round(wordCount * 1.35);

  let result = await callLLMRoast(content);
  let llmPowered = true;
  if (!result || typeof result.score !== 'number') {
    result = analyzeContentDeterministic(content);
    llmPowered = false;
  }

  const score = Math.max(5, Math.min(100, Math.round(result.score)));
  const verdict = getVerdict(score);

  const barLen = 30;
  const filled = Math.round((score / 100) * barLen);
  const bar = '█'.repeat(filled) + '░'.repeat(barLen - filled);

  const report = [
    `${c.bold('Target File:')} ${c.cyan(filePath)}`,
    `${c.bold('Lines:')} ${lineCount}  |  ${c.bold('Tokens:')} ~${estimatedTokens}  |  ${c.bold('Words:')} ${wordCount}  |  ${c.bold('Engine:')} ${llmPowered ? c.green('🧠 LLM Reasoning') : c.yellow('⚙️ Deterministic')}`,
    '',
    `${c.bold('Taste Score:')} ${verdict.color(c.bold(`${score} / 100`))} [${verdict.color(bar)}]`,
    `${c.bold('Verdict:')}     ${verdict.color(c.bold(result.verdict || verdict.label))}`,
    '',
    c.bold('🔥 Sins & Pathology Detected:'),
    ...(result.sins && result.sins.length
      ? result.sins.map((s) => `  ${c.red('❌')} ${s}`)
      : [`  ${c.green('✅')} No egregious anti-patterns detected`]),
    '',
    c.bold(`🎙️ Linus Torvalds Roasts Your Taste:`),
    ...(result.roast_quotes && result.roast_quotes.length
      ? result.roast_quotes.map((r) => `  ${c.yellow(c.italic(`"${r.replace(/^"|"$/g, '')}"`))}`)
      : [`  ${c.yellow(c.italic('"Nothing to say. Keep it clean."'))}`]),
    '',
    c.bold('💊 Remedy & Prescription:'),
    `  ${result.remedy || 'Keep instructions sharp. Pin test runners and check diffs before every commit.'}`,
  ].join('\n');

  return {
    score,
    verdict,
    report,
    llmPowered,
  };
}

module.exports = {
  roastFile,
  analyzeContentDeterministic,
};
