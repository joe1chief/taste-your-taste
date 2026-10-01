/**
 * Serverless API handler for dynamic GitHub Profile Taste Card & Badge
 * Compatible with Vercel / Netlify / Node HTTP functions.
 * Returns image/svg+xml with aggressive caching headers.
 */

const { generateCardSvg, generateBadgeSvg } = require('../src/card');

module.exports = (req, res) => {
  let query = {};
  if (req.query) {
    query = req.query;
  } else if (req.url && req.url.includes('?')) {
    const querystring = req.url.split('?')[1];
    query = Object.fromEntries(new URLSearchParams(querystring));
  }

  const isBadge = query.type === 'badge' || query.format === 'badge';

  const svg = isBadge
    ? generateBadgeSvg({
        type: query.badgeType || 'score',
        style: query.style || 'antfu',
        tone: query.tone || 'karpathy',
        archetype: query.archetype || 'Anti-Slop Minimalist',
        score: query.score || 94,
      })
    : generateCardSvg({
        user: query.user || 'developer',
        style: query.style || 'antfu',
        tone: query.tone || 'karpathy',
        archetype: query.archetype || 'Anti-Slop Minimalist',
        score: query.score || 94,
        theme: query.theme || 'cyber',
      });

  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'public, max-age=7200, s-maxage=86400, stale-while-revalidate=86400');
  res.statusCode = 200;
  res.end(svg);
};
