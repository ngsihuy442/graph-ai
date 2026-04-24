#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Antigravity MCP Installer
    Tai va cai dat Antigravity AI Agent cho du an hien tai.
#>

$ErrorActionPreference = "Stop"
$GithubRepo   = "https://github.com/ngsihuy442/graph-ai.git"
$DefaultApi   = "https://dm02.vinaweb.vn/graph-ai/admin/analyzer/export-api"
$DefaultChat  = "https://dm02.vinaweb.vn/graph-ai/admin/analyzer/agent-chat"
$DefaultToken = "antigravity_secret_2026"

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "   Antigravity AI Agent --- Installer           " -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Cai dat AI Agent cho: $(Get-Location)" -ForegroundColor White
Write-Host ""

Write-Host "[1] THONG TIN CAU HINH" -ForegroundColor Yellow
Write-Host "------------------------------------------------"

$UserId = Read-Host "  Nhap User ID cua ban tren graph-ai"
if (-not $UserId) { Write-Host "  Error: User ID khong duoc de trong" -ForegroundColor Red; exit 1 }

$ProjectId = Read-Host "  Nhap Project ID (Enter de dung 'latest')"
if (-not $ProjectId) { $ProjectId = "latest" }

$RefInput = Read-Host "  Du an tham chieu (Enter de bo qua, hoac nhap ID cach nhau dau phay)"
$RefProjects = if ($RefInput) { 
    '["' + ($RefInput.Split(',').Trim() -join '","') + '"]'
} else { '[]' }

Write-Host ""

Write-Host "[2] Dang tai tu GitHub..." -ForegroundColor Cyan

$TempDir = Join-Path ([System.IO.Path]::GetTempPath()) "ag_install_$(Get-Random)"

if (Get-Command git -ErrorAction SilentlyContinue) {
    git clone --depth=1 --quiet $GithubRepo $TempDir
} else {
    Write-Host "  Error: Can cai dat git truoc" -ForegroundColor Red; exit 1
}

$McpSource = Join-Path $TempDir ".mcp"
if (-not (Test-Path $McpSource)) {
    Write-Host "  Error: Khong tim thay .mcp/ trong repo" -ForegroundColor Red
    Remove-Item $TempDir -Recurse -Force -ErrorAction SilentlyContinue
    exit 1
}

Write-Host "  OK: Tai thanh cong" -ForegroundColor Green

Write-Host ""
Write-Host "[3] Dang cai dat files..." -ForegroundColor Cyan

$McpTarget = Join-Path (Get-Location) ".mcp"
if (-not (Test-Path $McpTarget)) {
    New-Item -ItemType Directory -Path $McpTarget | Out-Null
}

$copyFiles = @("server.js", "sync.js", "setup-project.ps1", "package.json")
foreach ($f in $copyFiles) {
    $src = Join-Path $McpSource $f
    if (Test-Path $src) {
        Copy-Item -Force $src (Join-Path $McpTarget $f)
        Write-Host "  + .mcp/$f" -ForegroundColor Green
    }
}

Remove-Item $TempDir -Recurse -Force -ErrorAction SilentlyContinue

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
Write-Host "  + .mcp/.antigravity" -ForegroundColor Green

Write-Host ""
Write-Host "[4] Cai dat dependencies..." -ForegroundColor Cyan
Push-Location $McpTarget
try {
    if (Test-Path "package.json") {
        npm install --silent
        Write-Host "  OK: @modelcontextprotocol/sdk" -ForegroundColor Green
    }
} catch {
    Write-Host "  Warning: npm install loi: $_" -ForegroundColor Yellow
} finally {
    Pop-Location
}

Write-Host ""
Write-Host "[5] Sync du lieu tu host..." -ForegroundColor Cyan
try {
    node ".mcp/sync.js"
} catch {
    Write-Host "  Warning: Sync loi. Ban co the chay lai sau: node .mcp/sync.js" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host "   CAI DAT HOAN TAT!                            " -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Buoc tiep theo:" -ForegroundColor Yellow
Write-Host "  1. Restart IDE de load .cursorrules" -ForegroundColor White
Write-Host "  2. Them MCP server vao IDE settings:" -ForegroundColor White
Write-Host '     { "command": "node", "args": [".mcp/server.js"] }' -ForegroundColor Cyan
Write-Host ""
Write-Host "  Cap nhat skill sau nay: node .mcp/sync.js" -ForegroundColor White
Write-Host ""

# [6] Don dep tep tin tam (Cleanup)
Write-Host "[6] Dang don dep cac tep tin cai dat..." -ForegroundColor Yellow
$CleanupFiles = @("setup-project.ps1", "package.json", "package-lock.json")
foreach ($f in $CleanupFiles) {
    $p = Join-Path $McpTarget $f
    if (Test-Path $p) { 
        Remove-Item $p -Force 
        Write-Host "  ✓ Da xoa: .mcp/$f" -ForegroundColor Gray
    }
}
Write-Host "  OK: He thong da duoc lam sach." -ForegroundColor Green
Write-Host ""

