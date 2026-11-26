/**
 * Taste Tax Engine (src/tax.js)
 * Audits agent instruction files (CLAUDE.md, AGENTS.md, .cursorrules, etc.) for
 * conversational slop, corporate platitudes, apologies, and verbose bloat,
 * converting abstract token waste into an itemized Annual AI Slop Tax Receipt
 * (USD/year + Iced Americano index) and a serrated Cyber Thermal Receipt SVG.
 *
 * Zero external runtime dependencies. 100% deterministic offline execution.
 */

const fs = require('fs');
const path = require('path');
const { THEMES, computeHexSig } = require('./card');
const { pruneDeterministic, calcStats } = require('./pruner');

const ICED_AMERICANO_USD = 5.0;

const MODEL_PRICING = {
  opus: {
    id: 'opus',
    label: 'Claude Opus / Frontier ($15/1M tok)',
    inputPerMillion: 15.0,
  },
  sonnet: {
    id: 'sonnet',
    label: 'Claude Sonnet ($3/1M tok)',
    inputPerMillion: 3.0,
  },
  gpt4o: {
    id: 'gpt4o',
    label: 'GPT-4o ($2.50/1M tok)',
    inputPerMillion: 2.5,
  },
  deepseek: {
    id: 'deepseek',
    label: 'DeepSeek V3 ($0.27/1M tok)',
    inputPerMillion: 0.27,
  },
};

