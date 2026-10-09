<#
  Verificação HTTP de um site publicado (ou de um servidor local): status, redirecionamentos, 404, canonical,
  robots/sitemap, títulos e descrições, h1, JSON-LD, ícones e cabeçalhos de segurança.
  Somente leitura (requisições GET/HEAD comuns). Não faz teste de carga nem exploração.

  Uso:
    powershell -ExecutionPolicy Bypass -File tools\check-site.ps1 -BaseUrl https://www.seudominio.com.br
    powershell -ExecutionPolicy Bypass -File tools\check-site.ps1 -BaseUrl http://localhost:8082 -Local
#>
param(
    [Parameter(Mandatory = $true)][string]$BaseUrl,
    [switch]$Local     # servidor local: não exige HTTPS/HSTS
)
$ErrorActionPreference = 'Stop'
$BaseUrl = $BaseUrl.TrimEnd('/')
$script:fail = 0; $script:pass = 0; $script:info = 0
function Ok($m) { $script:pass++; Write-Host ("  [ ok ] " + $m) -ForegroundColor Green }
function Bad($m) { $script:fail++; Write-Host ("  [FALHA] " + $m) -ForegroundColor Red }
function Info($m) { $script:info++; Write-Host ("  [info] " + $m) -ForegroundColor Yellow }
function Section($t) { Write-Host "`n== $t" }

function Get-Page([string]$url, [string]$method = 'GET') {
    $rq = [System.Net.HttpWebRequest]::Create($url)
    $rq.AllowAutoRedirect = $false; $rq.Method = $method; $rq.UserAgent = 'RVG-check-site/1.0'; $rq.Timeout = 20000
    $rq.Headers.Add('Accept-Encoding', 'gzip')
    try { $rs = $rq.GetResponse() } catch [System.Net.WebException] { $rs = $_.Exception.Response; if (-not $rs) { return [pscustomobject]@{ status = 0; headers = @{}; body = ''; location = ''; type = '' } } }
    $body = ''
    if ($method -eq 'GET') {
        $stream = $rs.GetResponseStream()
        if ($rs.Headers['Content-Encoding'] -eq 'gzip') { $stream = New-Object IO.Compression.GZipStream($stream, [IO.Compression.CompressionMode]::Decompress) }
        $ct = [string]$rs.ContentType
        if ($ct -match 'text|json|xml|javascript') { $sr = New-Object IO.StreamReader($stream, [Text.Encoding]::UTF8); $body = $sr.ReadToEnd(); $sr.Close() } else { $stream.Close() }
    }
    $h = @{}; foreach ($k in $rs.Headers.AllKeys) { $h[$k.ToLower()] = $rs.Headers[$k] }
    $o = [pscustomobject]@{ status = [int]$rs.StatusCode; headers = $h; body = $body; location = [string]$rs.Headers['Location']; type = [string]$rs.ContentType }
    $rs.Close(); $o
}

Section "Raiz, redirecionamentos e 404"
$landing = Get-Page "$BaseUrl/"
if ($landing.status -eq 200) { Ok "/ responde 200" } else { Bad "/ respondeu $($landing.status)" }
$r = Get-Page "$BaseUrl/index.html"
if ($r.status -in 301, 308) { Ok "/index.html redireciona ($($r.status)) para '$($r.location)'" } else { Info "/index.html respondeu $($r.status) (sem redirecionamento: o canonical da home evita duplicidade; veja docs/hospedagem-e-seguranca.md)" }
$nf = Get-Page "$BaseUrl/esta-pagina-nao-existe-$([guid]::NewGuid().ToString('N').Substring(0,6))"
if ($nf.status -eq 404) { Ok "URL inexistente responde 404 (e não 200/redirecionamento)" } else { Bad "URL inexistente respondeu $($nf.status) (esperado 404)" }
if ($nf.body -match 'noindex') { Ok "página 404 tem noindex" } else { Info "página 404 sem noindex detectado" }
if (-not $Local -and $BaseUrl.StartsWith('https://')) {
    $plain = Get-Page ('http://' + $BaseUrl.Substring(8) + '/')
    if ($plain.status -in 301, 308 -and $plain.location.StartsWith('https://')) { Ok "http:// redireciona para https://" } else { Bad "http:// respondeu $($plain.status) sem redirecionar para HTTPS" }
}

