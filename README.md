# RVG Soluções Integradas — site institucional (estático)

HTML + CSS + JavaScript sem dependências. Sem framework, sem backend.

| Pasta/arquivo | Conteúdo |
|---|---|
| `index.html`, `servicos/*/index.html`, `404.html` | páginas (home, 4 páginas de serviço, erro 404) |
| `css/styles.css`, `js/app.js`, `js/js-flag.js` | estilos e scripts |
| `assets/` | fotos (`result_*`), vídeo da home, logos; `assets/img/` = versões WebP e imagem de compartilhamento |
| `favicon.ico`, `favicon-96x96.png`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`, `site.webmanifest` | ícones |
| `_headers`, `_redirects`, `.htaccess` | cabeçalhos de segurança/cache e redirecionamentos (Netlify/Cloudflare e Apache) |
| `server.ps1` | servidor local (como uma hospedagem estática) |
| `tools/` | `build.ps1` (gera `dist/`), `check-site.ps1` (verificação HTTP), `make-icons.ps1` (ícones/OG), `site.config.json` |
| `docs/` | plano de SEO, hospedagem e segurança, desempenho, pendências |
| `index-original.html`, `css/*-original.css`, `js/*-original.js` | cópias da versão anterior (com `noindex`; **não são publicadas** pelo build) |

## Rotina
```powershell
powershell -ExecutionPolicy Bypass -File server.ps1                                  # http://localhost:8080
powershell -ExecutionPolicy Bypass -File tools\build.ps1 -SiteUrl https://SEU-DOMINIO # gera dist\ (publique o conteúdo de dist\)
powershell -ExecutionPolicy Bypass -File tools\check-site.ps1 -BaseUrl https://SEU-DOMINIO   # confere o site publicado
```
Leia `docs/pendencias-e-acoes-externas.md` antes de publicar (o domínio de produção ainda precisa ser confirmado).
