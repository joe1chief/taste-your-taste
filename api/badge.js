/**
 * Serverless API handler for dynamic GitHub Profile Taste Badge (Shields style)
 * Compatible with Vercel / Netlify / Node HTTP functions.
 * Returns image/svg+xml with aggressive caching headers.
 */

const { generateBadgeSvg } = require('../src/card');

module.exports = (req, res) => {
  let query = {};
  if (req.query) {
    query = req.query;
  } else if (req.url && req.url.includes('?')) {
    const querystring = req.url.split('?')[1];
    query = Object.fromEntries(new URLSearchParams(querystring));
  }

  const svg = generateBadgeSvg({
    type: query.type || 'score',
    style: query.style || 'antfu',
    tone: query.tone || 'karpathy',
    archetype: query.archetype || 'Anti-Slop Minimalist',
    score: query.score || 94,
  });

  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'public, max-age=7200, s-maxage=86400, stale-while-revalidate=86400');
  res.statusCode = 200;
  res.end(svg);
};
