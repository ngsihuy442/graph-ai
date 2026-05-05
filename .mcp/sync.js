import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const args = process.argv.slice(2);
const getArg = (f) => { const i = args.indexOf(f); return i !== -1 ? args[i + 1] : null; };
const extraRefs = getArg('--ref') ? [getArg('--ref')] : [];

const mcpDir = __dirname;
const projectDir = path.resolve(mcpDir, '..');
const configPath = path.join(mcpDir, '.antigravity');

if (!fs.existsSync(configPath)) {
    console.error('Error: Config not found at ' + configPath);
    process.exit(1);
}

// Đọc và loại bỏ BOM nếu có
let configRaw = fs.readFileSync(configPath, 'utf-8');
if (configRaw.charCodeAt(0) === 0xFEFF) {
    configRaw = configRaw.slice(1);
}

const config = JSON.parse(configRaw);
const { api_url, token, user_id } = config;

function fetchProject(projectId) {
    return new Promise((resolve, reject) => {
        const params = new URLSearchParams({ id: projectId, token, user_id: user_id || '' });
        const url = api_url.replace(/\/$/, '') + '?' + params.toString();
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
    const now = new Date().toLocaleString('vi-VN');
    let md = `# Project: ${mainData.project_name} (#${mainData.project_id})\n`;
    md += `Synced: ${now}\n\n`;

    // Chèn bộ luật Kỷ luật thép từ server
    md += mainData.markdown_rules || '';

    // Không cần in hàng nghìn symbols vào đây nữa vì đã có graph.json và tool search_symbol
    md += '\n\n---\n*Dữ liệu chi tiết đã được đồng bộ vào graph.json. Hãy sử dụng Antigravity Tools để truy vấn.*';
    md += '\n\n> **LUẬT QUAN TRỌNG TỪ HỆ THỐNG:**\n';
    md += '> 1. KHÔNG ĐƯỢC PHÉP phân tích, so sánh hoặc gọi API tới các dự án khác (thông qua tham số project_id) nếu chưa được người dùng cho phép rõ ràng.\n';
    md += '> 2. Khi chạy cleanup_code, ƯU TIÊN dùng action="remove" để xóa hẳn code thừa (không sợ lỗi vì luôn có file backup tự động).';
    md += '> 3. Khi dọn dẹp CSS/SCSS (sử dụng analyze_css và cleanup_code), nếu gặp đoạn CSS hoặc file SCSS có comment bắt đầu bằng `/*[CLEANUP ALL]` (hoặc tương tự), bạn được phép xóa sạch đoạn code đó hoặc toàn bộ file đó mà không cần hỏi lại.';
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
        } catch (e) { console.warn(`Warn: #${rid} failed: ${e.message}`); }
    }

    const cursorrules = buildCursorRules(mainData, refDataList);
    fs.writeFileSync(path.join(projectDir, '.cursorrules'), cursorrules, 'utf-8');
    saveGraphData([mainData, ...refDataList]);

    fs.writeFileSync(configPath, JSON.stringify({ ...config, last_sync: new Date().toISOString(), project_name: mainData.project_name }, null, 2));
    console.log('Sync complete.');
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
