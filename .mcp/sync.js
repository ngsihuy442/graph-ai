#!/usr/bin/env node
/**
 * Antigravity Skill Sync — Enhanced
 * Kéo data từ host về local để Local AI (Antigravity/Cursor) đọc trực tiếp.
 * 
 * Output:
 *   .cursorrules          → Skill + cấu trúc đầy đủ (IDE đọc tự động)
 *   .antigravity-graph.json → Graph data đầy đủ (MCP tools đọc offline)
 *
 * Chạy: node antigravity-sync.js
 * Chạy với tham chiếu: node antigravity-sync.js --ref 102
 */

const fs    = require('fs');
const path  = require('path');
const https = require('https');
const http  = require('http');

const args      = process.argv.slice(2);
const getArg    = (f) => { const i = args.indexOf(f); return i !== -1 ? args[i+1] : null; };
const extraRefs = getArg('--ref') ? [getArg('--ref')] : [];

// .mcp/sync.js — tất cả config trong .mcp/, output ra project root
const mcpDir     = __dirname;                        // d:\...\project\.mcp
const projectDir = path.resolve(mcpDir, '..');       // d:\...\project\
const configPath = path.join(mcpDir, '.antigravity'); // .mcp\.antigravity

const config     = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
const { api_url, token, user_id } = config;

// ============================================================
// FETCH PROJECT DATA
// ============================================================
function fetchProject(projectId) {
    return new Promise((resolve, reject) => {
        const params = new URLSearchParams({ id: projectId, token, user_id: user_id || '' });
        const url    = api_url.replace(/\/$/, '') + '?' + params.toString();
        console.log(`  → GET ${api_url}?id=${projectId}`);
        const client = url.startsWith('https') ? https : http;
        const req = client.get(url, res => {
            let raw = '';
            res.on('data', c => raw += c);
            res.on('end', () => {
                try   { resolve(JSON.parse(raw)); }
                catch { reject(new Error('Parse lỗi: ' + raw.substring(0, 200))); }
            });
        });
        req.on('error', reject);
        req.setTimeout(20000, () => { req.destroy(); reject(new Error('Timeout')); });
    });
}

// ============================================================
// BUILD .cursorrules — Đầy đủ để Local AI đọc hiểu dự án
// ============================================================
function buildCursorRules(mainData, refDataList) {
    const now   = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
    const nodes = mainData.nodes || [];
    const edges = mainData.edges || [];
    let md = '';

    // --- HEADER ---
    md += `<!-- Auto-synced từ Antigravity Server | ${now} -->\n\n`;
    md += `# 🎯 DỰ ÁN: ${mainData.project_name} (ID #${mainData.project_id})\n`;
    md += `> **${nodes.length} Nodes** | **${edges.length} Edges** | Synced: ${now}\n\n`;

    // --- SKILL / MARKDOWN RULES ---
    md += mainData.markdown_rules || '';
    md += '\n\n---\n\n';

    // --- DANH SÁCH TOÀN BỘ SYMBOLS (để AI tra cứu) ---
    md += '## 🗂 INDEX SYMBOLS THỰC TẾ\n\n';
    md += '> Local AI dùng danh sách này để trả lời chính xác, không bịa\n\n';

    const grouped = { apiendpoint: [], class: [], method: [], function: [], trait: [], other: [] };
    for (const n of nodes) {
        const t = n.type || 'other';
        (grouped[t] || grouped.other).push(n);
    }

    if (grouped.apiendpoint.length) {
        md += `### [A] API Endpoints (${grouped.apiendpoint.length})\n`;
        grouped.apiendpoint.slice(0, 80).forEach(n => {
            md += `- \`${n.id || ''}\` @ \`${path.basename(n.file || '')}\` dòng ${n.line || '?'}\n`;
        });
        md += '\n';
    }
    if (grouped.class.length) {
        md += `### [C] Classes / Controllers / Models (${grouped.class.length})\n`;
        grouped.class.slice(0, 80).forEach(n => {
            md += `- \`${n.id || ''}\` @ \`${path.basename(n.file || '')}\`\n`;
        });
        md += '\n';
    }
    if (grouped.method.length) {
        md += `### [M] Methods (${Math.min(grouped.method.length, 120)} / ${grouped.method.length})\n`;
        grouped.method.slice(0, 120).forEach(n => {
            md += `- \`${n.id || ''}\` @ \`${path.basename(n.file || '')}\` dòng ${n.line || '?'}\n`;
        });
        md += '\n';
    }

    // --- KEY RELATIONSHIPS (Edges quan trọng) ---
    if (edges.length) {
        const importantEdges = edges
            .filter(e => ['CALLS', 'EXTENDS', 'IMPLEMENTS', 'HAS_METHOD'].includes(e.relation))
            .slice(0, 200);
        md += `### [→] Quan hệ Logic (${importantEdges.length} mẫu)\n`;
        importantEdges.forEach(e => {
            md += `- \`${e.source || '?'}\` → \`${e.target || '?'}\` \`[${e.relation || ''}]\`\n`;
        });
        md += '\n';
    }

    // --- DỰ ÁN THAM CHIẾU ---
    if (refDataList.length > 0) {
        md += '---\n\n';
        md += '# 📚 DỰ ÁN THAM CHIẾU\n\n';
        md += '> **Hướng dẫn cho Local AI:** Khi user hỏi về migrate tính năng:\n';
        md += '> 1. Xác định class/method trong dự án THAM CHIẾU bên dưới\n';
        md += '> 2. So sánh với dự án CHÍNH phía trên — cái gì đang thiếu?\n';
        md += '> 3. Đề xuất cụ thể: copy file nào, thêm config ở đâu, sửa hàm nào\n\n';

        for (const ref of refDataList) {
            const rNodes = ref.nodes || [];
            const rEdges = ref.edges || [];
            md += `---\n\n## 🔗 ${ref.project_name} (ID #${ref.project_id}) — ${rNodes.length} Nodes\n\n`;

            const rEndpoints   = rNodes.filter(n => n.type === 'apiendpoint');
            const rControllers = rNodes.filter(n => n.type === 'class' && (n.id||'').includes('Controller'));
            const rMethods     = rNodes.filter(n => n.type === 'method');

            if (rControllers.length) {
                md += `**Controllers:**\n`;
                rControllers.slice(0, 30).forEach(n => md += `- \`${n.id}\` @ \`${path.basename(n.file||'')}\`\n`);
                md += '\n';
            }
            if (rEndpoints.length) {
                md += `**API Endpoints:**\n`;
                rEndpoints.slice(0, 50).forEach(n => md += `- \`${n.id}\` dòng ${n.line||'?'}\n`);
                md += '\n';
            }
            if (rMethods.length) {
                md += `**Methods (${Math.min(80, rMethods.length)} / ${rMethods.length}):**\n`;
                rMethods.slice(0, 80).forEach(n => md += `- \`${n.id}\` @ \`${path.basename(n.file||'')}\`\n`);
                md += '\n';
            }

            const rKeyEdges = rEdges.filter(e => ['CALLS','EXTENDS','HAS_METHOD'].includes(e.relation)).slice(0, 100);
            if (rKeyEdges.length) {
                md += `**Quan hệ Logic:**\n`;
                rKeyEdges.forEach(e => md += `- \`${e.source}\` → \`${e.target}\` [${e.relation}]\n`);
                md += '\n';
            }
        }
    }

    return md;
}

