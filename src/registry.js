/**
 * Registry loader for tastes, styles, tones, and presets.
 */

const fs = require('fs');
const path = require('path');

const REGISTRY_DIR = path.resolve(__dirname, '..', 'registry');

const METADATA = {
  styles: {
    antfu: {
      name: 'Antfu',
      category: 'TypeScript / Modern ESM',
      description: 'Strict TypeScript without any, named ESM exports, zero-bloat standard APIs.',
    },
    karpathy: {
      name: 'Karpathy',
      category: 'Minimalist AI / Python',
      description: 'Flat single-file architecture, transparent readability, no premature OOP.',
    },
    stripe: {
      name: 'Stripe',
      category: 'Industrial Craft',
      description: 'Deterministic test runners, spotless formatting, clean HTTP boundaries.',
    },
    minimalist: {
      name: 'Minimalist',
      category: 'Zero-Dependency',
      description: '<= 25 line native utilities, flat directory tree, ruthless anti-boilerplate.',
    },
    defensive: {
      name: 'Defensive',
      category: 'Reliability & Invariants',
      description: 'Boundary validation, exhaustive type checks, no silent error swallow.',
    },
    hacker: {
      name: 'Hacker',
      category: 'High Velocity',
      description: '160-char lines, thin wrapper functions, fast MVP iteration.',
    },
  },
  tones: {
    karpathy: {
      name: 'Karpathy (Anti-Slop)',
      description: 'Lead with outcome/diff immediately; no apologies, pleasantries, or narrations.',
    },
    linus: {
      name: 'Linus Torvalds',
      description: 'No-BS technical precision, reject over-abstraction, question unnecessary patterns.',
    },
    terse: {
      name: 'Terse',
      description: 'Ultra-compact bullet points and diffs; zero conversational overhead.',
    },
    teacher: {
      name: 'Teacher',
      description: 'Socratic explanations of why, edge cases highlighted, structured trade-offs.',
    },
  },
  presets: {
    'anti-slop': {
      name: 'Anti-Slop Armor',
      description: 'Full shield against conversational waste, dependency bloat, and fake mocks.',
    },
    'solo-hacker': {
      name: 'Solo Hacker MVP',
      description: 'Pragmatic single-file velocity, thin wrappers, direct diff delivery.',
    },
    enterprise: {
      name: 'Enterprise Industrial',
      description: 'Task runner determinism, defensive error handling, strict compliance.',
    },
  },
};

function getAvailable(type) {
  const dir = path.join(REGISTRY_DIR, type);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => path.basename(f, '.md'));
}

function loadContent(type, name) {
  const filePath = path.join(REGISTRY_DIR, type, `${name.toLowerCase()}.md`);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Taste module "${name}" not found in ${type}. Available: ${getAvailable(type).join(', ')}`);
  }
  return fs.readFileSync(filePath, 'utf-8');
}

function getMeta(type, name) {
  const normalized = name.toLowerCase();
  if (METADATA[type] && METADATA[type][normalized]) {
    return METADATA[type][normalized];
  }
  return { name, description: 'Custom community taste module.' };
}

module.exports = {
  getAvailable,
  loadContent,
  getMeta,
  METADATA,
};
