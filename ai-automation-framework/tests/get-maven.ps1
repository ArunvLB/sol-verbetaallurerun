$ErrorActionPreference = 'Stop'
$ver = '3.9.9'
$zipName = "apache-maven-$ver-bin.zip"
$urls = @(
  "https://repo.maven.apache.org/maven2/org/apache/maven/apache-maven/$ver/$zipName",
  "https://archive.apache.org/dist/maven/maven-3/$ver/binaries/$zipName"
)
$tempZip = Join-Path $PSScriptRoot ("maven-" + [guid]::NewGuid().ToString('N') + ".zip")

Write-Host "Downloading Maven $ver..."
$downloaded = $false
foreach ($u in $urls) {
  Write-Host "Trying $u"
  try {
    & curl.exe -L $u -o $tempZip
    if ((Get-Item $tempZip).Length -gt 1000000) { # sanity: >1MB
      $downloaded = $true
      break
    }
  } catch {
    Write-Host "Failed: $($_.Exception.Message)"
  }
}

if (-not $downloaded) { throw "Could not download Maven $ver" }

$destDir = Join-Path $PSScriptRoot 'maven'
if (Test-Path $destDir) { Remove-Item $destDir -Recurse -Force }
Expand-Archive -Path $tempZip -DestinationPath $destDir -Force
Remove-Item $tempZip
Write-Host "Maven unpacked to $destDir"
