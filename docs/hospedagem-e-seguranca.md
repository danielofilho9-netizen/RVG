# Publicação, cabeçalhos de segurança e redirecionamentos

O site é **estático** (HTML + CSS + JS, sem framework, sem backend, sem banco de dados). O resultado publicável é gerado em `dist/`
por `tools/build.ps1`. **Publique o conteúdo de `dist/`, não a pasta de trabalho** (a pasta de trabalho contém arquivos internos:
`*-original.*`, `tools/`, `docs/`, scripts `.ps1`, mídia sem uso).

## 1. Gerar e conferir
```powershell
# produção (informe o domínio de produção CONFIRMADO, sem barra final e sem caminho)
powershell -ExecutionPolicy Bypass -File tools\build.ps1 -SiteUrl https://www.seudominio.com.br

# ambiente de teste/preview (noindex + robots Disallow: / + X-Robots-Tag)
powershell -ExecutionPolicy Bypass -File tools\build.ps1 -SiteUrl https://preview.seudominio.com.br -Environment preview

# somente com HTTPS confirmado em todo o domínio: acrescenta HSTS (sem includeSubDomains/preload)
powershell -ExecutionPolicy Bypass -File tools\build.ps1 -SiteUrl https://www.seudominio.com.br -Hsts
```
O build valida links/âncoras internos, canonical único por página, JSON-LD (JSON válido), dados do negócio × conteúdo visível,
um `h1` por página e ausência de atributos `style` inline (exigência da CSP). Sem `-SiteUrl` ele avisa que canonical absoluto,
sitemap e JSON-LD não foram gerados.

Teste local do resultado (o servidor aplica `_headers`, `_redirects`, 404, gzip e Range como uma hospedagem estática):
```powershell
powershell -ExecutionPolicy Bypass -File server.ps1 -Root dist -Port 8082 -HonorCache
powershell -ExecutionPolicy Bypass -File tools\check-site.ps1 -BaseUrl http://localhost:8082 -Local
```
Depois de publicar, rode a mesma verificação contra o endereço real (confirma o que a hospedagem **de fato** entrega):
```powershell
powershell -ExecutionPolicy Bypass -File tools\check-site.ps1 -BaseUrl https://www.seudominio.com.br
```

## 2. Onde cada configuração entra (depende da hospedagem — **ainda não confirmada**)
| Hospedagem | Cabeçalhos | Redirecionamentos | Página 404 |
|---|---|---|---|
| Netlify / Cloudflare Pages | `_headers` (já incluído) | `_redirects` (já incluído)* | `404.html` automática |
| Apache / hospedagem compartilhada (cPanel etc.) | `.htaccess` (já incluído; exige mod_headers, mod_rewrite, mod_expires, mod_deflate) | `.htaccess` | `ErrorDocument 404` (já incluído) |
| Nginx | adicionar `add_header ... always;` (exemplo abaixo) | `return 301` / `try_files` | `error_page 404 /404.html;` |
| Vercel | `vercel.json` → `headers` (copiar os valores de `_headers`) | `redirects` | `404.html` automática |
| Firebase / GitHub Pages / S3+CloudFront | GitHub Pages **não permite** cabeçalhos customizados (use CDN/Cloudflare à frente); Firebase: `firebase.json` → `headers` | idem | `404.html` |

\* Netlify só redireciona um arquivo que existe (`/index.html`) com `301!`. Sem isso o redirecionamento é ignorado — não é grave, pois o
`canonical` da home já aponta para `/`.

Exemplo Nginx (valores equivalentes aos de `_headers`):
```nginx
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "DENY" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Cross-Origin-Opener-Policy "same-origin" always;
add_header Permissions-Policy 'accelerometer=(), camera=(), display-capture=(), fullscreen=(self "https://www.google.com" "https://maps.google.com"), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()' always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com https://cdnjs.cloudflare.com; font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com; img-src 'self'; media-src 'self'; frame-src https://www.google.com https://maps.google.com; connect-src 'self'; manifest-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'" always;
gzip on; gzip_types text/css application/javascript application/json image/svg+xml application/manifest+json text/plain application/xml;
location = /index.html { return 301 /; }
error_page 404 /404.html;
```
> Importante: os cabeçalhos **não estão ativos em produção só porque os arquivos existem**. Use `tools\check-site.ps1` no endereço real.

