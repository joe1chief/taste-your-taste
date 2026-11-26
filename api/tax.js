/**
 * Serverless API handler for Cyber AI Slop Tax Receipt SVG (/api/tax)
 * Compatible with Vercel / Netlify / Node HTTP functions.
 */

const { generateTaxReceiptSvg } = require('../src/tax');

module.exports = (req, res) => {
  let query = {};
  if (req.query) {
    query = req.query;
  } else if (req.url && req.url.includes('?')) {
    const querystring = req.url.split('?')[1];
    query = Object.fromEntries(new URLSearchParams(querystring));
  }

  const turnsPerDay = Math.max(1, parseInt(query.turns, 10) || 150);
  const stepsPerTurn = Math.max(1, parseInt(query.steps, 10) || 3);
  const teamSize = Math.max(1, parseInt(query.devs, 10) || 1);
  const politeUsd = Number(query.polite || 48.2);
  const fluffUsd = Number(query.fluff || 71.5);
  const apologyUsd = Number(query.apology || 34.0);
  const totalUsd = query.total !== undefined
    ? Number(query.total)
    : Number((politeUsd + fluffUsd + apologyUsd).toFixed(2));

  const items = [];
  if (totalUsd > 0) {
    if (politeUsd > 0) {
      items.push({ code: 'TAX-01', label: 'POLITENESS TAX', hint: '"please / kindly"', count: parseInt(query.politeCnt, 10) || 6, wastedTokens: 20, annualUsd: politeUsd });
    }
    if (fluffUsd > 0) {
      items.push({ code: 'TAX-02', label: 'PLATITUDE FLUFF', hint: '"write clean code"', count: parseInt(query.fluffCnt, 10) || 3, wastedTokens: 29, annualUsd: fluffUsd });
    }
    if (apologyUsd > 0) {
      items.push({ code: 'TAX-03', label: 'APOLOGY & MANNERS TAX', hint: '"apologize / friendly"', count: parseInt(query.apologyCnt, 10) || 2, wastedTokens: 14, annualUsd: apologyUsd });
    }
  }

  const wastedTokens = items.reduce((s, i) => s + i.wastedTokens, 0);
  const origTokens = Math.max(wastedTokens + 60, parseInt(query.tokens, 10) || 160);

  const report = {
    targetName: query.file || 'CLAUDE.md',
    model: { id: query.model || 'opus', label: 'Frontier Agent' },
    turnsPerDay,
    stepsPerTurn,
    daysPerYear: 365,
    teamSize,
    annualInjections: turnsPerDay * stepsPerTurn * 365 * teamSize,
    originalTokens: origTokens,
    cleanTokens: origTokens - wastedTokens,
    totalWastedTokens: wastedTokens,
    wastePercent: Number(((wastedTokens / origTokens) * 100).toFixed(1)),
    totalAnnualUsd: totalUsd,
    icedAmericanos: Math.round(totalUsd / 5.0),
    taxFree: totalUsd < 0.5,
    items,
  };

  const svg = generateTaxReceiptSvg(report, { theme: query.theme || 'cyber' });
  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'public, max-age=7200, s-maxage=86400, stale-while-revalidate=86400');
  res.statusCode = 200;
  res.end(svg);
};
