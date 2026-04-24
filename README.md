# 🤖 Antigravity AI Agent — MCP Server

> **Biến IDE của bạn thành AI trợ lý dự án thông minh**, kết nối trực tiếp với dữ liệu phân tích code trên host.

> ## ✨ Tính năng

| Tool | Chức năng |
|---|---|
| `search_symbol` | Tìm hàm/class/tính năng trong bất kỳ dự án nào |
| `get_context` | Xem 360° — ai gọi hàm này, nó gọi ai |
| `analyze_impact` | Đánh giá Blast Radius trước khi sửa code |
| `compare_projects` | So sánh 2 dự án — tìm tính năng còn thiếu |

---
---

## Quét mã nguồn lên Hệ thống trung tâm (Bắt buộc)

Trước khi cấu hình dưới local, bạn phải đẩy bản đồ mã nguồn của mình lên hệ thống để AI có dữ liệu đọc hiểu.

1. Truy cập vào [https://dm02.vinaweb.vn/graph-ai/admin](https://dm02.vinaweb.vn/graph-ai/admin) và tiến hành tạo tài khoản / đăng nhập. 
2. Tại màn hình **Quản lý AI Context Log**, bấm nút **"+ Phân tích mới"** (màu xanh ở góc phải trên cùng).
3. Tại giao diện **AI Architecture Scanner**, tìm khối **Auto-Zip Cloud** và bấm nút **"CHỌN THƯ MỤC"**.
4. Cửa sổ chọn file hiện lên, hãy trỏ đến **thư mục gốc của dự án** trên máy tính của bạn (Ví dụ: `D:\laragon\www\odooexam`) và chọn tải lên.
5. Khi hệ thống hiển thị thông báo xanh **"Đã nạp: odooexam"**, hãy cuộn xuống và bấm nút **"BẮT ĐẦU PHÂN TÍCH HỆ THỐNG"**.
6. Chờ thanh tiến trình khởi tạo đạt **100%** và báo *"Phân tích đã hoàn tất!"*. Bấm **View All Analyses** để xác nhận bản ghi đã được lưu.
7. Quay về lịch sử để xem ID và Tên dự án
---
<p align="center">
  <img src="https://github.com/user-attachments/assets/b640542d-df66-4861-b714-9cdd43add33d" width="49%" alt="Bước 1" />
  <img src="https://github.com/user-attachments/assets/6b76845d-0af7-408b-8b9d-22b6660ec25f" width="49%" alt="Bước 2" />
</p>

<p align="center">
  <img src="https://github.com/user-attachments/assets/08bc1c9c-db9b-4f75-9570-82f50388fcf9" width="49%" alt="Bước 3" />
  <img src="https://github.com/user-attachments/assets/ecb7284d-29ae-4f8e-8b8e-f3fcc117a9b0" width="49%" alt="Bước 4" />
</p>

<p align="center">
  <img src="https://github.com/user-attachments/assets/fe9d165d-bcd2-405d-aeaa-51d91e1ccd28" width="49%" alt="Bước 5" />
  <img src="https://github.com/user-attachments/assets/92446032-819a-4876-b31a-9e1aab753dcf" width="49%" alt="Bước 6" />
</p>
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

