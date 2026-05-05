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

    md += '\n\n> **QUY TRÌNH BẮT BUỘC KHI SỬA GIAO DIỆN (UI Workflow):**\n';
    md += '> Khi có yêu cầu sửa đổi giao diện (header, footer, layout, component...), PHẢI thực hiện đúng thứ tự:\n';
    md += '>\n';
    md += '> **Bước 1 — Tra cứu class bằng MCP (BẮT BUỘC, không được bỏ qua):**\n';
    md += '> - Gọi `search_symbol(keyword="tên-class")` để xác định class UI đang nằm ở file PHP/HTML nào.\n';
    md += '> - Gọi `get_symbol_source(node_id="UI_CLASS::tên-class")` để lấy đoạn HTML thực tế từ host.\n';
    md += '> - KHÔNG được tự đọc file PHP thủ công bằng `view_file` mà không gọi MCP trước.\n';
    md += '>\n';
    md += '> **Bước 2 — Kiểm tra Blast Radius trước khi sửa SCSS (BẮT BUỘC):**\n';
    md += '> - Gọi `analyze_impact(node_id="UI_CLASS::tên-class")` để đánh giá tác động.\n';
    md += '> - Chỉ được sửa SCSS sau khi xác nhận class đó không gây vỡ layout ở trang/component khác.\n';
    md += '>\n';
    md += '> **Bước 3 — Tìm kiếm bằng MCP Full-text Search (BẮT BUỘC, không dùng grep/run_command):**\n';
    md += '> - Gọi `search_full_text(keyword="tên-class", file_extension=".scss")` để tìm selector SCSS.\n';
    md += '> - Gọi `search_full_text(keyword="tên-class", file_extension=".php")` để xác minh phạm vi sử dụng.\n';
    md += '> - TUYỆT ĐỐI KHÔNG dùng `grep` hoặc `run_command` để tìm kiếm — Windows không hỗ trợ và đã có MCP tool thay thế.\n';
    md += '>\n';
    md += '> **Bước 4 — Thực hiện thay đổi:**\n';
    md += '> - Sửa file PHP/HTML (main.php, index.php...) theo cấu trúc đã lấy từ `get_symbol_source`.\n';
    md += '> - Sửa file SCSS (style.scss...) theo đúng selector đã tìm được từ `search_full_text`.\n';
    md += '>\n';
    md += '> **❌ Các hành vi bị cấm khi sửa giao diện:**\n';
    md += '> - Dùng `grep` / `run_command` để tìm class CSS → Dùng `search_full_text` thay thế.\n';
    md += '> - Đọc file SCSS tuần tự bằng `view_file` để tìm selector → Dùng `search_full_text` thay thế.\n';
    md += '> - Sửa SCSS mà không kiểm tra Blast Radius → Nguy cơ vỡ layout toàn site.\n';
    md += '> - Tự đoán cấu trúc HTML mà không gọi `get_symbol_source` → Sai vì Yii2 render động.';

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