Section "robots.txt e sitemap.xml"
$rb = Get-Page "$BaseUrl/robots.txt"
if ($rb.status -eq 200) { Ok "robots.txt 200" } else { Bad "robots.txt $($rb.status)" }
$blocksAll = $rb.body -match '(?im)^\s*Disallow:\s*/\s*$'
if ($blocksAll) { Info "robots.txt bloqueia tudo (esperado SOMENTE em preview/teste)" } else { Ok "robots.txt permite rastreamento" }
$sitemapUrl = [regex]::Match($rb.body, '(?im)^\s*Sitemap:\s*(\S+)').Groups[1].Value
if ($sitemapUrl) { Ok "robots.txt informa o sitemap: $sitemapUrl" } elseif (-not $blocksAll) { Bad "robots.txt sem linha Sitemap" }
$urls = @()
if ($sitemapUrl) {
    $sm = Get-Page $sitemapUrl
    if ($sm.status -eq 200 -and $sm.type -match 'xml') { Ok "sitemap.xml 200 ($($sm.type))" } else { Bad "sitemap.xml: status $($sm.status), tipo '$($sm.type)'" }
    $urls = @([regex]::Matches($sm.body, '<loc>([^<]+)</loc>') | ForEach-Object { $_.Groups[1].Value })
    Write-Host "  URLs no sitemap: $($urls.Count)"
}

Section "Páginas indexáveis"
$seenTitles = @{}; $seenDescs = @{}
foreach ($u in $urls) {
    $p = Get-Page $u
    if ($p.status -ne 200) { Bad "$u -> $($p.status)"; continue }
    $b = $p.body
    $title = [regex]::Match($b, '<title>([^<]*)</title>').Groups[1].Value
    $desc = [regex]::Match($b, '<meta name="description" content="([^"]*)"').Groups[1].Value
    $canon = [regex]::Match($b, '<link rel="canonical" href="([^"]*)"').Groups[1].Value
    $robots = [regex]::Match($b, '<meta name="robots" content="([^"]*)"').Groups[1].Value
    $h1 = [regex]::Matches($b, '<h1[\s>]').Count
    $lang = [regex]::Match($b, '<html lang="([^"]*)"').Groups[1].Value
    $line = $u
    if ($canon -eq $u) { Ok "$line canonical = própria URL" } else { Bad "$line canonical '$canon' difere da URL" }
    if ($robots -match 'noindex') { Bad "$line está no sitemap mas tem noindex" }
    if ($h1 -eq 1) { Ok "$line um <h1>" } else { Bad "$line tem $h1 <h1>" }
    if ($lang -eq 'pt-BR') { Ok "$line lang=pt-BR" } else { Bad "$line lang='$lang'" }
    if ($title.Length -ge 20 -and $title.Length -le 75) { Ok "$line título ($($title.Length) car.)" } else { Info "$line título com $($title.Length) car.: $title" }
    if ($desc.Length -ge 70 -and $desc.Length -le 175) { Ok "$line descrição ($($desc.Length) car.)" } else { Info "$line descrição com $($desc.Length) car." }
    if ($seenTitles.ContainsKey($title)) { Bad "$line título duplicado de $($seenTitles[$title])" } else { $seenTitles[$title] = $u }
    if ($seenDescs.ContainsKey($desc)) { Bad "$line descrição duplicada de $($seenDescs[$desc])" } else { $seenDescs[$desc] = $u }
    foreach ($key in 'og:title', 'og:description', 'og:url', 'og:image', 'twitter:card', 'twitter:image') { if ($b -notmatch ('(property|name)="' + [regex]::Escape($key) + '" content="[^"]+"')) { Bad "$line sem meta $key" } }
    $og = [regex]::Match($b, 'property="og:image" content="([^"]*)"').Groups[1].Value
    if ($og -and -not $og.StartsWith('http')) { Bad "$line og:image não é absoluta: $og" }
    $ld = [regex]::Matches($b, '(?s)<script type="application/ld\+json">(.*?)</script>')
    if ($ld.Count -eq 0) { Info "$line sem JSON-LD" }
    foreach ($m in $ld) { try { $j = $m.Groups[1].Value | ConvertFrom-Json; Ok "$line JSON-LD válido ($(($j.'@graph' | ForEach-Object { $_.'@type' }) -join ', '))" } catch { Bad "$line JSON-LD inválido" } }
    if ($b -match '\b\d{5}-\d{3}\b') { Bad "$line contém CEP" }
    # links internos (um nível): destino existe?
    $broken = 0; $checked = @{}
    foreach ($lm in [regex]::Matches($b, '<a [^>]*href="([^"#][^"]*)"')) {
        $href = $lm.Groups[1].Value
        if ($checked.ContainsKey($href)) { continue }; $checked[$href] = $true
        if ($href -match '^(mailto:|tel:|https?://(?!' + [regex]::Escape(([uri]$BaseUrl).Host) + '))') { continue }
        $abs = if ($href.StartsWith('http')) { $href } else { [Uri]::new([Uri]$u, $href).AbsoluteUri }
        $abs = $abs -replace '#.*$', ''
        $t = Get-Page $abs 'HEAD'; if ($t.status -notin 200, 301, 308) { $broken++; Bad "$line link quebrado: $href -> $($t.status)" }
    }
    if ($broken -eq 0) { Ok "$line links internos respondem" }
}

