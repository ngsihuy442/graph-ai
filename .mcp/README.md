# 🤖 Antigravity AI Agent — MCP Server

> **Biến IDE của bạn thành AI trợ lý dự án thông minh**, kết nối trực tiếp với dữ liệu phân tích code trên host.

## ✨ Tính năng

| Tool | Chức năng |
|---|---|
| `search_symbol` | Tìm hàm/class/tính năng trong bất kỳ dự án nào |
| `get_context` | Xem 360° — ai gọi hàm này, nó gọi ai |
| `analyze_impact` | Đánh giá Blast Radius trước khi sửa code |
| `compare_projects` | So sánh 2 dự án — tìm tính năng còn thiếu |

---

## 🚀 Cài đặt (1 lệnh)

Mở PowerShell tại **thư mục gốc dự án** của bạn:

```powershell
git clone https://github.com/ngsihuy442/graph-ai.git _ag_tmp; .\_ag_tmp\.mcp\install.ps1; Remove-Item _ag_tmp -Recurse -Force
```

Script sẽ hỏi:
- **User ID**: ID tài khoản của bạn trên hệ thống
- **Project ID**: ID dự án cần phân tích
- **Reference Projects** *(tùy chọn)*: Dự án tham chiếu để so sánh

---

## 🔧 Cấu hình IDE (Cursor / VS Code)

Sau khi cài đặt, thêm vào **MCP settings** của IDE:

```json
{
  "mcpServers": {
    "antigravity": {
      "command": "node",
      "args": [".mcp/server.js"]
    }
  }
}
```

---

## 📅 Cập nhật skill hàng ngày

```powershell
node .mcp/sync.js

# Thêm dự án tham chiếu
node .mcp/sync.js --ref 102
```

---

## 📁 Cấu trúc file

```
project/
├── .cursorrules          ← Auto-generated (IDE đọc tự động)
└── .mcp/
    ├── .antigravity      ← Config của bạn (không commit lên git)
    ├── server.js         ← MCP Server
    ├── sync.js           ← Sync script
    ├── install.ps1       ← Installer
    ├── setup-project.ps1 ← Setup dự án mới
    ├── package.json      ← Dependencies
    └── graph.json        ← Graph data (auto-generated)
```

---

## 💡 Sử dụng

Sau khi cài đặt và cấu hình IDE, chỉ cần **nói chuyện với AI**:

```
"#112 có tính năng gì mà dự án này chưa có?"
→ AI tự gọi compare_projects(project_b="112")

"actionScan làm gì và ai gọi nó?"
→ AI tự gọi analyze_impact("actionScan")

"Có class nào xử lý dịch thuật không?"
→ AI tự gọi search_symbol(keyword="translate")
```
