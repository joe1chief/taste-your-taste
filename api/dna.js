/**
 * Serverless API handler for Developer Code DNA & MBTI Wrapped SVG Card (/api/dna)
 * Compatible with Vercel / Netlify / Node HTTP functions.
 */

const { MASTER_PERSONAS, generateDnaCardSvg } = require('../src/dna');

module.exports = (req, res) => {
  let query = {};
  if (req.query) {
    query = req.query;
  } else if (req.url && req.url.includes('?')) {
    const querystring = req.url.split('?')[1];
    query = Object.fromEntries(new URLSearchParams(querystring));
  }

  const g1Key = MASTER_PERSONAS[query.g1] ? query.g1 : 'karpathy';
  const g2Key = MASTER_PERSONAS[query.g2] ? query.g2 : 'antfu';
  const g3Key = MASTER_PERSONAS[query.g3] ? query.g3 : 'goblin';

  const p1 = Math.max(10, Math.min(90, parseInt(query.p1, 10) || 74));
  const p2 = Math.max(5, Math.min(95 - p1, parseInt(query.p2, 10) || 19));
  const p3 = Math.max(1, 100 - p1 - p2);

  const profile = {
    author: query.user || 'developer',
    repoName: query.repo || 'workspace',
    genotype: String(query.genotype || 'STPZ').slice(0, 4).toUpperCase(),
    mbtiTitle: query.mbti || 'INTJ-A // Surgical Stdlib Purist',
    chronotype: query.chrono || 'NIGHT OWL (28% late-night commits)',
    genes: [
      { ...MASTER_PERSONAS[g1Key], percent: p1 },
      { ...MASTER_PERSONAS[g2Key], percent: p2 },
      { ...MASTER_PERSONAS[g3Key], percent: p3 },
    ],
    git: { commitCount: parseInt(query.commits, 10) || 100 },
    code: {
      hasZeroDeps: query.deps === '0' || !query.deps,
      runtimeDeps: parseInt(query.deps, 10) || 0,
      medianFnLoc: parseInt(query.fnLoc, 10) || 22,
      testRatio: (parseInt(query.tests, 10) || 28) / 100,
    },
  };

  const svg = generateDnaCardSvg(profile, { theme: query.theme || 'cyber' });
  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'public, max-age=7200, s-maxage=86400, stale-while-revalidate=86400');
  res.statusCode = 200;
  res.end(svg);
};
