[CmdletBinding()]
param(
    [ValidateSet("Inspect", "Deploy", "Promote", "Rollback")]
    [string]$Mode = "Inspect",
    [string]$Project = "ecoloop-staging-20261015",
    [string]$Region = "asia-south1",
    [string]$Service = "ecoloop-api",
    [string]$Image,
    [string]$RuntimeServiceAccount,
    [string]$FrontendOrigin,
    [string]$GeminiApiSecretRef,
    [string]$AgentProvider = "gemini_api",
    [string]$AgentModel = "gemini-3.1-flash-lite",
    [int]$AiDailyRequestLimit = 12,
    [int]$AgentRequestTimeoutSeconds = 20,
    [int]$AgentMaxOutputTokens = 4096,
    [string]$Revision,
    [switch]$AllowUnauthenticated,
    [switch]$EnableAssistant,
    [switch]$Apply
)

$ErrorActionPreference = "Stop"

function Invoke-Gcloud {
    param([string[]]$Arguments)
    & gcloud @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "gcloud failed with exit code $LASTEXITCODE"
    }
}

if ($Mode -eq "Inspect") {
    Invoke-Gcloud @(
        "run", "services", "describe", $Service,
        "--project=$Project", "--region=$Region", "--platform=managed", "--quiet"
    )
    exit 0
}

if (-not $Apply) {
    throw "Mode '$Mode' changes Cloud Run state. Re-run with -Apply after completing the documented project, IAM, billing, and cost-control gates."
}

if ($Mode -in @("Deploy", "Promote", "Rollback") -and [string]::IsNullOrWhiteSpace($Revision) -and $Mode -ne "Deploy") {
    throw "-Revision is required for $Mode."
}

if ($Mode -eq "Deploy") {
    if ([string]::IsNullOrWhiteSpace($Image) -or $Image -notmatch "@sha256:[0-9a-f]{64}$") {
        throw "Deploy requires -Image pinned by digest (IMAGE@sha256:...)."
    }
    $serviceAccountPattern = "^[a-z][a-z0-9-]*@$([regex]::Escape($Project))\.iam\.gserviceaccount\.com$"
    if ([string]::IsNullOrWhiteSpace($RuntimeServiceAccount) -or $RuntimeServiceAccount -notmatch $serviceAccountPattern -or $RuntimeServiceAccount -match "^firebase-adminsdk") {
        throw "Deploy requires a dedicated -RuntimeServiceAccount in project $Project; Firebase Admin SDK and default service accounts are not accepted."
    }
    if ($EnableAssistant -and ([string]::IsNullOrWhiteSpace($GeminiApiSecretRef) -or $AgentProvider -ne "gemini_api")) {
        throw "-EnableAssistant requires Gemini Developer API and an exact -GeminiApiSecretRef."
    }
    if ($AiDailyRequestLimit -lt 1 -or $AiDailyRequestLimit -gt 100) {
        throw "-AiDailyRequestLimit must be between 1 and 100."
    }
    $parsedOrigin = $null
    if (-not [System.Uri]::TryCreate($FrontendOrigin, [System.UriKind]::Absolute, [ref]$parsedOrigin) -or $parsedOrigin.Scheme -ne "https" -or [string]::IsNullOrWhiteSpace($parsedOrigin.Host) -or -not [string]::IsNullOrEmpty($parsedOrigin.UserInfo) -or $parsedOrigin.AbsolutePath -ne "/" -or -not [string]::IsNullOrEmpty($parsedOrigin.Query) -or -not [string]::IsNullOrEmpty($parsedOrigin.Fragment)) {
        throw "Deploy requires one exact HTTPS -FrontendOrigin (scheme and host only), such as https://app.example.com."
    }

    $existingService = & gcloud run services describe $Service --project=$Project --region=$Region --platform=managed --format="value(metadata.name)" --quiet 2>$null
    $isFirstDeployment = $LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace(($existingService | Out-String).Trim())

    $environment = [ordered]@{
        FIREBASE_PROJECT_ID = $Project
        GOOGLE_CLOUD_PROJECT = $Project
        AGENT_ENABLED = if ($EnableAssistant) { "true" } else { "false" }
        AGENT_PROVIDER = $AgentProvider
        AGENT_MODEL = $AgentModel
        AGENT_SESSION_STORE = "in_memory"
        AGENT_SESSION_IDLE_TTL_SECONDS = "86400"
        AGENT_MEMORY_BANK_ENABLED = "false"
        AGENT_REQUEST_TIMEOUT_SECONDS = $AgentRequestTimeoutSeconds.ToString()
        AGENT_MAX_OUTPUT_TOKENS = $AgentMaxOutputTokens.ToString()
        AI_DAILY_REQUEST_LIMIT = $AiDailyRequestLimit.ToString()
        MAX_REQUEST_BYTES = "256000"
        MAX_PHOTO_BYTES = "2000000"
        BACKEND_CORS_ORIGINS = (ConvertTo-Json -InputObject ([object[]]@($parsedOrigin.GetLeftPart([System.UriPartial]::Authority))) -Compress)
    }
    $environmentFile = Join-Path ([System.IO.Path]::GetTempPath()) ("ecoloop-cloud-run-env-{0}.json" -f [guid]::NewGuid().ToString("N"))
    $arguments = @(
        "run", "deploy", $Service,
        "--project=$Project",
        "--region=$Region",
        "--platform=managed",
        "--image=$Image",
        "--service-account=$RuntimeServiceAccount",
        "--port=8080",
        "--cpu=1",
        "--memory=512Mi",
        "--concurrency=20",
        "--timeout=60s",
        "--min=0",
        "--max=1",
        "--tag=candidate",
        "--quiet",
        "--env-vars-file=$environmentFile"
    )
    if (-not $isFirstDeployment) {
        $arguments += "--no-traffic"
    }
    if ($AllowUnauthenticated) {
        $arguments += "--allow-unauthenticated"
    } else {
        $arguments += "--no-allow-unauthenticated"
    }
    if (-not [string]::IsNullOrWhiteSpace($GeminiApiSecretRef)) {
        if ($GeminiApiSecretRef -notmatch "^[A-Za-z0-9_-]+:[1-9][0-9]*$") {
            throw "Use an exact Secret Manager reference in SECRET_ID:VERSION form; do not pass a secret value."
        }
        $arguments += "--set-secrets=GEMINI_API_KEY=$GeminiApiSecretRef"
    }
    try {
        $environmentJson = ConvertTo-Json -InputObject $environment -Depth 3 -Compress
        [System.IO.File]::WriteAllText($environmentFile, $environmentJson, [System.Text.UTF8Encoding]::new($false))
        Invoke-Gcloud $arguments
    } finally {
        if (Test-Path -LiteralPath $environmentFile -PathType Leaf) {
            Remove-Item -LiteralPath $environmentFile -Force
        }
    }
    if ($isFirstDeployment) {
        Write-Output "First revision deployed and serving default traffic; Cloud Run does not support --no-traffic when creating a service. Assistant remains disabled unless explicitly enabled. Verify the candidate tag before continuing."
    } else {
        Write-Output "Candidate revision deployed without default traffic. Use its candidate tag URL for smoke checks before promotion."
    }
    exit 0
}

if ($Mode -eq "Promote" -or $Mode -eq "Rollback") {
    Invoke-Gcloud @(
        "run", "services", "update-traffic", $Service,
        "--project=$Project", "--region=$Region", "--platform=managed",
        "--to-revisions=$Revision=100", "--quiet"
    )
}