// ============================================================
// SAVE GRAPH DATA (cho MCP tools đọc offline)
// ============================================================
function saveGraphData(allData) {
    // Lưu vào .mcp/graph.json
    const graphPath = path.join(mcpDir, 'graph.json');
    const payload = {
        synced_at: new Date().toISOString(),
        projects: allData.map(d => ({
            id:    d.project_id,
            name:  d.project_name,
            nodes: d.nodes || [],
            edges: d.edges || [],
        }))
    };
    fs.writeFileSync(graphPath, JSON.stringify(payload, null, 2), 'utf-8');
    const sizeKB = Math.round(fs.statSync(graphPath).size / 1024);
    console.log(`✅ .mcp/graph.json (${sizeKB} KB) — graph data offline`);
}

// ============================================================
// MAIN
// ============================================================
async function main() {
    console.log('\n=== Antigravity Skill Sync ===\n');

    // 1. Fetch dự án chính
    const mainId = config.project_id || 'latest';
    console.log(`[1] Dự án chính: #${mainId}`);
    const mainData = await fetchProject(mainId);
    if (mainData.status !== 'success') { console.error('[ERROR]', mainData.message); process.exit(1); }
    mainData.nodes_count = (mainData.nodes || []).length;
    mainData.edges_count = (mainData.edges || []).length;
    mainData.project_id  = mainData.project_id ?? mainId;
    console.log(`   ✓ ${mainData.project_name} — ${mainData.nodes_count} nodes | ${mainData.edges_count} edges`);

    // 2. Fetch dự án tham chiếu
    const refIds = [...(config.reference_projects || []), ...extraRefs];
    const refDataList = [];
    if (refIds.length) {
        console.log(`\n[2] Dự án tham chiếu: ${refIds.join(', ')}`);
        for (const rid of refIds) {
            try {
                const rd = await fetchProject(rid);
                if (rd.status === 'success') {
                    rd.nodes_count = (rd.nodes || []).length;
                    rd.project_id  = rd.project_id ?? rid;
                    refDataList.push(rd);
                    console.log(`   ✓ #${rid} ${rd.project_name} — ${rd.nodes_count} nodes`);
                } else { console.warn(`   ✗ #${rid}: ${rd.message}`); }
            } catch(e) { console.warn(`   ✗ #${rid}: ${e.message}`); }
        }
    } else {
        console.log(`[2] Không có dự án tham chiếu (dùng --ref ID để thêm)`);
    }

    // 3. Tạo .cursorrules
    console.log(`\n[3] Tạo .cursorrules...`);
    const cursorrules = buildCursorRules(mainData, refDataList);
    // Ghi .cursorrules ra project root (IDE cần ở đây)
    const cursorrulesPath = path.join(projectDir, '.cursorrules');
    fs.writeFileSync(cursorrulesPath, cursorrules, 'utf-8');
    const rulesKB = Math.round(Buffer.byteLength(cursorrules, 'utf-8') / 1024);
    console.log(`✅ .cursorrules (${rulesKB} KB) — IDE local AI đọc tự động`);

    // 4. Lưu graph JSON
    console.log(`\n[4] Lưu graph data...`);
    saveGraphData([mainData, ...refDataList]);

    // Cập nhật .mcp/.antigravity với thống kê mới nhất
    fs.writeFileSync(configPath, JSON.stringify({
        ...config,
        last_sync:    new Date().toISOString(),
        project_name: mainData.project_name,
        nodes_count:  mainData.nodes_count,
        edges_count:  mainData.edges_count,
    }, null, 2));
    console.log(`✅ .mcp/.antigravity cập nhật thống kê`);

    console.log('\n=== Hoàn tất! ===');
    console.log(`   Local AI đã có đầy đủ dữ liệu của dự án "${mainData.project_name}"`);
    console.log(`   Restart IDE để reload .cursorrules mới nhất.\n`);
}

main().catch(e => { console.error('[FATAL]', e.message); process.exit(1); });
