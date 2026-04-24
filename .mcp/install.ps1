#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Antigravity MCP Installer
    Tải và cài đặt Antigravity AI Agent cho dự án hiện tại.

.DESCRIPTION
    Chạy lệnh này từ thư mục gốc của dự án bạn muốn cài đặt:
    
    irm https://raw.githubusercontent.com/ngsihuy442/graph-ai/main/.mcp/install.ps1 | iex

    Hoặc clone về rồi chạy:
    git clone https://github.com/ngsihuy442/graph-ai.git _ag_tmp
    .\_ag_tmp\.mcp\install.ps1
    Remove-Item _ag_tmp -Recurse -Force
#>

$ErrorActionPreference = "Stop"
$GithubRepo   = "https://github.com/ngsihuy442/graph-ai.git"
$DefaultApi   = "https://dm02.vinaweb.vn/graph-ai/admin/analyzer/export-api"
$DefaultChat  = "https://dm02.vinaweb.vn/graph-ai/admin/analyzer/agent-chat"
$DefaultToken = "antigravity_secret_2026"

# ============================================================
# BANNER
# ============================================================
Write-Host ""
Write-Host "╔══════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   🤖 Antigravity AI Agent — Installer       ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Cài đặt AI Agent cho: $(Get-Location)" -ForegroundColor White
Write-Host ""

# ============================================================
# BƯỚC 1: Hỏi thông tin người dùng
# ============================================================
Write-Host "📋 THÔNG TIN CẤU HÌNH" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────"

$UserId = Read-Host "  Nhập User ID của bạn trên graph-ai"
if (-not $UserId) { Write-Host "❌ User ID không được để trống" -ForegroundColor Red; exit 1 }

$ProjectId = Read-Host "  Nhập Project ID cần phân tích (Enter để dùng 'latest')"
if (-not $ProjectId) { $ProjectId = "latest" }

$RefInput = Read-Host "  Dự án tham chiếu (Enter để bỏ qua, hoặc nhập nhiều ID cách nhau dấu phẩy)"
$RefProjects = if ($RefInput) { 
    '["' + ($RefInput.Split(',').Trim() -join '","') + '"]'
} else { '[]' }

Write-Host ""

# ============================================================
# BƯỚC 2: Tải .mcp/ từ GitHub
# ============================================================
Write-Host "⬇️  Đang tải từ GitHub..." -ForegroundColor Cyan

$TempDir = Join-Path ([System.IO.Path]::GetTempPath()) "ag_install_$(Get-Random)"

if (Get-Command git -ErrorAction SilentlyContinue) {
    git clone --depth=1 --quiet $GithubRepo $TempDir
} else {
    Write-Host "❌ Cần cài đặt git trước" -ForegroundColor Red; exit 1
}

$McpSource = Join-Path $TempDir ".mcp"
if (-not (Test-Path $McpSource)) {
    Write-Host "❌ Không tìm thấy .mcp/ trong repo" -ForegroundColor Red
    Remove-Item $TempDir -Recurse -Force -ErrorAction SilentlyContinue
    exit 1
}

Write-Host "  ✓ Tải thành công" -ForegroundColor Green

# ============================================================
# BƯỚC 3: Copy files vào thư mục hiện tại
# ============================================================
Write-Host "`n📁 Đang cài đặt files..." -ForegroundColor Cyan

$McpTarget = Join-Path (Get-Location) ".mcp"
if (-not (Test-Path $McpTarget)) {
    New-Item -ItemType Directory -Path $McpTarget | Out-Null
}

# Copy server.js, sync.js, setup-project.ps1 (không copy .antigravity, graph.json, chat.js)
$copyFiles = @("server.js", "sync.js", "setup-project.ps1", "package.json")
foreach ($f in $copyFiles) {
    $src = Join-Path $McpSource $f
    if (Test-Path $src) {
        Copy-Item -Force $src (Join-Path $McpTarget $f)
        Write-Host "  ✓ .mcp/$f" -ForegroundColor Green
    }
}

# Dọn temp
Remove-Item $TempDir -Recurse -Force -ErrorAction SilentlyContinue

# ============================================================
# BƯỚC 4: Tạo .mcp/.antigravity với thông tin người dùng
# ============================================================
$antigravityContent = @"
{
  "project_id": "$ProjectId",
  "api_url": "$DefaultApi",
  "agent_chat_url": "$DefaultChat",
  "token": "$DefaultToken",
  "user_id": "$UserId",
  "reference_projects": $RefProjects
}
"@

$antigravityPath = Join-Path $McpTarget ".antigravity"
Set-Content -Path $antigravityPath -Value $antigravityContent -Encoding UTF8
Write-Host "  ✓ .mcp/.antigravity" -ForegroundColor Green

# ============================================================
# BƯỚC 5: npm install
# ============================================================
Write-Host "`n📦 Cài đặt dependencies..." -ForegroundColor Cyan
Push-Location $McpTarget
try {
    if (Test-Path "package.json") {
        npm install --silent 2>&1 | Out-Null
        Write-Host "  ✓ @modelcontextprotocol/sdk" -ForegroundColor Green
    }
} catch {
    Write-Host "  ⚠️  npm install lỗi: $_" -ForegroundColor Yellow
} finally {
    Pop-Location
}

# ============================================================
# BƯỚC 6: Chạy sync lần đầu
# ============================================================
Write-Host "`n🔄 Sync dữ liệu từ host..." -ForegroundColor Cyan
try {
    node ".mcp/sync.js"
} catch {
    Write-Host "  ⚠️  Sync lỗi: $_" -ForegroundColor Yellow
    Write-Host "  Bạn có thể chạy lại sau: node .mcp/sync.js" -ForegroundColor White
}

# ============================================================
# HOÀN TẤT
# ============================================================
Write-Host ""
Write-Host "╔══════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║   ✅ Cài đặt hoàn tất!                      ║" -ForegroundColor Green
Write-Host "╚══════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "  📁 Files đã cài:" -ForegroundColor White
Write-Host "     .cursorrules        ← IDE đọc tự động" -ForegroundColor Gray
Write-Host "     .mcp/.antigravity   ← Config của bạn" -ForegroundColor Gray
Write-Host "     .mcp/server.js      ← MCP Server" -ForegroundColor Gray
Write-Host "     .mcp/graph.json     ← Graph data" -ForegroundColor Gray
Write-Host ""
Write-Host "  📌 Bước tiếp theo:" -ForegroundColor Yellow
Write-Host "     1. Restart IDE để load .cursorrules mới" -ForegroundColor White
Write-Host "     2. Thêm MCP server vào cấu hình IDE:" -ForegroundColor White
Write-Host '        { "command": "node", "args": [".mcp/server.js"] }' -ForegroundColor Cyan
Write-Host ""
Write-Host "  🔄 Cập nhật skill sau này: node .mcp/sync.js" -ForegroundColor White
Write-Host ""
