/**
 * Taste Card & Badge Generator v2.1: Geek Telemetry Terminal HUD Cards & Micro-Badges
 * Pure vector geometry (zero OS-dependent emojis), deterministic hex signatures,
 * dual-ring concentric telemetry gauges, and multi-theme CRT/HUD colorways.
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
    .replace(/"/g, '&quot;');
}

/**
 * Deterministic 24-bit FNV-1a hex signature for geek telemetry header.
 */
function computeHexSig(input) {
  let hash = 0x811c9dc5;
  const str = String(input || 'taste');
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return (hash & 0xffffff).toString(16).toUpperCase().padStart(6, '0');
}

const THEMES = {
  cyber: {
    name: 'Cyberpunk Rose (Default)',
    primary: '#f43f5e',
    secondary: '#8b5cf6',
    accent: '#22d3ee',
    bg0: '#05070e',
    bg1: '#0a0f1d',
    bg2: '#060913',
    chrome: '#080c17',
    panel: '#0c1324',
    border: '#f43f5e',
  },
  matrix: {
    name: 'Matrix Phosphor',
    primary: '#10b981',
    secondary: '#059669',
    accent: '#34d399',
    bg0: '#030906',
    bg1: '#07150e',
    bg2: '#040c08',
    chrome: '#05100a',
    panel: '#091c13',
    border: '#10b981',
  },
  midnight: {
    name: 'Tokyo Midnight',
    primary: '#38bdf8',
    secondary: '#6366f1',
    accent: '#a855f7',
    bg0: '#040814',
    bg1: '#0a1328',
    bg2: '#060b18',
    chrome: '#070e1e',
    panel: '#0d1832',
    border: '#38bdf8',
  },
  sunset: {
    name: 'Solaris Amber',
    primary: '#f59e0b',
    secondary: '#f97316',
    accent: '#fb7185',
    bg0: '#0c0704',
    bg1: '#190f07',
    bg2: '#100904',
    chrome: '#120a05',
    panel: '#1f130a',
    border: '#f59e0b',
  },
  noir: {
    name: 'Monochrome Carbon',
    primary: '#f1f5f9',
    secondary: '#94a3b8',
    accent: '#38bdf8',
    bg0: '#050507',
    bg1: '#0f1014',
    bg2: '#08080b',
    chrome: '#0a0a0e',
    panel: '#14151b',
    border: '#94a3b8',
  },
  dracula: {
    name: 'Dracula Synth',
    primary: '#ff79c6',
    secondary: '#bd93f9',
    accent: '#8be9fd',
    bg0: '#0b0914',
    bg1: '#161224',
    bg2: '#0e0b18',
    chrome: '#110e1d',
    panel: '#1d1830',
    border: '#ff79c6',
  },
  tron: {
    name: 'Tron Legacy Grid',
    primary: '#00f0ff',
    secondary: '#0284c7',
    accent: '#f97316',
    bg0: '#02080d',
    bg1: '#05131f',
    bg2: '#030b12',
    chrome: '#040e17',
    panel: '#081b2b',
    border: '#00f0ff',
  },
};

