param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('backend', 'frontend')]
    [string]$Service,
    [switch]$EnableAi
)
$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path $PSScriptRoot -Parent
$projectId = 'ecoloop-staging-20261015'
# Process-only switches. No credentials or real env files are inspected here.
if ($Service -eq 'backend') {
    $env:FIREBASE_PROJECT_ID = $projectId
    $env:GOOGLE_CLOUD_PROJECT = $projectId
    $env:BACKEND_CORS_ORIGINS = '["http://127.0.0.1:3003","http://localhost:3003"]'
    $env:AGENT_ENABLED = if ($EnableAi) { 'true' } else { 'false' }
    Push-Location (Join-Path $repoRoot 'backend')
    try { & .venv/Scripts/python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload }
    finally { Pop-Location }
} else {
    $rawConfig = firebase apps:sdkconfig WEB '1:26177403871:web:8b3125a80812c8c28be26a' --project $projectId --json
    if ($LASTEXITCODE -ne 0) { throw 'Firebase public configuration lookup failed. Run firebase login first.' }
    $publicConfig = ($rawConfig | ConvertFrom-Json).result.sdkConfig
    if (-not $publicConfig.apiKey -or $publicConfig.projectId -ne $projectId) { throw 'Unexpected Firebase web configuration.' }
    $env:NEXT_PUBLIC_FIREBASE_API_KEY = $publicConfig.apiKey
    $env:NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = $publicConfig.authDomain
    $env:NEXT_PUBLIC_FIREBASE_PROJECT_ID = $publicConfig.projectId
    $env:NEXT_PUBLIC_FIREBASE_APP_ID = $publicConfig.appId
    $env:NEXT_PUBLIC_ECOLOOP_API_ORIGIN = 'http://127.0.0.1:8001'
    $env:NEXT_PUBLIC_ECOLOOP_ENABLE_COMMANDS = 'true'
    $env:NEXT_PUBLIC_ECOLOOP_ENABLE_HOUSEHOLD_CREATE = 'true'
    Push-Location (Join-Path $repoRoot 'frontend')
    try { npm.cmd run dev -- --hostname=127.0.0.1 --port=3003 }
    finally { Pop-Location }
}
