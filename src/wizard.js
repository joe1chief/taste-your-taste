/**
 * Interactive Setup Wizard for taste-code (taste init)
 * Zero external dependencies, built using Node.js readline.
 */

const readline = require('readline');
const path = require('path');
const { c, banner, box, resolveTargetFile } = require('./utils');
const { getAvailable, getMeta } = require('./registry');
const { stackFlavor, blendTastes } = require('./stacker');

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
  console.log(`  ${c.dim('Configure your agent guidelines with world-class engineering taste.')}\n`);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    // -------------------------------------------------------------
    // Step 1: Select Target File
    // -------------------------------------------------------------
    const targetChoices = [
      { label: 'CLAUDE.md (Root Claude Code project rules)', value: 'claude' },
      { label: '.claude/CLAUDE.md (Nested Claude Code configuration)', value: 'dotclaude' },
      { label: '.cursor/rules/taste.mdc (Modern Cursor MDC rules)', value: 'mdc' },
      { label: '.cursorrules (Legacy Cursor single-file rules)', value: 'cursor' },
      { label: '.agent/rules.md (Google Antigravity / Gemini Agent)', value: 'agent' },
      { label: 'AGENTS.md (General multi-agent specification)', value: 'agents' },
    ];

    console.log(c.magenta(c.bold('Step 1 of 3: Select Target Rule Format')));
    targetChoices.forEach((tc, idx) => {
      console.log(`  ${c.cyan(`[${idx + 1}]`)} ${tc.label}`);
    });

    const targetAns = await askQuestion(rl, `\n${c.bold('Enter choice (1-6) [default: 1]: ')}`);
    const targetIdx = parseInt(targetAns, 10);
    const selectedTargetOption = (!isNaN(targetIdx) && targetIdx >= 1 && targetIdx <= targetChoices.length)
      ? targetChoices[targetIdx - 1].value
      : 'claude';
    const targetFile = resolveTargetFile(selectedTargetOption);
    console.log(`  ${c.green('✔')} Target selected: ${c.cyan(path.relative(process.cwd(), targetFile) || targetFile)}\n`);

    // -------------------------------------------------------------
    // Step 2: Select Engineering Style
    // -------------------------------------------------------------
    const styles = getAvailable('styles');
    console.log(c.magenta(c.bold('Step 2 of 3: Select Core Engineering Style')));
    styles.forEach((s, idx) => {
      const meta = getMeta('styles', s);
      console.log(`  ${c.cyan(`[${idx + 1}]`)} ${c.bold(s.padEnd(12))} — ${meta.description}`);
    });
    console.log(`  ${c.dim('[0]')} Skip style selection`);

    const styleAns = await askQuestion(rl, `\n${c.bold(`Enter choice (0-${styles.length}) [default: 1 (${styles[0]})]: `)}`);
    let selectedStyle = styles[0];
    if (styleAns === '0') {
      selectedStyle = null;
    } else if (styleAns) {
      const sIdx = parseInt(styleAns, 10);
      if (!isNaN(sIdx) && sIdx >= 1 && sIdx <= styles.length) {
        selectedStyle = styles[sIdx - 1];
      }
    }
    if (selectedStyle) {
      console.log(`  ${c.green('✔')} Style selected: ${c.cyan(selectedStyle)}\n`);
    } else {
      console.log(`  ${c.dim('⏩ Skipped style selection.')}\n`);
    }

    // -------------------------------------------------------------
    // Step 3: Select Tone Persona
    // -------------------------------------------------------------
    const tones = getAvailable('tones');
    console.log(c.magenta(c.bold('Step 3 of 3: Select Agent Tone & Persona')));
    tones.forEach((t, idx) => {
      const meta = getMeta('tones', t);
      console.log(`  ${c.yellow(`[${idx + 1}]`)} ${c.bold(t.padEnd(12))} — ${meta.description}`);
    });
    console.log(`  ${c.dim('[0]')} Skip tone selection`);

    const toneAns = await askQuestion(rl, `\n${c.bold(`Enter choice (0-${tones.length}) [default: 1 (${tones[0]})]: `)}`);
    let selectedTone = tones[0];
    if (toneAns === '0') {
      selectedTone = null;
    } else if (toneAns) {
      const tIdx = parseInt(toneAns, 10);
      if (!isNaN(tIdx) && tIdx >= 1 && tIdx <= tones.length) {
        selectedTone = tones[tIdx - 1];
      }
    }
    if (selectedTone) {
      console.log(`  ${c.green('✔')} Tone selected: ${c.yellow(selectedTone)}\n`);
    } else {
      console.log(`  ${c.dim('⏩ Skipped tone selection.')}\n`);
    }

    // -------------------------------------------------------------
    // Execute Taste Application
    // -------------------------------------------------------------
    rl.close();

    if (!selectedStyle && !selectedTone) {
      console.log(c.yellow('No style or tone selected. Creating clean starter rule file...'));
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
          '',
          `${c.dim('Next steps:')}`,
          `  1. Inspect your file: ${c.cyan(`cat ${path.relative(process.cwd(), targetFile) || targetFile}`)}`,
          `  2. Roast your setup:  ${c.yellow('npx taste-code roast')}`,
          `  3. Stack more bricks: ${c.magenta('npx taste-code add <flavor>')}`,
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
