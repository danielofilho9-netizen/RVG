# Pendências e ações externas (precisam de confirmação ou de acesso de terceiros)

## A. Informações que o projeto não confirma (não foram inventadas)
| # | Item | Por que importa | Onde entra |
|---|---|---|---|
| 1 | **Domínio de produção** (e se é `www` ou sem `www`) | Canonical, sitemap, Open Graph e dados estruturados precisam de URL absoluta. O e-mail `rvgsoluçõesintegradas.com.br` **não** foi usado para deduzir o domínio do site | `tools\build.ps1 -SiteUrl https://…` |
| 2 | **Hospedagem/CDN** (Netlify, Cloudflare, Apache/cPanel, Nginx, Vercel…) | Define onde os cabeçalhos, redirecionamentos e a página 404 realmente valem | `docs/hospedagem-e-seguranca.md` |
| 3 | **HTTPS confirmado** em todo o domínio | Pré-requisito para HSTS e para o redirecionamento http→https | `build.ps1 -Hsts` |
| 4 | **Área de atendimento** (cidades/regiões) | Hoje só é afirmado: sede em Porto Alegre + "consulte a disponibilidade". Nenhuma cobertura foi prometida | textos, JSON-LD (`areaServed`), Perfil da Empresa |
| 5 | **Horário de atendimento** | Não consta no projeto; não foi publicado em JSON-LD | JSON-LD (`openingHoursSpecification`) |
| 6 | **Logo vetorial** (SVG/PDF/AI) | Favicon SVG e logo nítida; hoje só há PNG/JPG | `tools\make-icons.ps1` |
| 7 | **Fotos reais de condomínios** (para Gestão Condominial) e legendas/autorização de uso | A única foto atual mostra acesso por cordas em telhado | página do serviço |
| 8 | **Autorização das fotos** (ex.: foto de iluminação com marca d'água "Drones & Afins", recortada no arquivo `result_`) | Direitos de imagem | todas as páginas |
| 9 | **Conteúdo adicional dos serviços** (etapas, prazos, segmentos, habilitações, FAQ real, casos reais) | Aprofunda as páginas sem inventar | `docs/seo-servicos-e-palavras-chave.md` |
| 10 | **H1 da home**: o único `h1` é o título da seção História ("De 2015 ao futuro das soluções integradas"), porque a home não pode ter texto sobre o vídeo | Um `h1` que diga o que a empresa faz ajuda busca e leitores | decisão de design/conteúdo |
| 11 | **Perfis sociais** além do Instagram, se existirem | `sameAs` só tem o que já está no site | `tools/site.config.json` |
| 12 | Itens de nomenclatura: o resumo da proposta usa "Gestão de Infraestrutura Condominial", "Projetos e Manutenção Elétrica" etc. (texto original enviado no WhatsApp) | Consistência de nomes de serviço | `index.html` (valores dos checkboxes) |

## B. Ações externas (exigem acesso a contas de terceiros — não executadas)
**Google Perfil da Empresa (Google Business Profile)**
1. Reivindicar/verificar o perfil da sede (Rua Riachuelo, 1612 — Porto Alegre/RS) e manter **nome, telefone, e-mail e endereço idênticos** aos do site
   (nome "RVG Soluções Integradas"; telefone (51) 9 8212-4987; e-mail rafaelvidor@rvgsoluçõesintegradas.com.br; **sem CEP** no site, mantendo a decisão).
2. Revisar **categoria principal e adicionais** conforme os serviços reais (acesso por cordas/alpinismo industrial, serviços elétricos, automação, iluminação, manutenção predial).
3. Cadastrar os **serviços** (os 4 do site) com descrições curtas fiéis às páginas.
4. Definir a **área de atendimento** *somente* com as regiões confirmadas pela RVG (não marcar regiões não atendidas).
5. Subir **fotos reais** (equipe, obras autorizadas, fachada/sede) e o logo (`icon-512.png`).
6. Informar o **site** (URL canônica) e o **horário**, se existir.
7. Não criar avaliações nem pedir avaliações em troca de benefícios; responder às reais.

**Google Search Console / Bing Webmaster**
1. Verificar a propriedade do domínio (DNS) e **enviar `sitemap.xml`**.
2. Inspecionar a home e as 4 páginas de serviço ("Solicitar indexação") após a publicação.
3. Acompanhar a cobertura, o relatório de Core Web Vitals (campo) e as consultas reais para revisar títulos/descrições.

**Favicon**: o navegador mostra o ícone novo assim que o arquivo é carregado (validado); o **Google atualiza o ícone nos resultados em dias ou
semanas** e só o faz quando consegue rastrear `/favicon.ico` e a home (requisito: múltiplo de 48 px — há 48 px no `.ico` e 96×96 em PNG).

**Domínio/DNS**: redirecionamento `www`↔raiz e http→https (na hospedagem/CDN); registros SPF/DKIM/DMARC do e-mail corporativo (fora do escopo do site).

## C. O que foi feito neste ciclo e já está pronto
Metadados únicos por página, canonical, Open Graph/Twitter, JSON-LD (LocalBusiness + WebSite; Service + BreadcrumbList), 4 páginas de serviço,
404 com `noindex`, sitemap/robots por ambiente (produção/preview), favicons e ícones, imagens WebP responsivas, cabeçalhos de segurança + CSP validada,
redirecionamentos, scripts de build e de verificação HTTP.
