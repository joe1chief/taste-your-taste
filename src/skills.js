/**
 * Agent Skills Manager: Browse, inspect, and install modular SKILL.md playbooks
 * across Claude Code, Antigravity/Gemini, Codex/AGENTS, Cursor, and Windsurf.
 * Zero external dependencies.
 */

const fs = require('fs');
const path = require('path');

const SKILLS_ROOT = path.resolve(__dirname, '..', 'skills');

const AGENT_SKILL_DIRS = {
  claude: ['.claude', 'skills'],
  agent: ['.agent', 'skills'],
  antigravity: ['.agent', 'skills'],
  gemini: ['.gemini', 'skills'],
  agents: ['.agents', 'skills'],
  codex: ['.agents', 'skills'],
  cursor: ['.cursor', 'skills'],
  windsurf: ['.windsurf', 'skills'],
};

function parseSkillFrontmatter(text, fallbackName) {
  let name = fallbackName;
  let description = 'Modular agent skill playbook.';
  const match = text.match(/^---\s*\n([\s\S]*?)\n---/);
  if (match) {
    const fm = match[1];
    const nameMatch = fm.match(/^name:\s*(.+)$/m);
    const descMatch = fm.match(/^description:\s*(.+)$/m);
    if (nameMatch) {
      name = nameMatch[1].trim().replace(/^['"]|['"]$/g, '');
    }
    if (descMatch) {
      description = descMatch[1].trim().replace(/^['"]|['"]$/g, '');
    }
  }
  return { name, description };
}

function listSkills() {
  if (!fs.existsSync(SKILLS_ROOT)) {
    return [];
  }
  const entries = fs.readdirSync(SKILLS_ROOT, { withFileTypes: true });
  const skills = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const skillPath = path.join(SKILLS_ROOT, entry.name, 'SKILL.md');
    if (!fs.existsSync(skillPath)) continue;
    const content = fs.readFileSync(skillPath, 'utf-8');
    const { name, description } = parseSkillFrontmatter(content, entry.name);
    const lines = content.split('\n').length;
    skills.push({
      id: entry.name,
      name,
      description,
      lines,
      sourcePath: skillPath,
    });
  }

  return skills.sort((a, b) => a.id.localeCompare(b.id));
}

function getSkill(skillId) {
  const cleanId = String(skillId || '').trim().toLowerCase();
  if (!cleanId || cleanId.includes('..') || cleanId.includes('/') || cleanId.includes('\\')) {
    throw new Error(`Invalid skill identifier: "${skillId}"`);
  }
  const skillDir = path.join(SKILLS_ROOT, cleanId);
  const skillPath = path.join(skillDir, 'SKILL.md');
  if (!fs.existsSync(skillPath)) {
    const available = listSkills().map((s) => s.id).join(', ');
    throw new Error(`Skill "${skillId}" not found. Available skills: ${available}`);
  }
  const content = fs.readFileSync(skillPath, 'utf-8');
  const meta = parseSkillFrontmatter(content, cleanId);
  return {
    id: cleanId,
    ...meta,
    content,
    sourceDir: skillDir,
    sourcePath: skillPath,
  };
}

function resolveSkillDestDir(skillId, options = {}) {
  const cwd = options.cwd || process.cwd();
  if (options.dir) {
    const base = path.isAbsolute(options.dir) ? options.dir : path.join(cwd, options.dir);
    return path.join(base, skillId);
  }
  const agentKey = String(options.agent || 'claude').toLowerCase();
  const segments = AGENT_SKILL_DIRS[agentKey];
  if (!segments) {
    throw new Error(
      `Unsupported skill agent "${options.agent}". Supported: ${Object.keys(AGENT_SKILL_DIRS).join(', ')}`
    );
  }
  return path.join(cwd, ...segments, skillId);
}

function copyDirRecursive(srcDir, destDir) {
  fs.mkdirSync(destDir, { recursive: true });
  for (const item of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const srcPath = path.join(srcDir, item.name);
    const dstPath = path.join(destDir, item.name);
    if (item.isDirectory()) {
      copyDirRecursive(srcPath, dstPath);
    } else if (item.isFile()) {
      fs.copyFileSync(srcPath, dstPath);
    }
  }
}

function installSkill(skillId, options = {}) {
  const skill = getSkill(skillId);
  const destDir = resolveSkillDestDir(skill.id, options);
  const existed = fs.existsSync(path.join(destDir, 'SKILL.md'));
  copyDirRecursive(skill.sourceDir, destDir);

  return {
    id: skill.id,
    name: skill.name,
    description: skill.description,
    agent: String(options.agent || 'claude').toLowerCase(),
    destDir,
    destFile: path.join(destDir, 'SKILL.md'),
    updated: existed,
  };
}

module.exports = {
  AGENT_SKILL_DIRS,
  listSkills,
  getSkill,
  installSkill,
  resolveSkillDestDir,
};
