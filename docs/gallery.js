/* Daily gallery: generated local data, no GitHub API calls or credentials. */
(function (root) {
  'use strict';

  function selectProjects(projects, { query = '', status = 'all', archetype = 'all', sort = 'latest' } = {}) {
    const search = query.trim().toLowerCase();
    const selected = projects.filter(item =>
      (status === 'all' || item.status === status) &&
      (archetype === 'all' || item.archetype === archetype) &&
      [item.repo, item.language, item.vibe, item.archetype].some(value => value.toLowerCase().includes(search))
    );
    return selected.sort((a, b) => {
      const order = sort === 'stars' ? b.stars - a.stars
        : sort === 'name' ? 0 : (b.updated_at || '').localeCompare(a.updated_at || '');
      return order || a.repo.toLowerCase().localeCompare(b.repo.toLowerCase());
    });
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

  if (typeof module !== 'undefined' && module.exports) module.exports = { selectProjects, githubLink };
  if (typeof document === 'undefined') return;

  let catalog;
  let currentArchetype = 'all';
  const element = (tag, className, text) => {
    const node = document.createElement(tag);
    node.className = className;
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

  function renderProjects() {
    if (!catalog) return;
    const projects = selectProjects(catalog.projects, {
      query: document.getElementById('search-input').value,
      status: document.getElementById('collection-filter').value,
      archetype: currentArchetype,
      sort: document.getElementById('sort-order').value,
    });
    const grid = document.getElementById('repo-grid');
    grid.replaceChildren();
    document.getElementById('result-count').textContent = `${projects.length} of ${catalog.counts.total} projects`;
    if (!projects.length) {
      grid.append(element('p', 'col-span-full py-12 text-center text-gray-400', 'No projects match these filters.'));
    }
    for (const item of projects) {
      const card = element('article', 'bg-gray-900 border border-gray-800 hover:border-pink-500/50 rounded-2xl p-6 transition flex flex-col shadow-xl');
      const curated = item.status === 'curated';
      const badges = element('div', 'flex flex-wrap items-center gap-2 mb-3');
      badges.append(element('span', curated
        ? 'text-xs px-2 py-1 rounded border border-emerald-700 text-emerald-300'
        : 'text-xs px-2 py-1 rounded border border-amber-700 text-amber-300', curated ? 'Curated project' : 'Pending review'));
      badges.append(element('span', 'text-xs font-mono text-gray-400', `${item.stars.toLocaleString('en-US')} stars`));
      card.append(badges);
      card.append(link(item.repo, item.source_url, 'text-lg font-bold text-white hover:text-pink-400 mb-2 break-words'));
      card.append(element('p', 'text-xs text-pink-300 mb-3', `${item.archetype} / ${item.language}`));
      card.append(element('p', 'text-sm text-gray-300 mb-4 break-words', item.vibe));
      card.append(element('p', 'text-xs font-mono text-gray-400 mb-2 break-words', item.file));
      card.append(element('p', 'text-xs text-gray-400 mb-4 line-clamp-2', item.highlight));
      const footer = element('div', 'mt-auto border-t border-gray-800 pt-3');
      footer.append(element('p', 'text-xs text-gray-400 mb-3', item.updated_at
        ? `${item.latest_change}: ${dateText(item.updated_at)}` : 'Maintainer-selected project'));
      const links = element('div', 'flex flex-wrap gap-4 text-xs text-pink-300');
      links.append(link(item.archive_url ? 'View archived rules' : 'View source repository', item.archive_url || item.source_url, 'hover:text-white underline'));
      if (item.curated_url && item.curated_url !== item.archive_url) links.append(link('Curated snapshot', item.curated_url, 'hover:text-white underline'));
      if (item.issue_url) links.append(link('Review discovery', item.issue_url, 'hover:text-white underline'));
      footer.append(links);
      card.append(footer);
      grid.append(card);
    }
  }

  function renderArchetypes() {
    const filters = document.getElementById('archetype-filters');
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
        renderProjects();
      });
      filters.append(button);
    }
  }

  async function loadCatalog() {
    const status = document.getElementById('catalog-status');
    try {
      const response = await fetch('./catalog.json', { cache: 'no-cache' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      catalog = await response.json();
      if (catalog.schema_version !== 1 || !Array.isArray(catalog.projects)) throw new Error('Unsupported catalog');
      status.textContent = `${catalog.counts.total} projects / ${catalog.counts.curated} curated / ${catalog.counts.pending_review} pending review`;
      const scan = document.getElementById('scan-status');
      scan.replaceChildren();
      if (catalog.last_scan) {
        scan.append(link(`Last completed scan: ${dateText(catalog.last_scan.completed_at)}`, catalog.last_scan.run_url, 'underline hover:text-white'));
      } else {
        scan.textContent = 'Scan timestamps will be recorded from the next Radar run.';
      }
      document.getElementById('content-status').textContent = `Latest content activity: ${dateText(catalog.latest_update)}`;
      renderArchetypes();
      renderProjects();
    } catch (error) {
      status.textContent = 'The project catalog could not be loaded. Reload the page or browse the repository on GitHub.';
      document.getElementById('repo-grid').replaceChildren();
      console.error('Gallery load failed:', error);
    }
  }

  root.filterRepos = renderProjects;
  loadCatalog();
})(typeof window === 'undefined' ? globalThis : window);
