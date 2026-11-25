/**
 * Taste CLI Main Router & Command Controller (v2.0)
 */

const path = require('path');
const fs = require('fs');
const { c, banner, box, TARGET_FORMATS, resolveTargetFile } = require('./utils');
const { getAvailable, getMeta } = require('./registry');
const { stackFlavor, blendTastes } = require('./stacker');
const { roastFile } = require('./roaster');
const { runWizard } = require('./wizard');
const { pruneFile } = require('./pruner');
const { diffTastes } = require('./differ');
const { renderCardToFile, renderBadgeToFile } = require('./card');
const { listSkills, getSkill, installSkill } = require('./skills');
const { checkFile } = require('./checker');

function printHelp() {
  banner();
  console.log(`
${c.bold('USAGE:')}
  ${c.cyan('taste')} ${c.yellow('<command>')} ${c.dim('[options]')}

${c.bold('COMMANDS:')}
  ${c.yellow('init')}                               Interactive TUI wizard to set up agent rules
  ${c.yellow('list')}                               List all modular taste flavors, styles, tones, and skills
  ${c.yellow('add')} ${c.green('<flavor>')}                      Stack a style or preset into your project rule file
  ${c.yellow('blend')} ${c.dim('--style <name> --tone <name>')} Mix an engineering style with an agent tone persona
  ${c.yellow('skill')} ${c.dim('<list|add|show> [name]')}      Browse and install modular SKILL.md agent playbooks
  ${c.yellow('check')} ${c.dim('[file] [--min-score 70]')}      CI quality gate & secret-leak audit (non-zero exit on fail)
  ${c.yellow('roast')} ${c.dim('[path/to/CLAUDE.md]')}           Savage Linus-style roast of your agent instructions
  ${c.yellow('prune')} ${c.dim('[file] [--write]')}              Distill and compact prompt to save 30%-70% tokens
  ${c.yellow('diff')} ${c.dim('<tasteA> <tasteB>')}              Compare engineering philosophies and constraints
  ${c.yellow('card')} ${c.dim('[--user <name>] [--theme <name>]')}  Generate dynamic GitHub Profile Taste Card SVG
  ${c.yellow('badge')} ${c.dim('[--type <score|dna|arch>]')}         Generate sleek vector micro-badge SVG

${c.bold('TARGET FORMATS (--target, -t):')}
  ${c.cyan('claude')} (CLAUDE.md), ${c.cyan('dotclaude')} (.claude/CLAUDE.md), ${c.cyan('agents')} (AGENTS.md),
  ${c.cyan('mdc')} (.cursor/rules/*.mdc), ${c.cyan('cursor')} (.cursorrules), ${c.cyan('copilot')} (.github/copilot-instructions.md),
  ${c.cyan('windsurf')} (.windsurfrules), ${c.cyan('windsurf-rules')} (.windsurf/rules/*.md),
  ${c.cyan('cline')} (.clinerules), ${c.cyan('agent')} (.agent/rules.md), ${c.cyan('gemini')} (GEMINI.md)

${c.bold('OPTIONS:')}
  ${c.dim('--target, -t <file|type>')}           Destination rule format or custom file path
  ${c.dim('--style, -s <name>')}                 Style to blend (antfu, karpathy, stripe, minimalist, defensive, hacker)
  ${c.dim('--tone <name>')}                      Tone to blend (karpathy, linus, terse, teacher)
  ${c.dim('--agent <name>')}                     Skill target agent (claude, agent, gemini, agents, cursor, windsurf)
  ${c.dim('--min-score <0-100>')}                Minimum passing Taste Score for 'taste check' (default: 70)
  ${c.dim('--max-tokens <count>')}               Maximum estimated token budget for 'taste check' (default: 4000)
  ${c.dim('--json')}                             Emit machine-readable JSON output (supported in 'check' and 'skill list')
  ${c.dim('--theme <name>')}                     Card/Badge colorway: ${c.cyan('cyber')}, ${c.cyan('matrix')}, ${c.cyan('tron')}, ${c.cyan('dracula')}, ${c.cyan('midnight')}, ${c.cyan('sunset')}, ${c.cyan('noir')}
  ${c.dim('--help, -h')}                         Show this help menu
  ${c.dim('--version, -v')}                      Show version

${c.bold('EXAMPLES:')}
  ${c.cyan('npx taste-code blend --style antfu --tone karpathy --target copilot')}
  ${c.cyan('npx taste-code skill add karpathy-guidelines --agent claude')}
  ${c.cyan('npx taste-code check CLAUDE.md --min-score 75')}
`);
}

