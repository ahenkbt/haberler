Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$agentLabs = Join-Path $root "ai-call-center/AgentLabs-Package/AgentLabs-v5.3.8"

if (!(Test-Path $agentLabs)) {
  throw "AgentLabs package not found: $agentLabs"
}

git add `
  "ai-call-center/Dockerfile" `
  "ai-call-center/railway.toml" `
  "ai-call-center/.dockerignore" `
  "ai-call-center/AgentLabs-Package/AgentLabs-v5.3.8/package.json" `
  "ai-call-center/AgentLabs-Package/AgentLabs-v5.3.8/package-lock.json" `
  "ai-call-center/AgentLabs-Package/AgentLabs-v5.3.8/client" `
  "ai-call-center/AgentLabs-Package/AgentLabs-v5.3.8/server" `
  "ai-call-center/AgentLabs-Package/AgentLabs-v5.3.8/plugins" `
  "ai-call-center/AgentLabs-Package/AgentLabs-v5.3.8/packages" `
  "ai-call-center/AgentLabs-Package/AgentLabs-v5.3.8/shared" `
  "ai-call-center/AgentLabs-Package/AgentLabs-v5.3.8/drizzle" `
  "ai-call-center/AgentLabs-Package/AgentLabs-v5.3.8/*.config.*" `
  "ai-call-center/AgentLabs-Package/AgentLabs-v5.3.8/tsconfig*.json"

Write-Host "AgentLabs deploy files staged."
