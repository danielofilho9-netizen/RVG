<#
  Servidor local de desenvolvimento/pré-visualização (Windows PowerShell 5.1, sem dependências).
  Uso:   powershell -ExecutionPolicy Bypass -File server.ps1                   (serve esta pasta em http://localhost:8080/)
         powershell -ExecutionPolicy Bypass -File server.ps1 -Root dist -Port 8082   (serve o resultado do build)

  Comportamento parecido com uma hospedagem estática, para testar de verdade:
    - /pasta/ entrega /pasta/index.html; arquivo inexistente => 404.html com status 404
    - redirecionamentos de _redirects (301) e cabeçalhos de _headers (CSP, nosniff, cache etc.)
    - compressão gzip para texto e suporte a Range (vídeo)
  Somente para uso local: não é um servidor de produção.
#>
param(
    [string]$Root = $PSScriptRoot,
    [int]$Port = 8080,
    [switch]$HonorCache   # respeita Cache-Control do _headers (útil para testar o build); por padrão o desenvolvimento usa no-store
)

$Root = (Resolve-Path $Root).Path
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()
Write-Host "Servidor em http://localhost:$Port/  (raiz: $Root)"

$mimeTypes = @{
    '.html' = 'text/html; charset=utf-8'; '.css' = 'text/css; charset=utf-8'; '.js' = 'application/javascript; charset=utf-8'
    '.json' = 'application/json'; '.webmanifest' = 'application/manifest+json'; '.xml' = 'application/xml; charset=utf-8'; '.txt' = 'text/plain; charset=utf-8'
    '.png' = 'image/png'; '.jpg' = 'image/jpeg'; '.jpeg' = 'image/jpeg'; '.webp' = 'image/webp'; '.svg' = 'image/svg+xml'; '.ico' = 'image/x-icon'
    '.mp4' = 'video/mp4'; '.woff2' = 'font/woff2'
}
$compressible = '.html', '.css', '.js', '.json', '.webmanifest', '.xml', '.txt', '.svg'

# --- _headers (formato Netlify/Cloudflare Pages): linha sem recuo = padrão de caminho; linhas recuadas = cabeçalhos ---
$headerRules = @()
$headersFile = Join-Path $Root '_headers'
if (Test-Path $headersFile) {
    $current = $null
    foreach ($line in (Get-Content $headersFile -Encoding UTF8)) {
        if (-not $line.Trim() -or $line.TrimStart().StartsWith('#')) { continue }
        if ($line -match '^\S') {
            $pattern = '^' + ([regex]::Escape($line.Trim()).Replace('\*', '.*')) + '$'
            $current = @{ regex = $pattern; headers = @() }; $headerRules += $current
        } elseif ($current) {
            $i = $line.IndexOf(':'); if ($i -gt 0) { $current.headers += , @($line.Substring(0, $i).Trim(), $line.Substring($i + 1).Trim()) }
        }
    }
}
# --- _redirects: "origem destino status" ---
$redirects = @()
$redirectsFile = Join-Path $Root '_redirects'
if (Test-Path $redirectsFile) {
    foreach ($line in (Get-Content $redirectsFile -Encoding UTF8)) {
        if (-not $line.Trim() -or $line.TrimStart().StartsWith('#')) { continue }
        $parts = $line.Trim() -split '\s+'
        if ($parts.Count -ge 2) { $redirects += , @($parts[0], $parts[1], $(if ($parts.Count -ge 3) { [int]$parts[2] } else { 301 })) }
    }
}

function Send-File($context, [string]$filePath, [int]$status) {
    $req = $context.Request; $res = $context.Response
    $ext = [IO.Path]::GetExtension($filePath).ToLower()
    $ct = $mimeTypes[$ext]; if (-not $ct) { $ct = 'application/octet-stream' }
    $bytes = [IO.File]::ReadAllBytes($filePath)
    $res.StatusCode = $status
    $res.ContentType = $ct
    $res.AddHeader('Accept-Ranges', 'bytes')
    if (-not $HonorCache) { $res.AddHeader('Cache-Control', 'no-store') }
    $reqPath = $req.Url.AbsolutePath
    foreach ($rule in $headerRules) { if ($reqPath -match $rule.regex) { foreach ($h in $rule.headers) { if ($h[0] -eq 'Cache-Control' -and -not $HonorCache) { continue }; $res.AddHeader($h[0], $h[1]) } } }
    $range = $req.Headers['Range']
    if ($status -eq 200 -and $range -match 'bytes=(\d*)-(\d*)') {
        $start = if ($Matches[1]) { [int64]$Matches[1] } else { 0 }
        $end = if ($Matches[2]) { [int64]$Matches[2] } else { $bytes.Length - 1 }
        if ($end -ge $bytes.Length) { $end = $bytes.Length - 1 }
        $len = $end - $start + 1
        $res.StatusCode = 206
        $res.AddHeader('Content-Range', "bytes $start-$end/$($bytes.Length)")
        $res.ContentLength64 = $len
        $res.OutputStream.Write($bytes, [int]$start, [int]$len)
        return
    }
    if ($compressible -contains $ext -and ($req.Headers['Accept-Encoding'] -match 'gzip')) {
        $ms = New-Object IO.MemoryStream
        $gz = New-Object IO.Compression.GZipStream($ms, [IO.Compression.CompressionMode]::Compress)
        $gz.Write($bytes, 0, $bytes.Length); $gz.Close()
        $bytes = $ms.ToArray()
        $res.AddHeader('Content-Encoding', 'gzip'); $res.AddHeader('Vary', 'Accept-Encoding')
    }
    $res.ContentLength64 = $bytes.Length
    if ($req.HttpMethod -ne 'HEAD') { $res.OutputStream.Write($bytes, 0, $bytes.Length) }
}

while ($listener.IsListening) {
    $context = $listener.GetContext()
    try {
        $path = [Uri]::UnescapeDataString($context.Request.Url.AbsolutePath)

        # redirecionamentos permanentes
        $redirected = $false
        foreach ($r in $redirects) {
            if ($path -eq $r[0]) { $context.Response.StatusCode = $r[2]; $context.Response.RedirectLocation = $r[1]; $redirected = $true; break }
        }
        if ($redirected) { continue }

        # impede sair da pasta raiz e expõe apenas arquivos publicáveis
        $relative = $path.TrimStart('/').Replace('/', [IO.Path]::DirectorySeparatorChar)
        $target = [IO.Path]::GetFullPath((Join-Path $Root $relative))
        $hidden = $relative -match '(^|\\)(\.|tools\\|docs\\|_headers$|_redirects$)' -or $relative -match '\.ps1$'
        if (-not $target.StartsWith($Root) -or $hidden) {
            $notFound = Join-Path $Root '404.html'
            if (Test-Path $notFound) { Send-File $context $notFound 404 } else { $context.Response.StatusCode = 404 }
            continue
        }
        if (Test-Path $target -PathType Container) {
            if (-not $path.EndsWith('/')) { $context.Response.StatusCode = 301; $context.Response.RedirectLocation = $path + '/'; continue }
            $target = Join-Path $target 'index.html'
        }
        if (Test-Path $target -PathType Leaf) {
            Send-File $context $target 200
        } else {
            $notFound = Join-Path $Root '404.html'
            if (Test-Path $notFound) { Send-File $context $notFound 404 } else { $context.Response.StatusCode = 404 }
        }
    } catch {
        try { $context.Response.StatusCode = 500 } catch {}
    } finally {
        try { $context.Response.Close() } catch {}
    }
}
