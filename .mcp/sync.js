const fs    = require('fs');
const path  = require('path');
const https = require('https');
const http  = require('http');

const args      = process.argv.slice(2);
const getArg    = (f) => { const i = args.indexOf(f); return i !== -1 ? args[i+1] : null; };
const extraRefs = getArg('--ref') ? [getArg('--ref')] : [];

const mcpDir     = __dirname;
const projectDir = path.resolve(mcpDir, '..');
const configPath = path.join(mcpDir, '.antigravity');

if (!fs.existsSync(configPath)) {
    console.error('Error: Config not found at ' + configPath);
    process.exit(1);
}
const config     = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
const { api_url, token, user_id } = config;

function fetchProject(projectId) {
    return new Promise((resolve, reject) => {
        const params = new URLSearchParams({ id: projectId, token, user_id: user_id || '' });
        const url    = api_url.replace(/\/$/, '') + '?' + params.toString();
        console.log(`  -> GET ${projectId}`);
        const client = url.startsWith('https') ? https : http;
        const req = client.get(url, res => {
            let raw = '';
            res.on('data', c => raw += c);
            res.on('end', () => {
                try { resolve(JSON.parse(raw)); }
                catch { reject(new Error('Parse error: ' + raw.substring(0, 100))); }
            });
        });
        req.on('error', reject);
        req.setTimeout(20000, () => { req.destroy(); reject(new Error('Timeout')); });
    });
}

function buildCursorRules(mainData, refDataList) {
    const now   = new Date().toLocaleString('vi-VN');
    const nodes = mainData.nodes || [];
    const edges = mainData.edges || [];
    let md = `# Project: ${mainData.project_name} (#${mainData.project_id})\n`;
    md += `Synced: ${now}\n\n`;
    md += mainData.markdown_rules || '';
    md += '\n\n---\n## SYMBOLS INDEX\n\n';
    nodes.slice(0, 200).forEach(n => {
        md += `- [${n.type}] ${n.id} @ ${path.basename(n.file||'')}\n`;
    });
    return md;
}

function saveGraphData(allData) {
    const graphPath = path.join(mcpDir, 'graph.json');
    const payload = {
        synced_at: new Date().toISOString(),
        projects: allData.map(d => ({ id: d.project_id, name: d.project_name, nodes: d.nodes || [], edges: d.edges || [] }))
    };
    fs.writeFileSync(graphPath, JSON.stringify(payload, null, 2), 'utf-8');
    console.log(`OK: graph.json saved`);
}

async function main() {
    const mainId = config.project_id || 'latest';
    const mainData = await fetchProject(mainId);
    if (mainData.status !== 'success') throw new Error(mainData.message);
    
    const refIds = [...(config.reference_projects || []), ...extraRefs];
    const refDataList = [];
    for (const rid of refIds) {
        try {
            const rd = await fetchProject(rid);
            if (rd.status === 'success') refDataList.push(rd);
        } catch(e) { console.warn(`Warn: #${rid} failed: ${e.message}`); }
    }

    const cursorrules = buildCursorRules(mainData, refDataList);
    fs.writeFileSync(path.join(projectDir, '.cursorrules'), cursorrules, 'utf-8');
    saveGraphData([mainData, ...refDataList]);

    fs.writeFileSync(configPath, JSON.stringify({ ...config, last_sync: new Date().toISOString(), project_name: mainData.project_name }, null, 2));
    console.log('Sync complete.');
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
