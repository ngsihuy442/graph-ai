# 🚀 Graph-AI: Antigravity MCP cho Antigravity

**Graph-AI (Antigravity Engine)** là bộ công cụ "cầu nối" giúp Cursor IDE giao tiếp trực tiếp với hệ thống phân tích mã nguồn trung tâm (cPanel) của Team. 

Thay vì để AI đoán mò, công cụ này cung cấp cho AI khả năng nhìn thấu **Mối quan hệ logic (Call Graph)** và **Đánh giá rủi ro (Blast Radius)** trước khi thực hiện bất kỳ sửa đổi nào trên code.

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

### 💻 Cài đặt nhanh Graph-AI tại dự án ở Local

Mở Terminal (PowerShell) ngay tại thư mục gốc của dự án đang code và chạy dán toàn bộ đoạn lệnh sau:

```powershell
git clone [https://github.com/ngsihuy442/graph-ai.git](https://github.com/ngsihuy442/graph-ai.git) temp-mcp
Move-Item -Path temp-mcp\.mcp -Destination . -Force
Move-Item -Path temp-mcp\.antigravity -Destination . -Force
Remove-Item -Path temp-mcp -Recurse -Force
npm install @modelcontextprotocol/sdk
```

⚙️ Cấu hình Danh tính (Chỉ làm 1 lần)
Sau khi chạy lệnh trên, ở thư mục gốc dự án của bạn sẽ xuất hiện file .antigravity. 
Mở file này ra và điền thông tin của bạn:
```powershell
JSON
{
  "project_id": "TEN_DU_AN", 
  "api_url": "[https://dm02.vinaweb.vn/graph-ai/admin/analyzer/export-api](https://dm02.vinaweb.vn/graph-ai/admin/analyzer/export-api)",
  "user_id": "ĐIỀN_ID_CỦA_BẠN_VÀO_ĐÂY" 
}
```
Lưu ý: user_id là mã định danh cá nhân của bạn (ví dụ: 46) để đảm bảo AI lấy đúng bản đồ cấu trúc do bạn vừa quét.


### 🔌 Hướng dẫn thêm MCP Tools trong Antigravity
Dưới đây là minh họa cách thêm Tools vào Cursor:

<img width="480" height="696" alt="image" src="https://github.com/user-attachments/assets/ee53825e-d4fb-46ba-aebf-cf68312dcad5" />


<img width="1517" height="985" alt="image" src="https://github.com/user-attachments/assets/71266b2c-dd03-44dc-a095-6a598bd21317" />

Sửa lại cấu hình MCP Server trong Cursor của bạn như sau (thay thế đường dẫn cho phù hợp với máy của bạn):
```powershell
JSON
{
    "mcpServers": {
        "antigravity-engine": {
            "command": "node",
            "args": [
                "Duong_dan_toi_du_an/.mcp/server.js"
            ]
        }
    }
}
```
Bước cuối cùng: Sau khi lưu cấu hình, hãy quay lại giao diện Cursor và ấn nút Refresh ở mục MCP Server để hệ thống nhận diện công cụ mới nhé!

---
## 🎮 Cách sử dụng

Hiện tại **Antigravity Engine** cung cấp 3 siêu năng lực cốt lõi cho AI. Khi chat, hệ thống sẽ tự động dùng các công cụ này:

* 🔍 **`search_symbol`**: Tìm kiếm nhanh vị trí hàm, class, hoặc biến trong toàn bộ hệ thống.
* 🌐 **`get_context`**: Soi chiếu quan hệ 360 độ (Hàm này đang gọi đến ai, và đang bị ai gọi).
* 💥 **`analyze_impact`**: Đánh giá mức độ rủi ro (*Blast Radius*) xem nếu sửa một hàm thì sẽ làm hỏng những file nào khác.

---

### 💬 Cách ra lệnh cho AI

Mở khung Chat trong Cursor, gõ phím `@` để tag trực tiếp **.antigravity** vào cuộc hội thoại và yêu cầu:

> **@.antigravity** Hãy dùng `analyze_impact` để phân tích rủi ro nếu tôi thay đổi logic trong hàm `actionScan`.

✨ *Ngay lập tức, AI sẽ gọi API để lấy bản đồ cấu trúc mới nhất từ cPanel và liệt kê chính xác những file bạn cần phải cập nhật theo!*