function handleList() {
  banner();
  console.log(`${c.bold('📦 Available Taste Modules (Lego Bricks):\n')}`);

  console.log(c.magenta(c.bold('🎨 Engineering Styles (--style):')));
  for (const key of getAvailable('styles')) {
    const meta = getMeta('styles', key);
    console.log(`  ${c.cyan(c.bold(key.padEnd(14)))} ${c.gray('│')} ${meta.description}`);
  }

  console.log(`\n${c.magenta(c.bold('🗣️ Agent Tones & Personas (--tone):'))}`);
  for (const key of getAvailable('tones')) {
    const meta = getMeta('tones', key);
    console.log(`  ${c.yellow(c.bold(key.padEnd(14)))} ${c.gray('│')} ${meta.description}`);
  }

  console.log(`\n${c.magenta(c.bold('⚡ Complete Taste Presets (taste add <preset>):'))}`);
  for (const key of getAvailable('presets')) {
    const meta = getMeta('presets', key);
    console.log(`  ${c.green(c.bold(key.padEnd(14)))} ${c.gray('│')} ${meta.description}`);
  }

  const skills = listSkills();
  if (skills.length > 0) {
    console.log(`\n${c.magenta(c.bold('🧠 Modular Agent Skills (taste skill add <id>):'))}`);
    for (const sk of skills) {
      console.log(`  ${c.blue(c.bold(sk.id.padEnd(22)))} ${c.gray('│')} ${sk.description}`);
    }
  }

  console.log(`\n${c.magenta(c.bold('🎯 Supported Target Formats (--target):'))}`);
  for (const fmt of TARGET_FORMATS) {
    console.log(`  ${c.cyan(fmt.key.padEnd(16))} ${c.gray('→')} ${fmt.label}`);
  }

  console.log(`\n${c.dim('Try: ')}${c.cyan('npx taste-code blend --style antfu --tone karpathy')}\n`);
}

function handleSkill(args) {
  const sub = (args[0] && !args[0].startsWith('-')) ? args[0].toLowerCase() : 'list';
  const asJson = args.includes('--json');

  if (sub === 'list' || sub === 'ls') {
    const skills = listSkills();
    if (asJson) {
      console.log(JSON.stringify(skills, null, 2));
      return;
    }
    banner();
    console.log(`${c.bold(`🧠 Curated Agent Skills Library (${skills.length} playbooks):\n`)}`);
    for (const sk of skills) {
      console.log(`  ${c.cyan(c.bold(sk.id.padEnd(24)))} ${c.gray(`(${sk.lines} lines)`)}`);
      console.log(`    ${c.dim(sk.description)}\n`);
    }
    console.log(`${c.dim('Install a skill: ')}${c.cyan('npx taste-code skill add karpathy-guidelines --agent claude')}\n`);
    return;
  }

  if (sub === 'show' || sub === 'info') {
    const skillId = args[1];
    if (!skillId) {
      console.error(`${c.red('Error:')} Missing skill ID. Example: ${c.cyan('taste skill show karpathy-guidelines')}`);
      process.exit(1);
    }
    try {
      const sk = getSkill(skillId);
      banner();
      console.log(
        box(
          `🧠 Skill: ${sk.id}`,
          [
            `${c.bold('Name:')}        ${c.cyan(sk.name)}`,
            `${c.bold('Description:')} ${sk.description}`,
            `${c.bold('Source:')}      ${c.dim(sk.sourcePath)}`,
          ].join('\n'),
          '\x1b[36m'
        )
      );
      const preview = sk.content.split('\n').slice(0, 28).join('\n');
      console.log(`\n${c.gray(preview)}\n`);
    } catch (err) {
      console.error(`${c.red('Skill lookup failed:')} ${err.message}`);
      process.exit(1);
    }
    return;
  }

  if (sub === 'add' || sub === 'install') {
    const skillId = args[1];
    if (!skillId || skillId.startsWith('-')) {
      console.error(`${c.red('Error:')} Missing skill ID. Run ${c.cyan('taste skill list')} to view options.`);
      process.exit(1);
    }
    let agent = 'claude';
    let dir = null;
    for (let i = 2; i < args.length; i++) {
      if (args[i] === '--agent' || args[i] === '-a') {
        agent = args[i + 1] || agent;
        i++;
      } else if (args[i] === '--dir' || args[i] === '-d') {
        dir = args[i + 1] || null;
        i++;
      }
    }
    try {
      const res = installSkill(skillId, { agent, dir });
      banner();
      console.log(
        box(
          '🧠 Agent Skill Installed',
          [
            `${c.bold('Skill:')}       ${c.green(res.id)}`,
            `${c.bold('Agent:')}       ${c.cyan(res.agent)}`,
            `${c.bold('Destination:')} ${c.yellow(path.relative(process.cwd(), res.destFile) || res.destFile)}`,
            `${c.bold('Status:')}      ${res.updated ? c.yellow('Updated existing skill') : c.green('Installed fresh copy')}`,
            '',
            `${c.dim(res.description)}`,
          ].join('\n'),
          '\x1b[32m'
        )
      );
    } catch (err) {
      console.error(`${c.red('Failed to install skill:')} ${err.message}`);
      process.exit(1);
    }
    return;
  }

  console.error(`${c.red('Unknown skill subcommand:')} ${sub}. Use ${c.cyan('list')}, ${c.cyan('add')}, or ${c.cyan('show')}.`);
  process.exit(1);
}

