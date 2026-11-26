/**
 * Interactive Setup Wizard for taste-code (taste init)
 * Integrates Auto-Scan Code DNA (`taste dna`) as the default intelligent setup path,
 * replacing blind cold-start guessing while retaining manual Lego brick selection.
 * Zero external dependencies.
 */

const fs = require('fs');
const readline = require('readline');
const path = require('path');
const { c, banner, box, TARGET_FORMATS, resolveTargetFile } = require('./utils');
const { getAvailable, getMeta } = require('./registry');
const { stackFlavor, blendTastes } = require('./stacker');
const { analyzeRepoDna } = require('./dna');

function askQuestion(rl, query) {
  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      resolve(answer.trim());
    });
  });
}

async function runWizard() {
  banner();
  console.log(`  ${c.bold('🧙 Welcome to the Taste Initialization Wizard')}`);
  console.log(`  ${c.dim('Reverse-engineer your Git DNA or stack master Lego bricks in 10 seconds.')}\n`);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    // Step 1: Select Target Format
    const targetChoices = TARGET_FORMATS.map((f) => ({ label: f.label, value: f.key }));
    console.log(c.magenta(c.bold('Step 1: Select Target Rule Format')));
    targetChoices.forEach((tc, idx) => {
      console.log(`  ${c.cyan(`[${idx + 1}]`)} ${tc.label}`);
    });

    const targetAns = await askQuestion(rl, `\n${c.bold(`Enter choice (1-${targetChoices.length}) [default: 1]: `)}`);
    const targetIdx = parseInt(targetAns, 10);
    const selectedTargetOption = !isNaN(targetIdx) && targetIdx >= 1 && targetIdx <= targetChoices.length
      ? targetChoices[targetIdx - 1].value
      : 'claude';
    const targetFile = resolveTargetFile(selectedTargetOption);
    console.log(`  ${c.green('✔')} Target selected: ${c.cyan(path.relative(process.cwd(), targetFile) || targetFile)}\n`);

    // Step 2: Mode Selection (DNA Auto-Scan vs Manual Lego Selection)
    console.log(c.magenta(c.bold('Step 2: Choose Initialization Mode')));
    console.log(`  ${c.green('[1]')} ${c.bold('🧬 Auto-Scan Git & Codebase DNA (Recommended)')} — Reverse-engineer your own coding style`);
    console.log(`  ${c.cyan('[2]')} ${c.bold('🍸 Manual Lego Brick Picker')} — Pick master style & tone manually`);

    const modeAns = await askQuestion(rl, `\n${c.bold('Enter mode (1-2) [default: 1]: ')}`);

    if (modeAns !== '2') {
      rl.close();
      const profile = analyzeRepoDna(process.cwd());
      const dir = path.dirname(targetFile);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(targetFile, profile.synthesizedRules, 'utf-8');

      console.log(
        box(
          '🧬 Code DNA Synthesized & Initialized!',
          [
            `${c.bold('Code Genotype:')} ${c.magenta(profile.genotype)} (${profile.mbtiTitle})`,
            `${c.bold('Your DNA Mix:')}  ${c.cyan(profile.oneLineSummary)}`,
            `${c.bold('Target File:')}   ${c.green(path.relative(process.cwd(), targetFile) || targetFile)}`,
            '',
            `${c.dim('Next steps:')}`,
            `  1. Export Wrapped SVG: ${c.cyan('npx taste-code dna --svg taste-dna.svg')}`,
            `  2. Audit Slop Tax:     ${c.yellow('npx taste-code tax')}`,
          ].join('\n'),
          '\x1b[32m'
        )
      );
      return;
    }

    // Manual Style & Tone Selection
    const styles = getAvailable('styles');
    console.log(`\n${c.magenta(c.bold('Step 3: Select Core Engineering Style'))}`);
    styles.forEach((s, idx) => {
      const meta = getMeta('styles', s);
      console.log(`  ${c.cyan(`[${idx + 1}]`)} ${c.bold(s.padEnd(12))} — ${meta.description}`);
    });
    console.log(`  ${c.dim('[0]')} Skip style selection`);

    const styleAns = await askQuestion(rl, `\n${c.bold(`Enter choice (0-${styles.length}) [default: 1 (${styles[0]})]: `)}`);
    let selectedStyle = styles[0];
    if (styleAns === '0') selectedStyle = null;
    else if (styleAns) {
      const sIdx = parseInt(styleAns, 10);
      if (!isNaN(sIdx) && sIdx >= 1 && sIdx <= styles.length) selectedStyle = styles[sIdx - 1];
    }

    const tones = getAvailable('tones');
    console.log(`\n${c.magenta(c.bold('Step 4: Select Agent Tone & Persona'))}`);
    tones.forEach((t, idx) => {
      const meta = getMeta('tones', t);
      console.log(`  ${c.yellow(`[${idx + 1}]`)} ${c.bold(t.padEnd(12))} — ${meta.description}`);
    });
    console.log(`  ${c.dim('[0]')} Skip tone selection`);

    const toneAns = await askQuestion(rl, `\n${c.bold(`Enter choice (0-${tones.length}) [default: 1 (${tones[0]})]: `)}`);
    let selectedTone = tones[0];
    if (toneAns === '0') selectedTone = null;
    else if (toneAns) {
      const tIdx = parseInt(toneAns, 10);
      if (!isNaN(tIdx) && tIdx >= 1 && tIdx <= tones.length) selectedTone = tones[tIdx - 1];
    }

    rl.close();

    if (!selectedStyle && !selectedTone) {
      stackFlavor(targetFile, 'minimalist');
    } else if (selectedStyle && selectedTone) {
      blendTastes(targetFile, selectedStyle, selectedTone);
    } else if (selectedStyle) {
      stackFlavor(targetFile, selectedStyle, 'styles');
    } else {
      stackFlavor(targetFile, selectedTone, 'tones');
    }

    console.log(
      box(
        '🚀 Taste Configuration Initialized!',
        [
          `${c.bold('Target File:')}   ${c.green(path.relative(process.cwd(), targetFile) || targetFile)}`,
          `${c.bold('Style Applied:')} ${selectedStyle ? c.cyan(selectedStyle) : c.dim('(none)')}`,
          `${c.bold('Tone Applied:')}  ${selectedTone ? c.yellow(selectedTone) : c.dim('(none)')}`,
        ].join('\n'),
        '\x1b[32m'
      )
    );
  } catch (err) {
    rl.close();
    console.error(`${c.red('Wizard encountered an error:')} ${err.message}`);
    process.exit(1);
  }
}

module.exports = { runWizard };