## 3. Content-Security-Policy (escrita para o que o site usa)
- `script-src 'self'`: todo JavaScript é local (`js/app.js`, `js/js-flag.js`). Não há scripts inline nem `eval`.
- `style-src`: CSS próprio + Google Fonts + Font Awesome (cdnjs). Não há `style=""` inline (o build falha se houver).
- `font-src`: arquivos de fonte do Google Fonts (gstatic) e do Font Awesome (cdnjs).
- `img-src 'self'`, `media-src 'self'`: imagens e vídeo da home são do próprio domínio.
- `frame-src`: somente o mapa do Google (a CSP do site só controla a moldura; o conteúdo do mapa roda dentro do iframe).
- `frame-ancestors 'none'` + `X-Frame-Options: DENY`: ninguém pode incorporar o site em outra página.
- **Validação feita**: modo *Report-Only* e depois modo *enforce*, carregando a home inteira (com rolagem), uma página de serviço e a 404 em
  Edge — **0 violações**, mapa, fontes, ícones, vídeo e formulário funcionando.
- Se a RVG acrescentar Google Analytics, Meta Pixel, reCAPTCHA, chat etc., a CSP precisa ser ampliada **antes** (teste primeiro com
  `Content-Security-Policy-Report-Only`).

## 4. HSTS
Não está ligado por padrão. Ative **somente** quando o HTTPS estiver confirmado em todo o domínio e a renovação do certificado for
automática: `tools\build.ps1 -Hsts` (ou descomente a linha no `.htaccess`) → `max-age=31536000`. **Não** use `includeSubDomains`
nem `preload` sem listar e testar todos os subdomínios (incluindo e-mail/painéis); `preload` é praticamente irreversível.

## 5. Redirecionamentos e domínio canônico
- Implementados: `/index.html` e `/servicos/*/index.html` → URL limpa (301); `/servicos/x` → `/servicos/x/` (a hospedagem costuma fazer).
- **A definir com o domínio**: `www` × sem `www` (escolha um e redirecione o outro com 301 na hospedagem/DNS) e `http` → `https`.
  O build usa exatamente o domínio informado em `-SiteUrl` nos canonical, sitemap e dados estruturados.
- Não deduza o domínio do site a partir do e-mail (`rvgsoluçõesintegradas.com.br`): pode ser outro.

## 6. Cache
`/css/*` e `/js/*` usam `Cache-Control: immutable` de 1 ano porque o build acrescenta `?v=<hash>` (muda a cada alteração).
`/assets/*` 30 dias. HTML sempre revalidado. Se publicar sem o build, remova o cache longo de css/js.

## 7. Revisão de segurança (resumo — o que foi checado)
| Item | Resultado |
|---|---|
| Segredos/credenciais no código público | Nenhum encontrado (padrões de chaves de API, tokens, senhas, chaves privadas). Telefone/e-mail/Instagram públicos são intencionais. |
| Dependências | **Nenhuma** (sem npm). Terceiros: Font Awesome 6.5.1 (CSS com SRI sha512 verificado contra o CDN) e Google Fonts (CSS não aceita SRI, pois varia por navegador). |
| Backend/formulários | Não há backend. Os formulários abrem WhatsApp ou o cliente de e-mail do visitante. Entradas: `maxlength`, remoção de caracteres de controle (bloqueia injeção de linha/cabeçalho no assunto do e-mail) e `encodeURIComponent`. |
| XSS | Sem `innerHTML` com dados variáveis (resumo da proposta passou a usar nós de texto). CSP sem `unsafe-inline`/`unsafe-eval`. |
| Arquivos internos | O build exclui scripts, backups `*-original.*`, `tools/`, `docs/`; `.htaccess`/`server.ps1` bloqueiam `.ps1`, `_headers`, `_redirects`, dotfiles. `index-original.html` ganhou `noindex` caso seja publicado por engano. |
| Mixed content | Nenhum: todas as URLs externas são `https://`. |
| Iframe do mapa | `sandbox` restrito + `referrerpolicy`; a moldura é permitida só para Google. |
| Links externos | `target="_blank"` com `rel="noopener"`. |
| Se um dia houver login/sessão | Cookies `Secure; HttpOnly; SameSite`, CSRF e validação no servidor — hoje não se aplicam (site estático). |
