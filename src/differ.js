/**
 * Taste Differ: Engineering Taste & Philosophy Comparator
 * Compares two engineering styles, agent personas, or local instruction files.
 * Zero external dependencies.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { URL } = require('url');
const { loadContent, getMeta, getAvailable } = require('./registry');
const { c, box } = require('./utils');

const DEFAULT_BASE_URL = 'https://token-api.yicloud.com/v1';
const DEFAULT_MODEL = 'DeepSeek-V4.1-Flash';

function resolveTasteOrFile(identifier, cwd = process.cwd()) {
  const cleanId = identifier.toLowerCase().trim();

  // 1. Check registry styles
  if (getAvailable('styles').includes(cleanId)) {
    return {
      type: 'style',
      name: cleanId,
      meta: getMeta('styles', cleanId),
      content: loadContent('styles', cleanId),
    };
  }

  // 2. Check registry tones
  if (getAvailable('tones').includes(cleanId)) {
    return {
      type: 'tone',
      name: cleanId,
      meta: getMeta('tones', cleanId),
      content: loadContent('tones', cleanId),
    };
  }

  // 3. Check registry presets
  if (getAvailable('presets').includes(cleanId)) {
    return {
      type: 'preset',
      name: cleanId,
      meta: getMeta('presets', cleanId),
      content: loadContent('presets', cleanId),
    };
  }

  // 4. Check local file path
  const resolvedPath = path.isAbsolute(identifier) ? identifier : path.join(cwd, identifier);
  if (fs.existsSync(resolvedPath)) {
    const content = fs.readFileSync(resolvedPath, 'utf-8');
    return {
      type: 'file',
      name: path.basename(resolvedPath),
      meta: { name: path.basename(resolvedPath), description: `Local file at ${resolvedPath}` },
      content,
      path: resolvedPath,
    };
  }

  throw new Error(`Unrecognized flavor, style, or file: '${identifier}'`);
}

function callLLMDiff(itemA, itemB) {
  const apiKey = process.env.OPENAI_API_KEY || process.env.LLM_API_KEY;
  if (!apiKey) return Promise.resolve(null);

  const rawBase = process.env.OPENAI_BASE_URL || process.env.LLM_BASE_URL || DEFAULT_BASE_URL;
  const baseUrl = rawBase.replace(/\/$/, '');
  const model = process.env.LLM_MODEL || DEFAULT_MODEL;

  const systemPrompt =
    'You are an elite software architect and code taste critic. ' +
    'Compare two developer engineering tastes / agent instructions.\n' +
    'Analyze their ideological clash, trade-offs, and behavioral constraints.\n' +
    'Return ONLY a valid JSON object with the following keys:\n' +
    '- philosophy_clash: string (2-3 sentences explaining the core divergence in developer philosophy)\n' +
    '- contrasts: array of objects [{ category: string, taste_a: string, taste_b: string }]\n' +
    '- when_to_use_a: string (one clear recommendation when Taste A is superior)\n' +
    '- when_to_use_b: string (one clear recommendation when Taste B is superior)\n' +
    'Answer in pure English without markdown code fences or conversational text.';

  const payload = JSON.stringify({
    model: model,
    messages: [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: `Taste A [${itemA.name}]:\n${itemA.content.slice(0, 5000)}\n\n---\n\nTaste B [${itemB.name}]:\n${itemB.content.slice(0, 5000)}`,
      },
    ],
    temperature: 0.1,
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
            'User-Agent': 'Taste-Diff-LLM/1.0',
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

function diffDeterministic(itemA, itemB) {
  const extractBullets = (text) =>
    text
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.startsWith('-') || l.startsWith('*'))
      .map((l) => l.replace(/^[-*]\s*/, ''))
      .slice(0, 4);

  const bulletsA = extractBullets(itemA.content);
  const bulletsB = extractBullets(itemB.content);

  const contrasts = [
    {
      category: 'Primary Directives',
      taste_a: bulletsA[0] || 'Standard rules',
      taste_b: bulletsB[0] || 'Standard rules',
    },
    {
      category: 'Architectural Stance',
      taste_a: bulletsA[1] || 'Specific constraints',
      taste_b: bulletsB[1] || 'Specific constraints',
    },
    {
      category: 'Tooling & Testing',
      taste_a: bulletsA[2] || 'Deterministic checks',
      taste_b: bulletsB[2] || 'Deterministic checks',
    },
  ];

  return {
    philosophy_clash: `${itemA.name} focuses on ${itemA.meta.description || 'its defined rules'}, whereas ${itemB.name} emphasizes ${itemB.meta.description || 'its distinct philosophy'}.`,
    contrasts,
    when_to_use_a: `Use ${itemA.name} when optimizing for its specific engineering profile.`,
    when_to_use_b: `Use ${itemB.name} when you need its complementary constraints.`,
    llm_powered: false,
  };
}

async function diffTastes(targetA, targetB, cwd = process.cwd()) {
  const itemA = resolveTasteOrFile(targetA, cwd);
  const itemB = resolveTasteOrFile(targetB, cwd);

  let result = await callLLMDiff(itemA, itemB);
  let llmPowered = true;

  if (!result || !result.philosophy_clash) {
    result = diffDeterministic(itemA, itemB);
    llmPowered = false;
  }

  // Format terminal report
  const report = [
    `${c.bold('Comparing:')} ${c.cyan(c.bold(itemA.name))} ${c.dim('vs')} ${c.yellow(c.bold(itemB.name))}  ${c.dim(`[Engine: ${llmPowered ? '🧠 LLM' : '⚙️ Static'}]`)}`,
    '',
    c.bold('⚡ The Philosophy Clash:'),
    `  ${result.philosophy_clash}`,
    '',
    c.bold('⚖️ Direct Contrasts:'),
    ...(result.contrasts && result.contrasts.length
      ? result.contrasts.map(
          (cItem) =>
            `  ${c.magenta(c.bold(`[${cItem.category}]`))}\n` +
            `    ${c.cyan(`• ${itemA.name}:`)} ${cItem.taste_a}\n` +
            `    ${c.yellow(`• ${itemB.name}:`)} ${cItem.taste_b}`
        )
      : []),
    '',
    c.bold('🎯 When to Choose:'),
    `  ${c.cyan(c.bold(`• Choose ${itemA.name}:`))} ${result.when_to_use_a}`,
    `  ${c.yellow(c.bold(`• Choose ${itemB.name}:`))} ${result.when_to_use_b}`,
  ].join('\n');

  return {
    itemA,
    itemB,
    analysis: result,
    report,
    llmPowered,
  };
}

module.exports = {
  resolveTasteOrFile,
  diffTastes,
  diffDeterministic,
};
