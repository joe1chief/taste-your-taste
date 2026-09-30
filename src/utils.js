/**
 * Utility helpers for ANSI styling, file resolution, and terminal rendering.
 * Zero external dependencies.
 */

const fs = require('fs');
const path = require('path');

const ESC = '\x1b[';
const colors = {
  reset: `${ESC}0m`,
  bold: `${ESC}1m`,
  dim: `${ESC}2m`,
  italic: `${ESC}3m`,
  underline: `${ESC}4m`,
  red: `${ESC}31m`,
  green: `${ESC}32m`,
  yellow: `${ESC}33m`,
  blue: `${ESC}34m`,
  magenta: `${ESC}35m`,
  cyan: `${ESC}36m`,
  white: `${ESC}37m`,
  gray: `${ESC}90m`,
  bgRed: `${ESC}41m`,
  bgGreen: `${ESC}42m`,
  bgYellow: `${ESC}43m`,
};

function style(str, ...codes) {
  return `${codes.join('')}${str}${colors.reset}`;
}

const c = {
  bold: (s) => style(s, colors.bold),
  dim: (s) => style(s, colors.dim),
  italic: (s) => style(s, colors.italic),
  red: (s) => style(s, colors.red),
  green: (s) => style(s, colors.green),
  yellow: (s) => style(s, colors.yellow),
  blue: (s) => style(s, colors.blue),
  magenta: (s) => style(s, colors.magenta),
  cyan: (s) => style(s, colors.cyan),
  gray: (s) => style(s, colors.gray),
  white: (s) => style(s, colors.white),
  badge: (label, color = colors.cyan) => `${color}${colors.bold} ${label} ${colors.reset}`,
};

function banner() {
  console.log(`
${c.magenta(c.bold('  🍷 TASTE YOUR TASTE'))} ${c.dim('— Developer Taste & Vibe Stacking Engine')}
${c.gray('  ──────────────────────────────────────────────────────────')}
`);
}

function box(title, content, borderColor = colors.magenta) {
  const lines = content.split('\n');
  const maxLen = Math.max(title.length + 4, ...lines.map((l) => l.replace(/\x1b\[[0-9;]*m/g, '').length), 55);
  const top = `${borderColor}┌─ ${c.bold(title)} ${'─'.repeat(Math.max(0, maxLen - title.length - 4))}┐${colors.reset}`;
  const bottom = `${borderColor}└${'─'.repeat(maxLen)}┘${colors.reset}`;

  const body = lines
    .map((l) => {
      const plainLen = l.replace(/\x1b\[[0-9;]*m/g, '').length;
      const pad = ' '.repeat(Math.max(0, maxLen - plainLen - 2));
      return `${borderColor}│${colors.reset} ${l}${pad} ${borderColor}│${colors.reset}`;
    })
    .join('\n');

  return `${top}\n${body}\n${bottom}`;
}

/**
 * Determine the destination file path based on user target option or auto-detection.
 */
function resolveTargetFile(targetOption, cwd = process.cwd(), defaultMdcName = 'taste') {
  if (targetOption) {
    const t = targetOption.toLowerCase();
    if (t === 'claude' || t === 'claudemd') return path.join(cwd, 'CLAUDE.md');
    if (t === 'dotclaude' || t === '.claude') return path.join(cwd, '.claude', 'CLAUDE.md');
    if (t === 'cursor' || t === 'cursorrules') return path.join(cwd, '.cursorrules');
    if (t === 'mdc' || t === 'cursor-mdc' || t === '.cursor/rules' || t === 'cursor/rules') {
      return path.join(cwd, '.cursor', 'rules', `${defaultMdcName}.mdc`);
    }
    if (t === 'agent' || t === '.agent') return path.join(cwd, '.agent', 'rules.md');
    if (t === 'agents' || t === 'agentsmd' || t === 'agents.md') return path.join(cwd, 'AGENTS.md');
    return path.isAbsolute(targetOption) ? targetOption : path.join(cwd, targetOption);
  }

  // Auto-detect priority in cwd:
  // 1. CLAUDE.md
  // 2. .claude/CLAUDE.md
  // 3. .cursor/rules/*.mdc (Modern Cursor)
  // 4. .cursorrules (Legacy Cursor)
  // 5. AGENTS.md
  // 6. .agent/rules.md
  // 7. Default to CLAUDE.md
  if (fs.existsSync(path.join(cwd, 'CLAUDE.md'))) return path.join(cwd, 'CLAUDE.md');
  if (fs.existsSync(path.join(cwd, '.claude', 'CLAUDE.md'))) return path.join(cwd, '.claude', 'CLAUDE.md');

  const cursorRulesDir = path.join(cwd, '.cursor', 'rules');
  if (fs.existsSync(cursorRulesDir) && fs.statSync(cursorRulesDir).isDirectory()) {
    const mdcFiles = fs.readdirSync(cursorRulesDir).filter((f) => f.endsWith('.mdc'));
    if (mdcFiles.length > 0) {
      return path.join(cursorRulesDir, mdcFiles[0]);
    }
    return path.join(cursorRulesDir, `${defaultMdcName}.mdc`);
  }

  if (fs.existsSync(path.join(cwd, '.cursorrules'))) return path.join(cwd, '.cursorrules');
  if (fs.existsSync(path.join(cwd, 'AGENTS.md'))) return path.join(cwd, 'AGENTS.md');
  if (fs.existsSync(path.join(cwd, '.agent', 'rules.md'))) return path.join(cwd, '.agent', 'rules.md');

  return path.join(cwd, 'CLAUDE.md');
}

module.exports = {
  c,
  banner,
  box,
  resolveTargetFile,
};
