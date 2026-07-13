import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const args = process.argv.slice(2);
const hasFlag = (flag) => args.includes(flag);
const getArg = (flag) => {
  const index = args.indexOf(flag);
  return index !== -1 ? args[index + 1] : null;
};

const extraRefs = getArg('--ref') ? [getArg('--ref')] : [];
const syncFullGraph = hasFlag('--full');

const mcpDir = __dirname;
const projectDir = path.resolve(mcpDir, '..');
const configPath = path.join(mcpDir, '.antigravity');
const cacheDir = path.join(mcpDir, 'cache');
const contextCacheDir = path.join(cacheDir, 'context_cache');

fs.mkdirSync(contextCacheDir, { recursive: true });

if (!fs.existsSync(configPath)) {
  console.error('Error: Config not found at ' + configPath);
  process.exit(1);
}

let configRaw = fs.readFileSync(configPath, 'utf-8');
if (configRaw.charCodeAt(0) === 0xFEFF) {
  configRaw = configRaw.slice(1);
}

const config = JSON.parse(configRaw);
const { api_url, token, user_id } = config;

function endpointUrl(endpoint, params = {}) {
  const base = api_url.replace(/\/export-api.*$/, '');
  const url = new URL(`${base}/${endpoint}`);
  url.searchParams.set('token', token);
  url.searchParams.set('user_id', user_id || '');
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, value);
    }
  }
  return url.toString();
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, res => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(raw));
        } catch {
          reject(new Error('Parse error: ' + raw.substring(0, 160)));
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(20000, () => {
      req.destroy();
      reject(new Error('Timeout'));
    });
  });
}

async function fetchEndpoint(endpoint, projectId, params = {}) {
  const url = endpointUrl(endpoint, { id: projectId, ...params });
  console.log(`  -> GET ${endpoint} #${projectId}`);
  const data = await fetchJson(url);
  if (data.status !== 'success') {
    throw new Error(data.message || `${endpoint} failed`);
  }
  return data;
}

function writeJson(fileName, data) {
  fs.writeFileSync(path.join(cacheDir, fileName), JSON.stringify(data, null, 2), 'utf-8');
}

function buildCursorRules(manifest) {
  const now = new Date().toLocaleString('vi-VN');
  const budget = manifest.budgets || {};
  return [
    `# Project: ${manifest.project_name} (#${manifest.project_id})`,
    `Synced: ${now}`,
    '',
    'Antigravity retrieval mode: AI-thin / MCP-heavy / Host-heavy.',
    `Graph hash: ${manifest.graph_hash}`,
    `Budget: context=${budget.max_context_tokens || 3000}, source_lines=${budget.max_source_lines || 160}, symbols=${budget.max_symbols || 30}.`,
    '',
    'Use MCP tools for retrieval instead of reading full graph/source by default:',
    '- search_symbol',
    '- search_full_text',
    '- get_context',
    '- analyze_impact',
    '- compare_projects',
    '- get_symbol_source',
    '',
  ].join('\n');
}

function saveGraphData(allData) {
  const graphPath = path.join(mcpDir, 'graph.json');
  const payload = {
    synced_at: new Date().toISOString(),
    mode: 'full-debug-cache',
    projects: allData.map(d => ({
      id: d.project_id,
      name: d.project_name,
      nodes: d.nodes || [],
      edges: d.edges || [],
    })),
  };
  fs.writeFileSync(graphPath, JSON.stringify(payload, null, 2), 'utf-8');
  console.log('OK: graph.json saved (--full)');
}

async function fetchFullProject(projectId) {
  const url = `${api_url.replace(/\/$/, '')}?` + new URLSearchParams({
    id: projectId,
    token,
    user_id: user_id || '',
    mode: 'full',
  }).toString();
  console.log(`  -> GET export-api full #${projectId}`);
  const data = await fetchJson(url);
  if (data.status !== 'success') throw new Error(data.message || 'full export failed');
  return data;
}

async function syncProject(projectId) {
  const manifest = await fetchEndpoint('manifest', projectId);
  const fileMap = await fetchEndpoint('file-map', projectId, { limit: 500 });
  const symbolIndex = await fetchEndpoint('search-symbol', projectId, { keyword: '', limit: 30 });
  return { manifest, fileMap, symbolIndex };
}

async function main() {
  const mainId = config.project_id || 'latest';
  const main = await syncProject(mainId);

  writeJson('manifest.json', main.manifest);
  writeJson('file_map.json', main.fileMap);
  writeJson('symbol_index.json', main.symbolIndex);
  writeJson('prompt_budget.json', main.manifest.budgets || {
    max_context_tokens: 3000,
    max_source_lines: 160,
    max_symbols: 30,
    max_neighbors_per_node: 10,
  });

  const refIds = [...(config.reference_projects || []), ...extraRefs];
  const refs = [];
  for (const refId of refIds) {
    try {
      refs.push({ id: refId, ...(await syncProject(refId)) });
    } catch (e) {
      console.warn(`Warn: #${refId} failed: ${e.message}`);
    }
  }
  if (refs.length) {
    writeJson('references.json', refs);
  }

  fs.writeFileSync(path.join(projectDir, '.cursorrules'), buildCursorRules(main.manifest), 'utf-8');

  if (syncFullGraph) {
    const fullProjects = [await fetchFullProject(mainId)];
    for (const refId of refIds) {
      try {
        fullProjects.push(await fetchFullProject(refId));
      } catch (e) {
        console.warn(`Warn full #${refId}: ${e.message}`);
      }
    }
    saveGraphData(fullProjects);
  } else {
    console.log('Skipped graph.json. Use --full only for debug/full-cache.');
  }

  fs.writeFileSync(configPath, JSON.stringify({
    ...config,
    last_sync: new Date().toISOString(),
    project_name: main.manifest.project_name,
    graph_hash: main.manifest.graph_hash,
  }, null, 2));

  console.log('Sync complete.');
}

main().catch(error => {
  console.error('Fatal:', error.message);
  process.exit(1);
});
