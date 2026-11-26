/**
 * Taste CLI Main Router & Command Controller (v2.2)
 * Includes `taste dna` (Git Genome & Personal Rule Synthesizer) and
 * `taste tax` (Cyber Supermarket AI Slop Tax Receipt Generator).
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
const { analyzeRepoDna, renderDnaCardToFile } = require('./dna');
const { taxFile, renderTaxReceiptToFile } = require('./tax');

function printHelp() {
  banner();
  console.log(`
${c.bold('USAGE:')}
  ${c.cyan('taste')} ${c.yellow('<command>')} ${c.dim('[options]')}

${c.bold('VIRAL & DIAGNOSTIC COMMANDS:')}
  ${c.yellow('dna')} ${c.dim('[--write] [--svg taste-dna.svg]')}    Reverse-engineer Git history into Code MBTI, Master DNA & personal CLAUDE.md
  ${c.yellow('tax')} ${c.dim('[file] [--turns 150] [--svg]')}       Print itemized Annual AI Slop Tax Receipt (USD/year + Iced Americanos + SVG)
  ${c.yellow('roast')} ${c.dim('[path/to/CLAUDE.md]')}              Savage Linus Torvalds critique of your agent instructions
  ${c.yellow('check')} ${c.dim('[file] [--min-score 70]')}         CI quality gate & secret-leak audit (non-zero exit on fail)

${c.bold('CURATION & STACKING COMMANDS:')}
  ${c.yellow('init')}                                  Interactive wizard (DNA auto-scan or manual Lego brick setup)
  ${c.yellow('list')}                                  List all modular taste styles, tones, presets, and skills
  ${c.yellow('add')} ${c.green('<flavor>')}                         Stack a style or preset into your project rule file
  ${c.yellow('blend')} ${c.dim('--style <name> --tone <name>')}    Mix an engineering style with an agent tone persona
  ${c.yellow('skill')} ${c.dim('<list|add|show> [name]')}         Browse and install modular SKILL.md agent playbooks
  ${c.yellow('prune')} ${c.dim('[file] [--write]')}                 Eliminate slop tax & compact prompt with zero rule loss
  ${c.yellow('diff')} ${c.dim('<tasteA> <tasteB>')}                 Compare engineering philosophies and constraints
  ${c.yellow('card')} ${c.dim('[--user <name>] [--theme <name>]')}  Generate Geek Telemetry Profile HUD Card SVG (540x220)
  ${c.yellow('badge')} ${c.dim('[--type <score|dna|tax|roast>]')}   Generate Cyber Slash Micro-Badge SVG (28px)

${c.bold('TARGET FORMATS (--target, -t):')}
  ${c.cyan('claude')} (CLAUDE.md), ${c.cyan('dotclaude')} (.claude/CLAUDE.md), ${c.cyan('agents')} (AGENTS.md),
  ${c.cyan('mdc')} (.cursor/rules/*.mdc), ${c.cyan('cursor')} (.cursorrules), ${c.cyan('copilot')} (.github/copilot-instructions.md),
  ${c.cyan('windsurf')} (.windsurfrules), ${c.cyan('windsurf-rules')} (.windsurf/rules/*.md),
  ${c.cyan('cline')} (.clinerules), ${c.cyan('agent')} (.agent/rules.md), ${c.cyan('gemini')} (GEMINI.md)

${c.bold('EXAMPLES:')}
  ${c.cyan('npx taste-code dna --write --svg taste-dna.svg')}
  ${c.cyan('npx taste-code tax CLAUDE.md --turns 150 --svg taste-tax.svg')}
  ${c.cyan('npx taste-code blend --style antfu --tone karpathy --target copilot')}
  ${c.cyan('npx taste-code skill add karpathy-guidelines --agent claude')}
`);
}

function handleDna(args) {
  let cwd = process.cwd();
  let maxCommits = 100;
  let write = false;
  let targetOption = null;
  let svgPath = null;
  let theme = 'cyber';
  let user = null;
  let asJson = false;

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--write' || a === '-w') {
      write = true;
    } else if (a === '--commits' || a === '-n') {
      maxCommits = parseInt(args[i + 1], 10) || 100;
      i++;
    } else if (a === '--target' || a === '-t') {
      targetOption = args[i + 1];
      i++;
    } else if (a === '--svg' || a === '--output' || a === '-o') {
      const next = args[i + 1];
      if (next && !next.startsWith('-')) {
        svgPath = next;
        i++;
      } else {
        svgPath = 'taste-dna.svg';
      }
    } else if (a === '--theme') {
      theme = args[i + 1] || theme;
      i++;
    } else if (a === '--user' || a === '-u') {
      user = args[i + 1] || null;
      i++;
    } else if (a === '--json') {
      asJson = true;
    } else if (!a.startsWith('-')) {
      cwd = path.resolve(a);
    }
  }

  const profile = analyzeRepoDna(cwd, { maxCommits, user });
  const destRuleFile = resolveTargetFile(targetOption || 'claude', cwd);
  let writtenPath = null;
  let backupPath = null;

  if (write) {
    const dir = path.dirname(destRuleFile);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (fs.existsSync(destRuleFile)) {
      backupPath = `${destRuleFile}.bak`;
      fs.copyFileSync(destRuleFile, backupPath);
    }
    fs.writeFileSync(destRuleFile, profile.synthesizedRules, 'utf-8');
    writtenPath = destRuleFile;
  }

  let renderedSvgPath = null;
  if (svgPath) {
    const resolvedSvg = path.isAbsolute(svgPath) ? svgPath : path.join(process.cwd(), svgPath);
    renderDnaCardToFile(resolvedSvg, profile, { theme });
    renderedSvgPath = resolvedSvg;
  }

  if (asJson) {
    console.log(
      JSON.stringify(
        {
          ...profile,
          writtenPath,
          renderedSvgPath,
        },
        null,
        2
      )
    );
    return;
  }

  banner();
  const barSegments = profile.genes
    .map((g, idx) => {
      const colorFn = idx === 0 ? c.cyan : idx === 1 ? c.green : c.magenta;
      const blocks = Math.max(1, Math.round((g.percent / 100) * 28));
      return `  ${colorFn(c.bold(`${String(g.percent).padStart(2, ' ')}% ${g.name.padEnd(10)}`))} ${colorFn('█'.repeat(blocks))} ${c.dim(`(${g.tagline})`)}`;
    })
    .join('\n');

  const depsStr = profile.code.hasZeroDeps ? '0 (Stdlib Purist)' : `${profile.code.runtimeDeps} packages`;
  const testPct = `${Math.round(profile.code.testRatio * 100)}% (${profile.code.testFileCount} test / ${profile.code.sourceFileCount} src)`;

  const reportLines = [
    `${c.bold('Repository:')}     ${c.cyan(profile.repoName)}  ${c.dim(`(@${profile.author})`)}`,
    `${c.bold('Code Genotype:')}  ${c.magenta(c.bold(profile.genotype))} — ${c.bold(profile.mbtiTitle)}`,
    `${c.bold('Chronotype:')}     ${c.yellow(profile.chronotype)}`,
    '',
    c.bold('🧬 Your Developer Code DNA Mix:'),
    barSegments,
    '',
    c.bold('📊 Measured Telemetry Signals:'),
    `  • ${c.bold('Git History:')}    ${profile.git.commitCount} commits analyzed (median ~${profile.git.medianChangedLines} LOC/commit)`,
    `  • ${c.bold('Primary Stack:')}  ${profile.code.primaryLanguage} | Runtime Deps: ${depsStr}`,
    `  • ${c.bold('Code Anatomy:')}   Median function ~${profile.code.medianFnLoc} lines | Median depth: ${profile.code.medianDepth}`,
    `  • ${c.bold('Proof Density:')}  ${testPct}`,
    '',
    writtenPath
      ? `${c.green('✔')} Reverse-engineered rules written to: ${c.green(path.relative(process.cwd(), writtenPath) || writtenPath)}${backupPath ? c.dim(` (backup: ${path.basename(backupPath)})`) : ''}`
      : `${c.yellow('ℹ')} Add ${c.cyan('--write')} to generate ${c.cyan(path.basename(destRuleFile))} tailored to your own coding style!`,
    renderedSvgPath
      ? `${c.green('✔')} Shareable DNA Wrapped SVG saved to: ${c.cyan(path.relative(process.cwd(), renderedSvgPath) || renderedSvgPath)}`
      : `${c.dim('Tip: Add')} ${c.cyan('--svg taste-dna.svg')} ${c.dim('to export your Spotify-Wrapped DNA Card SVG!')}`,
  ];

  console.log(box('🧬 DEVELOPER CODE DNA & GENOTYPE REPORT', reportLines.join('\n'), '\x1b[36m'));

  if (!write) {
    console.log(`\n${c.bold('Preview of your reverse-engineered CLAUDE.md (first 14 lines):')}`);
    console.log(c.gray(profile.synthesizedRules.split('\n').slice(0, 14).join('\n')) + '\n');
  }
}

function handleTax(args) {
  let targetPath = null;
  let turns = 150;
  let model = 'opus';
  let devs = 1;
  let svgPath = null;
  let theme = 'cyber';
  let asJson = false;

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--turns' || a === '-n') {
      turns = parseInt(args[i + 1], 10) || 150;
      i++;
    } else if (a === '--model' || a === '-m') {
      model = args[i + 1] || model;
      i++;
    } else if (a === '--devs' || a === '--team') {
      devs = parseInt(args[i + 1], 10) || 1;
      i++;
    } else if (a === '--svg' || a === '--output' || a === '-o') {
      const next = args[i + 1];
      if (next && !next.startsWith('-')) {
        svgPath = next;
        i++;
      } else {
        svgPath = 'taste-tax.svg';
      }
    } else if (a === '--theme') {
      theme = args[i + 1] || theme;
      i++;
    } else if (a === '--json') {
      asJson = true;
    } else if (!a.startsWith('-') && !targetPath) {
      targetPath = a;
    }
  }

  const resolved = resolveTargetFile(targetPath);
  if (!fs.existsSync(resolved)) {
    console.error(`${c.red('Error:')} Target file not found: ${resolved}`);
    console.error(`Specify a rule file or generate one first with: ${c.cyan('npx taste-code dna --write')}`);
    process.exit(1);
  }

  const report = taxFile(resolved, { turns, model, devs });
  let renderedSvgPath = null;
  if (svgPath) {
    const resolvedSvg = path.isAbsolute(svgPath) ? svgPath : path.join(process.cwd(), svgPath);
    renderTaxReceiptToFile(resolvedSvg, report, { theme });
    renderedSvgPath = resolvedSvg;
  }

  if (asJson) {
    console.log(JSON.stringify({ ...report, renderedSvgPath }, null, 2));
    return;
  }

  banner();
  const rel = path.relative(process.cwd(), resolved) || resolved;
  const width = 54;
  const lineSep = c.gray('-'.repeat(width));

  const itemLines = report.items.length
    ? report.items.map((it) => {
        const left = `${String(it.count).padStart(2, '0')}x ${it.label}`;
        const right = `$${it.annualUsd.toFixed(2)} / yr`;
        const dots = '.'.repeat(Math.max(3, width - left.length - right.length - 2));
        return `  ${c.red(left)} ${c.gray(dots)} ${c.yellow(c.bold(right))}`;
      })
    : [`  ${c.green('00x CONVERSATIONAL SLOP ............... $0.00 / yr')}`];

  const totalBanner = report.taxFree
    ? c.green(c.bold('💸 ANNUAL AI SLOP TAX: $0.00 / YR (CERTIFIED TAX-EXEMPT!)'))
    : c.red(
        c.bold(
          `💸 ANNUAL AI SLOP TAX: $${report.totalAnnualUsd.toFixed(2)} / YR (=${report.icedAmericanos} Iced Americanos ☕)`
        )
      );

  const receiptLines = [
    `  ${c.bold('BUREAU OF CONTEXT WINDOW ECONOMICS — OFFICIAL RECEIPT')}`,
    `  ${c.dim(`File: ${rel} | ${report.turnsPerDay} turns/day x ${report.stepsPerTurn} steps${report.teamSize > 1 ? ` x ${report.teamSize} devs` : ''} (${report.model.id.toUpperCase()})`)}`,
    `  ${lineSep}`,
    ...itemLines,
    `  ${lineSep}`,
    `  ${c.dim(`Context Overhead: ${report.totalWastedTokens} / ${report.originalTokens} tokens (${report.wastePercent}% wasted per turn)`)}`,
    `  ${totalBanner}`,
    '',
    report.taxFree
      ? `  ${c.green('✔')} Zero polite filler detected. Keep your operational contract sharp!`
      : `  ${c.yellow('💊 Evade Tax Now:')} ${c.cyan(`npx taste-code prune ${rel} --write`)}`,
    renderedSvgPath
      ? `  ${c.green('✔')} Receipt SVG exported to: ${c.cyan(path.relative(process.cwd(), renderedSvgPath) || renderedSvgPath)}`
      : `  ${c.dim('Tip: Add')} ${c.cyan('--svg taste-tax.svg')} ${c.dim('(or --theme paper) to export a shareable Receipt SVG!')}`,
  ];

  console.log(box('🧾 CYBER SUPERMARKET SLOP TAX RECEIPT', receiptLines.join('\n'), report.taxFree ? '\x1b[32m' : '\x1b[31m'));
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

  console.log(`\n${c.dim('Try: ')}${c.cyan('npx taste-code dna --svg taste-dna.svg')}\n`);
}

function handleSkill(args) {
  const sub = args[0] && !args[0].startsWith('-') ? args[0].toLowerCase() : 'list';
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
  console.log(c.dim(`  ⚡ Evading Slop Tax & compacting ${path.relative(process.cwd(), resolved) || resolved}...\n`));

  try {
    const result = await pruneFile(resolved, { write, backup, level });
    const savingsColor = result.tokensSaved > 0 ? c.green : c.yellow;

    console.log(
      box(
        '✂️ SLOP TAX EVASION & PRUNING REPORT',
        [
          `${c.bold('Target File:')}      ${c.cyan(path.relative(process.cwd(), resolved) || resolved)}`,
          `${c.bold('Optimization:')}     ${c.magenta(level.toUpperCase())}  |  ${c.dim(`Engine: ${result.llmPowered ? '🧠 LLM' : '⚙️ Static'}`)}`,
          '',
          `${c.bold('Context Compacted:')} ~${result.originalStats.tokens} tok → ~${result.prunedStats.tokens} tok (${result.percentSaved}% lighter)`,
          `${c.bold('Annual Tax Saved:')}  ${savingsColor(c.bold(`~$${result.annualUsdSaved.toFixed(2)} / yr (=${result.coffeesSaved} Iced Americanos ☕)`))}`,
          '',
          result.written
            ? `${c.green('✔')} Changes written in-place! ${result.backupPath ? c.dim(`(Backup saved: ${path.basename(result.backupPath)})`) : ''}`
            : `${c.yellow('ℹ')} Dry-run preview only. Use ${c.cyan('--write')} or ${c.cyan('-w')} to overwrite, or ${c.cyan('taste tax --svg')} for a receipt.`,
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

  let taxLabel = '$0.00/YR SLOP TAX';
  let taxColor = '#10b981';
  if (targetFile && fs.existsSync(targetFile)) {
    const tx = taxFile(targetFile);
    if (!tx.taxFree) {
      taxLabel = `$${tx.totalAnnualUsd.toFixed(0)}/YR SLOP TAX`;
      taxColor = '#f43f5e';
    }
  }

  banner();
  try {
    const { outputPath: resolvedOut } = renderCardToFile(path.resolve(outputPath), {
      user,
      style,
      tone,
      theme,
      taxLabel,
      taxColor,
      file: targetFile,
    });

    console.log(
      box(
        '🎨 Profile Taste Card Generated',
        [
          `${c.bold('Output Path:')}  ${c.cyan(resolvedOut)}`,
          `${c.bold('User Handle:')}  @${user}`,
          `${c.bold('Taste DNA:')}    ${style} + ${tone}`,
          `${c.bold('Slop Tax:')}     ${taxLabel}`,
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
  let style = null;
  let tone = null;
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
      style = args[i + 1] || null;
      i++;
    } else if (a === '--tone') {
      tone = args[i + 1] || null;
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

  let dnaSummary = null;
  if (type === 'dna' && !style && !tone) {
    const dna = analyzeRepoDna(process.cwd());
    dnaSummary = `${dna.genes[0].percent}% ${dna.genes[0].name} · ${dna.genes[1].percent}% ${dna.genes[1].name} [${dna.genotype}]`;
  }

  let taxUsd = 0;
  if (type === 'slop' || type === 'tax') {
    const autoFile = targetFile ? resolveTargetFile(targetFile) : resolveTargetFile(null);
    if (fs.existsSync(autoFile)) {
      taxUsd = taxFile(autoFile).totalAnnualUsd;
    }
  }

  banner();
  try {
    const { outputPath: resolvedOut } = renderBadgeToFile(path.resolve(outputPath), {
      type,
      user,
      style: style || 'antfu',
      tone: tone || 'karpathy',
      dnaSummary,
      taxUsd,
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
          `${c.bold('Theme:')}        ${theme}`,
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
    case 'dna':
    case 'genome':
    case 'wrapped':
      handleDna(args);
      break;
    case 'tax':
    case 'receipt':
      handleTax(args);
      break;
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
