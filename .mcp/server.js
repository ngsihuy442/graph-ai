import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const configPath = path.join(__dirname, '.antigravity');

function getConfig() {
  if (!fs.existsSync(configPath)) return null;
  let raw = fs.readFileSync(configPath, 'utf-8');
  if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1);
  return JSON.parse(raw);
}

// Hàm hỗ trợ quét tất cả các file trong thư mục (bỏ qua các thư mục rác)
function walkSync(dir, filelist = []) {
  const ignoreFolders = ['.git', '.mcp', 'node_modules', 'vendor', 'assets', 'images', 'logs'];
  if (!fs.existsSync(dir)) return filelist;

  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filepath = path.join(dir, file);
    const stat = fs.statSync(filepath);
    if (stat.isDirectory()) {
      if (!ignoreFolders.includes(file)) {
        filelist = walkSync(filepath, filelist);
      }
    } else {
      filelist.push(filepath);
    }
  }
  return filelist;
}

async function fetchGraphFromHost(projectId) {
  const graphPath = path.join(__dirname, 'graph.json');

  // Ưu tiên đọc từ file cục bộ để tốc độ nhanh nhất
  if (fs.existsSync(graphPath)) {
    try {
      const allData = JSON.parse(fs.readFileSync(graphPath, 'utf-8'));
      const pid = projectId || getConfig()?.project_id;

      // Tìm dự án trong file projects
      const project = allData.projects.find(p => p.id == pid || p.name == projectId);
      if (project) {
        return {
          projectId: project.id,
          projectName: project.name,
          nodes: project.nodes,
          edges: project.edges,
          mdRules: "" // Rules đã nằm trong .cursorrules
        };
      }
    } catch (e) {
      console.error("Lỗi đọc graph.json, chuyển sang gọi API...");
    }
  }

  // Fallback: Gọi API nếu không có file graph.json (Giữ nguyên logic cũ của bạn)
  const cfg = getConfig();
  const pid = projectId || cfg.project_id || 'latest';
  const url = `${cfg.api_url}?id=${pid}&token=${cfg.token}&user_id=${cfg.user_id || ''}`;
  const res = await fetch(url);
  const data = await res.json();
  return {
    projectId: data.project_id,
    projectName: data.project_name,
    nodes: data.nodes || [],
    edges: data.edges || [],
    mdRules: data.markdown_rules || '',
  };
}

