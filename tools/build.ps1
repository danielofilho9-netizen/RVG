<#
  Build do site estático -> pasta dist/ (pronta para publicar). Windows PowerShell 5.1, sem dependências.

  Uso:
    powershell -ExecutionPolicy Bypass -File tools\build.ps1 -SiteUrl https://www.seudominio.com.br
    powershell -ExecutionPolicy Bypass -File tools\build.ps1 -SiteUrl https://preview.seudominio.com.br -Environment preview
    powershell -ExecutionPolicy Bypass -File tools\build.ps1            (sem domínio: gera o site, mas SEM canonical/sitemap/dados estruturados absolutos)

  O que o build faz:
    * copia só o que é publicável (páginas, css, js, ícones e as imagens/vídeo realmente referenciados);
      ficam de fora: *-original.*, tools/, docs/, scripts .ps1, arquivos soltos e mídia sem uso;
    * canonical, og:url, og:image e twitter:image absolutos (a partir do domínio informado);
    * JSON-LD (LocalBusiness + WebSite na home; Service + BreadcrumbList em cada serviço), montado com os
      dados reais de tools/site.config.json e com texto lido da própria página (sem duplicar conteúdo);
    * sitemap.xml (somente URLs indexáveis, sem datas inventadas) e robots.txt do ambiente;
    * versão (?v=hash) em css/js, permitindo cache longo sem servir arquivo velho;
    * ambiente preview: noindex nas páginas, Disallow: / no robots.txt e X-Robots-Tag no _headers;
    * -Hsts adiciona Strict-Transport-Security (sem includeSubDomains/preload) — use só com HTTPS confirmado;
    * valida links internos/âncoras, canonical único, JSON-LD (JSON válido), sitemap e dados do negócio x conteúdo visível.
#>
param(
    [string]$SiteUrl = '',
    [ValidateSet('production', 'preview')][string]$Environment = '',
    [string]$Out = 'dist',
    [switch]$Hsts
)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$config = Get-Content (Join-Path $PSScriptRoot 'site.config.json') -Raw -Encoding UTF8 | ConvertFrom-Json
if (-not $SiteUrl) { $SiteUrl = [string]$config.siteUrl }
if (-not $Environment) { $Environment = if ($config.environment) { [string]$config.environment } else { 'production' } }
$SiteUrl = $SiteUrl.Trim().TrimEnd('/')
$errors = New-Object System.Collections.ArrayList
$warnings = New-Object System.Collections.ArrayList
function Warn($m) { [void]$warnings.Add($m) }
function Fail($m) { [void]$errors.Add($m) }

if ($SiteUrl) {
    if ($SiteUrl -notmatch '^https?://[^/\s]+$') { throw "SiteUrl inválido ('$SiteUrl'). Use apenas esquema + domínio, sem caminho. Ex.: https://www.exemplo.com.br" }
    if ($SiteUrl -notmatch '^https://' -and $SiteUrl -notmatch '^http://localhost') { Warn "SiteUrl sem HTTPS: $SiteUrl (use https:// em produção)." }
} else {
    Warn 'Domínio não informado (-SiteUrl): canonical/og:url/og:image absolutos, sitemap.xml e JSON-LD NÃO foram gerados. Informe o domínio de produção confirmado.'
}

# ---------- pasta de saída (só apaga dentro do projeto) ----------
$outDir = [IO.Path]::GetFullPath((Join-Path $root $Out))
if (-not $outDir.StartsWith($root + [IO.Path]::DirectorySeparatorChar) -or $outDir -eq $root) { throw "Saída fora do projeto: $outDir" }
if (Test-Path $outDir) { [IO.Directory]::Delete($outDir, $true) }
New-Item -ItemType Directory -Force $outDir | Out-Null

