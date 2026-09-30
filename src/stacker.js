/**
 * Stacker Engine: Manages atomic stacking, blending, and non-destructive merging
 * of taste Lego bricks into CLAUDE.md, .cursorrules, or .agent/rules.md.
 */

const fs = require('fs');
const path = require('path');
const { loadContent, getMeta } = require('./registry');

/**
 * Creates block markers for safe stacking and idempotent updates.
 */
function makeMarkers(category, name) {
  const tag = `${category.toUpperCase()}:${name.toLowerCase()}`;
  return {
    start: `<!-- TASTE:${tag}:START -->`,
    end: `<!-- TASTE:${tag}:END -->`,
  };
}

/**
 * Inserts or updates a taste block within an existing text document.
 */
function updateDocumentBlock(originalText, category, name, blockContent) {
  const { start, end } = makeMarkers(category, name);
  const formattedBlock = `${start}\n${blockContent.trim()}\n${end}`;

  const startIndex = originalText.indexOf(start);
  const endIndex = originalText.indexOf(end);

  if (startIndex !== -1 && endIndex !== -1 && endIndex >= startIndex) {
    // Replace existing block
    const before = originalText.substring(0, startIndex).trimEnd();
    const after = originalText.substring(endIndex + end.length).trimStart();
    const sep = before ? '\n\n' : '';
    const endSep = after ? '\n\n' : '\n';
    return `${before}${sep}${formattedBlock}${endSep}${after}`;
  }

  // Append new block cleanly
  const trimmed = originalText.trim();
  if (!trimmed) {
    return `${formattedBlock}\n`;
  }
  return `${trimmed}\n\n${formattedBlock}\n`;
}

/**
 * Stack an individual flavor (preset or style) into target file.
 */
function stackFlavor(targetFile, flavorName, category = 'styles') {
  let cat = category;
  let content;

  try {
    content = loadContent(cat, flavorName);
  } catch (err) {
    // If not found in requested category, try presets
    try {
      content = loadContent('presets', flavorName);
      cat = 'presets';
    } catch {
      throw err;
    }
  }

  const dir = path.dirname(targetFile);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  let existing = '';
  if (fs.existsSync(targetFile)) {
    existing = fs.readFileSync(targetFile, 'utf-8');
  }

  const updated = updateDocumentBlock(existing, cat, flavorName, content);
  fs.writeFileSync(targetFile, updated, 'utf-8');

  return {
    category: cat,
    name: flavorName,
    meta: getMeta(cat, flavorName),
    targetFile,
    isNewFile: !existing,
  };
}

/**
 * Blend a style and a tone together into target file.
 */
function blendTastes(targetFile, styleName, toneName) {
  const styleContent = loadContent('styles', styleName);
  const toneContent = loadContent('tones', toneName);

  const dir = path.dirname(targetFile);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  let current = '';
  if (fs.existsSync(targetFile)) {
    current = fs.readFileSync(targetFile, 'utf-8');
  }

  const isNewFile = !current;

  // Stack Style
  current = updateDocumentBlock(current, 'styles', styleName, styleContent);
  // Stack Tone
  current = updateDocumentBlock(current, 'tones', toneName, toneContent);

  fs.writeFileSync(targetFile, current, 'utf-8');

  return {
    style: { name: styleName, meta: getMeta('styles', styleName) },
    tone: { name: toneName, meta: getMeta('tones', toneName) },
    targetFile,
    isNewFile,
  };
}

module.exports = {
  stackFlavor,
  blendTastes,
  makeMarkers,
};
