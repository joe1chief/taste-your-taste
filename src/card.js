/**
 * Taste Card Generator: Dynamic GitHub Profile SVG Badge & Card
 * Generates aesthetic developer taste cards for GitHub profile READMEs.
 * Zero external dependencies.
 */

const fs = require('fs');
const path = require('path');
const { analyzeContentDeterministic } = require('./roaster');

function escapeXml(unsafe) {
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function generateCardSvg(options = {}) {
  const user = escapeXml(options.user || 'developer');
  const archetype = escapeXml(options.archetype || 'Anti-Slop Minimalist');
  const style = escapeXml(options.style || 'antfu');
  const tone = escapeXml(options.tone || 'karpathy');
  const score = Math.max(5, Math.min(100, Math.round(Number(options.score) || 94)));

  let ratingLabel = "CHEF'S TASTE";
  let ratingColor = '#10b981'; // emerald
  let barColor = '#ec4899'; // pink

  if (score < 40) {
    ratingLabel = 'CRIMINAL WASTE';
    ratingColor = '#ef4444'; // red
    barColor = '#ef4444';
  } else if (score < 70) {
    ratingLabel = 'SLOPPY AMATEUR';
    ratingColor = '#f59e0b'; // amber
    barColor = '#f59e0b';
  } else if (score < 88) {
    ratingLabel = 'ACCEPTABLE CRAFT';
    ratingColor = '#06b6d4'; // cyan
    barColor = '#8b5cf6';
  }

  const barWidth = Math.round((score / 100) * 160);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="495" height="195" viewBox="0 0 495 195" fill="none">
  <style>
    .header { font: 700 16px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; fill: #f43f5e; }
    .sub { font: 500 12px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; fill: #8b949e; }
    .title { font: 600 13px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; fill: #e6edf3; }
    .value { font: 700 13px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, monospace; fill: #a5f3fc; }
    .stat-label { font: 500 12px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; fill: #7d8590; }
    .stat-val { font: 700 12px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; fill: #f0f6fc; }
    .badge-bg { fill: rgba(244, 63, 94, 0.15); stroke: rgba(244, 63, 94, 0.4); }
    .badge-txt { font: 700 11px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; fill: #fda4af; }
  </style>

  <!-- Background Card -->
  <rect x="0.5" y="0.5" width="494" height="194" rx="14" fill="#0d1117" stroke="#30363d"/>

  <!-- Top Decorative Glow -->
  <circle cx="450" cy="30" r="70" fill="#ec4899" opacity="0.08" filter="blur(30px)"/>
  <circle cx="50" cy="160" r="50" fill="#8b5cf6" opacity="0.08" filter="blur(30px)"/>

  <!-- Header -->
  <g transform="translate(25, 32)">
    <text x="0" y="0" class="header">🍷 TASTE YOUR TASTE</text>
    <text x="185" y="-1" class="sub">• @${user}</text>
  </g>

  <!-- Archetype Badge -->
  <g transform="translate(25, 48)">
    <rect x="0" y="0" width="165" height="22" rx="6" class="badge-bg"/>
    <text x="10" y="15" class="badge-txt">${archetype}</text>
  </g>

  <!-- Left Stats Column -->
  <g transform="translate(25, 100)">
    <!-- Taste DNA -->
    <text x="0" y="0" class="stat-label">Taste Stacking:</text>
    <text x="0" y="20" class="stat-val">${style} <tspan fill="#8b949e">+</tspan> ${tone}</text>

    <!-- Politeness Tax -->
    <text x="0" y="52" class="stat-label">Politeness Tax:</text>
    <text x="0" y="70" class="stat-val" fill="#10b981">0% (Pure Diff)</text>
  </g>

  <!-- Right Score Column -->
  <g transform="translate(260, 100)">
    <text x="0" y="0" class="stat-label">Taste Score:</text>
    <text x="0" y="22" class="title" font-weight="700">
      <tspan font-size="20" fill="${ratingColor}">${score}</tspan><tspan fill="#8b949e" font-size="13"> / 100</tspan>
    </text>

    <!-- Progress Bar -->
    <rect x="0" y="34" width="160" height="7" rx="3.5" fill="#21262d"/>
    <rect x="0" y="34" width="${barWidth}" height="7" rx="3.5" fill="${barColor}"/>

    <!-- Linus Rating -->
    <text x="0" y="66" class="stat-label">Linus Verdict:</text>
    <text x="90" y="66" class="stat-val" fill="${ratingColor}">${ratingLabel}</text>
  </g>
</svg>`;
}

function generateCardFromFile(filePath, options = {}) {
  let score = options.score;
  let archetype = options.archetype;

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const analysis = analyzeContentDeterministic(content);
    if (!score) score = analysis.score;
    if (!archetype) {
      if (score >= 80) archetype = 'Anti-Slop Minimalist';
      else if (content.includes('strict') || content.includes('assert')) archetype = 'Defensive Architect';
      else if (content.includes('160') || content.includes('hacker')) archetype = 'Hacker Velocity';
      else archetype = 'Engineering Craft';
    }
  }

  return generateCardSvg({
    ...options,
    score: score || 92,
    archetype: archetype || 'Anti-Slop Minimalist',
  });
}

function renderCardToFile(outputPath, options = {}) {
  const svg = options.file
    ? generateCardFromFile(options.file, options)
    : generateCardSvg(options);

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(outputPath, svg, 'utf-8');
  return { outputPath, svg };
}

module.exports = {
  generateCardSvg,
  generateCardFromFile,
  renderCardToFile,
};