function Read-Text($p) { [IO.File]::ReadAllText($p, [Text.Encoding]::UTF8) }
function Write-Text($p, $t) { $d = Split-Path $p -Parent; if (-not (Test-Path $d)) { New-Item -ItemType Directory -Force $d | Out-Null }; [IO.File]::WriteAllText($p, $t, (New-Object Text.UTF8Encoding($false))) }
function Copy-Out([string]$rel) {
    $src = Join-Path $root $rel
    if (-not (Test-Path $src -PathType Leaf)) { Fail "Arquivo referenciado não existe: $rel"; return }
    $dst = Join-Path $outDir $rel
    $d = Split-Path $dst -Parent; if (-not (Test-Path $d)) { New-Item -ItemType Directory -Force $d | Out-Null }
    Copy-Item $src $dst -Force
}

# ---------- páginas ----------
$pages = @()
$pages += [pscustomobject]@{ file = 'index.html'; url = '/'; type = 'home' }
foreach ($d in Get-ChildItem (Join-Path $root 'servicos') -Directory) {
    if (Test-Path (Join-Path $d.FullName 'index.html')) { $pages += [pscustomobject]@{ file = "servicos/$($d.Name)/index.html"; url = "/servicos/$($d.Name)/"; type = 'service' } }
}
$pages += [pscustomobject]@{ file = '404.html'; url = ''; type = 'notfound' }

# ---------- arquivos estáticos fixos ----------
$fixed = 'css/styles.css', 'js/app.js', 'js/js-flag.js', 'favicon.ico', 'favicon-96x96.png', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'site.webmanifest', '_redirects', '.htaccess'
foreach ($f in $fixed) { Copy-Out $f }

# ---------- versão dos arquivos css/js ----------
function Short-Hash([string]$rel) { $b = [IO.File]::ReadAllBytes((Join-Path $root $rel)); $h = [Security.Cryptography.SHA256]::Create().ComputeHash($b); (($h[0..4] | ForEach-Object { $_.ToString('x2') }) -join '') }
$versioned = @{ 'css/styles.css' = (Short-Hash 'css/styles.css'); 'js/app.js' = (Short-Hash 'js/app.js'); 'js/js-flag.js' = (Short-Hash 'js/js-flag.js') }

# ---------- imagens referenciadas (HTML, CSS, manifest) ----------
$assetRefs = New-Object System.Collections.Generic.HashSet[string]
function Collect-Assets([string]$text) {
    foreach ($m in [regex]::Matches($text, '(?<![\w/.-])(?:\.\./)*/?(assets/[A-Za-z0-9_\-./]+\.(?:jpg|jpeg|png|webp|mp4|svg|ico))')) { [void]$assetRefs.Add($m.Groups[1].Value) }
}
foreach ($pg in $pages) { Collect-Assets (Read-Text (Join-Path $root $pg.file)) }
Collect-Assets (Read-Text (Join-Path $root 'css/styles.css'))
foreach ($a in $assetRefs) { Copy-Out $a }

# ---------- dados do negócio (JSON-LD) ----------
$biz = $config.business
function Abs([string]$path) { if ($path.StartsWith('/')) { return $SiteUrl + $path } else { return $path } }
$orgId = "$SiteUrl/#organization"
function Strip-Tags([string]$s) { ([regex]::Replace($s, '<[^>]+>', '')).Replace('&amp;', '&').Trim() }
function Meta-Content([string]$html, [string]$key) {
    $m = [regex]::Match($html, '<meta\s+(?:property|name)="' + [regex]::Escape($key) + '"\s+content="([^"]*)"')
    if ($m.Success) { $m.Groups[1].Value.Replace('&amp;', '&') } else { '' }
}
function To-Json($o) { ($o | ConvertTo-Json -Depth 12 -Compress) }

$sitemapUrls = New-Object System.Collections.ArrayList
$canonicals = @{}
$report = @()

