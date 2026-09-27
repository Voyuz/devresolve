param([switch]$Approve, [switch]$CheckOnly)
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$taskRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$toolsRoot = Join-Path $taskRoot '.local-tools'
$nodeRoot = Join-Path $toolsRoot 'node'
$bobRoot = Join-Path $toolsRoot 'bob'
function Emit([string]$stage, [string]$message) {
  @{ stage = $stage; message = $message } | ConvertTo-Json -Compress | Write-Output
}
function NodeReady([string]$command) {
  if (-not $command -or -not (Test-Path -LiteralPath $command)) { return $false }
  $version = & $command --version 2>$null
  return ($LASTEXITCODE -eq 0 -and $version -match '^v(\d+)\.' -and [int]$Matches[1] -ge 24)
}
function Download([string]$uri, [string]$target) { Invoke-WebRequest -Uri $uri -OutFile $target -UseBasicParsing -TimeoutSec 180 }
$nodeCommand = Join-Path $nodeRoot 'node.exe'
if (-not (NodeReady $nodeCommand)) {
  $systemNode = Get-Command node.exe -ErrorAction SilentlyContinue
  $nodeCommand = if ($systemNode) { $systemNode.Source } else { '' }
}
if ($CheckOnly) { Emit 'check' "Node 24 ready: $(NodeReady $nodeCommand)"; exit 0 }
if (-not $Approve) { Emit 'failed' 'Explicit approval is required. Run with -Approve after reviewing the setup.'; exit 1 }
$lock = $null
$stage = 'prepare'
$savedCredentials = @{}
$credentialNames = @('BOB_API_KEY', 'BOBSHELL_API_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'GITHUB_TOKEN', 'DEVRESOLVE_REVIEW_TOKEN', 'DEVRESOLVE_SESSION_SECRET')
foreach ($name in $credentialNames) {
  $savedCredentials[$name] = [Environment]::GetEnvironmentVariable($name, 'Process')
  [Environment]::SetEnvironmentVariable($name, $null, 'Process')
}
try {
  New-Item -ItemType Directory -Path $toolsRoot -Force | Out-Null
  $lockPath = Join-Path $toolsRoot 'setup.lock'
  $lock = [IO.File]::Open($lockPath, [IO.FileMode]::OpenOrCreate, [IO.FileAccess]::ReadWrite, [IO.FileShare]::None)
  $stage = 'node'
  if (-not (NodeReady $nodeCommand)) {
    Emit $stage 'Downloading Node.js 24 into this project.'
    $architecture = [Runtime.InteropServices.RuntimeInformation]::OSArchitecture.ToString().ToLowerInvariant()
    if ($architecture -notin @('x64', 'arm64')) { throw 'Unsupported Windows architecture.' }
    $releases = Invoke-RestMethod 'https://nodejs.org/dist/index.json' -TimeoutSec 60
    $release = $releases | Where-Object { $_.version -match '^v24\.\d+\.\d+$' -and $_.files -contains "win-$architecture-zip" } | Select-Object -First 1
    if (-not $release) { throw 'Node.js 24 release not found.' }
    $archiveName = "node-$($release.version)-win-$architecture.zip"
    $base = "https://nodejs.org/dist/$($release.version)"
    $checksums = (Invoke-WebRequest "$base/SHASUMS256.txt" -UseBasicParsing -TimeoutSec 60).Content
    $match = [regex]::Match($checksums, '(?m)^([a-f0-9]{64})\s+' + [regex]::Escape($archiveName) + '\s*$')
    if (-not $match.Success) { throw 'Node.js checksum not found.' }
    $archive = Join-Path $toolsRoot $archiveName
    Download "$base/$archiveName" $archive
    if ((Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash.ToLowerInvariant() -ne $match.Groups[1].Value) { throw 'Node.js checksum verification failed.' }
    $extracted = Join-Path $toolsRoot 'node-download'
    Expand-Archive -LiteralPath $archive -DestinationPath $extracted -Force
    New-Item -ItemType Directory -Path $nodeRoot -Force | Out-Null
    Copy-Item -Path (Join-Path $extracted "node-$($release.version)-win-$architecture/*") -Destination $nodeRoot -Recurse -Force
    $nodeCommand = Join-Path $nodeRoot 'node.exe'
    if (-not (NodeReady $nodeCommand)) { throw 'Installed Node.js did not pass verification.' }
  }
  Emit $stage 'Node.js 24 or later is available.'
  $env:PATH = "$(Split-Path $nodeCommand);$bobRoot;$env:PATH"
  $stage = 'bob'
  $candidate = Join-Path $bobRoot 'node_modules/bobshell/dist/bob.js'
  $existingBob = Get-Command bob.cmd -ErrorAction SilentlyContinue
  if (-not $existingBob -and $env:APPDATA) {
    $userShim = Join-Path $env:APPDATA 'npm/bob.cmd'
    if (Test-Path -LiteralPath $userShim) { $existingBob = @{ Source = $userShim } }
  }
  $compatible = $false
  if (Test-Path -LiteralPath $candidate) {
    $help = & $nodeCommand $candidate run --help 2>&1 | Out-String
    $compatible = $LASTEXITCODE -eq 0 -and $help -match '--format' -and $help -match '--mode'
  } elseif ($existingBob) {
    $help = & $existingBob.Source run --help 2>&1 | Out-String
    $compatible = $LASTEXITCODE -eq 0 -and $help -match '--format' -and $help -match '--mode'
  }
  if (-not $compatible) {
    Emit $stage 'Downloading the official IBM Bob Shell 2 package.'
    $vendor = 'https://s3.us-south.cloud-object-storage.appdomain.cloud/bob-shell'
    $version = (Invoke-WebRequest "$vendor/bobshell2-version.txt" -UseBasicParsing -TimeoutSec 60).Content.Trim()
    if ($version -notmatch '^2\.\d+\.\d+$') { throw 'Invalid Bob Shell 2 release version.' }
    $expectedHash = (Invoke-WebRequest "$vendor/bobshell-$version.tgz.sha256" -UseBasicParsing -TimeoutSec 60).Content.Trim().ToLowerInvariant()
    if ($expectedHash -notmatch '^[a-f0-9]{64}$') { throw 'Invalid Bob Shell checksum.' }
    $package = Join-Path $toolsRoot "bobshell-$version.tgz"
    Download "$vendor/bobshell-$version.tgz?Signature=$expectedHash" $package
    if ((Get-FileHash -LiteralPath $package -Algorithm SHA256).Hash.ToLowerInvariant() -ne $expectedHash) { throw 'Bob Shell checksum verification failed.' }
    $npm = Join-Path (Split-Path $nodeCommand) 'node_modules/npm/bin/npm-cli.js'
    if (-not (Test-Path -LiteralPath $npm)) { throw 'npm is missing from this Node installation.' }
    $env:NPM_CONFIG_USERCONFIG = Join-Path $toolsRoot 'setup.npmrc'
    Set-Content -LiteralPath $env:NPM_CONFIG_USERCONFIG -Value 'registry=https://registry.npmjs.org/'
    $env:NPM_CONFIG_CACHE = Join-Path $toolsRoot 'npm-cache'
    Emit $stage 'Installing Bob Shell. This can take several minutes.'
    & $nodeCommand $npm install --global --prefix $bobRoot --registry=https://registry.npmjs.org/ --allow-scripts=@officecli/officecli --no-audit --no-fund --loglevel=error $package *> (Join-Path $toolsRoot 'npm-install.log')
    if ($LASTEXITCODE -ne 0) { throw 'npm failed.' }
    $help = & $nodeCommand $candidate run --help 2>&1 | Out-String
    if ($LASTEXITCODE -ne 0 -or $help -notmatch '--format' -or $help -notmatch '--mode') { throw 'Bob Shell did not pass verification.' }
  }
  Emit 'complete' 'Node and Bob Shell are ready. Configure your Bob API key in .env.local; restart the app if its Node version was upgraded.'
} catch {
  $reason = 'Check internet access and local write permissions.'
  if ($_.Exception.Message -match 'checksum') { $reason = 'Package integrity verification failed. No unverified package was installed.' }
  elseif ($_.Exception.Message -eq 'npm failed.') { $reason = 'npm failed. Inspect .local-tools/npm-install.log locally before retrying.' }
  elseif ($stage -eq 'prepare') { $reason = 'Another installer may be running, or the local folder is not writable.' }
  Emit 'failed' "Installation failed during $stage. $reason See docs/bob-setup.md for retry steps."
  exit 1
} finally {
  if ($lock) { $lock.Dispose() }
  foreach ($name in $credentialNames) { [Environment]::SetEnvironmentVariable($name, $savedCredentials[$name], 'Process') }
}
