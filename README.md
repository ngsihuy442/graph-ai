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

## 🌐 Quét mã nguồn lên Hệ thống trung tâm (Bắt buộc)

Trước khi cấu hình dưới local, bạn phải đẩy bản đồ mã nguồn của mình lên hệ thống để AI có dữ liệu đọc hiểu.

1. Truy cập vào [https://dm02.vinaweb.vn/graph-ai/admin](https://dm02.vinaweb.vn/graph-ai/admin) và tiến hành tạo tài khoản / đăng nhập. 
2. Tại màn hình **Quản lý AI Context Log**, bấm nút **"+ Phân tích mới"** (màu xanh ở góc phải trên cùng).
3. Tại giao diện **AI Architecture Scanner**, tìm khối **Auto-Zip Cloud** và bấm nút **"CHỌN THƯ MỤC"**.
4. Cửa sổ chọn file hiện lên, hãy trỏ đến **thư mục gốc của dự án** trên máy tính của bạn (Ví dụ: `D:\laragon\www\odooexam`) và chọn tải lên.
5. Khi hệ thống hiển thị thông báo xanh **"Đã nạp: odooexam"**, hãy cuộn xuống và bấm nút **"BẮT ĐẦU PHÂN TÍCH HỆ THỐNG"**.
6. Chờ thanh tiến trình khởi tạo đạt **100%** và báo *"Phân tích đã hoàn tất!"*. Bấm **View All Analyses** để xác nhận bản ghi đã được lưu.
7. Quay về lịch sử để xem **ID User** và **Tên dự án** để cấu hình file `.antigravity`.

---

### 📸 Hướng dẫn trực quan (Click để xem từng bước)

<details>
  <summary><b>Bước 1 & 2: Truy cập danh sách & Tạo phân tích mới</b></summary>
  <p align="center">
    <br><img src="https://github.com/user-attachments/assets/b640542d-df66-4861-b714-9cdd43add33d" height="500" alt="Bước 1">
  </p>
</details>

<details>
  <summary><b>Bước 3: Chọn phương thức Auto-Zip Cloud</b></summary>
  <p align="center">
    <br><img src="https://github.com/user-attachments/assets/6b76845d-0af7-408b-8b9d-22b6660ec25f" height="500" alt="Bước 2">
  </p>
</details>

<details>
  <summary><b>Bước 4: Trỏ đường dẫn đến thư mục dự án Local</b></summary>
  <p align="center">
    <br><img src="https://github.com/user-attachments/assets/08bc1c9c-db9b-4f75-9570-82f50388fcf9" height="500" alt="Bước 3">
  </p>
</details>

<details>
  <summary><b>Bước 5: Xác nhận nạp thư mục & Bắt đầu quét</b></summary>
  <p align="center">
    <br><img src="https://github.com/user-attachments/assets/ecb7284d-29ae-4f8e-8b8e-f3fcc117a9b0" height="500" alt="Bước 4">
  </p>
</details>

<details>
  <summary><b>Bước 6: Chờ hệ thống xử lý (100%)</b></summary>
  <p align="center">
    <br><img src="https://github.com/user-attachments/assets/fe9d165d-bcd2-405d-aeaa-51d91e1ccd28" height="500" alt="Bước 5">
  </p>
</details>

<details>
  <summary><b>Bước 7: Kiểm tra ID User và Project Name trong Lịch sử</b></summary>
  <p align="center">
    <br><img src="https://github.com/user-attachments/assets/92446032-819a-4876-b31a-9e1aab753dcf" height="500" alt="Bước 6">
  </p>
</details>

---




---
## 🚀 Cài đặt trên Agent Antigravity (1 lệnh)

## 🔧 Cấu hình IDE (Cursor / VS Code / Agent Antigravity)

Thêm vào **MCP settings** của IDE:

```json
{
  "mcpServers": {
    "antigravity": {
      "command": "node",
      "args": ["duong_dan_toi_du_an/.mcp/server.js"]
    }
  }
}
```
### 📸 Hướng dẫn thiếp lập MCP Server (Click vào để xem chi tiết)

<details>
  <summary><b>B1: Mở Agent (Ctrl + L) và vào mục MCP Servers</b></summary>
  <p align="center">
    <br><img src="https://github.com/user-attachments/assets/b078ed14-ad1e-47b6-a3e0-cbf3abd6de8e" height="500" alt="Slide 1">
  </p>
</details>

<details>
  <summary><b>B2: Bấm vào 'Manage MCP Servers'</b></summary>
  <p align="center">
    <br><img src="https://github.com/user-attachments/assets/a3b02e89-87a2-42c7-b84c-b345c89f8e78" height="500" alt="Slide 2">
  </p>
</details>

<details>
  <summary><b>B3: Bấm vào 'View raw config'</b></summary>
  <p align="center">
    <br><img src="https://github.com/user-attachments/assets/fd36354e-6622-4b7f-be30-ad0e2d579772" height="500" alt="Slide 3">
  </p>
</details>

<details>
  <summary><b>B4: Dán nội dung JSON bên trên và thay đổi lại URL đến server.js</b></summary>
  <p align="center">
    <br><img src="https://github.com/user-attachments/assets/9b0dc757-0623-485d-976c-2e2a1ea05b30" height="500" alt="Slide 4">
  </p>
</details>

<details>
  <summary><b>B5: Quay lại Manage MCPs và ấn Refresh để cập nhật MCP</b></summary>
  <p align="center">
    <br><img src="https://github.com/user-attachments/assets/55247a02-2911-4327-8ef2-3cf71725557d" height="500" alt="Slide 5">
  </p>
</details>
---

Mở PowerShell tại **thư mục gốc dự án** của bạn:

```powershell
git clone https://github.com/ngsihuy442/graph-ai.git _ag_tmp; .\_ag_tmp\.mcp\install.ps1;
Remove-Item _ag_tmp -Recurse -Force
```

Script sẽ hỏi:
- **User ID**: ID tài khoản của bạn trên hệ thống
- **Project ID**: ID dự án cần phân tích
- **Reference Projects** *(tùy chọn)*: Dự án tham chiếu để so sánh
- **Token**: Lấy mã token trong Cài đặt AI cá nhân để kết nối tới server

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
    ├── .antigravity      ← Config của bạn
    ├── graph.json        ← Cấu trúc dự án
    ├── server.js         ← MCP Server
    ├── sync.js           ← Sync script
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