foreach ($pg in $pages) {
    $html = Read-Text (Join-Path $root $pg.file)
    $title = [regex]::Match($html, '<title>([^<]*)</title>').Groups[1].Value
    $robots = Meta-Content $html 'robots'
    $indexable = ($robots -notmatch 'noindex')

    # versão dos arquivos css/js
    foreach ($k in $versioned.Keys) { $html = [regex]::Replace($html, '((?:href|src)="(?:\.\./)*/?' + [regex]::Escape($k) + ')"', ('$1?v=' + $versioned[$k] + '"')) }

    if ($Environment -eq 'preview') {
        $html = [regex]::Replace($html, '<meta name="robots" content="[^"]*">', '<meta name="robots" content="noindex, nofollow">')
        $indexable = $false
    }

    if ($SiteUrl -and $pg.url) {
        $self = $SiteUrl + $pg.url
        $html = [regex]::Replace($html, '(<link rel="canonical" href=")([^"]*)(")', { param($m) $m.Groups[1].Value + (Abs $m.Groups[2].Value) + $m.Groups[3].Value })
        foreach ($key in 'og:url', 'og:image', 'twitter:image') {
            $html = [regex]::Replace($html, '(<meta (?:property|name)="' + [regex]::Escape($key) + '" content=")(/[^"]*)(")', { param($m) $m.Groups[1].Value + (Abs $m.Groups[2].Value) + $m.Groups[3].Value })
        }
        # --- JSON-LD ---
        $graph = @()
        if ($pg.type -eq 'home') {
            $desc = Meta-Content $html 'description'
            $graph += [ordered]@{
                '@type' = 'LocalBusiness'; '@id' = $orgId; name = $biz.name; url = "$SiteUrl/"
                logo = [ordered]@{ '@type' = 'ImageObject'; url = "$SiteUrl/icon-512.png"; width = 512; height = 512 }
                image = "$SiteUrl/assets/img/og-image.jpg"; description = $desc; slogan = $biz.slogan; foundingDate = $biz.foundingDate
                telephone = $biz.telephone; email = $biz.email
                address = [ordered]@{ '@type' = 'PostalAddress'; streetAddress = $biz.address.streetAddress; addressLocality = $biz.address.addressLocality; addressRegion = $biz.address.addressRegion; addressCountry = $biz.address.addressCountry }
                sameAs = @($biz.sameAs)
            }
            $graph += [ordered]@{ '@type' = 'WebSite'; '@id' = "$SiteUrl/#website"; url = "$SiteUrl/"; name = $biz.name; inLanguage = 'pt-BR'; publisher = [ordered]@{ '@id' = $orgId } }
        } elseif ($pg.type -eq 'service') {
            $h1 = Strip-Tags ([regex]::Match($html, '(?s)<h1[^>]*>(.*?)</h1>').Groups[1].Value)
            $lead = Strip-Tags ([regex]::Match($html, '(?s)<p class="service-hero_lead">(.*?)</p>').Groups[1].Value)
            $crumb = Strip-Tags ([regex]::Match($html, '(?s)<li aria-current="page">(.*?)</li>').Groups[1].Value)
            $img = Meta-Content $html 'og:image'
            if (-not ($h1 -and $lead -and $crumb)) { Fail "JSON-LD: não foi possível ler h1/lead/breadcrumb em $($pg.file)" }
            $graph += [ordered]@{
                '@type' = 'Service'; '@id' = "$self#service"; name = $h1; serviceType = $crumb; description = $lead; url = $self; image = $img
                provider = [ordered]@{ '@type' = 'LocalBusiness'; '@id' = $orgId; name = $biz.name; url = "$SiteUrl/" }
            }
            $graph += [ordered]@{ '@type' = 'BreadcrumbList'; itemListElement = @(
                [ordered]@{ '@type' = 'ListItem'; position = 1; name = 'Início'; item = "$SiteUrl/" },
                [ordered]@{ '@type' = 'ListItem'; position = 2; name = $crumb; item = $self }) }
        }
        if ($graph.Count -gt 0) {
            $json = To-Json ([ordered]@{ '@context' = 'https://schema.org'; '@graph' = $graph })
            try { [void]($json | ConvertFrom-Json) } catch { Fail "JSON-LD inválido em $($pg.file)" }
            $html = $html.Replace('</head>', '    <script type="application/ld+json">' + $json + '</script>' + "`n" + '</head>')
        }
        # canonical único
        $canon = [regex]::Match($html, '<link rel="canonical" href="([^"]*)"').Groups[1].Value
        if ($canon -ne $self) { Fail "canonical de $($pg.file) é '$canon' (esperado '$self')" }
        if ($canonicals.ContainsKey($canon)) { Fail "canonical duplicado: $canon" } else { $canonicals[$canon] = $pg.file }
        if ($indexable) { [void]$sitemapUrls.Add($self) }
    }
    Write-Text (Join-Path $outDir $pg.file) $html
    $report += ('{0,-48} {1}{2}' -f $pg.file, $title, $(if ($indexable) { '' } else { '   [noindex]' }))
}

