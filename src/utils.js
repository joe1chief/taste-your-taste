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
${c.magenta(c.bold('  🍷 TASTE YOUR TASTE v2.2'))} ${c.dim('— Code DNA, Slop Tax & Vibe Stacking Engine')}
${c.gray('  ──────────────────────────────────────────────────────────────────────')}
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

const TARGET_FORMATS = [
  { key: 'claude', path: 'CLAUDE.md', label: 'CLAUDE.md (Claude Code root)' },
  { key: 'dotclaude', path: '.claude/CLAUDE.md', label: '.claude/CLAUDE.md (Claude Code nested)' },
  { key: 'agents', path: 'AGENTS.md', label: 'AGENTS.md (OpenAI Codex / Universal multi-agent)' },
  { key: 'mdc', path: '.cursor/rules/taste.mdc', label: '.cursor/rules/taste.mdc (Modern Cursor MDC)' },
  { key: 'cursor', path: '.cursorrules', label: '.cursorrules (Legacy Cursor)' },
  { key: 'copilot', path: '.github/copilot-instructions.md', label: '.github/copilot-instructions.md (GitHub Copilot)' },
  { key: 'windsurf', path: '.windsurfrules', label: '.windsurfrules (Windsurf IDE)' },
  { key: 'windsurf-rules', path: '.windsurf/rules/taste.md', label: '.windsurf/rules/taste.md (Modern Windsurf rules)' },
  { key: 'cline', path: '.clinerules', label: '.clinerules (Cline / Roo Code)' },
  { key: 'agent', path: '.agent/rules.md', label: '.agent/rules.md (Google Antigravity)' },
  { key: 'gemini', path: 'GEMINI.md', label: 'GEMINI.md (Gemini CLI)' },
];

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
    if (t === 'copilot' || t === 'github' || t === 'copilot-instructions') {
      return path.join(cwd, '.github', 'copilot-instructions.md');
    }
    if (t === 'windsurf' || t === 'windsurfrules' || t === '.windsurfrules') {
      return path.join(cwd, '.windsurfrules');
    }
    if (t === 'windsurf-rules' || t === '.windsurf/rules') {
      return path.join(cwd, '.windsurf', 'rules', `${defaultMdcName}.md`);
    }
    if (t === 'cline' || t === 'clinerules' || t === '.clinerules') {
      return path.join(cwd, '.clinerules');
    }
    if (t === 'gemini' || t === 'geminimd' || t === 'gemini.md') {
      return path.join(cwd, 'GEMINI.md');
    }
    if (t === 'agent' || t === '.agent' || t === 'antigravity') {
      return path.join(cwd, '.agent', 'rules.md');
    }
    if (t === 'agents' || t === 'agentsmd' || t === 'agents.md' || t === 'codex') {
      return path.join(cwd, 'AGENTS.md');
    }
    return path.isAbsolute(targetOption) ? targetOption : path.join(cwd, targetOption);
  }

  // Auto-detect priority in cwd:
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
  if (fs.existsSync(path.join(cwd, '.github', 'copilot-instructions.md'))) {
    return path.join(cwd, '.github', 'copilot-instructions.md');
  }
  if (fs.existsSync(path.join(cwd, '.windsurfrules'))) return path.join(cwd, '.windsurfrules');
  if (fs.existsSync(path.join(cwd, '.clinerules'))) return path.join(cwd, '.clinerules');
  if (fs.existsSync(path.join(cwd, 'GEMINI.md'))) return path.join(cwd, 'GEMINI.md');
  if (fs.existsSync(path.join(cwd, '.agent', 'rules.md'))) return path.join(cwd, '.agent', 'rules.md');

  return path.join(cwd, 'CLAUDE.md');
}

module.exports = {
  c,
  banner,
  box,
  TARGET_FORMATS,
  resolveTargetFile,
};
