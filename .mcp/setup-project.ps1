#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Thiết lập Antigravity MCP cho một dự án mới.

.EXAMPLE
    .\setup-project.ps1 -ProjectDir "D:\laragon\www\datviet" -ProjectId "102"
    .\setup-project.ps1 -ProjectDir "D:\laragon\www\graph-ai" -ProjectId "103" -UserId "6"
    .\setup-project.ps1 -ProjectDir "D:\laragon\www\datviet" -ProjectId "102" -RefProjects "104"
#>
param(
    [Parameter(Mandatory=$true)]
    [string]$ProjectDir,

    [Parameter(Mandatory=$true)]
    [string]$ProjectId,

    [string]$ApiUrl      = "https://dm02.vinaweb.vn/graph-ai/admin/analyzer/export-api",
    [string]$GetCodeUrl   = "https://dm02.vinaweb.vn/graph-ai/admin/analyzer/get-code",
    [string]$AgentChatUrl= "https://dm02.vinaweb.vn/graph-ai/admin/analyzer/agent-chat",
    [string]$Token       = "antigravity_secret_2026",
    [string]$UserId      = "6",
    [string[]]$RefProjects = @()
)

$ErrorActionPreference = "Stop"
$SourceMcp = Join-Path $PSScriptRoot ".mcp"

Write-Host "`n=== Antigravity Project Setup ===" -ForegroundColor Cyan
Write-Host "  Project Dir : $ProjectDir"
Write-Host "  Project ID  : #$ProjectId"

# 1. Tạo thư mục nếu chưa có
$mcpTarget = Join-Path $ProjectDir ".mcp"
if (-not (Test-Path $mcpTarget)) {
    New-Item -ItemType Directory -Path $mcpTarget | Out-Null
    Write-Host "`n[1] Tạo .mcp/" -ForegroundColor Green
} else {
    Write-Host "`n[1] .mcp/ đã tồn tại — bỏ qua" -ForegroundColor Yellow
}

# 2. Copy server.js và sync.js (không copy .antigravity và graph.json)
$filesToCopy = @("server.js", "sync.js")
foreach ($file in $filesToCopy) {
    $src  = Join-Path $SourceMcp $file
    $dest = Join-Path $mcpTarget $file
    if (Test-Path $src) {
        Copy-Item -Force $src $dest
        Write-Host "  ✓ Copied: .mcp/$file" -ForegroundColor Green
    } else {
        Write-Host "  ✗ Không tìm thấy nguồn: $src" -ForegroundColor Red
    }
}

# 3. Tạo .mcp/.antigravity mới
$refJson = if ($RefProjects.Count -gt 0) {
    '["' + ($RefProjects -join '","') + '"]'
} else { '[]' }

$antigravityContent = @"
{
  "project_id": "$ProjectId",
  "api_url": "$ApiUrl",
  "get_code_url": "$GetCodeUrl",
  "agent_chat_url": "$AgentChatUrl",
  "token": "$Token",
  "user_id": "$UserId",
  "reference_projects": $refJson
}
"@

$antigravityPath = Join-Path $mcpTarget ".antigravity"
Set-Content -Path $antigravityPath -Value $antigravityContent -Encoding UTF8
Write-Host "`n[2] Tạo .mcp/.antigravity" -ForegroundColor Green
Write-Host "  project_id       : $ProjectId"
Write-Host "  reference_projects: $refJson"

# 4. Chạy sync để tạo .cursorrules
Write-Host "`n[3] Chạy sync..." -ForegroundColor Cyan
Push-Location $ProjectDir
try {
    node ".mcp/sync.js"
    Write-Host "`n[4] Kết quả:" -ForegroundColor Green
    if (Test-Path ".cursorrules") {
        $size = [math]::Round((Get-Item ".cursorrules").Length / 1KB, 1)
        Write-Host "  ✓ .cursorrules ($size KB)" -ForegroundColor Green
    }
    if (Test-Path ".mcp/graph.json") {
        $size = [math]::Round((Get-Item ".mcp/graph.json").Length / 1KB, 1)
        Write-Host "  ✓ .mcp/graph.json ($size KB)" -ForegroundColor Green
    }
} catch {
    Write-Host "  ✗ Sync lỗi: $_" -ForegroundColor Red
} finally {
    Pop-Location
}

Write-Host "`n=== Hoàn tất! ===" -ForegroundColor Cyan
Write-Host "Mở IDE tại: $ProjectDir"
Write-Host "Sau đó Restart IDE để load .cursorrules mới.`n"