# ---------- robots.txt e sitemap.xml ----------
if ($Environment -eq 'preview') {
    Write-Text (Join-Path $outDir 'robots.txt') "# Ambiente de teste/preview: nao indexar.`nUser-agent: *`nDisallow: /`n"
} else {
    $rb = "User-agent: *`nAllow: /`n"
    if ($SiteUrl) { $rb += "`nSitemap: $SiteUrl/sitemap.xml`n" }
    Write-Text (Join-Path $outDir 'robots.txt') $rb
}
if ($SiteUrl -and $Environment -eq 'production') {
    $sm = New-Object System.Text.StringBuilder
    [void]$sm.AppendLine('<?xml version="1.0" encoding="UTF-8"?>')
    [void]$sm.AppendLine('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')
    foreach ($u in $sitemapUrls) { [void]$sm.AppendLine('  <url><loc>' + [Security.SecurityElement]::Escape($u) + '</loc></url>') }
    [void]$sm.AppendLine('</urlset>')
    Write-Text (Join-Path $outDir 'sitemap.xml') $sm.ToString()
}

# ---------- _headers (preview: X-Robots-Tag; -Hsts: HSTS) ----------
$headers = (Read-Text (Join-Path $root '_headers')) -replace "`r`n", "`n"
$extra = @()
if ($Environment -eq 'preview') { $extra += '  X-Robots-Tag: noindex, nofollow' }
if ($Hsts) { $extra += '  Strict-Transport-Security: max-age=31536000' }
if ($extra.Count -gt 0) { $headers = $headers.Replace("/*`n", "/*`n" + ($extra -join "`n") + "`n") }
Write-Text (Join-Path $outDir '_headers') ($headers -replace "`r`n", "`n")
if ($Environment -eq 'preview' -or $Hsts) {
    $ht = Read-Text (Join-Path $outDir '.htaccess')
    $add = ''
    if ($Environment -eq 'preview') { $add += "    Header always set X-Robots-Tag `"noindex, nofollow`"`n" }
    if ($Hsts) { $add += "    Header always set Strict-Transport-Security `"max-age=31536000`"`n" }
    $ht = $ht.Replace("<IfModule mod_headers.c>`n", "<IfModule mod_headers.c>`n" + $add)
    Write-Text (Join-Path $outDir '.htaccess') $ht
}

# ---------- validações ----------
$distFiles = @{}; foreach ($f in Get-ChildItem $outDir -Recurse -File) { $distFiles[$f.FullName.Substring($outDir.Length + 1).Replace('\', '/')] = $true }
$idCache = @{}
function Ids-Of([string]$rel) { if (-not $idCache.ContainsKey($rel)) { $idCache[$rel] = @([regex]::Matches((Read-Text (Join-Path $outDir $rel)), '\sid="([^"]+)"') | ForEach-Object { $_.Groups[1].Value }) }; $idCache[$rel] }
$pageByUrl = @{}; foreach ($pg in $pages) { if ($pg.url) { $pageByUrl[$pg.url] = $pg.file } }

foreach ($pg in $pages) {
    $html = Read-Text (Join-Path $outDir $pg.file)
    $baseDir = if ($pg.type -eq 'notfound') { '' } else { (Split-Path $pg.file -Parent).Replace('\', '/') }
    foreach ($m in [regex]::Matches($html, '(?:href|src)="([^"]+)"')) {
        $ref = $m.Groups[1].Value
        if ($ref -match '^(https?:|mailto:|tel:|data:|javascript:)' -or $ref.StartsWith('//')) { continue }
        $path, $frag = $ref, ''
        if ($ref.Contains('#')) { $path = $ref.Substring(0, $ref.IndexOf('#')); $frag = $ref.Substring($ref.IndexOf('#') + 1) }
        $path = ($path -replace '\?.*$', '')
        if ($path -eq '' -and $frag -eq '') { continue }
        if ($path.StartsWith('/')) { $resolved = $path.TrimStart('/') } elseif ($path -eq '') { $resolved = $pg.file } else {
            $parts = New-Object System.Collections.ArrayList; if ($baseDir) { foreach ($s in $baseDir.Split('/')) { [void]$parts.Add($s) } }
            foreach ($s in $path.Split('/')) { if ($s -eq '..') { if ($parts.Count) { $parts.RemoveAt($parts.Count - 1) } } elseif ($s -ne '.' -and $s -ne '') { [void]$parts.Add($s) } }
            $resolved = ($parts -join '/') + $(if ($path.EndsWith('/')) { '/' } else { '' })
        }
        $resolved = $resolved.TrimStart('/')
        if ($resolved -eq '' -or $resolved.EndsWith('/')) { $resolved += 'index.html' }
        if (-not $distFiles.ContainsKey($resolved)) { Fail "[$($pg.file)] link/arquivo inexistente: '$ref' -> $resolved"; continue }
        if ($frag -and $resolved.EndsWith('.html')) { if ((Ids-Of $resolved) -notcontains $frag) { Fail "[$($pg.file)] âncora inexistente: '$ref'" } }
    }
    # exatamente um h1; sem atributo style inline (CSP)
    if ([regex]::Matches($html, '<h1[\s>]').Count -ne 1) { Fail "[$($pg.file)] deve ter exatamente um <h1>" }
    if ($html -match '\sstyle="') { Fail "[$($pg.file)] atributo style inline (bloqueado pela CSP)" }
}

# dados do negócio x conteúdo visível (home)
$homeOut = Read-Text (Join-Path $outDir 'index.html')
foreach ($pair in @(@('nome', $biz.name), @('telefone', $biz.telephoneVisible), @('e-mail', $biz.email), @('endereço', ($biz.address.streetAddress + ' — ' + $biz.address.addressLocality)))) {
    if (-not $homeOut.Contains([string]$pair[1])) { Fail "JSON-LD/negócio: '$($pair[0])' ($($pair[1])) não aparece na home" }
}
if ($homeOut -match '(?i)\b\d{5}-\d{3}\b') { Fail 'A home contém um CEP (decisão: não publicar).' }

# ---------- relatório ----------
Write-Host "`n== Build ($Environment) -> $outDir"
Write-Host ("   domínio: " + $(if ($SiteUrl) { $SiteUrl } else { '(não informado)' }))
$report | ForEach-Object { Write-Host "   $_" }
Write-Host ("   sitemap: " + $(if ($sitemapUrls.Count) { ($sitemapUrls -join ', ') } else { '(não gerado)' }))
Write-Host ("   arquivos: " + $distFiles.Count + ", " + [Math]::Round(((Get-ChildItem $outDir -Recurse -File | Measure-Object Length -Sum).Sum) / 1MB, 2) + ' MB')
foreach ($w in $warnings) { Write-Host "   AVISO: $w" -ForegroundColor Yellow }
foreach ($e in $errors) { Write-Host "   ERRO: $e" -ForegroundColor Red }
if ($errors.Count -gt 0) { Write-Host "`nBuild com $($errors.Count) erro(s)." -ForegroundColor Red; exit 1 }
Write-Host "`nBuild concluído sem erros." -ForegroundColor Green