function handleCheck(args) {
  let targetPath = null;
  let minScore = 70;
  let maxTokens = 4000;
  let asJson = false;

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--min-score') {
      minScore = parseInt(args[i + 1], 10);
      i++;
    } else if (a === '--max-tokens') {
      maxTokens = parseInt(args[i + 1], 10);
      i++;
    } else if (a === '--json') {
      asJson = true;
    } else if (!a.startsWith('-') && !targetPath) {
      targetPath = a;
    }
  }

  const resolved = resolveTargetFile(targetPath);
  if (!fs.existsSync(resolved)) {
    if (asJson) {
      console.log(JSON.stringify({ passed: false, error: `Target file not found: ${resolved}` }, null, 2));
    } else {
      console.error(`${c.red('Error:')} Target file not found: ${resolved}`);
    }
    process.exit(1);
  }

  const result = checkFile(resolved, {
    minScore: Number.isNaN(minScore) ? 70 : minScore,
    maxTokens: Number.isNaN(maxTokens) ? 4000 : maxTokens,
  });

  if (asJson) {
    console.log(JSON.stringify(result, null, 2));
    if (!result.passed) process.exit(1);
    return;
  }

  banner();
  const rel = path.relative(process.cwd(), resolved) || resolved;
  const checkLines = result.checks.map((chk) => {
    const icon = chk.passed ? c.green('✔') : c.red('✖');
    return `  ${icon} ${c.bold(chk.label.padEnd(32))} ${c.dim(chk.detail)}`;
  });

  console.log(
    box(
      result.passed ? '✅ TASTE QUALITY GATE PASSED' : '❌ TASTE QUALITY GATE FAILED',
      [
        `${c.bold('Target File:')}  ${c.cyan(rel)}`,
        `${c.bold('Taste Score:')}  ${result.score} / 100 (${result.verdict})`,
        `${c.bold('Context Size:')} ~${result.stats.tokens} tokens (${result.stats.lines} lines)`,
        '',
        c.bold('Invariant Checks:'),
        ...checkLines,
      ].join('\n'),
      result.passed ? '\x1b[32m' : '\x1b[31m'
    )
  );

  if (!result.passed) {
    process.exit(1);
  }
}

