import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const __dirname        = path.dirname(fileURLToPath(import.meta.url));
// Tất cả file config đều trong .mcp/
const configPath       = path.join(__dirname, '.antigravity');
// .cursorrules vẫn phải ở root project (IDE yêu cầu)
const projectRoot      = path.resolve(__dirname, '..');

// ============================================================
// ĐỌC CONFIG .antigravity
// ============================================================
function getConfig() {
  if (!fs.existsSync(configPath)) return null;
  return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
}

// ============================================================
// FETCH GRAPH DATA TỪ HOST (live, không cache)
// Hỗ trợ project_id động để so sánh đa dự án
// ============================================================
async function fetchGraphFromHost(projectId) {
  const cfg = getConfig();
  if (!cfg) throw new Error('Chưa cấu hình .antigravity');

  const pid = projectId || cfg.project_id || 'latest';
  const url = `${cfg.api_url}?id=${pid}&token=${cfg.token || 'antigravity_secret_2026'}&user_id=${cfg.user_id || ''}`;

  const res  = await fetch(url);
  const data = await res.json();

  if (data.status !== 'success') {
    throw new Error(`API lỗi cho project #${pid}: ${data.message}`);
  }

  return {
    projectId:   data.project_id ?? pid,
    projectName: data.project_name,
    nodes:       data.nodes  || [],
    edges:       data.edges  || [],
    mdRules:     data.markdown_rules || '',
  };
}

// ============================================================
// MCP SERVER
// ============================================================
const server = new Server(
  { name: "Antigravity-Central-Engine", version: "2.0.0" },
  { capabilities: { tools: {} } }
);

// ============================================================
// TOOL DEFINITIONS
// ============================================================
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "search_symbol",
      description: "Tìm kiếm hàm, class hoặc tính năng trong dự án. Có thể chỉ định project_id để tìm trong dự án khác trên host.",
      inputSchema: {
        type: "object",
        properties: {
          keyword:    { type: "string", description: "Tên hàm hoặc từ khóa cần tìm" },
          project_id: { type: "string", description: "ID dự án cần tìm (mặc định: dự án hiện tại)" }
        },
        required: ["keyword"]
      }
    },
    {
      name: "get_context",
      description: "Xem 360° của một hàm/file: nó nằm ở đâu, ai gọi nó, nó gọi ai.",
      inputSchema: {
        type: "object",
        properties: {
          node_id:    { type: "string", description: "ID của node cần xem" },
          project_id: { type: "string", description: "ID dự án (mặc định: dự án hiện tại)" }
        },
        required: ["node_id"]
      }
    },
    {
      name: "analyze_impact",
      description: "BẮT BUỘC dùng trước khi sửa code. Đánh giá Blast Radius — sửa hàm này thì hỏng ở đâu.",
      inputSchema: {
        type: "object",
        properties: {
          node_id:    { type: "string", description: "ID của node cần phân tích" },
          project_id: { type: "string", description: "ID dự án (mặc định: dự án hiện tại)" }
        },
        required: ["node_id"]
      }
    },
    {
      name: "compare_projects",
      description: "So sánh 2 dự án trên host. Tìm Controllers/Endpoints/Methods mà dự án B có nhưng dự án A chưa có.",
      inputSchema: {
        type: "object",
        properties: {
          project_a:  { type: "string", description: "ID dự án A (mặc định: dự án hiện tại)" },
          project_b:  { type: "string", description: "ID dự án B (dự án tham chiếu)" },
          filter_type:{ type: "string", description: "Lọc theo loại: all | apiendpoint | class | method (mặc định: all)" }
        },
        required: ["project_b"]
      }
    },
    {
      name: "list_projects",
      description: "Liệt kê tất cả dự án có sẵn trên host mà người dùng này có quyền truy cập.",
      inputSchema: { type: "object", properties: {} }
    }
  ]
}));