const server = new Server(
  { name: "Antigravity-Central-Engine", version: "2.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "search_symbol",
      description: "Tim kiem ham, class hoac tinh nang. Co the dung project_id de tim trong du an khac.",
      inputSchema: {
        type: "object",
        properties: {
          keyword: { type: "string" },
          project_id: { type: "string" }
        },
        required: ["keyword"]
      }
    },
    {
      name: "search_full_text",
      description: "Tim kiem toan van ban (full-text search) truc tiep trong ruot cac file cua du an. Quet tung dong code chu khong chi tim ten ham.",
      inputSchema: {
        type: "object",
        properties: {
          keyword: { type: "string" },
          file_extension: { type: "string", description: "Vi du: .php, .xml, .js (khong bat buoc)" }
        },
        required: ["keyword"]
      }
    },
    {
      name: "get_context",
      description: "Xem 360 do cua ham/file.",
      inputSchema: {
        type: "object",
        properties: {
          node_id: { type: "string" },
          project_id: { type: "string" }
        },
        required: ["node_id"]
      }
    },
    {
      name: "analyze_impact",
      description: "Danh gia Blast Radius truoc khi sua code.",
      inputSchema: {
        type: "object",
        properties: {
          node_id: { type: "string" },
          project_id: { type: "string" }
        },
        required: ["node_id"]
      }
    },
    {
      name: "compare_projects",
      description: "So sanh 2 du an. Tim tinh nang B co ma A chua co.",
      inputSchema: {
        type: "object",
        properties: {
          project_a: { type: "string" },
          project_b: { type: "string" },
          filter_type: { type: "string" }
        },
        required: ["project_b"]
      }
    },
    {
      name: "get_symbol_source",
      description: "Lay ma nguon thuc te cua mot ham/class.",
      inputSchema: {
        type: "object",
        properties: {
          node_id: { type: "string" },
          project_id: { type: "string" }
        },
        required: ["node_id"]
      }
    },
    {
      name: "analyze_css",
      description: "Phan tich AST de tim Dead CSS/SCSS va Duplicate Code tren Host.",
      inputSchema: {
        type: "object",
        properties: {
          file_path: { type: "string", description: "BAT BUOC la duong dan TUONG DOI tu goc du an (vd: bundle/css/style.scss). KHONG truyen duong dan tuyet doi vi API tren host khong hieu!" },
          project_id: { type: "string", description: "TÙY CHỌN: ID dự án. KHÔNG TRUYỀN (bỏ qua tham số này) để tự động dùng dự án hiện tại." }
        },
        required: ["file_path"]
      }
    },
    {
      name: "cleanup_code",
      description: "Don dep ma nguon (Dead code hoac Duplicate) bang cach comment hoac xoa truc tiep file. Ho tro ca CSS, SCSS, va JS.",
      inputSchema: {
        type: "object",
        properties: {
          action: { type: "string", description: "Hanh dong: 'comment' hoac 'remove' (KHUYẾN KHÍCH DÙNG 'remove' để xóa hẳn cho sạch, vì hệ thống luôn tự động tạo file backup an toàn trước khi chạy)." },
          target: { type: "string", description: "Muc tieu: 'dead', 'duplicate', hoac 'all'" },
          file_path: { type: "string", description: "BAT BUOC la duong dan TUYET DOI toi file can don dep tren local (vd: d:\\laragon\\www\\pacific\\bundle\\css\\style.scss)" },
          json_report_path: { type: "string", description: "Duong dan tuyet doi toi file report JSON tu analyze_css (Khong bat buoc, mac dinh la css_report.json)" }
        },
        required: ["action", "target", "file_path"]
      }
    }
  ]
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  try {
    if (name === "search_symbol") {
      const { nodes, projectName, projectId } = await fetchGraphFromHost(args.project_id);
      const kw = (args.keyword || '').toLowerCase();
      const matches = nodes.filter(n => (n.label || '').toLowerCase().includes(kw) || (n.id || '').toLowerCase().includes(kw));
      if (!matches.length) return text(`Khong tim thay '${args.keyword}' trong ${projectName}.`);
      let res = `Ket qua cho '${args.keyword}' (#${projectId}) - Tim thay ${matches.length} muc:\n\n`;
      const limit = 50;
      matches.slice(0, limit).forEach(n => { res += `[${(n.type || '?').toUpperCase()}] ${n.id} @ ${n.file}\n`; });
      if (matches.length > limit) {
        res += `\n... (Van con ${matches.length - limit} ket qua khac duoc an bot. Hay thu hep tu khoa).`;
      }
      return text(res);
    }

    if (name === "search_full_text") {
      const keyword = args.keyword.toLowerCase();
      const extFilter = args.file_extension ? args.file_extension.toLowerCase() : null;
      const projectRoot = path.join(__dirname, '..'); // Lùi 1 cấp từ thư mục .mcp ra root dự án

      let res = `Ket qua full-text cho tu khoa '${args.keyword}':\n\n`;
      let matchCount = 0;
      const maxResults = 50; // Giới hạn 50 dòng để AI không bị ngợp

      const allFiles = walkSync(projectRoot);
      for (const file of allFiles) {
        if (matchCount >= maxResults) break;

        // Bỏ qua file theo đuôi mở rộng (nếu AI có yêu cầu)
        if (extFilter && !file.toLowerCase().endsWith(extFilter)) continue;

        // Bỏ qua các file không phải văn bản
        if (file.match(/\.(png|jpg|jpeg|gif|ico|zip|pdf|exe|dll|ttf|woff)$/i)) continue;

        try {
          const content = fs.readFileSync(file, 'utf-8');
          const lines = content.split('\n');

          for (let i = 0; i < lines.length; i++) {
            if (lines[i].toLowerCase().includes(keyword)) {
              const relativePath = path.relative(projectRoot, file);
              res += `- ${relativePath} (Line ${i + 1}): ${lines[i].trim().substring(0, 150)}\n`;
              matchCount++;
              if (matchCount >= maxResults) {
                res += `\n... (Vuot qua ${maxResults} ket qua. Hay yeu cau them file_extension de loc tot hon).`;
                break;
              }
            }
          }
        } catch (e) {
          // Bỏ qua nếu lỗi đọc file (file mã hóa, quyền truy cập...)
        }
      }

      if (matchCount === 0) return text(`Khong tim thay '${args.keyword}' trong ruot bat ky file nao.`);
      return text(res);
    }

    if (name === "get_context") {
      const { nodes, edges, projectName, projectId } = await fetchGraphFromHost(args.project_id);
      const node = nodes.find(n => n.id === args.node_id);
      if (!node) return text(`Khong thay node ${args.node_id}`);
      const incoming = edges.filter(e => e.target === node.id);
      const outgoing = edges.filter(e => e.source === node.id);
      let res = `Context [${node.id}] in ${projectName}:\n`;
      res += `In (${incoming.length}): ` + incoming.slice(0, 5).map(e => e.source).join(', ') + '\n';
      res += `Out (${outgoing.length}): ` + outgoing.slice(0, 5).map(e => e.target).join(', ') + '\n';
      return text(res);
    }

    if (name === "analyze_impact") {
      const { edges, projectName } = await fetchGraphFromHost(args.project_id);
      const incoming = edges.filter(e => e.target === args.node_id);
      let res = `Impact [${args.node_id}] in ${projectName}:\n`;
      if (incoming.length) {
        res += `RED: Will break ${incoming.length} places:\n` + incoming.map(e => `- ${e.source}`).join('\n');
      } else { res += `GREEN: Safe to edit.`; }
      return text(res);
    }

    if (name === "compare_projects") {
      const cfg = getConfig();
      const pidA = args.project_a || cfg?.project_id || 'latest';
      const [dataA, dataB] = await Promise.all([fetchGraphFromHost(pidA), fetchGraphFromHost(args.project_b)]);
      const idsA = new Set(dataA.nodes.map(n => n.id));
      let diff = dataB.nodes.filter(n => !idsA.has(n.id));
      if (args.filter_type && args.filter_type !== 'all') diff = diff.filter(n => n.type === args.filter_type);
      let res = `Compare #${pidA} vs #${args.project_b}:\nOnly in B (${diff.length} nodes):\n`;
      diff.slice(0, 20).forEach(n => { res += `+ [${n.type}] ${n.id}\n`; });
      return text(res);
    }

    if (name === "get_symbol_source") {
      const cfg = getConfig();
      const { nodes, projectName, projectId } = await fetchGraphFromHost(args.project_id);
      const node = nodes.find(n => n.id === args.node_id);
      if (!node || !node.file) return text(`Khong tim thay symbol '${args.node_id}' hoac thong tin file.`);

      const baseUrl = cfg.get_code_url || cfg.api_url.replace('/export-api', '/get-code');
      const url = `${baseUrl}?log_id=${projectId}&token=${cfg.token}&file=${encodeURIComponent(node.file)}&line=${node.line || 1}&end_line=${node.endLine || ''}`;

      const response = await fetch(url);
      const data = await response.json();
      if (data.status === "success") {
        return text(`--- SOURCE: ${node.file} (Line ${data.startLine}) ---\n${data.code}\n--- END ---`);
      } else {
        return text(`Loi tu host: ${data.message}`);
      }
    }

    if (name === "analyze_css") {
      const cfg = getConfig();
      const pid = args.project_id || cfg.project_id || 'latest';
      const baseUrl = cfg.api_url.replace('/export-api', '/analyze-optimization');
      const url = `${baseUrl}?log_id=${pid}&token=${cfg.token}&file=${encodeURIComponent(args.file_path)}`;
      try {
        const response = await fetch(url);
        const data = await response.json();
        if (data.status === "success") {
          const reportPath = path.join(__dirname, 'css_report.json');
          fs.writeFileSync(reportPath, JSON.stringify(data, null, 2), 'utf-8');

          let res = `--- KET QUA PHAN TICH CSS AST ---\n`;
          res += `[SUCCESS] JSON report da luu tu dong tai: ${reportPath}\n`;
          res += `(Ban co the goi tool cleanup_code ma khong can truyen json_report_path nua)\n\n`;
          res += `File: ${data.file}\n`;
          res += `Tong so Classes tim thay: ${data.total_classes_found || 0}\n\n`;
          res += `>> DEAD CSS (Ma thua khong duoc dung): ${data.dead_items?.length || 0} muc\n`;
          if (data.dead_items?.length) {
            data.dead_items.slice(0, 50).forEach(i => {
              res += `- [${i.type}] ${i.name} (Line ${i.line}) - Selector: ${i.selector}\n`;
            });
            if (data.dead_items.length > 50) res += `... (Va ${data.dead_items.length - 50} muc khac)\n`;
          }
          res += `\n>> DUPLICATED CSS (Ma lap thuoc tinh): ${data.duplicates?.length || 0} muc\n`;
          if (data.duplicates?.length) {
            data.duplicates.slice(0, 50).forEach(d => {
              res += `- Lap giua Line ${d.lines[0]} va Line ${d.lines[1]}\n`;
              res += `  Selector 1: ${d.selectors[0]}\n`;
              res += `  Selector 2: ${d.selectors[1]}\n`;
            });
          }
          return text(res);
        } else {
          return text(`Loi tu host: ${data.message}\nDebug: ${data.debug || ''}`);
        }
      } catch (e) {
        return text(`Loi ket noi den API Analyzer: ${e.message}`);
      }
    }

    if (name === "cleanup_code") {
      try {
        const { exec } = await import('child_process');
        const scriptPath = path.join(__dirname, '../backend/parsers/cleanup_code.js').replace(/\\/g, '/');
        let reportPath = args.json_report_path || path.join(__dirname, 'css_report.json');
        reportPath = reportPath.replace(/\\/g, '/');
        const cmd = `node "${scriptPath}" "${args.action}" "${args.target}" "${args.file_path}" "${reportPath}"`;
        
        return new Promise((resolve) => {
           exec(cmd, (error, stdout, stderr) => {
               if (error) {
                   resolve(text(`Lỗi khi dọn dẹp mã: ${error.message}\n${stderr}`));
               } else {
                   resolve(text(stdout));
               }
           });
        });
      } catch (e) {
         return text(`Lỗi khi gọi lệnh dọn dẹp: ${e.message}`);
      }
    }

    throw new Error(`Tool not found: ${name}`);
  } catch (e) { return text(`Error: ${e.message}`); }
});

function text(t) { return { content: [{ type: "text", text: t }] }; }
const transport = new StdioServerTransport();
await server.connect(transport);