const TAX_CATEGORIES = [
  {
    id: 'politeness',
    code: 'TAX-01',
    label: 'POLITENESS TAX',
    hint: '"please / kindly / thank you"',
    regex: /\b(please|kindly|thank\s+you|thanks\s+in\s+advance|thanks|gratefully|if\s+you\s+don't\s+mind)\b/gi,
    tokensPerHit: 3.4,
  },
  {
    id: 'platitudes',
    code: 'TAX-02',
    label: 'PLATITUDE FLUFF',
    hint: '"write clean code / best practices"',
    regex: /(write\s+clean(?:,\s*readable)?\s+code|clean\s+and\s+readable\s+code|follow\s+(?:all\s+)?(?:industry\s+)?best\s+practices|strive\s+for\s+excellence|high[- ]quality\s+code|maintainable\s+and\s+scalable)/gi,
    tokensPerHit: 8.5,
  },
  {
    id: 'apologies',
    code: 'TAX-03',
    label: 'APOLOGY & MANNERS TAX',
    hint: '"apologize / be helpful & friendly"',
    regex: /(apologize(?:\s+immediately)?|\bsorry\b|helpful\s+and\s+friendly|be\s+(?:very\s+)?(?:helpful|polite|friendly|courteous)|value\s+collaboration\s+and\s+empathy)/gi,
    tokensPerHit: 6.8,
  },
  {
    id: 'roleplay',
    code: 'TAX-04',
    label: 'ROLEPLAY PREAMBLE TAX',
    hint: '"you are a world-class expert..."',
    regex: /(you\s+are\s+an?\s+(?:world-class|expert|helpful|senior)|as\s+an\s+ai\s+(?:assistant|agent)|here\s+are\s+the\s+project\s+guidelines)/gi,
    tokensPerHit: 8.2,
  },
  {
    id: 'hedging',
    code: 'TAX-05',
    label: 'HEDGING & WAFFLE TAX',
    hint: '"feel free to / try your best"',
    regex: /(feel\s+free\s+to|try\s+your\s+best\s+to|whenever\s+possible|make\s+sure\s+that\s+you\s+always|ensure\s+that\s+you\s+always)/gi,
    tokensPerHit: 5.5,
  },
];

function escapeXml(unsafe) {
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Calculate itemized annual AI Slop Tax from prompt content.
 */
function calculateSlopTax(content, options = {}) {
  const text = String(content || '');
  const turnsPerDay = Math.max(1, Number(options.turnsPerDay || options.turns) || 150);
  const stepsPerTurn = Math.max(1, Number(options.stepsPerTurn) || 3);
  const daysPerYear = Math.max(1, Number(options.daysPerYear) || 365);
  const teamSize = Math.max(1, Number(options.teamSize || options.devs) || 1);
  const modelKey = options.model && MODEL_PRICING[String(options.model).toLowerCase()]
    ? String(options.model).toLowerCase()
    : 'opus';
  const model = MODEL_PRICING[modelKey];

  const annualInjections = turnsPerDay * stepsPerTurn * daysPerYear * teamSize;
  const usdPerTokenYear = (annualInjections / 1_000_000) * model.inputPerMillion;

  const originalStats = calcStats(text);
  const prunedText = pruneDeterministic(text);
  const prunedStats = calcStats(prunedText);
  const prunerDeltaTokens = Math.max(0, originalStats.tokens - prunedStats.tokens);

  const items = [];
  let regexWastedTokens = 0;

  for (const cat of TAX_CATEGORIES) {
    const matches = text.match(cat.regex) || [];
    if (matches.length > 0) {
      const wastedTokens = Math.max(2, Math.round(matches.length * cat.tokensPerHit));
      regexWastedTokens += wastedTokens;
      const annualUsd = Number((wastedTokens * usdPerTokenYear).toFixed(2));
      items.push({
        id: cat.id,
        code: cat.code,
        label: cat.label,
        hint: cat.hint,
        count: matches.length,
        samples: [...new Set(matches.map((m) => m.trim().toLowerCase()))].slice(0, 3),
        wastedTokens,
        annualUsd,
      });
    }
  }

  // Reconcile any extra verbose filler lines caught by pruner beyond explicit regex items
  if (prunerDeltaTokens > regexWastedTokens + 4) {
    const extraTokens = prunerDeltaTokens - regexWastedTokens;
    items.push({
      id: 'verbose_bloat',
      code: 'TAX-06',
      label: 'VERBOSE PROSE OVERHEAD',
      hint: 'redundant filler lines & spacing',
      count: 1,
      samples: ['wordy prose'],
      wastedTokens: extraTokens,
      annualUsd: Number((extraTokens * usdPerTokenYear).toFixed(2)),
    });
  }

  const totalWastedTokens = items.reduce((sum, it) => sum + it.wastedTokens, 0);
  const totalAnnualUsd = Number(items.reduce((sum, it) => sum + it.annualUsd, 0).toFixed(2));
  const totalOriginalAnnualUsd = Number((originalStats.tokens * usdPerTokenYear).toFixed(2));
  const wastePercent = originalStats.tokens > 0
    ? Number(Math.min(95, (totalWastedTokens / originalStats.tokens) * 100).toFixed(1))
    : 0;
  const icedAmericanos = totalAnnualUsd >= ICED_AMERICANO_USD
    ? Math.round(totalAnnualUsd / ICED_AMERICANO_USD)
    : Number((totalAnnualUsd / ICED_AMERICANO_USD).toFixed(1));

  const taxFree = items.length === 0 || totalAnnualUsd < 0.5;

  return {
    targetName: options.targetName || 'CLAUDE.md',
    model,
    turnsPerDay,
    stepsPerTurn,
    daysPerYear,
    teamSize,
    annualInjections,
    originalTokens: originalStats.tokens,
    cleanTokens: Math.max(0, originalStats.tokens - totalWastedTokens),
    totalWastedTokens,
    wastePercent,
    totalOriginalAnnualUsd,
    totalAnnualUsd,
    icedAmericanos,
    taxFree,
    items,
  };
}

function buildZigZagPolygon(x, yTop, width, height, teeth = 22, toothH = 7) {
  const step = width / teeth;
  const topPts = [];
  for (let i = 0; i <= teeth; i++) {
    const px = (x + i * step).toFixed(1);
    const py = i % 2 === 0 ? yTop : yTop + toothH;
    topPts.push(`${px},${py}`);
  }
  const yBot = yTop + height;
  const botPts = [];
  for (let i = teeth; i >= 0; i--) {
    const px = (x + i * step).toFixed(1);
    const py = i % 2 === 0 ? yBot : yBot - toothH;
    botPts.push(`${px},${py}`);
  }
  return [...topPts, ...botPts].join(' ');
}

function buildBarcodeBars(xStart, y, totalWidth, height, seedHex, color) {
  const bars = [];
  let cursor = xStart;
  const widths = [2.5, 1.2, 3.4, 1.2, 1.8, 2.8, 1.2, 1.5];
  let idx = 0;
  while (cursor < xStart + totalWidth - 4) {
    const charCode = seedHex.charCodeAt(idx % seedHex.length) || 65;
    const w = widths[(charCode + idx) % widths.length];
    const gap = 1.6 + ((charCode + idx * 3) % 3) * 0.9;
    if (cursor + w <= xStart + totalWidth) {
      bars.push(`<rect x="${cursor.toFixed(1)}" y="${y}" width="${w.toFixed(1)}" height="${height}" fill="${color}"/>`);
    }
    cursor += w + gap;
    idx++;
  }
  return bars.join('');
}

/**
 * Generate a Cyber Supermarket Thermal Receipt SVG (440 x dynamic height).
 * Supports both dark neon themes (`cyber`, `matrix`, `tron`, `dracula`, `noir`)
 * and realistic classic thermal receipt paper (`paper`).
 */
function generateTaxReceiptSvg(report, options = {}) {
  const rawTheme = String(options.theme || 'cyber').toLowerCase();
  const isPaper = rawTheme === 'paper';
  const th = THEMES[rawTheme] || THEMES.cyber;

  const receiptNo = computeHexSig(
    `${report.targetName}:${report.totalAnnualUsd}:${report.totalWastedTokens}:${report.turnsPerDay}`
  );

  const displayItems = report.items && report.items.length > 0
    ? report.items
    : [
        {
          code: 'TAX-00',
          label: 'CONVERSATIONAL SLOP',
          hint: 'zero polite filler detected',
          count: 0,
          wastedTokens: 0,
          annualUsd: 0.0,
        },
      ];

  const W = 440;
  const rowH = 38;
  const itemsBlockH = displayItems.length * rowH;
  const paperH = 364 + itemsBlockH;
  const H = paperH + 36;

  // Color palette (Paper vs Cyber Dark Thermal)
  const voidBg = isPaper ? '#0f172a' : th.bg0;
  const paperFill = isPaper ? '#f7f6ef' : th.bg1;
  const inkMain = isPaper ? '#111827' : '#f8fafc';
  const inkMuted = isPaper ? '#52525b' : '#94a3b8';
  const inkDim = isPaper ? '#a1a1aa' : '#334155';
  const accentPrimary = report.taxFree
    ? '#10b981'
    : isPaper
      ? '#dc2626'
      : th.primary;
  const accentSecondary = isPaper ? '#1d4ed8' : th.accent;
  const totalBoxBg = report.taxFree
    ? 'rgba(16, 185, 129, 0.14)'
    : isPaper
      ? 'rgba(220, 38, 38, 0.09)'
      : 'rgba(244, 63, 94, 0.14)';

  const paperPoints = buildZigZagPolygon(22, 18, W - 44, paperH, 24, 7);

  let currentY = 148;
  const itemRowsSvg = displayItems
    .map((it) => {
      const y = currentY;
      currentY += rowH;
      const qtyStr = `${String(it.count).padStart(2, '0')}x`;
      const usdStr = `$${Number(it.annualUsd).toFixed(2)}`;
      return `<g transform="translate(44, ${y})">
      <text x="0" y="13" class="mono" font-size="11" font-weight="800" fill="${accentPrimary}">${qtyStr}</text>
      <text x="32" y="13" class="mono" font-size="11" font-weight="700" fill="${inkMain}">${escapeXml(it.label)}</text>
      <text x="352" y="13" text-anchor="end" class="mono" font-size="11.5" font-weight="800" fill="${inkMain}">${usdStr}</text>
      <text x="32" y="27" class="mono" font-size="9" fill="${inkMuted}">${escapeXml(it.hint)} (~${it.wastedTokens} tok/turn)</text>
    </g>`;
    })
    .join('\n  ');

  const summaryY = currentY + 10;
  const totalUsdFormatted = `$${Number(report.totalAnnualUsd).toFixed(2)}`;
  const coffeeLine = report.taxFree
    ? '0 CUPS WASTED // CERTIFIED TAX-EXEMPT'
    : `ENOUGH FOR ${report.icedAmericanos} ICED AMERICANOS ($5/CUP)`;
  const stampText = report.taxFree
    ? 'ZERO SLOP // CHEF CERTIFIED'
    : 'EVADE TAX: npx taste-code prune -w';

  const teamSuffix = report.teamSize > 1 ? ` x ${report.teamSize} DEVS` : '';
  const billingMeta = `${report.turnsPerDay} TURNS/DAY x ${report.stepsPerTurn} STEPS${teamSuffix}`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" fill="none" role="img" aria-label="AI Slop Tax Receipt: ${totalUsdFormatted} per year">
  <defs>
    <filter id="paperShadow" x="-10%" y="-5%" width="120%" height="112%">
      <feDropShadow dx="0" dy="6" stdDeviation="8" flood-color="#000000" flood-opacity="0.55"/>
    </filter>
  </defs>

  <style>
    .mono { font-family: 'JetBrains Mono', 'SFMono-Regular', ui-monospace, Menlo, Monaco, Consolas, monospace; }
  </style>

  <!-- Backdrop -->
  <rect width="${W}" height="${H}" rx="16" fill="${voidBg}"/>

  <!-- Serrated Thermal Paper Body -->
  <polygon points="${paperPoints}" fill="${paperFill}" stroke="${isPaper ? '#d4d4d8' : accentPrimary}" stroke-opacity="${isPaper ? '0.8' : '0.45'}" stroke-width="1.2" filter="url(#paperShadow)"/>

  <!-- Receipt Header -->
  <g transform="translate(220, 52)">
    <text x="0" y="0" text-anchor="middle" class="mono" font-size="13.5" font-weight="800" fill="${inkMain}" letter-spacing="1.2">AI SLOP TAX RECEIPT</text>
    <text x="0" y="17" text-anchor="middle" class="mono" font-size="9.5" font-weight="600" fill="${inkMuted}">BUREAU OF CONTEXT WINDOW ECONOMICS</text>
    <text x="0" y="33" text-anchor="middle" class="mono" font-size="9" fill="${accentSecondary}">FILE: ${escapeXml(String(report.targetName).slice(0, 26))}  •  #TX-${receiptNo}</text>
    <text x="0" y="47" text-anchor="middle" class="mono" font-size="8.5" fill="${inkMuted}">${escapeXml(billingMeta)} (${escapeXml(report.model.id.toUpperCase())})</text>
  </g>

  <line x1="42" y1="112" x2="398" y2="112" stroke="${inkDim}" stroke-width="1.2" stroke-dasharray="4 3"/>
  <text x="44" y="128" class="mono" font-size="9" font-weight="700" fill="${inkMuted}">QTY  TAXABLE PROMPT OFFENSE</text>
  <text x="396" y="128" text-anchor="end" class="mono" font-size="9" font-weight="700" fill="${inkMuted}">USD / YR</text>
  <line x1="42" y1="136" x2="398" y2="136" stroke="${inkDim}" stroke-width="1" stroke-dasharray="2 3"/>

  <!-- Line Items -->
  ${itemRowsSvg}

  <!-- Totals Section -->
  <g transform="translate(42, ${summaryY})">
    <line x1="0" y1="0" x2="356" y2="0" stroke="${inkDim}" stroke-width="1.2" stroke-dasharray="4 3"/>

    <text x="2" y="19" class="mono" font-size="9.5" font-weight="600" fill="${inkMuted}">PROMPT CONTEXT OVERHEAD</text>
    <text x="354" y="19" text-anchor="end" class="mono" font-size="9.5" font-weight="700" fill="${inkMain}">${report.totalWastedTokens} / ${report.originalTokens} TOK (${report.wastePercent}%)</text>

    <text x="2" y="35" class="mono" font-size="9.5" font-weight="600" fill="${inkMuted}">ANNUAL CONTEXT INJECTIONS</text>
    <text x="354" y="35" text-anchor="end" class="mono" font-size="9.5" font-weight="700" fill="${inkMain}">${report.annualInjections.toLocaleString('en-US')}x / YR</text>

    <!-- Grand Total Highlight Box -->
    <rect x="0" y="48" width="356" height="58" rx="7" fill="${totalBoxBg}" stroke="${accentPrimary}" stroke-width="1.5"/>
    <text x="14" y="71" class="mono" font-size="10.5" font-weight="800" fill="${accentPrimary}">ANNUAL SLOP TAX</text>
    <text x="342" y="75" text-anchor="end" class="mono" font-size="22" font-weight="800" fill="${accentPrimary}">${totalUsdFormatted}<tspan font-size="10.5">/YR</tspan></text>
    <text x="14" y="94" class="mono" font-size="9.5" font-weight="700" fill="${inkMain}">${escapeXml(coffeeLine)}</text>

    <!-- Remedy Stamp -->
    <rect x="0" y="118" width="356" height="26" rx="5" fill="${isPaper ? '#18181b' : th.panel}" stroke="${accentSecondary}" stroke-opacity="0.55"/>
    <text x="178" y="135" text-anchor="middle" class="mono" font-size="9.5" font-weight="700" fill="${isPaper ? '#f8fafc' : accentSecondary}">${escapeXml(stampText)}</text>

    <!-- Deterministic 1D Barcode -->
    <g transform="translate(28, 156)">
      ${buildBarcodeBars(0, 0, 300, 30, receiptNo + String(report.totalWastedTokens), isPaper ? '#18181b' : '#cbd5e1')}
      <text x="150" y="42" text-anchor="middle" class="mono" font-size="8.5" letter-spacing="2" fill="${inkMuted}">TASTE-YOUR-TASTE // ${receiptNo}</text>
    </g>
  </g>
</svg>`;
}

function taxFile(filePath, options = {}) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Target file not found: ${filePath}`);
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  const report = calculateSlopTax(content, {
    ...options,
    targetName: options.targetName || path.basename(filePath),
  });
  return {
    filePath,
    ...report,
  };
}

function renderTaxReceiptToFile(outputPath, report, options = {}) {
  const svg = generateTaxReceiptSvg(report, options);
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(outputPath, svg, 'utf-8');
  return { outputPath, svg };
}

module.exports = {
  ICED_AMERICANO_USD,
  MODEL_PRICING,
  TAX_CATEGORIES,
  calculateSlopTax,
  generateTaxReceiptSvg,
  taxFile,
  renderTaxReceiptToFile,
};
