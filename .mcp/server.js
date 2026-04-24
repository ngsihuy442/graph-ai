import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const __dirname        = path.dirname(fileURLToPath(import.meta.url));
const configPath       = path.join(__dirname, '.antigravity');
const projectRoot      = path.resolve(__dirname, '..');

function getConfig() {
  if (!fs.existsSync(configPath)) return null;
  return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
}

async function fetchGraphFromHost(projectId) {
  const cfg = getConfig();
  if (!cfg) throw new Error('Chua cau hinh .antigravity');

  const pid = projectId || cfg.project_id || 'latest';
  const url = `${cfg.api_url}?id=${pid}&token=${cfg.token || 'antigravity_secret_2026'}&user_id=${cfg.user_id || ''}`;

  const res  = await fetch(url);
  const data = await res.json();

  if (data.status !== 'success') {
    throw new Error(`API loi cho project #${pid}: ${data.message}`);
  }

  return {
    projectId:   data.project_id ?? pid,
    projectName: data.project_name,
    nodes:       data.nodes  || [],
    edges:       data.edges  || [],
    mdRules:     data.markdown_rules || '',
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
          keyword:    { type: "string" },
          project_id: { type: "string" }
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
          node_id:    { type: "string" },
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
          node_id:    { type: "string" },
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
          project_a:  { type: "string" },
          project_b:  { type: "string" },
          filter_type:{ type: "string" }
        },
        required: ["project_b"]
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
      let res = `Ket qua cho '${args.keyword}' (#${projectId}):\n\n`;
      matches.slice(0, 15).forEach(n => { res += `[${(n.type||'?').toUpperCase()}] ${n.id} @ ${n.file}\n`; });
      return text(res);
    }
    if (name === "get_context") {
      const { nodes, edges, projectName, projectId } = await fetchGraphFromHost(args.project_id);
      const node = nodes.find(n => n.id === args.node_id);
      if (!node) return text(`Khong thay node ${args.node_id}`);
      const incoming = edges.filter(e => e.target === node.id);
      const outgoing = edges.filter(e => e.source === node.id);
      let res = `Context [${node.id}] in ${projectName}:\n`;
      res += `In (${incoming.length}): ` + incoming.slice(0,5).map(e=>e.source).join(', ') + '\n';
      res += `Out (${outgoing.length}): ` + outgoing.slice(0,5).map(e=>e.target).join(', ') + '\n';
      return text(res);
    }
    if (name === "analyze_impact") {
      const { edges, projectName } = await fetchGraphFromHost(args.project_id);
      const incoming = edges.filter(e => e.target === args.node_id);
      let res = `Impact [${args.node_id}] in ${projectName}:\n`;
      if (incoming.length) {
        res += `RED: Will break ${incoming.length} places:\n` + incoming.map(e=>`- ${e.source}`).join('\n');
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
    throw new Error(`Tool not found: ${name}`);
  } catch (e) { return text(`Error: ${e.message}`); }
});

function text(t) { return { content: [{ type: "text", text: t }] }; }
const transport = new StdioServerTransport();
await server.connect(transport);
