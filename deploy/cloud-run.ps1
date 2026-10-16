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
    [string]$Revision,
    [switch]$AllowUnauthenticated,
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
    if ([string]::IsNullOrWhiteSpace($RuntimeServiceAccount) -or $RuntimeServiceAccount -notmatch "^[^@]+@[^@]+\.iam\.gserviceaccount\.com$") {
        throw "Deploy requires an existing dedicated -RuntimeServiceAccount; do not use the Firebase Admin SDK service account."
    }
    $parsedOrigin = $null
    if (-not [System.Uri]::TryCreate($FrontendOrigin, [System.UriKind]::Absolute, [ref]$parsedOrigin) -or $parsedOrigin.Scheme -ne "https" -or $parsedOrigin.AbsolutePath -ne "/" -or -not [string]::IsNullOrEmpty($parsedOrigin.Query) -or -not [string]::IsNullOrEmpty($parsedOrigin.Fragment)) {
        throw "Deploy requires one exact HTTPS -FrontendOrigin (scheme and host only), such as https://app.example.com."
    }

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
        "--no-traffic",
        "--quiet",
        "--set-env-vars=FIREBASE_PROJECT_ID=$Project,GOOGLE_CLOUD_PROJECT=$Project,AGENT_ENABLED=false,BACKEND_CORS_ORIGINS=$FrontendOrigin"
    )
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
    Invoke-Gcloud $arguments
    Write-Output "Revision deployed without traffic. Verify its health and configuration before promotion."
    exit 0
}

if ($Mode -eq "Promote" -or $Mode -eq "Rollback") {
    Invoke-Gcloud @(
        "run", "services", "update-traffic", $Service,
        "--project=$Project", "--region=$Region", "--platform=managed",
        "--to-revisions=$Revision=100", "--quiet"
    )
}
