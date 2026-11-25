/* Daily gallery v2.0: generated local data, inline rule preview, skills explorer, and deterministic pruner. */
(function (root) {
  'use strict';

  const PAGE_SIZE = 24;

  function selectProjects(projects, { query = '', status = 'all', archetype = 'all', language = 'all', sort = 'latest' } = {}) {
    const search = query.trim().toLowerCase();
    const selected = projects.filter(item =>
      (status === 'all' || item.status === status) &&
      (archetype === 'all' || item.archetype === archetype) &&
      (language === 'all' || (item.language || '') === language) &&
      [item.repo, item.language || '', item.vibe || '', item.archetype || '', item.file || '']
        .some(value => value.toLowerCase().includes(search))
    );
    return selected.sort((a, b) => {
      const order = sort === 'stars' ? b.stars - a.stars
        : sort === 'name' ? 0 : (b.updated_at || '').localeCompare(a.updated_at || '');
      return order || a.repo.toLowerCase().localeCompare(b.repo.toLowerCase());
    });
  }

  function paginateProjects(projects, limit = PAGE_SIZE) {
    const safeLimit = Math.max(1, Number(limit) || PAGE_SIZE);
    return {
      items: projects.slice(0, safeLimit),
      total: projects.length,
      hasMore: projects.length > safeLimit,
    };
  }

  function githubLink(value) {
    try {
      const url = new URL(value);
      return url.protocol === 'https:' && url.hostname === 'github.com' && !url.username && !url.password
        ? url.href : null;
    } catch {
      return null;
    }
  }

  function rawGithubLink(value) {
    try {
      const url = new URL(value);
      return url.protocol === 'https:' &&
        url.hostname === 'raw.githubusercontent.com' &&
        url.pathname.startsWith('/joe1chief/taste-your-taste/') &&
        !url.username && !url.password
        ? url.href : null;
    } catch {
      return null;
    }
  }

  function prunePromptClient(text, level = 'balanced') {
    const lines = String(text || '').split('\n');
    const fluffPatterns = [
      /^\s*(please\s+)?(always\s+)?(ensure|strive\s+for|write)\s+(clean|readable|high\s+quality)\s+code/i,
      /^\s*(please\s+)?(be|act)\s+(very\s+)?(helpful|polite|friendly|courteous)/i,
      /helpful\s+and\s+friendly/i,
      /follow\s+(all\s+)?(industry\s+)?best\s+practices/i,
      /strive\s+for\s+excellence/i,
      /as\s+an\s+ai\s+(assistant|agent)/i,
      /^\s*thank\s+you[!.]?\s*$/i,
      /apologize\s+(if\s+you\s+make\s+a\s+mistake|immediately)/i,
      /if\s+you\s+make\s+a\s+mistake,\s*(kindly\s+)?apologize/i,
      /feel\s+free\s+to\s+ask/i,
      /here\s+are\s+the\s+project\s+guidelines:?\s*$/i,
      /we\s+value\s+collaboration\s+and\s+empathy/i,
    ];

    const kept = [];
    let removedLines = 0;
    for (let line of lines) {
      if (fluffPatterns.some(pattern => pattern.test(line))) {
        removedLines++;
        continue;
      }
      if (level !== 'minimal') {
        line = line.replace(/^(\s*[-*]\s*)(please|kindly)\s+/i, '$1');
        line = line.replace(/\bplease\s+(ensure\s+that\s+you\s+|make\s+sure\s+to\s+)/gi, '');
      }
      if (level === 'aggressive') {
        if (line.trim() === '') continue;
        line = line.replace(/\s{2,}/g, ' ');
      }
      kept.push(line);
    }

    const collapsed = [];
    let prevEmpty = false;
    for (const line of kept) {
      const empty = line.trim() === '';
      if (empty) {
        if (!prevEmpty) collapsed.push('');
        prevEmpty = true;
      } else {
        collapsed.push(line);
        prevEmpty = false;
      }
    }

    const pruned = collapsed.join('\n').trim() + (collapsed.length ? '\n' : '');
    const origTokens = Math.max(0, Math.round(String(text || '').length / 3.8));
    const prunedTokens = Math.max(0, Math.round(pruned.length / 3.8));
    const saved = Math.max(0, origTokens - prunedTokens);
    const percent = origTokens > 0 ? Number(((saved / origTokens) * 100).toFixed(1)) : 0;

    return {
      prunedContent: pruned,
      originalTokens: origTokens,
      prunedTokens,
      tokensSaved: saved,
      percentSaved: percent,
      removedLines,
    };
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { selectProjects, paginateProjects, githubLink, rawGithubLink, prunePromptClient };
  }
  if (typeof document === 'undefined') return;

  let catalog;
  let currentArchetype = 'all';
  let visibleLimit = PAGE_SIZE;
  let activeModalContent = '';

  const element = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };

  const link = (label, href, className) => {
    const target = githubLink(href);
    const node = element(target ? 'a' : 'span', className, label);
    if (target) {
      node.href = target;
      node.target = '_blank';
      node.rel = 'noopener noreferrer';
    }
    return node;
  };

  const dateText = value => value ? value.replace('T', ' ').replace('Z', ' UTC') : 'Not recorded';

  function notifyToast(message) {
    if (typeof root.showToast === 'function') {
      root.showToast(message);
    }
  }

  async function openRulePreview(title, files) {
    const modal = document.getElementById('rule-preview-modal');
    const titleEl = document.getElementById('modal-repo-title');
    const tabsEl = document.getElementById('modal-file-tabs');
    const codeEl = document.getElementById('modal-rule-content');
    const metaEl = document.getElementById('modal-rule-meta');
    if (!modal || !codeEl || !tabsEl || !titleEl) return;

    const validFiles = (files || []).filter(f => rawGithubLink(f.raw_url));
    if (!validFiles.length) return;

    titleEl.textContent = title;
    modal.classList.remove('hidden');
    tabsEl.replaceChildren();

    async function selectFile(idx) {
      const chosen = validFiles[idx];
      Array.from(tabsEl.children).forEach((btn, i) => {
        btn.className = i === idx
          ? 'px-3 py-1 rounded-lg text-xs font-mono bg-pink-600 text-white'
          : 'px-3 py-1 rounded-lg text-xs font-mono bg-gray-800 text-gray-300 hover:bg-gray-700';
      });
      codeEl.textContent = `Loading ${chosen.name}...`;
      metaEl.textContent = chosen.path || chosen.name;
      activeModalContent = '';

      try {
        const safeUrl = rawGithubLink(chosen.raw_url);
        const resp = await fetch(safeUrl);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const text = await resp.text();
        activeModalContent = text;
        codeEl.textContent = text;
        const estTokens = Math.round(text.length / 3.8);
        const lineCount = text.split('\n').length;
        metaEl.textContent = `${chosen.name} • ${lineCount} lines • ~${estTokens.toLocaleString('en-US')} est. tokens`;
      } catch (err) {
        codeEl.textContent = `Unable to fetch raw file preview (${err.message}). Use the GitHub archive link to view directly.`;
      }
    }

    validFiles.forEach((file, idx) => {
      const btn = element('button', '', file.name);
      btn.type = 'button';
      btn.addEventListener('click', () => selectFile(idx));
      tabsEl.append(btn);
    });

    await selectFile(0);
  }

  function closeRuleModal() {
    const modal = document.getElementById('rule-preview-modal');
    if (modal) modal.classList.add('hidden');
  }

  function copyModalContent() {
    if (!activeModalContent) return;
    navigator.clipboard.writeText(activeModalContent);
    notifyToast('Copied raw prompt rules to clipboard!');
  }

  function sendModalToSandbox(target) {
    if (!activeModalContent) return;
    closeRuleModal();
    if (target === 'roast') {
      const input = document.getElementById('roast-input');
      if (input) input.value = activeModalContent;
      if (typeof root.switchTab === 'function') root.switchTab('roast-playground');
      if (typeof root.runRoast === 'function') root.runRoast();
    } else if (target === 'pruner') {
      const input = document.getElementById('pruner-input');
      if (input) input.value = activeModalContent;
      if (typeof root.switchTab === 'function') root.switchTab('pruner');
      if (typeof root.runClientPruner === 'function') root.runClientPruner();
    }
  }

  function renderProjects(resetPage = false) {
    if (!catalog) return;
    if (resetPage) visibleLimit = PAGE_SIZE;

    const langSelect = document.getElementById('language-filter');
    const filtered = selectProjects(catalog.projects, {
      query: document.getElementById('search-input').value,
      status: document.getElementById('collection-filter').value,
      archetype: currentArchetype,
      language: langSelect ? langSelect.value : 'all',
      sort: document.getElementById('sort-order').value,
    });

    const page = paginateProjects(filtered, visibleLimit);
    const grid = document.getElementById('repo-grid');
    grid.replaceChildren();
    document.getElementById('result-count').textContent =
      `Showing ${page.items.length} of ${page.total} matching (${catalog.counts.total} tracked)`;

    const loadMoreWrap = document.getElementById('load-more-wrap');
    const loadMoreBtn = document.getElementById('load-more-btn');
    if (loadMoreWrap && loadMoreBtn) {
      if (page.hasMore) {
        loadMoreWrap.classList.remove('hidden');
        loadMoreBtn.textContent = `Load more projects (${page.total - page.items.length} remaining)`;
      } else {
        loadMoreWrap.classList.add('hidden');
      }
    }

    if (!page.items.length) {
      grid.append(element('p', 'col-span-full py-12 text-center text-gray-400', 'No projects match these filters.'));
      return;
    }

    for (const item of page.items) {
      const card = element('article', 'bg-gray-900 border border-gray-800 hover:border-pink-500/50 rounded-2xl p-6 transition flex flex-col shadow-xl');
      const curated = item.status === 'curated';
      const badges = element('div', 'flex flex-wrap items-center gap-2 mb-3');
      badges.append(element('span', curated
        ? 'text-xs px-2 py-0.5 rounded border border-emerald-700 bg-emerald-950/40 text-emerald-300'
        : 'text-xs px-2 py-0.5 rounded border border-amber-700 bg-amber-950/40 text-amber-300', curated ? 'Curated' : 'Pending review'));
      badges.append(element('span', 'text-xs font-mono text-gray-400', `★ ${item.stars.toLocaleString('en-US')}`));
      if (item.evolution_count > 0) {
        badges.append(element('span', 'text-xs px-2 py-0.5 rounded bg-purple-950/50 border border-purple-800 text-purple-300 font-mono', `⚡ ${item.evolution_count}x evolved`));
      }
      card.append(badges);

      card.append(link(item.repo, item.source_url, 'text-lg font-bold text-white hover:text-pink-400 mb-1.5 break-words'));
      card.append(element('p', 'text-xs text-pink-300 mb-3 font-medium', `${item.archetype} • ${item.language}`));
      card.append(element('p', 'text-sm text-gray-300 mb-3 break-words', item.vibe));
      card.append(element('p', 'text-xs font-mono text-indigo-300/90 mb-2 break-words', `📄 ${item.file}`));
      card.append(element('p', 'text-xs text-gray-400 mb-4 line-clamp-2', item.highlight));

      const footer = element('div', 'mt-auto border-t border-gray-800 pt-3');
      footer.append(element('p', 'text-xs text-gray-500 mb-3', item.updated_at
        ? `${item.latest_change}: ${dateText(item.updated_at)}` : 'Maintainer-selected project'));

      const links = element('div', 'flex flex-wrap items-center gap-3 text-xs text-pink-300');
      if (Array.isArray(item.raw_files) && item.raw_files.length > 0) {
        const previewBtn = element('button', 'px-2.5 py-1 rounded-lg bg-pink-950/60 border border-pink-700/80 text-pink-200 hover:bg-pink-900 font-mono transition', '👁 Preview rules');
        previewBtn.type = 'button';
        previewBtn.addEventListener('click', () => openRulePreview(item.repo, item.raw_files));
        links.append(previewBtn);
      }
      links.append(link(item.archive_url ? 'Archive' : 'Source', item.archive_url || item.source_url, 'hover:text-white underline'));
      if (item.curated_url && item.curated_url !== item.archive_url) links.append(link('Curated dir', item.curated_url, 'hover:text-white underline'));
      if (item.issue_url && !curated) links.append(link('Issue', item.issue_url, 'hover:text-white underline'));
      footer.append(links);
      card.append(footer);
      grid.append(card);
    }
  }

  function renderLanguages() {
    const langSelect = document.getElementById('language-filter');
    if (!langSelect || !catalog) return;
    const counts = {};
    for (const p of catalog.projects) {
      const lang = p.language || 'General';
      counts[lang] = (counts[lang] || 0) + 1;
    }
    const sortedLangs = Object.keys(counts).sort((a, b) => counts[b] - counts[a] || a.localeCompare(b));
    langSelect.replaceChildren(element('option', '', 'All languages'));
    langSelect.firstChild.value = 'all';
    for (const lang of sortedLangs) {
      const opt = element('option', '', `${lang} (${counts[lang]})`);
      opt.value = lang;
      langSelect.append(opt);
    }
  }

  function renderArchetypes() {
    const filters = document.getElementById('archetype-filters');
    if (!filters) return;
    filters.replaceChildren();
    for (const value of ['all', ...new Set(catalog.projects.map(item => item.archetype).sort())]) {
      const button = element('button', value === currentArchetype
        ? 'px-3 py-1.5 rounded-lg text-xs font-medium bg-pink-900/50 border border-pink-600 text-pink-200'
        : 'px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-900 border border-gray-800 text-gray-400 hover:text-gray-200', value === 'all' ? 'All styles' : value);
      button.type = 'button';
      button.setAttribute('aria-pressed', String(value === currentArchetype));
      button.addEventListener('click', () => {
        currentArchetype = value;
        renderArchetypes();
        renderProjects(true);
      });
      filters.append(button);
    }
  }

  function renderSkills() {
    const grid = document.getElementById('skills-grid');
    if (!grid || !catalog) return;
    const skills = Array.isArray(catalog.skills) ? catalog.skills : [];
    const agentSelect = document.getElementById('skill-target-agent');
    const targetAgent = agentSelect ? agentSelect.value : 'claude';
    grid.replaceChildren();

    if (!skills.length) {
      grid.append(element('p', 'col-span-full text-center text-gray-400 py-8', 'No modular skills indexed.'));
      return;
    }

    for (const sk of skills) {
      const card = element('article', 'bg-gray-900 border border-gray-800 hover:border-indigo-500/60 rounded-2xl p-6 flex flex-col shadow-xl transition');
      const header = element('div', 'flex items-center justify-between gap-2 mb-3');
      header.append(element('span', 'text-xs font-mono px-2.5 py-0.5 rounded bg-indigo-950/70 border border-indigo-700 text-indigo-300', 'SKILL.md'));
      header.append(link('View on GitHub', sk.url, 'text-xs text-gray-400 hover:text-white underline'));
      card.append(header);

      card.append(element('h3', 'text-lg font-bold text-white font-mono mb-2', sk.id));
      card.append(element('p', 'text-sm text-gray-300 mb-5 flex-grow', sk.description));

      const cmd = `npx taste-code skill add ${sk.id}${targetAgent !== 'claude' ? ` --agent ${targetAgent}` : ''}`;
      const cmdBox = element('div', 'bg-gray-950 border border-gray-800 rounded-xl px-3 py-2.5 font-mono text-xs text-pink-300 mb-3 break-all', cmd);
      card.append(cmdBox);

      const actions = element('div', 'flex items-center gap-3');
      const copyBtn = element('button', 'flex-1 py-2 rounded-lg bg-pink-600 hover:bg-pink-500 text-white text-xs font-semibold transition', 'Copy Install Cmd');
      copyBtn.type = 'button';
      copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(cmd);
        notifyToast(`Copied: ${cmd}`);
      });
      actions.append(copyBtn);

      if (sk.raw_url) {
        const prevBtn = element('button', 'px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-mono transition', 'Preview');
        prevBtn.type = 'button';
        prevBtn.addEventListener('click', () => openRulePreview(`skills/${sk.id}`, [{ name: 'SKILL.md', path: sk.path, raw_url: sk.raw_url }]));
        actions.append(prevBtn);
      }

      card.append(actions);
      grid.append(card);
    }
  }

  async function loadCatalog() {
    const status = document.getElementById('catalog-status');
    try {
      const response = await fetch('./catalog.json', { cache: 'no-cache' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      catalog = await response.json();
      if (catalog.schema_version !== 1 || !Array.isArray(catalog.projects)) throw new Error('Unsupported catalog');
      status.textContent = `${catalog.counts.total} projects • ${catalog.counts.curated} curated • ${catalog.counts.pending_review} pending review`;
      const scan = document.getElementById('scan-status');
      scan.replaceChildren();
      if (catalog.last_scan) {
        scan.append(link(`Last completed scan: ${dateText(catalog.last_scan.completed_at)}`, catalog.last_scan.run_url, 'underline hover:text-white'));
      } else {
        scan.textContent = 'Scan timestamps will be recorded from the next Radar run.';
      }
      document.getElementById('content-status').textContent = `Latest content activity: ${dateText(catalog.latest_update)}`;
      renderLanguages();
      renderArchetypes();
      renderProjects(true);
      renderSkills();
    } catch (error) {
      status.textContent = 'The project catalog could not be loaded. Reload the page or browse the repository on GitHub.';
      document.getElementById('repo-grid').replaceChildren();
      console.error('Gallery load failed:', error);
    }
  }

  const loadMoreBtn = document.getElementById('load-more-btn');
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', () => {
      visibleLimit += PAGE_SIZE;
      renderProjects(false);
    });
  }

  root.filterRepos = () => renderProjects(true);
  root.renderSkillsCatalog = renderSkills;
  root.closeRuleModal = closeRuleModal;
  root.copyModalContent = copyModalContent;
  root.sendModalToSandbox = sendModalToSandbox;
  root.prunePromptClient = prunePromptClient;
  loadCatalog();
})(typeof window === 'undefined' ? globalThis : window);