function handleAdd(args) {
  const flavor = args[0];
  if (!flavor || flavor.startsWith('-')) {
    console.error(`${c.red('Error:')} Missing flavor name. Run ${c.cyan('taste list')} to see options.`);
    process.exit(1);
  }

  let targetOption = null;
  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--target' || args[i] === '-t') {
      targetOption = args[i + 1];
      i++;
    }
  }

  const targetFile = resolveTargetFile(targetOption);
  try {
    const result = stackFlavor(targetFile, flavor);
    banner();
    console.log(
      box(
        '✨ Taste Stacked Successfully',
        [
          `${c.bold('Module:')}   ${c.green(result.name)} (${result.category})`,
          `${c.bold('Target:')}   ${c.cyan(path.relative(process.cwd(), targetFile) || targetFile)}`,
          `${c.bold('Status:')}   ${result.isNewFile ? c.yellow('Created new file') : c.green('Updated existing block')}`,
          '',
          `${c.dim(result.meta.description)}`,
        ].join('\n'),
        '\x1b[32m'
      )
    );
  } catch (err) {
    console.error(`${c.red('Failed to stack flavor:')} ${err.message}`);
    process.exit(1);
  }
}

function handleBlend(args) {
  let styleName = null;
  let toneName = null;
  let targetOption = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--style' || args[i] === '-s') {
      styleName = args[i + 1];
      i++;
    } else if (args[i] === '--tone') {
      toneName = args[i + 1];
      i++;
    } else if (args[i] === '--target' || args[i] === '-t') {
      targetOption = args[i + 1];
      i++;
    }
  }

  if (!styleName || !toneName) {
    console.error(
      `${c.red('Error:')} Both ${c.yellow('--style')} and ${c.yellow('--tone')} are required for blending.`
    );
    console.error(`Example: ${c.cyan('taste blend --style antfu --tone karpathy')}`);
    process.exit(1);
  }

  const targetFile = resolveTargetFile(targetOption);
  try {
    const res = blendTastes(targetFile, styleName, toneName);
    banner();
    console.log(
      box(
        '🍸 Taste Blend Complete!',
        [
          `${c.bold('Style:')}    ${c.cyan(res.style.name)} (${res.style.meta.name})`,
          `${c.bold('Tone:')}     ${c.yellow(res.tone.name)} (${res.tone.meta.name})`,
          `${c.bold('Target:')}   ${c.green(path.relative(process.cwd(), targetFile) || targetFile)}`,
          '',
          c.dim('Your agent now possesses this unique hybrid developer taste.'),
        ].join('\n'),
        '\x1b[36m'
      )
    );
  } catch (err) {
    console.error(`${c.red('Failed to blend tastes:')} ${err.message}`);
    process.exit(1);
  }
}

async function handleRoast(args) {
  let targetPath = args[0] && !args[0].startsWith('-') ? args[0] : null;
  let persona = 'linus';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--persona') {
      persona = args[i + 1];
      i++;
    }
  }

  const resolved = resolveTargetFile(targetPath);
  if (!fs.existsSync(resolved)) {
    console.error(`${c.red('Error:')} Target file not found: ${resolved}`);
    console.error(`Run in a directory with CLAUDE.md, .cursorrules, or specify a file: ${c.cyan('taste roast path/to/file')}`);
    process.exit(1);
  }

  banner();
  console.log(c.dim('  🧠 Consulting Linus Torvalds via LLM...\n'));
  try {
    const { report } = await roastFile(resolved, persona);
    console.log(box('🌶️ TASTE ROAST REPORT', report, '\x1b[31m'));
    console.log('');
  } catch (err) {
    console.error(`${c.red('Roast failed:')} ${err.message}`);
    process.exit(1);
  }
}

