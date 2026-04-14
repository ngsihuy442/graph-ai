### 💻 Cài đặt nhanh

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
