const test = require('node:test');
const assert = require('node:assert/strict');
const { selectProjects, paginateProjects, githubLink, rawGithubLink, prunePromptClient } = require('../docs/gallery.js');

const projects = [
  { repo: 'team/curated', status: 'curated', stars: 5000, language: 'Rust', vibe: 'Careful rules', archetype: 'Defensive Architect', updated_at: null },
  { repo: 'alice/new', status: 'pending_review', stars: 1000, language: 'Python', vibe: 'Fast feedback', archetype: 'Pragmatic Systems', updated_at: '2026-10-10T01:00:00Z' },
  { repo: 'bob/older', status: 'pending_review', stars: 2000, language: 'Python', vibe: 'Small changes', archetype: 'Engineering Craft', updated_at: '2026-10-09T01:00:00Z' },
];

test('recent activity is visible before older and undated curated projects', () => {
  assert.deepEqual(selectProjects(projects).map(p => p.repo), ['alice/new', 'bob/older', 'team/curated']);
  assert.equal(projects[0].repo, 'team/curated');
});

test('review state, language, search and archetype filters compose without promoting entries', () => {
  assert.deepEqual(selectProjects(projects, { status: 'curated' }).map(p => p.repo), ['team/curated']);
  assert.deepEqual(selectProjects(projects, { language: 'Rust' }).map(p => p.repo), ['team/curated']);
  assert.deepEqual(selectProjects(projects, { status: 'pending_review', query: ' PYTHON ', archetype: 'Pragmatic Systems' }).map(p => p.repo), ['alice/new']);
  assert.deepEqual(selectProjects(projects, { status: 'curated', query: 'Python' }), []);
});

test('stars and name sorting remain available', () => {
  assert.deepEqual(selectProjects(projects, { sort: 'stars' }).map(p => p.stars), [5000, 2000, 1000]);
  assert.deepEqual(selectProjects(projects, { sort: 'name' }).map(p => p.repo), ['alice/new', 'bob/older', 'team/curated']);
});

test('pagination slices large catalogs cleanly', () => {
  const page = paginateProjects(projects, 2);
  assert.equal(page.items.length, 2);
  assert.equal(page.total, 3);
  assert.equal(page.hasMore, true);
});

test('imported links cannot use script URLs, impersonate GitHub, or include credentials', () => {
  for (const value of [null, 'javascript:alert(1)', 'https://github.com.evil.test/a', 'http://github.com/a', 'https://user:secret@github.com/a']) {
    assert.equal(githubLink(value), null);
  }
  assert.equal(githubLink('https://github.com/alice/new'), 'https://github.com/alice/new');

  for (const badRaw of [null, 'https://evil.test/joe1chief/taste-your-taste/main/AGENTS.md', 'https://raw.githubusercontent.com/other/repo/main/AGENTS.md']) {
    assert.equal(rawGithubLink(badRaw), null);
  }
  assert.equal(
    rawGithubLink('https://raw.githubusercontent.com/joe1chief/taste-your-taste/main/VoiceStudio/AGENTS.md'),
    'https://raw.githubusercontent.com/joe1chief/taste-your-taste/main/VoiceStudio/AGENTS.md'
  );
});

test('client pruner strips politeness fluff while preserving commands and invariants', () => {
  const input = 'Please be helpful and friendly.\nAlways write clean code and follow all best practices.\n- Please run pytest -q\n- Never commit secrets\nThank you!\n';
  const result = prunePromptClient(input, 'balanced');
  assert.ok(!result.prunedContent.includes('helpful and friendly'));
  assert.ok(result.prunedContent.includes('run pytest -q'));
  assert.ok(result.prunedContent.includes('Never commit secrets'));
  assert.ok(result.tokensSaved > 0);
});