async function handlePrune(args) {
  let targetPath = null;
  let write = false;
  let backup = true;
  let level = 'balanced';

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--write' || a === '-w') {
      write = true;
    } else if (a === '--no-backup') {
      backup = false;
    } else if (a === '--level') {
      level = args[i + 1] || 'balanced';
      i++;
    } else if (!a.startsWith('-') && !targetPath) {
      targetPath = a;
    }
  }

  const resolved = resolveTargetFile(targetPath);
  if (!fs.existsSync(resolved)) {
    console.error(`${c.red('Error:')} Target file not found: ${resolved}`);
    process.exit(1);
  }

  banner();
  console.log(c.dim(`  ⚡ Compacting and distilling instructions in ${path.relative(process.cwd(), resolved) || resolved}...\n`));

  try {
    const result = await pruneFile(resolved, { write, backup, level });
    const savingsColor = result.tokensSaved > 0 ? c.green : c.yellow;

    console.log(
      box(
        '✂️ PROMPT TOKEN PRUNING REPORT',
        [
          `${c.bold('Target File:')}     ${c.cyan(path.relative(process.cwd(), resolved) || resolved)}`,
          `${c.bold('Optimization:')}    ${c.magenta(level.toUpperCase())}  |  ${c.dim(`Engine: ${result.llmPowered ? '🧠 LLM' : '⚙️ Static'}`)}`,
          '',
          `${c.bold('Original Tokens:')} ~${result.originalStats.tokens} (${result.originalStats.lines} lines, ${result.originalStats.words} words)`,
          `${c.bold('Pruned Tokens:')}   ~${result.prunedStats.tokens} (${result.prunedStats.lines} lines, ${result.prunedStats.words} words)`,
          `${c.bold('Tokens Saved:')}    ${savingsColor(c.bold(`~${result.tokensSaved} tokens (${result.percentSaved}% context saved)`))}`,
          '',
          result.written
            ? `${c.green('✔')} Changes written in-place! ${result.backupPath ? c.dim(`(Backup saved: ${path.basename(result.backupPath)})`) : ''}`
            : `${c.yellow('ℹ')} Dry-run preview only. Use ${c.cyan('--write')} or ${c.cyan('-w')} to overwrite file.`,
        ].join('\n'),
        result.written ? '\x1b[32m' : '\x1b[33m'
      )
    );

    if (!write) {
      console.log(`\n${c.bold('Preview of distilled prompt (first 15 lines):')}`);
      const previewLines = result.prunedContent.split('\n').slice(0, 15).join('\n');
      console.log(c.gray(previewLines) + '\n...\n');
    }
  } catch (err) {
    console.error(`${c.red('Pruning failed:')} ${err.message}`);
    process.exit(1);
  }
}

async function handleDiff(args) {
  const nonFlag = args.filter((a) => !a.startsWith('-'));
  if (nonFlag.length < 2) {
    console.error(`${c.red('Error:')} 'taste diff' requires two flavors or files to compare.`);
    console.error(`Example: ${c.cyan('taste diff antfu karpathy')}`);
    console.error(`Example: ${c.cyan('taste diff CLAUDE.md .cursorrules')}`);
    process.exit(1);
  }

  const [targetA, targetB] = nonFlag;
  banner();
  console.log(c.dim(`  ⚖️ Comparing developer tastes: ${targetA} vs ${targetB}...\n`));

  try {
    const { report } = await diffTastes(targetA, targetB);
    console.log(box('⚡ TASTE PHILOSOPHY DIFF', report, '\x1b[35m'));
    console.log('');
  } catch (err) {
    console.error(`${c.red('Diff failed:')} ${err.message}`);
    process.exit(1);
  }
}

function handleCard(args) {
  let user = 'developer';
  let outputPath = 'taste-card.svg';
  let style = 'antfu';
  let tone = 'karpathy';
  let theme = 'cyber';
  let targetFile = null;

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--user' || a === '-u') {
      user = args[i + 1] || user;
      i++;
    } else if (a === '--output' || a === '-o') {
      outputPath = args[i + 1] || outputPath;
      i++;
    } else if (a === '--style' || a === '-s') {
      style = args[i + 1] || style;
      i++;
    } else if (a === '--tone') {
      tone = args[i + 1] || tone;
      i++;
    } else if (a === '--theme') {
      theme = args[i + 1] || theme;
      i++;
    } else if (a === '--target' || a === '-t') {
      targetFile = args[i + 1];
      i++;
    }
  }

  if (!targetFile) {
    const autoResolved = resolveTargetFile(null);
    if (fs.existsSync(autoResolved)) {
      targetFile = autoResolved;
    }
  }

  banner();
  try {
    const { outputPath: resolvedOut } = renderCardToFile(path.resolve(outputPath), {
      user,
      style,
      tone,
      theme,
      file: targetFile,
    });

    console.log(
      box(
        '🎨 Profile Taste Card Generated',
        [
          `${c.bold('Output Path:')}  ${c.cyan(resolvedOut)}`,
          `${c.bold('User Handle:')}  @${user}`,
          `${c.bold('Taste DNA:')}    ${style} + ${tone}`,
          `${c.bold('Theme:')}        ${theme}`,
          '',
          `${c.dim('Embed into your GitHub Profile README.md:')}`,
          c.yellow(`![My Developer Taste](./${path.relative(process.cwd(), resolvedOut) || resolvedOut})`),
        ].join('\n'),
        '\x1b[36m'
      )
    );
  } catch (err) {
    console.error(`${c.red('Failed to generate card:')} ${err.message}`);
    process.exit(1);
  }
}

