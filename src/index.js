/**
 * Taste CLI Main Router & Command Controller
 */

const path = require('path');
const fs = require('fs');
const { c, banner, box, resolveTargetFile } = require('./utils');
const { getAvailable, getMeta, METADATA } = require('./registry');
const { stackFlavor, blendTastes } = require('./stacker');
const { roastFile } = require('./roaster');

function printHelp() {
  banner();
  console.log(`
${c.bold('USAGE:')}
  ${c.cyan('taste')} ${c.yellow('<command>')} ${c.dim('[options]')}

${c.bold('COMMANDS:')}
  ${c.yellow('list')}                               List all modular taste flavors, styles, and tones
  ${c.yellow('add')} ${c.green('<flavor>')}                      Stack a style or preset into your project rule file
  ${c.yellow('blend')} ${c.dim('--style <name> --tone <name>')} Mix an engineering style with an agent tone persona
  ${c.yellow('roast')} ${c.dim('[path/to/CLAUDE.md]')}           Savage Linus-style roast of your agent instructions

${c.bold('OPTIONS:')}
  ${c.dim('--target, -t <file|type>')}           Target file: ${c.cyan('claude')}, ${c.cyan('cursor')}, ${c.cyan('agent')}, or custom path
  ${c.dim('--style, -s <name>')}                 Style to blend (e.g. antfu, karpathy, stripe, minimalist)
  ${c.dim('--tone <name>')}                      Tone to blend (e.g. karpathy, linus, terse, teacher)
  ${c.dim('--help, -h')}                         Show this help menu
  ${c.dim('--version, -v')}                      Show version

${c.bold('EXAMPLES:')}
  ${c.gray('# Add radical zero-dependency minimalist style')}
  ${c.cyan('npx taste add minimalist')}

  ${c.gray('# Add strict TypeScript engineering rules to .cursorrules')}
  ${c.cyan('npx taste add antfu --target cursor')}

  ${c.gray('# Blend Antfu strictness with Karpathy anti-slop tone')}
  ${c.cyan('npx taste blend --style antfu --tone karpathy')}

  ${c.gray('# Roast current project instructions')}
  ${c.cyan('npx taste roast')}
`);
}

function handleList() {
  banner();
  console.log(`${c.bold('📦 Available Taste Modules (Lego Bricks):\n')}`);

  // Styles
  console.log(c.magenta(c.bold('🎨 Engineering Styles (--style):')));
  for (const key of getAvailable('styles')) {
    const meta = getMeta('styles', key);
    console.log(`  ${c.cyan(c.bold(key.padEnd(14)))} ${c.gray('│')} ${meta.description}`);
  }

  // Tones
  console.log(`\n${c.magenta(c.bold('🗣️ Agent Tones & Personas (--tone):'))}`);
  for (const key of getAvailable('tones')) {
    const meta = getMeta('tones', key);
    console.log(`  ${c.yellow(c.bold(key.padEnd(14)))} ${c.gray('│')} ${meta.description}`);
  }

  // Presets
  console.log(`\n${c.magenta(c.bold('⚡ Complete Taste Presets (taste add <preset>):'))}`);
  for (const key of getAvailable('presets')) {
    const meta = getMeta('presets', key);
    console.log(`  ${c.green(c.bold(key.padEnd(14)))} ${c.gray('│')} ${meta.description}`);
  }

  console.log(`\n${c.dim('Try: ')}${c.cyan('npx taste blend --style antfu --tone karpathy')}\n`);
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

function handleRoast(args) {
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
  try {
    const { report } = roastFile(resolved, persona);
    console.log(box('🌶️ TASTE ROAST REPORT', report, '\x1b[31m'));
    console.log('');
  } catch (err) {
    console.error(`${c.red('Roast failed:')} ${err.message}`);
    process.exit(1);
  }
}

function run(argv = process.argv.slice(2)) {
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
    case 'list':
      handleList();
      break;
    case 'add':
      handleAdd(args);
      break;
    case 'blend':
      handleBlend(args);
      break;
    case 'roast':
      handleRoast(args);
      break;
    default:
      console.error(`${c.red('Unknown command:')} ${command}`);
      printHelp();
      process.exit(1);
  }
}

module.exports = { run };
