/**
 * Comprehensive test suite for Taste CLI and Roaster Engine
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { getAvailable, loadContent } = require('../src/registry');
const { stackFlavor, blendTastes } = require('../src/stacker');
const { resolveTargetFile } = require('../src/utils');
const { analyzeContentDeterministic, roastFile } = require('../src/roaster');

const TEMP_DIR = path.join(__dirname, 'tmp');

function setup() {
  if (fs.existsSync(TEMP_DIR)) {
    fs.rmSync(TEMP_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

function teardown() {
  if (fs.existsSync(TEMP_DIR)) {
    fs.rmSync(TEMP_DIR, { recursive: true, force: true });
  }
}

function testRegistry() {
  console.log('Testing registry loader...');
  const styles = getAvailable('styles');
  const tones = getAvailable('tones');
  const presets = getAvailable('presets');

  assert(styles.includes('antfu'), 'Styles must include antfu');
  assert(styles.includes('karpathy'), 'Styles must include karpathy');
  assert(styles.includes('minimalist'), 'Styles must include minimalist');
  assert(tones.includes('linus'), 'Tones must include linus');
  assert(tones.includes('terse'), 'Tones must include terse');
  assert(presets.includes('anti-slop'), 'Presets must include anti-slop');

  const antfuContent = loadContent('styles', 'antfu');
  assert(antfuContent.includes('TypeScript Strictness'), 'Antfu content must be loaded');
  console.log('✅ Registry loader test passed.');
}

function testStacker() {
  console.log('Testing taste stacker...');
  const targetFile = path.join(TEMP_DIR, 'CLAUDE.md');

  // 1. Stack first flavor (antfu)
  const res1 = stackFlavor(targetFile, 'antfu');
  assert(res1.isNewFile, 'First stack should create new file');
  let content = fs.readFileSync(targetFile, 'utf-8');
  assert(content.includes('<!-- TASTE:STYLES:antfu:START -->'), 'Marker must be present');
  assert(content.includes('TypeScript Strictness'), 'Content must be included');

  // 2. Stack second flavor (minimalist)
  const res2 = stackFlavor(targetFile, 'minimalist');
  assert(!res2.isNewFile, 'Second stack should modify existing file');
  content = fs.readFileSync(targetFile, 'utf-8');
  assert(content.includes('<!-- TASTE:STYLES:antfu:START -->'), 'Antfu must still be present');
  assert(content.includes('<!-- TASTE:STYLES:minimalist:START -->'), 'Minimalist must be appended');

  // 3. Re-stack antfu to verify idempotent update
  stackFlavor(targetFile, 'antfu');
  content = fs.readFileSync(targetFile, 'utf-8');
  const matches = content.match(/<!-- TASTE:STYLES:antfu:START -->/g);
  assert.strictEqual(matches.length, 1, 'Antfu block must not be duplicated');

  console.log('✅ Taste stacker test passed.');
}

function testBlend() {
  console.log('Testing taste blend...');
  const blendFile = path.join(TEMP_DIR, 'BLENDED.md');

  const res = blendTastes(blendFile, 'antfu', 'karpathy');
  assert(res.isNewFile, 'Blend should create file');
  const content = fs.readFileSync(blendFile, 'utf-8');
  assert(content.includes('<!-- TASTE:STYLES:antfu:START -->'), 'Style block must be present');
  assert(content.includes('<!-- TASTE:TONES:karpathy:START -->'), 'Tone block must be present');

  console.log('✅ Taste blend test passed.');
}

async function testRoaster() {
  console.log('Testing roaster engine...');

  // Test 1: Slop-filled prompt
  const slopPrompt = `
# Guidelines
Please be helpful and friendly to the user.
Always ensure high quality, clean and readable code following all best practices.
We strive for excellence. As an AI assistant, you should apologize if you make a mistake.
Thank you for your help!
`;
  const slopAnalysis = analyzeContentDeterministic(slopPrompt);
  assert(slopAnalysis.score < 50, `Slop prompt should get a low score, got ${slopAnalysis.score}`);
  assert(slopAnalysis.sins.length >= 2, 'Should detect multiple fluff phrases');

  // Test 2: High-taste, disciplined prompt
  const tastePrompt = `
# Project Rules
- Run tests: pytest -v tests/
- Format: ruff check --fix
- Zero conversational fluff. Never apologize, never say 'Certainly!'.
- Deliver git patch immediately.
- Do not add third-party dependencies for helpers <= 20 lines.
`;
  const tasteAnalysis = analyzeContentDeterministic(tastePrompt);
  assert(tasteAnalysis.score >= 80, `Taste prompt should get a high score, got ${tasteAnalysis.score}`);

  // Test 3: roastFile with output
  const testFile = path.join(TEMP_DIR, 'ROAST_TARGET.md');
  fs.writeFileSync(testFile, slopPrompt, 'utf-8');
  const roastResult = await roastFile(testFile, 'linus');
  assert(roastResult.report.includes('Linus Torvalds Roasts Your Taste'), 'Roast output must contain Linus quotes');
  assert(roastResult.report.includes('Sins & Pathology Detected'), 'Roast output must list sins');

  console.log('✅ Roaster engine test passed.');
}

function testCursorMdc() {
  console.log('Testing Cursor MDC (.cursor/rules/*.mdc) support...');
  const mdcTarget = resolveTargetFile('mdc', TEMP_DIR);
  assert(mdcTarget.endsWith(path.join('.cursor', 'rules', 'taste.mdc')), 'Should resolve to .cursor/rules/taste.mdc');

  const res = stackFlavor(mdcTarget, 'antfu');
  assert(res.isNewFile, 'Should create new MDC file');
  const content = fs.readFileSync(mdcTarget, 'utf-8');
  assert(content.startsWith('---'), 'MDC file must start with YAML frontmatter delimiter');
  assert(content.includes('globs: *'), 'MDC file must include globs');
  assert(content.includes('alwaysApply: true'), 'MDC file must include alwaysApply');
  assert(content.includes('<!-- TASTE:STYLES:antfu:START -->'), 'MDC file must contain taste block');

  // Test stacking second flavor into same MDC
  stackFlavor(mdcTarget, 'minimalist');
  const updatedContent = fs.readFileSync(mdcTarget, 'utf-8');
  assert(updatedContent.startsWith('---'), 'MDC frontmatter must remain intact');
  assert(updatedContent.includes('<!-- TASTE:STYLES:antfu:START -->'), 'Antfu block must remain');
  assert(updatedContent.includes('<!-- TASTE:STYLES:minimalist:START -->'), 'Minimalist block must be added');

  console.log('✅ Cursor MDC test passed.');
}

async function runAll() {
  setup();
  try {
    testRegistry();
    testStacker();
    testBlend();
    testCursorMdc();
    await testRoaster();
    console.log('\n🎉 ALL CLI & ROASTER TESTS PASSED SUCCESFULLY!\n');
  } finally {
    teardown();
  }
}

runAll();
