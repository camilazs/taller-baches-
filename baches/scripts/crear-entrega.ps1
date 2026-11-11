param([string]$OutputDirectory)
$ErrorActionPreference = 'Stop'
$project = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
if (-not $OutputDirectory) { $OutputDirectory = Join-Path (Split-Path $project -Parent) 'entregas' }
$output = [System.IO.Path]::GetFullPath($OutputDirectory)
[System.IO.Directory]::CreateDirectory($output) | Out-Null
$zipPath = Join-Path $output ('baches-entrega-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '.zip')
if (Test-Path -LiteralPath $zipPath) { throw 'Ya existe una entrega con este nombre. No se sobrescribió.' }
$files = [System.Collections.Generic.List[System.IO.FileInfo]]::new()
foreach ($name in @('package.json','server.mjs','vision.mjs','.env.example','.gitignore','INICIAR.cmd','README.md','VALIDACION.md','ENTREGA.md','GIT-CAMILA.md')) {
  $files.Add((Get-Item -LiteralPath (Join-Path $project $name)))
}
foreach ($folder in @('dist','tests','scripts','docs')) {
  foreach ($file in (Get-ChildItem -LiteralPath (Join-Path $project $folder) -Recurse -File)) {
    if ($file.Extension -notin @('.lnk','.zip') -and -not $file.Name.StartsWith('.env')) { $files.Add($file) }
  }
}
Add-Type -AssemblyName System.IO.Compression
$stream = [System.IO.File]::Open($zipPath, [System.IO.FileMode]::CreateNew)
$archive = [System.IO.Compression.ZipArchive]::new($stream, [System.IO.Compression.ZipArchiveMode]::Create)
$manifest = @()
try {
  foreach ($file in $files) {
    $relative = $file.FullName.Substring($project.TrimEnd('\').Length + 1).Replace('\','/')
    if ($relative.StartsWith('..') -or ($file.Name -like '.env*' -and $file.Name -ne '.env.example')) { throw 'Archivo no permitido en la entrega.' }
    $entry = $archive.CreateEntry('baches/' + $relative)
    $inputStream = [System.IO.File]::OpenRead($file.FullName)
    $entryStream = $entry.Open()
    try { $inputStream.CopyTo($entryStream) } finally { $entryStream.Dispose(); $inputStream.Dispose() }
    $manifest += [ordered]@{ path = $relative; sha256 = (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash.ToLowerInvariant() }
  }
  $entry = $archive.CreateEntry('baches/ENTREGA-MANIFEST.json')
  $writer = [System.IO.StreamWriter]::new($entry.Open(), [System.Text.UTF8Encoding]::new($false))
  try { $writer.Write((ConvertTo-Json -InputObject ([ordered]@{ createdAt = [DateTime]::UtcNow.ToString('o'); files = $manifest }) -Depth 6)) } finally { $writer.Dispose() }
} finally { $archive.Dispose(); $stream.Dispose() }
Write-Output $zipPath