Section "Ícones e manifesto"
foreach ($f in @(@('/favicon.ico', 'image/(x-icon|vnd.microsoft.icon)'), @('/favicon-96x96.png', 'image/png'), @('/apple-touch-icon.png', 'image/png'), @('/icon-192.png', 'image/png'), @('/icon-512.png', 'image/png'), @('/site.webmanifest', 'json'))) {
    $x = Get-Page ($BaseUrl + $f[0]) 'HEAD'
    if ($x.status -eq 200 -and $x.type -match $f[1]) { Ok "$($f[0]) 200 ($($x.type))" } else { Bad "$($f[0]) status $($x.status), tipo '$($x.type)'" }
}

Section "Cabeçalhos de segurança (home)"
$hh = $landing.headers
foreach ($k in 'content-security-policy', 'x-content-type-options', 'x-frame-options', 'referrer-policy', 'permissions-policy', 'cross-origin-opener-policy') {
    if ($hh.ContainsKey($k)) { Ok "$k presente" } else { Bad "$k ausente" }
}
if ($hh.ContainsKey('content-security-policy') -and $hh['content-security-policy'] -match "unsafe-inline|unsafe-eval") { Bad "CSP contém unsafe-inline/unsafe-eval" }
if ($hh.ContainsKey('strict-transport-security')) { Ok "HSTS presente: $($hh['strict-transport-security'])"; if ($hh['strict-transport-security'] -match 'includeSubDomains|preload') { Info "HSTS com includeSubDomains/preload: confirme todos os subdomínios antes" } }
elseif ($Local) { Info "HSTS não se aplica em http local" } else { Info "HSTS ausente (ative somente com HTTPS confirmado: build -Hsts)" }
if ($hh.ContainsKey('x-robots-tag')) { Info "X-Robots-Tag: $($hh['x-robots-tag']) (esperado só em preview)" }
$css = Get-Page ($BaseUrl + '/css/styles.css') 'HEAD'
Write-Host ("  cache css: " + $css.headers['cache-control'] + " | compressão: " + $(if ($css.headers['content-encoding']) { $css.headers['content-encoding'] } else { '(não detectada)' }))

Write-Host ("`nResumo: {0} ok, {1} falha(s), {2} aviso(s)" -f $script:pass, $script:fail, $script:info) -ForegroundColor $(if ($script:fail) { 'Red' } else { 'Green' })
if ($script:fail) { exit 1 }
