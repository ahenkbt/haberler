# AgentLabs eklentilerini plugins/ altına kopyalar (yerel geliştirme / commit öncesi).
#
# Kullanım:
#   cd goalgo
#   .\scripts\sync-plugins.ps1
#
param(
  [string]$AgentLabsRoot = ""
)

$ErrorActionPreference = "Stop"

$goalgoRoot = Split-Path $PSScriptRoot -Parent
if (-not $AgentLabsRoot) {
  $AgentLabsRoot = Join-Path $goalgoRoot "ai-call-center\AgentLabs-Package\AgentLabs-v5.3.8"
}

$pluginsDir = Join-Path $AgentLabsRoot "plugins"
$aiCallCenter = Join-Path $goalgoRoot "ai-call-center"

$mappings = @(
  @{ Source = Join-Path $aiCallCenter "Messaging\messaging"; Dest = "messaging" },
  @{ Source = Join-Path $aiCallCenter "SIP-Trunk\sip-engine"; Dest = "sip-engine" },
  @{ Source = Join-Path $aiCallCenter "Teams\team-management"; Dest = "team-management" },
  @{ Source = Join-Path $aiCallCenter "Rest-API\rest-api"; Dest = "rest-api" }
)

if (-not (Test-Path $AgentLabsRoot)) {
  Write-Host "HATA: AgentLabs klasörü yok: $AgentLabsRoot" -ForegroundColor Red
  exit 1
}

New-Item -ItemType Directory -Force -Path $pluginsDir | Out-Null

Write-Host ""
Write-Host "=== AgentLabs eklenti senkronu ===" -ForegroundColor Cyan
Write-Host "Hedef: $pluginsDir"
Write-Host ""

foreach ($map in $mappings) {
  if (-not (Test-Path $map.Source)) {
    Write-Host "ATLANDI (kaynak yok): $($map.Source)" -ForegroundColor Yellow
    continue
  }
  $dest = Join-Path $pluginsDir $map.Dest
  if (Test-Path $dest) {
    Remove-Item -Recurse -Force $dest
  }
  Copy-Item -Path $map.Source -Destination $dest -Recurse
  Write-Host "OK  $($map.Dest)  <-  $($map.Source)" -ForegroundColor Green
}

Write-Host ""
Write-Host "Tamam. Railway Docker imajı eklentileri goalgo/ai-call-center altından otomatik kopyalar;" -ForegroundColor Cyan
Write-Host "yalnızca yerel npm run dev için plugins/ güncellemeniz yeterli." -ForegroundColor Cyan
Write-Host ""