const ARCHETYPE_CONFIG = {
  'Defensive Architect': {
    code: 'ARCH::DEFENSIVE',
    color: '#10b981',
    bg: 'rgba(16, 185, 129, 0.11)',
    border: 'rgba(16, 185, 129, 0.45)',
    // Vector hex-shield icon (14x14 viewBox)
    iconPath: 'M7 1L12.5 3.5V7.5C12.5 10.8 10.1 13.4 7 14.5C3.9 13.4 1.5 10.8 1.5 7.5V3.5L7 1ZM5.2 7.6L6.6 9L9.4 5.8',
  },
  'Anti-Slop Minimalist': {
    code: 'ARCH::ANTI-SLOP',
    color: '#38bdf8',
    bg: 'rgba(56, 189, 248, 0.11)',
    border: 'rgba(56, 189, 248, 0.45)',
    // Vector precision diamond prism
    iconPath: 'M7 1L13 7L7 13L1 7L7 1ZM7 4.2L4.2 7L7 9.8L9.8 7L7 4.2Z',
  },
  'Hacker Velocity': {
    code: 'ARCH::VELOCITY',
    color: '#f59e0b',
    bg: 'rgba(245, 158, 11, 0.11)',
    border: 'rgba(245, 158, 11, 0.45)',
    // Vector high-voltage bolt
    iconPath: 'M8.2 1L2.5 8H7L5.8 13.8L11.8 6.6H7.3L8.2 1Z',
  },
  'Engineering Craft': {
    code: 'ARCH::CRAFT',
    color: '#c084fc',
    bg: 'rgba(192, 132, 252, 0.11)',
    border: 'rgba(192, 132, 252, 0.45)',
    // Vector circuit node / hex core
    iconPath: 'M7 1.5L12 4.4V10.1L7 13L2 10.1V4.4L7 1.5ZM7 5.2A2.1 2.1 0 1 0 7 9.4A2.1 2.1 0 1 0 7 5.2Z',
  },
  'Pragmatic Taste': {
    code: 'ARCH::PRAGMATIC',
    color: '#fb7185',
    bg: 'rgba(251, 113, 133, 0.11)',
    border: 'rgba(251, 113, 133, 0.45)',
    // Vector crosshair reticle
    iconPath: 'M7 2A5 5 0 1 0 7 12A5 5 0 1 0 7 2ZM7 0.5V3M7 11V13.5M0.5 7H3M11 7H13.5',
  },
  'Pragmatic Systems': {
    code: 'ARCH::SYSTEMS',
    color: '#22d3ee',
    bg: 'rgba(34, 211, 238, 0.11)',
    border: 'rgba(34, 211, 238, 0.45)',
    iconPath: 'M2 3H12V6H2V3ZM2 8.5H12V11.5H2V8.5ZM4 4.5H5M4 10H5',
  },
};

function resolveRating(score) {
  if (score < 40) {
    return {
      upper: 'CRIMINAL WASTE',
      title: 'Criminal Waste',
      tier: 'TIER::F',
      color: '#ef4444',
      bg: 'rgba(239, 68, 68, 0.13)',
      border: 'rgba(239, 68, 68, 0.5)',
    };
  }
  if (score < 70) {
    return {
      upper: 'SLOPPY AMATEUR',
      title: 'Sloppy Amateur',
      tier: 'TIER::C',
      color: '#f59e0b',
      bg: 'rgba(245, 158, 11, 0.13)',
      border: 'rgba(245, 158, 11, 0.5)',
    };
  }
  if (score < 88) {
    return {
      upper: 'ACCEPTABLE CRAFT',
      title: 'Acceptable Craft',
      tier: 'TIER::A',
      color: '#22d3ee',
      bg: 'rgba(34, 211, 238, 0.13)',
      border: 'rgba(34, 211, 238, 0.5)',
    };
  }
  return {
    upper: "CHEF'S TASTE",
    title: "Chef's Taste",
    tier: 'TIER::S+',
    color: '#10b981',
    bg: 'rgba(16, 185, 129, 0.14)',
    border: 'rgba(16, 185, 129, 0.55)',
  };
}

function renderMiniSegBar(x, y, filledCount, totalCount, activeColor) {
  const segW = 5;
  const segH = 6;
  const gap = 2.2;
  const rects = [];
  for (let i = 0; i < totalCount; i++) {
    const sx = (x + i * (segW + gap)).toFixed(1);
    const active = i < filledCount;
    rects.push(
      `<rect x="${sx}" y="${y}" width="${segW}" height="${segH}" rx="1.1" fill="${active ? activeColor : '#162033'}" fill-opacity="${active ? '0.94' : '0.85'}"/>`
    );
  }
  return rects.join('');
}