// ============================================================
// TOOL HANDLERS
// ============================================================
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    // ── search_symbol ──────────────────────────────────────
    if (name === "search_symbol") {
      const { nodes, projectName, projectId } = await fetchGraphFromHost(args.project_id);
      const kw = (args.keyword || '').toLowerCase();
      const matches = nodes.filter(n =>
        (n.label || '').toLowerCase().includes(kw) ||
        (n.id    || '').toLowerCase().includes(kw)
      );
      if (!matches.length) return text(`Không tìm thấy '${args.keyword}' trong ${nodes.length} nodes của dự án ${projectName} (#${projectId}).`);

      let res = `🔍 KẾT QUẢ: '${args.keyword}' trong ${projectName} (#${projectId})\n\n`;
      matches.slice(0, 15).forEach(n => {
        res += `[${(n.type||'?').toUpperCase()}] ${n.id}\n  @ ${n.file} dòng ${n.line || '?'}\n\n`;
      });
      if (matches.length > 15) res += `... và ${matches.length - 15} kết quả nữa.\n`;
      return text(res);
    }

    // ── get_context ────────────────────────────────────────
    if (name === "get_context") {
      const { nodes, edges, projectName, projectId } = await fetchGraphFromHost(args.project_id);
      const targetId = args.node_id;
      const node = nodes.find(n => n.id === targetId || (n.id||'').toLowerCase() === targetId.toLowerCase());
      if (!node) return text(`Không tìm thấy node '${targetId}' trong ${projectName} (#${projectId}). Dùng search_symbol để tìm ID chính xác.`);

      const incoming = edges.filter(e => e.target === node.id);
      const outgoing = edges.filter(e => e.source === node.id);

      let res = `🌐 NGỮ CẢNH 360° — [${node.id}] — ${projectName} (#${projectId})\n`;
      res += `Loại: ${(node.type||'?').toUpperCase()} | File: ${node.file} | Dòng: ${node.line || '?'}\n\n`;
      res += `BỊ GỌI BỞI (${incoming.length}):\n`;
      incoming.slice(0, 10).forEach(e => res += `  <- ${e.source} [${e.relation}]\n`);
      if (incoming.length > 10) res += `  ... và ${incoming.length - 10} nơi khác\n`;
      res += `\nGỌI ĐẾN (${outgoing.length}):\n`;
      outgoing.slice(0, 10).forEach(e => res += `  -> ${e.target} [${e.relation}]\n`);
      if (outgoing.length > 10) res += `  ... và ${outgoing.length - 10} nơi khác\n`;
      return text(res);
    }

    // ── analyze_impact ─────────────────────────────────────
    if (name === "analyze_impact") {
      const { nodes, edges, projectName, projectId } = await fetchGraphFromHost(args.project_id);
      const targetId = args.node_id;
      const node = nodes.find(n => n.id === targetId || (n.id||'').toLowerCase() === targetId.toLowerCase());
      const incoming = edges.filter(e => e.target === (node?.id || targetId));
      const outgoing = edges.filter(e => e.source === (node?.id || targetId));

      let res = `💥 BLAST RADIUS — [${targetId}] — ${projectName} (#${projectId})\n\n`;
      if (incoming.length > 0) {
        res += `🔴 d=1 WILL BREAK — ${incoming.length} nơi gọi trực tiếp:\n`;
        incoming.forEach(e => res += `  ⚠️  ${e.source} [${e.relation}]\n`);
        res += `\n→ BẮT BUỘC cập nhật ${incoming.length} file trên nếu sửa ${targetId}.\n`;
      } else {
        res += `🟢 SAFE — Không có nơi nào gọi trực tiếp (d=1).\n`;
      }
      if (outgoing.length > 0) {
        res += `\n🟡 d=2 LIKELY AFFECTED — ${outgoing.length} hàm được gọi bởi ${targetId}:\n`;
        outgoing.slice(0, 10).forEach(e => res += `  -> ${e.target} [${e.relation}]\n`);
      }
      return text(res);
    }

    // ── compare_projects ───────────────────────────────────
    if (name === "compare_projects") {
      const cfg = getConfig();
      const pidA = args.project_a || cfg?.project_id || 'latest';
      const pidB = args.project_b;
      const filterType = args.filter_type || 'all';

      const [dataA, dataB] = await Promise.all([
        fetchGraphFromHost(pidA),
        fetchGraphFromHost(pidB)
      ]);

      const idsA = new Set(dataA.nodes.map(n => n.id));

      let nodesOnlyInB = dataB.nodes.filter(n => !idsA.has(n.id));
      if (filterType !== 'all') {
        nodesOnlyInB = nodesOnlyInB.filter(n => n.type === filterType);
      }

      const grouped = {};
      nodesOnlyInB.forEach(n => {
        const t = n.type || 'other';
        if (!grouped[t]) grouped[t] = [];
        grouped[t].push(n);
      });

      let res = `📊 SO SÁNH DỰ ÁN\n`;
      res += `  A: ${dataA.projectName} (#${dataA.projectId}) — ${dataA.nodes.length} nodes\n`;
      res += `  B: ${dataB.projectName} (#${dataB.projectId}) — ${dataB.nodes.length} nodes\n\n`;
      res += `🔍 B CÓ MÀ A CHƯA CÓ (${nodesOnlyInB.length} symbols):\n\n`;

      for (const [type, items] of Object.entries(grouped)) {
        res += `--- [${type.toUpperCase()}] (${items.length}) ---\n`;
        items.slice(0, 30).forEach(n => {
          res += `  + ${n.id} @ ${path.basename(n.file || '')} dòng ${n.line || '?'}\n`;
        });
        if (items.length > 30) res += `  ... và ${items.length - 30} nữa\n`;
        res += '\n';
      }

      res += `\n💡 GỢI Ý MIGRATE:\n`;
      const ctrlOnly = (grouped['class'] || []).filter(n => (n.id||'').includes('Controller'));
      if (ctrlOnly.length) {
        res += `Controllers cần thêm vào #${dataA.projectId}:\n`;
        ctrlOnly.forEach(n => res += `  → Copy: ${n.file}\n`);
      }

      return text(res);
    }

    // ── list_projects ──────────────────────────────────────
    if (name === "list_projects") {
      const cfg = getConfig();
      if (!cfg) return text('Chưa cấu hình .antigravity');
      // Thử lấy danh sách bằng cách gọi export-api với id=latest
      const data = await fetchGraphFromHost('latest');
      return text(`Dự án mặc định: ${data.projectName} (#${data.projectId})\n\nĐể truy cập dự án khác, dùng project_id trong các tool.\nVí dụ: search_symbol(keyword="translate", project_id="112")`);
    }

    throw new Error(`Tool không tồn tại: ${name}`);

  } catch (e) {
    return text(`❌ Lỗi: ${e.message}`);
  }
});

// Helper
function text(t) {
  return { content: [{ type: "text", text: t }] };
}

const transport = new StdioServerTransport();
await server.connect(transport);