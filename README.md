Mở Terminal (PowerShell) ngay tại thư mục gốc của dự án đang code và chạy dán toàn bộ đoạn lệnh sau:


git clone https://github.com/ngsihuy442/graph-ai.git temp-mcp
Move-Item -Path temp-mcp\.mcp -Destination . -Force
Move-Item -Path temp-mcp\.antigravity -Destination . -Force
Remove-Item -Path temp-mcp -Recurse -Force
npm install @modelcontextprotocol/sdk


⚙️ Cấu hình Danh tính (Chỉ làm 1 lần)
Sau khi chạy lệnh trên, ở thư mục gốc dự án của bạn sẽ xuất hiện file .antigravity. Mở file này ra và điền thông tin của bạn:

JSON
{
  "project_id": "htxtuyenhai", 
  "api_url": "https://dm02.vinaweb.vn/graph-ai/admin/analyzer/export-api",
  "user_id": "ĐIỀN_ID_CỦA_BẠN_VÀO_ĐÂY" 
}
Lưu ý: user_id là mã định danh cá nhân của bạn (ví dụ: 46) để đảm bảo AI lấy đúng bản đồ cấu trúc do bạn vừa quét.

