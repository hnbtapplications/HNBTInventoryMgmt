$ErrorActionPreference = "Stop"

$token = $args[0]
if (-not $token) {
    Write-Host "Please provide a GitHub Personal Access Token as the first argument."
    Write-Host "Usage: .\push-to-github.ps1 YOUR_GITHUB_TOKEN"
    exit 1
}

$owner = "hnbtapplications"
$repo  = "HNBTInventoryMgmt"
$branch = "main"
$localRoot = "c:\Users\Admin\Downloads\Updated_Refub"
$remoteFolder = "refurbished-laptop"

$headers = @{
    "Authorization" = "token $token"
    "Accept"        = "application/vnd.github.v3+json"
    "Content-Type"  = "application/json"
}

# Recursively get all files excluding node_modules, dist, .git, etc.
$filesToPush = Get-ChildItem -Path $localRoot -File -Recurse | Where-Object {
    $_.FullName -notmatch "\\node_modules\\" -and
    $_.FullName -notmatch "\\dist\\" -and
    $_.FullName -notmatch "\\\.git\\" -and
    $_.FullName -notmatch "\\patch-main\.cjs"
}

function Get-GitHubFileSHA($path) {
    try {
        $url = "https://api.github.com/repos/$owner/$repo/contents/$path?ref=$branch"
        $res = Invoke-RestMethod -Uri $url -Headers $headers -Method GET
        return $res.sha
    } catch {
        return $null
    }
}

function Push-FileToGitHub($fileInfo) {
    $relativePath = $fileInfo.FullName.Substring($localRoot.Length + 1)
    $repoPath = "$remoteFolder/$relativePath" -replace '\\', '/'

    $bytes = [System.IO.File]::ReadAllBytes($fileInfo.FullName)
    $b64   = [Convert]::ToBase64String($bytes)

    $existingSHA = Get-GitHubFileSHA $repoPath
    $message = if ($existingSHA) { "Update $repoPath" } else { "Add $repoPath" }

    $body = @{
        message = $message
        content = $b64
        branch  = $branch
    }
    if ($existingSHA) { $body.sha = $existingSHA }

    $jsonBody = $body | ConvertTo-Json -Depth 5
    $url = "https://api.github.com/repos/$owner/$repo/contents/$repoPath"

    try {
        Invoke-RestMethod -Uri $url -Headers $headers -Method PUT -Body $jsonBody | Out-Null
        Write-Host "PUSHED: $repoPath"
    } catch {
        Write-Host "ERROR ($repoPath): $($_.Exception.Message)"
    }
}

Write-Host "== Pushing Refurbished Laptop app to github.com/$owner/$repo/$remoteFolder =="
foreach ($file in $filesToPush) {
    Push-FileToGitHub $file
}
Write-Host "== Done! Next step: Configure Vercel Project 'hnbt-refurbished-laptop-standalone' Root Directory to '$remoteFolder' =="