function generateCardSvg(options = {}) {
  const rawUser = String(options.user || 'developer').replace(/^@/, '').slice(0, 26);
  const rawArchetype = String(options.archetype || 'Anti-Slop Minimalist').slice(0, 28);
  const rawStyle = String(options.style || 'antfu').slice(0, 16);
  const rawTone = String(options.tone || 'karpathy').slice(0, 16);

  const user = escapeXml(rawUser);
  const archetype = escapeXml(rawArchetype);
  const style = escapeXml(rawStyle);
  const tone = escapeXml(rawTone);

  const score = Math.max(5, Math.min(100, Math.round(Number(options.score) || 94)));
  const themeKey = options.theme && THEMES[options.theme] ? options.theme : 'cyber';
  const th = THEMES[themeKey];
  const rating = resolveRating(score);

  const archConfig = ARCHETYPE_CONFIG[rawArchetype] || {
    code: 'ARCH::CUSTOM',
    color: th.accent,
    bg: 'rgba(34, 211, 238, 0.11)',
    border: 'rgba(34, 211, 238, 0.45)',
    iconPath: 'M7 1L13 7L7 13L1 7L7 1Z',
  };

  const hexSig = computeHexSig(`${rawUser}:${rawStyle}:${rawTone}:${rawArchetype}:${score}`);

  // Gauge geometry (W=540, H=220, right dial center cx=438, cy=105)
  const gaugeR = 39;
  const circumference = 2 * Math.PI * gaugeR;
  const strokeOffset = (circumference * (1 - score / 100)).toFixed(2);

  // Dynamic chip geometry
  const archChipW = Math.min(285, Math.max(158, Math.round(rawArchetype.length * 7.3 + 42)));
  const styleText = `--style ${rawStyle}`;
  const toneText = `--tone ${rawTone}`;
  const styleChipW = Math.max(92, Math.round(styleText.length * 6.5 + 24));
  const toneChipW = Math.max(92, Math.round(toneText.length * 6.5 + 24));
  const connectorX = styleChipW;
  const toneChipX = styleChipW + 22;

  const signalBars = Math.max(1, Math.min(10, Math.round((score / 100) * 10)));
  const armorBars = score >= 85 ? 10 : score >= 70 ? 8 : score >= 50 ? 6 : 3;
  const cliCmd = `npx taste-code blend --style ${rawStyle} --tone ${rawTone}`;
  const escapedCmd = escapeXml(cliCmd.length > 54 ? `${cliCmd.slice(0, 51)}...` : cliCmd);

  // Titlebar cursor offset after `~/taste-dna/@user`
  const pathStr = `~/taste-dna/@${rawUser}`;
  const cursorX = Math.round(68 + pathStr.length * 6.8 + 7);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="540" height="220" viewBox="0 0 540 220" fill="none" role="img" aria-label="Taste Your Taste Telemetry Card for @${user}">
  <defs>
    <clipPath id="cardClip">
      <rect x="0.5" y="0.5" width="539" height="219" rx="14"/>
    </clipPath>

    <linearGradient id="bgCanvas" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${th.bg0}"/>
      <stop offset="52%" stop-color="${th.bg1}"/>
      <stop offset="100%" stop-color="${th.bg2}"/>
    </linearGradient>

    <linearGradient id="rimBorder" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${th.primary}" stop-opacity="0.9"/>
      <stop offset="45%" stop-color="${th.secondary}" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="${th.accent}" stop-opacity="0.85"/>
    </linearGradient>

    <linearGradient id="laserTop" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${th.primary}" stop-opacity="0"/>
      <stop offset="25%" stop-color="${th.primary}" stop-opacity="0.95"/>
      <stop offset="75%" stop-color="${th.accent}" stop-opacity="0.95"/>
      <stop offset="100%" stop-color="${th.accent}" stop-opacity="0"/>
    </linearGradient>

    <linearGradient id="gaugeArc" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${th.secondary}"/>
      <stop offset="50%" stop-color="${th.primary}"/>
      <stop offset="100%" stop-color="${rating.color}"/>
    </linearGradient>

    <radialGradient id="nebulaRight" cx="84%" cy="22%" r="52%">
      <stop offset="0%" stop-color="${th.primary}" stop-opacity="0.16"/>
      <stop offset="100%" stop-color="${th.primary}" stop-opacity="0"/>
    </radialGradient>

    <radialGradient id="nebulaLeft" cx="14%" cy="78%" r="48%">
      <stop offset="0%" stop-color="${th.secondary}" stop-opacity="0.14"/>
      <stop offset="100%" stop-color="${th.secondary}" stop-opacity="0"/>
    </radialGradient>

    <pattern id="blueprintGrid" width="36" height="36" patternUnits="userSpaceOnUse">
      <path d="M 36 0 L 0 0 0 36" fill="none" stroke="#94a3b8" stroke-width="0.5" stroke-opacity="0.06"/>
      <path d="M 18 16.5 V 19.5 M 16.5 18 H 19.5" stroke="#e2e8f0" stroke-width="0.6" stroke-opacity="0.1"/>
    </pattern>

    <pattern id="crtScanline" width="8" height="4" patternUnits="userSpaceOnUse">
      <rect x="0" y="0" width="8" height="1" fill="#ffffff" fill-opacity="0.018"/>
    </pattern>

    <filter id="arcGlow" x="-25%" y="-25%" width="150%" height="150%">
      <feGaussianBlur stdDeviation="2.6" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <style>
    .mono { font-family: 'JetBrains Mono', 'SFMono-Regular', ui-monospace, Menlo, Monaco, Consolas, monospace; }
    .sans { font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, sans-serif; }
    .chrome-path { font-size: 11px; font-weight: 600; fill: #94a3b8; }
    .chrome-user { font-size: 11px; font-weight: 700; fill: #f8fafc; }
    .telemetry-tag { font-size: 9.5px; font-weight: 700; fill: #64748b; letter-spacing: 0.8px; }
    .sec-idx { font-size: 8.5px; font-weight: 700; fill: ${th.primary}; letter-spacing: 1.1px; }
    .sec-lbl { font-size: 8.5px; font-weight: 700; fill: #64748b; letter-spacing: 1.1px; }
    .arch-name { font-size: 12px; font-weight: 800; fill: ${archConfig.color}; letter-spacing: 0.3px; }
    .chip-code { font-size: 10.5px; font-weight: 600; }
    .metric-key { font-size: 9px; font-weight: 700; fill: #94a3b8; letter-spacing: 0.6px; }
    .metric-val { font-size: 9px; font-weight: 700; fill: #cbd5e1; }
    .score-num { font-size: 25px; font-weight: 800; fill: #f8fafc; letter-spacing: -0.5px; }
    .score-max { font-size: 9.5px; font-weight: 700; fill: #64748b; letter-spacing: 0.6px; }
    .verdict-lbl { font-size: 9.5px; font-weight: 800; fill: ${rating.color}; letter-spacing: 0.9px; }
    .footer-cmd { font-size: 10px; font-weight: 500; fill: #cbd5e1; }
    .footer-brand { font-size: 9px; font-weight: 800; fill: ${th.primary}; letter-spacing: 1.2px; }

    @keyframes cursorBlink {
      0%, 49% { opacity: 0.9; }
      50%, 100% { opacity: 0.15; }
    }
    @keyframes radarPulse {
      0%, 100% { opacity: 0.25; }
      50% { opacity: 0.9; }
    }
    .cursor-blk { animation: cursorBlink 1.2s infinite; }
    .led-pulse { animation: radarPulse 2.2s infinite ease-in-out; }
  </style>

  <!-- Clipped Interior Layers -->
  <g clip-path="url(#cardClip)">
    <rect x="0" y="0" width="540" height="220" fill="url(#bgCanvas)"/>
    <rect x="0" y="0" width="540" height="220" fill="url(#nebulaRight)"/>
    <rect x="0" y="0" width="540" height="220" fill="url(#nebulaLeft)"/>
    <rect x="0" y="0" width="540" height="220" fill="url(#blueprintGrid)"/>
    <rect x="0" y="0" width="540" height="220" fill="url(#crtScanline)"/>

    <!-- Top Terminal Window Chrome -->
    <rect x="0" y="0" width="540" height="33" fill="${th.chrome}" fill-opacity="0.9"/>
    <line x1="0" y1="33" x2="540" y2="33" stroke="#1e293b" stroke-width="1"/>
    <line x1="40" y1="1" x2="500" y2="1" stroke="url(#laserTop)" stroke-width="1.5"/>

    <!-- Bottom CLI Prompt Strip -->
    <rect x="0" y="191" width="540" height="29" fill="${th.chrome}" fill-opacity="0.92"/>
    <line x1="0" y1="191" x2="540" y2="191" stroke="#1e293b" stroke-width="1"/>
  </g>

  <!-- Outer Precision Frame & Inner Specular Rim -->
  <rect x="1.5" y="1.5" width="537" height="217" rx="13" stroke="#ffffff" stroke-opacity="0.05" stroke-width="1"/>
  <rect x="0.6" y="0.6" width="538.8" height="218.8" rx="14" stroke="url(#rimBorder)" stroke-width="1.2"/>

  <!-- Corner HUD Reticle Brackets -->
  <path d="M 9 42 L 9 37 L 14 37" stroke="${th.primary}" stroke-opacity="0.55" stroke-width="1.2" stroke-linecap="square"/>
  <path d="M 531 42 L 531 37 L 526 37" stroke="${th.accent}" stroke-opacity="0.55" stroke-width="1.2" stroke-linecap="square"/>
  <path d="M 9 182 L 9 187 L 14 187" stroke="${th.secondary}" stroke-opacity="0.55" stroke-width="1.2" stroke-linecap="square"/>
  <path d="M 531 182 L 531 187 L 526 187" stroke="${th.primary}" stroke-opacity="0.55" stroke-width="1.2" stroke-linecap="square"/>

  <!-- ================= 1. TERMINAL TITLEBAR CHROME ================= -->
  <g transform="translate(16, 11)">
    <circle cx="5" cy="5.5" r="4" fill="#ff5f56" fill-opacity="0.82"/>
    <circle cx="17" cy="5.5" r="4" fill="#ffbd2e" fill-opacity="0.82"/>
    <circle cx="29" cy="5.5" r="4" fill="#27c93f" fill-opacity="0.82"/>

    <text x="52" y="9.5" class="mono">
      <tspan class="chrome-path">~/taste-dna/</tspan><tspan class="chrome-user">@${user}</tspan>
    </text>
    <rect x="${cursorX - 16}" y="0.5" width="6" height="10.5" rx="1" fill="${th.primary}" class="cursor-blk"/>
  </g>

  <!-- Right Telemetry Signature & Live Status Pill -->
  <g transform="translate(344, 7)">
    <text x="0" y="13.5" class="mono telemetry-tag">SIG:0x${hexSig}</text>
    <g transform="translate(86, 0)">
      <rect x="0" y="0" width="94" height="19" rx="9.5" fill="rgba(16, 185, 129, 0.1)" stroke="rgba(16, 185, 129, 0.38)" stroke-width="1"/>
      <circle cx="11" cy="9.5" r="4.5" fill="#10b981" class="led-pulse"/>
      <circle cx="11" cy="9.5" r="2.3" fill="#34d399"/>
      <text x="20" y="12.8" class="mono" font-size="8.5" font-weight="700" fill="#34d399" letter-spacing="0.6">VERIFIED</text>
    </g>
  </g>

  <!-- ================= 2. LEFT TELEMETRY DECK ================= -->
  <!-- Section 01: Archetype -->
  <g transform="translate(22, 46)">
    <text x="0" y="8" class="mono">
      <tspan class="sec-idx">01</tspan><tspan class="sec-lbl"> // ENGINEERING ARCHETYPE</tspan>
    </text>
    <g transform="translate(0, 14)">
      <rect x="0" y="0" width="${archChipW}" height="26" rx="6" fill="${archConfig.bg}" stroke="${archConfig.border}" stroke-width="1"/>
      <rect x="0" y="4" width="2.5" height="18" rx="1" fill="${archConfig.color}"/>
      <g transform="translate(10, 6)">
        <path d="${archConfig.iconPath}" stroke="${archConfig.color}" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
      </g>
      <text x="30" y="17" class="sans arch-name">${archetype}</text>
    </g>
  </g>

  <!-- Section 02: Vibe Stacking Pipeline -->
  <g transform="translate(22, 98)">
    <text x="0" y="8" class="mono">
      <tspan class="sec-idx">02</tspan><tspan class="sec-lbl"> // TASTE STACKING DNA</tspan>
    </text>
    <g transform="translate(0, 14)">
      <!-- Style Module -->
      <rect x="0" y="0" width="${styleChipW}" height="24" rx="5" fill="${th.panel}" stroke="#1e293b" stroke-width="1"/>
      <rect x="0" y="0" width="${styleChipW}" height="24" rx="5" stroke="${th.accent}" stroke-opacity="0.35" stroke-width="1"/>
      <text x="10" y="15.5" class="mono chip-code" fill="${th.accent}">${escapeXml(styleText)}</text>

      <!-- Circuit Trace Connector -->
      <line x1="${connectorX}" y1="12" x2="${toneChipX}" y2="12" stroke="#475569" stroke-width="1.2" stroke-dasharray="2 2"/>
      <circle cx="${connectorX + 11}" cy="12" r="3.5" fill="${th.bg1}" stroke="${th.primary}" stroke-width="1.2"/>

      <!-- Tone Module -->
      <g transform="translate(${toneChipX}, 0)">
        <rect x="0" y="0" width="${toneChipW}" height="24" rx="5" fill="${th.panel}" stroke="#1e293b" stroke-width="1"/>
        <rect x="0" y="0" width="${toneChipW}" height="24" rx="5" stroke="${th.secondary}" stroke-opacity="0.45" stroke-width="1"/>
        <text x="10" y="15.5" class="mono chip-code" fill="#e9d5ff">${escapeXml(toneText)}</text>
      </g>
    </g>
  </g>

  <!-- Section 03: Segmented Guardrail Equalizer -->
  <g transform="translate(22, 149)">
    <text x="0" y="9" class="mono metric-key">SIGNAL</text>
    ${renderMiniSegBar(44, 2.5, signalBars, 10, rating.color)}
    <text x="122" y="9" class="mono metric-val">${score}%</text>

    <text x="160" y="9" class="mono metric-key">ARMOR</text>
    ${renderMiniSegBar(200, 2.5, armorBars, 10, th.accent)}
    <text x="278" y="9" class="mono metric-val">ON</text>

    <text x="0" y="25" class="mono" font-size="9.5" font-weight="600" fill="#10b981">0% POLITENESS TAX</text>
    <text x="112" y="25" class="mono" font-size="9.5" fill="#64748b">•</text>
    <text x="122" y="25" class="mono" font-size="9.5" font-weight="600" fill="#94a3b8">DIFF-FIRST CONTRACT</text>
    <text x="242" y="25" class="mono" font-size="9.5" fill="#64748b">•</text>
    <text x="252" y="25" class="mono" font-size="9.5" font-weight="700" fill="${th.primary}">${rating.tier}</text>
  </g>

  <!-- Vertical Telemetry Bus Divider -->
  <line x1="340" y1="44" x2="340" y2="181" stroke="#1e293b" stroke-width="1"/>
  <circle cx="340" cy="72" r="2" fill="${th.primary}" fill-opacity="0.7"/>
  <circle cx="340" cy="152" r="2" fill="${th.accent}" fill-opacity="0.7"/>

  <!-- ================= 3. RIGHT REACTOR GAUGE & LINUS VERDICT ================= -->
  <g transform="translate(440, 100)">
    <!-- Outer Precision Degree Ticks -->
    <circle cx="0" cy="0" r="48" fill="none" stroke="#334155" stroke-width="1.5" stroke-dasharray="1.5 6.35" opacity="0.75"/>
    <!-- Inner Counter-Ring -->
    <circle cx="0" cy="0" r="30.5" fill="none" stroke="${th.accent}" stroke-width="0.9" stroke-dasharray="3 3" opacity="0.28"/>
    <!-- Main Gauge Track -->
    <circle cx="0" cy="0" r="${gaugeR}" fill="none" stroke="#131c2e" stroke-width="6.5"/>
    <!-- Illuminated Value Arc -->
    <circle cx="0" cy="0" r="${gaugeR}" fill="none" stroke="url(#gaugeArc)" stroke-width="6.5"
            stroke-linecap="round" stroke-dasharray="${circumference.toFixed(2)}" stroke-dashoffset="${strokeOffset}"
            transform="rotate(-90)" filter="url(#arcGlow)"/>

    <!-- Center Readout -->
    <text x="0" y="3" text-anchor="middle" class="mono score-num">${score}</text>
    <text x="0" y="16" text-anchor="middle" class="mono score-max">/ 100</text>
  </g>

  <!-- Linus Audit Verdict Stamp -->
  <g transform="translate(362, 157)">
    <rect x="0" y="0" width="156" height="24" rx="5" fill="${rating.bg}" stroke="${rating.border}" stroke-width="1"/>
    <path d="M 5 5 L 5 19 M 151 5 L 151 19" stroke="${rating.color}" stroke-width="1.3" stroke-opacity="0.65"/>
    <text x="78" y="15.5" text-anchor="middle" class="mono verdict-lbl">${rating.upper}</text>
  </g>

  <!-- ================= 4. FOOTER EXECUTABLE CLI BAR ================= -->
  <g transform="translate(18, 209)">
    <text x="0" y="0" class="mono" font-size="10.5" font-weight="700" fill="${th.primary}">❯</text>
    <text x="12" y="0" class="mono footer-cmd">${escapedCmd}</text>
    <text x="504" y="0" text-anchor="end" class="mono footer-brand">TASTE YOUR TASTE</text>
  </g>
</svg>`;
}

function generateBadgeSvg(options = {}) {
  const type = String(options.type || 'score').toLowerCase();
  const rawStyle = String(options.style || 'antfu').slice(0, 18);
  const rawTone = String(options.tone || 'karpathy').slice(0, 18);
  const rawArchetype = String(options.archetype || 'Anti-Slop Minimalist').slice(0, 28);
  const score = Math.max(5, Math.min(100, Math.round(Number(options.score) || 94)));
  const themeKey = options.theme && THEMES[options.theme] ? options.theme : 'cyber';
  const th = THEMES[themeKey];
  const rating = resolveRating(score);

  let label = 'TASTE';
  let value = `${score}/100 · ${rating.title}`;
  let accentColor = rating.color;

  if (type === 'dna') {
    label = 'TASTE DNA';
    value = `${rawStyle} + ${rawTone}`;
    accentColor = th.accent;
  } else if (type === 'archetype') {
    label = 'ARCHETYPE';
    value = rawArchetype;
    accentColor = (ARCHETYPE_CONFIG[rawArchetype] && ARCHETYPE_CONFIG[rawArchetype].color) || th.primary;
  } else if (type === 'slop') {
    label = 'POLITENESS TAX';
    value = '0% · PURE DIFF';
    accentColor = '#10b981';
  } else if (type === 'roast') {
    label = 'LINUS ROAST';
    value = `${rating.title} [${rating.tier.replace('TIER::', '')}]`;
    accentColor = rating.color;
  }

  const escapedLabel = escapeXml(label);
  const escapedValue = escapeXml(value);

  // Precise monospace character width calculation + micro 5-bar signal meter on right
  const labelWidth = Math.round(label.length * 6.9 + 36);
  const meterWidth = 28;
  const valueWidth = Math.round(value.length * 6.85 + 24 + meterWidth);
  const totalWidth = labelWidth + valueWidth;
  const activeBars = type === 'dna' || type === 'archetype' || type === 'slop'
    ? 5
    : Math.max(1, Math.min(5, Math.round((score / 100) * 5)));

  const barsSvg = [];
  for (let i = 0; i < 5; i++) {
    const bx = totalWidth - 30 + i * 4.5;
    const bh = 5 + i * 2;
    const by = 19 - bh;
    const lit = i < activeBars;
    barsSvg.push(
      `<rect x="${bx.toFixed(1)}" y="${by}" width="2.8" height="${bh}" rx="0.8" fill="${lit ? accentColor : '#1e293b'}" fill-opacity="${lit ? '0.95' : '0.8'}"/>`
    );
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="28" viewBox="0 0 ${totalWidth} 28" fill="none" role="img" aria-label="${escapedLabel}: ${escapedValue}">
  <defs>
    <clipPath id="badgeClip">
      <rect x="0.5" y="0.5" width="${totalWidth - 1}" height="27" rx="6"/>
    </clipPath>
    <linearGradient id="badgeRim" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${th.primary}" stop-opacity="0.85"/>
      <stop offset="50%" stop-color="${th.secondary}" stop-opacity="0.45"/>
      <stop offset="100%" stop-color="${accentColor}" stop-opacity="0.9"/>
    </linearGradient>
    <linearGradient id="valTint" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${accentColor}" stop-opacity="0.16"/>
      <stop offset="100%" stop-color="${accentColor}" stop-opacity="0.06"/>
    </linearGradient>
  </defs>

  <style>
    .b-mono { font-family: 'JetBrains Mono', 'SFMono-Regular', ui-monospace, Menlo, Monaco, Consolas, monospace; }
    .b-key { font-size: 10.2px; font-weight: 800; fill: #e2e8f0; letter-spacing: 0.7px; }
    .b-val { font-size: 10.8px; font-weight: 700; fill: ${accentColor}; }
  </style>

  <g clip-path="url(#badgeClip)">
    <!-- Left Key Segment -->
    <rect x="0" y="0" width="${totalWidth}" height="28" fill="${th.bg0}"/>
    <!-- Angled Cyber Right Segment -->
    <polygon points="${labelWidth + 4},0 ${totalWidth},0 ${totalWidth},28 ${labelWidth - 4},28" fill="${th.bg1}"/>
    <polygon points="${labelWidth + 4},0 ${totalWidth},0 ${totalWidth},28 ${labelWidth - 4},28" fill="url(#valTint)"/>
    <!-- Angled Slash Divider -->
    <line x1="${labelWidth + 4}" y1="0" x2="${labelWidth - 4}" y2="28" stroke="${accentColor}" stroke-opacity="0.55" stroke-width="1.2"/>
  </g>

  <!-- Outer Precision Border -->
  <rect x="0.5" y="0.5" width="${totalWidth - 1}" height="27" rx="6" stroke="url(#badgeRim)" stroke-width="1.1"/>

  <!-- Left Vector Terminal Prompt Icon + Node -->
  <g transform="translate(9, 8)">
    <rect x="0" y="0" width="14" height="12" rx="2.5" fill="${th.panel}" stroke="${th.primary}" stroke-opacity="0.6" stroke-width="1"/>
    <path d="M 3.2 3.5 L 6.2 6 L 3.2 8.5 M 7.4 8.5 H 10.6" stroke="${th.primary}" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
  </g>

  <!-- Key Label -->
  <text x="28" y="17.8" class="b-mono b-key">${escapedLabel}</text>

  <!-- Value Readout -->
  <text x="${labelWidth + 9}" y="17.8" class="b-mono b-val">${escapedValue}</text>

  <!-- 5-Bar Signal Equalizer -->
  ${barsSvg.join('\n  ')}
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

function renderBadgeToFile(outputPath, options = {}) {
  const svg = generateBadgeSvg(options);

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(outputPath, svg, 'utf-8');
  return { outputPath, svg };
}

module.exports = {
  THEMES,
  ARCHETYPE_CONFIG,
  computeHexSig,
  generateCardSvg,
  generateBadgeSvg,
  generateCardFromFile,
  renderCardToFile,
  renderBadgeToFile,
};