function handleBadge(args) {
  let user = 'developer';
  let outputPath = 'taste-badge.svg';
  let style = 'antfu';
  let tone = 'karpathy';
  let type = 'score';
  let theme = 'cyber';
  let archetype = 'Anti-Slop Minimalist';
  let targetFile = null;

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--type' || a === '-T') {
      type = args[i + 1] || type;
      i++;
    } else if (a === '--output' || a === '-o') {
      outputPath = args[i + 1] || outputPath;
      i++;
    } else if (a === '--style' || a === '-s') {
      style = args[i + 1] || style;
      i++;
    } else if (a === '--tone') {
      tone = args[i + 1] || tone;
      i++;
    } else if (a === '--theme') {
      theme = args[i + 1] || theme;
      i++;
    } else if (a === '--user' || a === '-u') {
      user = args[i + 1] || user;
      i++;
    } else if (a === '--archetype') {
      archetype = args[i + 1] || archetype;
      i++;
    } else if (a === '--target' || a === '-t') {
      targetFile = args[i + 1];
      i++;
    }
  }

  banner();
  try {
    const { outputPath: resolvedOut } = renderBadgeToFile(path.resolve(outputPath), {
      type,
      user,
      style,
      tone,
      theme,
      archetype,
      file: targetFile,
    });

    console.log(
      box(
        '🛡️ Profile Taste Badge Generated',
        [
          `${c.bold('Output Path:')}  ${c.cyan(resolvedOut)}`,
          `${c.bold('Badge Type:')}   ${type}`,
          `${c.bold('Taste DNA:')}    ${style} + ${tone}`,
          '',
          `${c.dim('Embed into your GitHub Profile or README.md:')}`,
          c.yellow(`![Taste Badge](./${path.relative(process.cwd(), resolvedOut) || resolvedOut})`),
        ].join('\n'),
        '\x1b[35m'
      )
    );
  } catch (err) {
    console.error(`${c.red('Failed to generate badge:')} ${err.message}`);
    process.exit(1);
  }
}

async function run(argv = process.argv.slice(2)) {
  if (argv.length === 0 || argv.includes('--help') || argv.includes('-h')) {
    printHelp();
    return;
  }

  if (argv.includes('--version') || argv.includes('-v')) {
    const pkg = require('../package.json');
    console.log(`taste-code v${pkg.version}`);
    return;
  }

  const command = argv[0];
  const args = argv.slice(1);

  switch (command) {
    case 'init':
      await runWizard();
      break;
    case 'list':
      handleList();
      break;
    case 'add':
      handleAdd(args);
      break;
    case 'blend':
      handleBlend(args);
      break;
    case 'skill':
    case 'skills':
      handleSkill(args);
      break;
    case 'check':
    case 'doctor':
      handleCheck(args);
      break;
    case 'roast':
      await handleRoast(args);
      break;
    case 'prune':
    case 'minify':
      await handlePrune(args);
      break;
    case 'diff':
      await handleDiff(args);
      break;
    case 'card':
      handleCard(args);
      break;
    case 'badge':
      handleBadge(args);
      break;
    default:
      console.error(`${c.red('Unknown command:')} ${command}`);
      printHelp();
      process.exit(1);
  }
}

module.exports = { run };
