🚀 Graph-AI: Antigravity MCP cho Cursor IDE
Graph-AI (Antigravity Engine) là bộ công cụ "cầu nối" giúp Cursor IDE giao tiếp trực tiếp với hệ thống phân tích mã nguồn trung tâm (cPanel) của Team.

Thay vì để AI đoán mò, công cụ này cung cấp cho AI khả năng nhìn thấu Mối quan hệ logic (Call Graph) và Đánh giá rủi ro (Blast Radius) trước khi thực hiện bất kỳ sửa đổi nào trên code.

🛠 Yêu cầu hệ thống
Đã cài đặt Node.js trên máy tính (để chạy MCP Server).

Đang sử dụng Cursor IDE.

Đã có tài khoản / user_id trên hệ thống phân tích code nội bộ.

📥 Hướng dẫn Cài đặt (Dành cho Windows)
⚠️ Quan trọng: KHÔNG clone công cụ này ra một thư mục độc lập. Bạn phải nhúng nó trực tiếp vào thư mục dự án mà bạn đang làm việc (ví dụ: htxtuyenhai, odooexam).

Mở Terminal (PowerShell) ngay tại thư mục gốc của dự án đang code và chạy dán toàn bộ đoạn lệnh sau:

PowerShell
# 1. Tải bộ công cụ về thư mục tạm
git clone https://github.com/ngsihuy442/graph-ai.git temp-mcp

# 2. Di chuyển toàn bộ file (trừ .git) ra thư mục gốc
Get-ChildItem -Path temp-mcp -Force -Exclude .git | Move-Item -Destination . -Force

# 3. Xóa dọn dẹp thư mục tạm
Remove-Item -Path temp-mcp -Recurse -Force

# 4. Tự động cài đặt thư viện cần thiết
npm install
⚙️ Cấu hình Danh tính (Chỉ làm 1 lần)
Sau khi chạy lệnh trên, ở thư mục gốc dự án của bạn sẽ xuất hiện file .antigravity. Mở file này ra và điền thông tin của bạn:

JSON
{
  "project_id": "htxtuyenhai", 
  "api_url": "https://dm02.vinaweb.vn/graph-ai/admin/analyzer/export-api",
  "user_id": "ĐIỀN_ID_CỦA_BẠN_VÀO_ĐÂY" 
}
Lưu ý: user_id là mã định danh cá nhân của bạn (ví dụ: 46) để đảm bảo AI lấy đúng bản đồ cấu trúc do bạn vừa quét.

🔌 Nối cáp vào Cursor IDE
Để Cursor nhận diện được "Bộ não" mới này, bạn làm theo các bước sau:

Mở Cursor, bấm phím tắt Ctrl + , (hoặc vào Cursor Settings).

Chuyển sang tab Features > Cuộn xuống phần MCP Servers.

Bấm + Add New MCP Server và điền thông tin:

Name: Antigravity

Type: command

Command: node

Args: Điền đường dẫn tuyệt đối đến file server.js của bạn.
(Ví dụ: D:/laragon/www/htxtuyenhai/.mcp/server.js - Hãy dùng dấu gạch chéo /)

Bấm Save. Nếu thấy xuất hiện chấm 🟢 Xanh lá cây là bạn đã thành công!

🎮 Cách sử dụng
Hiện tại Antigravity Engine cung cấp 3 siêu năng lực cho AI:

🔍 search_symbol: Tìm kiếm nhanh vị trí hàm/class trong hệ thống.

🌐 get_context: Soi quan hệ 360 độ (Hàm này gọi ai, bị ai gọi).

💥 analyze_impact: Đánh giá mức độ hỏng hóc nếu sửa một hàm (Blast Radius).

Cách trò chuyện với AI:
Mở Chat trong Cursor và yêu cầu thẳng:

"Hãy dùng analyze_impact để phân tích rủi ro nếu tôi thay đổi logic trong hàm actionScan."

Ngay lập tức, AI sẽ gọi API, lấy dữ liệu cấu trúc mới nhất và cảnh báo bạn những file cần phải cập nhật theo!

⚠️ Khắc phục sự cố (Troubleshooting)
Chấm MCP màu Đỏ: Kiểm tra lại đường dẫn tuyệt đối trong phần Args của Cursor. Đảm bảo bạn đã chạy lệnh npm install.

AI trả lời chung chung, không dùng tool: Hãy nhắc AI: "Hãy tuân thủ quy trình trong file .cursorrules".

Báo lỗi quyền truy cập API: Mở file antigravity_debug.txt ở thư mục gốc để xem chi tiết lỗi. Thường là do sai user_id hoặc chưa bấm Quét mã nguồn trên cPanel.
