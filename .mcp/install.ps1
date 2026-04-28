#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Antigravity MCP Installer (Optimized)
    Tai va cai dat Antigravity AI Agent cho du an hien tai.
#>

$ErrorActionPreference = "Stop"
$DefaultApi      = "https://dm02.vinaweb.vn/graph-ai/admin/analyzer/export-api"
$DefaultGetCode  = "https://dm02.vinaweb.vn/graph-ai/admin/analyzer/get-code"
$DefaultChat     = "https://dm02.vinaweb.vn/graph-ai/admin/analyzer/agent-chat"
$DefaultToken    = "antigravity_secret_2026"

Write-Host "`n================================================" -ForegroundColor Cyan
Write-Host "   Antigravity AI Agent --- Installer           " -ForegroundColor Cyan
Write-Host "================================================`n" -ForegroundColor Cyan

Write-Host "[1] THONG TIN CAU HINH" -ForegroundColor Yellow
Write-Host "------------------------------------------------"

$UserId = Read-Host "  Nhap User ID cua ban tren graph-ai"
if (-not $UserId) { Write-Host "  Error: User ID khong duoc de trong" -ForegroundColor Red; exit 1 }

$ProjectId = Read-Host "  Nhap Project ID (Enter de dung 'latest')"
if (-not $ProjectId) { $ProjectId = "latest" }

$TokenInput = Read-Host "  Nhap Token bao mat (Enter de dung mac dinh)"
$Token = if ($TokenInput) { $TokenInput } else { $DefaultToken }

$RefInput = Read-Host "  Du an tham chieu (Enter bo qua, nhap ID cach bang dau phay)"
$RefProjects = if ($RefInput) { '["' + ($RefInput.Split(',').Trim() -join '","') + '"]' } else { '[]' }

Write-Host "`n[2] Dang cai dat files..." -ForegroundColor Cyan

# Lấy nguồn file ngay tại thư mục chứa file install.ps1 (trong _ag_tmp)
$McpSource = $PSScriptRoot
$McpTarget = Join-Path (Get-Location) ".mcp"

if (-not (Test-Path $McpTarget)) { New-Item -ItemType Directory -Path $McpTarget | Out-Null }

$copyFiles = @("server.js", "sync.js", "package.json")
foreach ($f in $copyFiles) {
    $src = Join-Path $McpSource $f
    if (Test-Path $src) {
        Copy-Item -Force $src (Join-Path $McpTarget $f)
        Write-Host "  + .mcp/$f" -ForegroundColor Green
    }
}

# Tạo .antigravity
$antigravityContent = @"
{
  "project_id": "$ProjectId",
  "api_url": "$DefaultApi",
  "get_code_url": "$DefaultGetCode",
  "agent_chat_url": "$DefaultChat",
  "token": "$Token",
  "user_id": "$UserId",
  "reference_projects": $RefProjects
}
"@
Set-Content -Path (Join-Path $McpTarget ".antigravity") -Value $antigravityContent -Encoding UTF8
Write-Host "  + .mcp/.antigravity" -ForegroundColor Green

Write-Host "`n[3] Cai dat dependencies..." -ForegroundColor Cyan
Push-Location $McpTarget
try {
    if (Test-Path "package.json") {
        npm install --silent
        Write-Host "  OK: NPM Packages Installed" -ForegroundColor Green
    }
} catch { Write-Host "  Warning: npm install loi" -ForegroundColor Yellow } 
finally { Pop-Location }

Write-Host "`n[4] Sync du lieu tu host..." -ForegroundColor Cyan
try { node ".mcp/sync.js" } 
catch { Write-Host "  Warning: Sync loi." -ForegroundColor Yellow }

# Don dep package.json ra khoi du an
$CleanupFiles = @("package.json", "package-lock.json")
foreach ($f in $CleanupFiles) {
    $p = Join-Path $McpTarget $f
    if (Test-Path $p) { Remove-Item $p -Force }
}

Write-Host "`n================================================" -ForegroundColor Green
Write-Host "   CAI DAT HOAN TAT!                            " -ForegroundColor Green
Write-Host "================================================`n" -ForegroundColor Green
