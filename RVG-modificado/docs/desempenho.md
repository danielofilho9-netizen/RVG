# Desempenho — antes e depois

**Natureza das medições:** *laboratório* (Edge 154 headless, máquina de desenvolvimento, cache desligado, servidor local com gzip).
**Não são dados de usuários reais (campo)** e **não comprovam aprovação em Core Web Vitals**. Para isso é preciso o relatório CrUX/Search
Console (Core Web Vitals) do site em produção, que só existe após meses de acesso real. Perfil "celular" = 390×844 @2x, CPU 4× mais lenta,
rede 1,6 Mbps / 150 ms (equivale ao "Slow 4G" do Lighthouse). A variação entre execuções é grande (principalmente TBT), por isso o "depois" mostra faixas.

| Métrica (home) | Antes | Depois |
|---|---|---|
| Transferência inicial (desktop, 6 s) | 4.046 KB | **2.663 KB** (−34%; o vídeo de 2,1 MB não mudou) |
| Imagens na carga inicial | 1.510 KB | **118 KB** |
| Imagens após rolar a página inteira | 4.256 KB | **672 KB** (−84%) |
| Logo do cabeçalho/rodapé | PNG 1.164 KB | WebP **6 KB** |
| Quadro de abertura do vídeo (poster = LCP) | JPEG 345 KB | WebP **111 KB** + `preload` com prioridade alta |
| Fundo da seção Serviços | JPEG 994 KB | WebP **112 KB** |
| Fotos dos serviços (11) | JPEG 112–218 KB cada | WebP 640 w (24–56 KB) / 1200 w (51–144 KB) via `<picture>` + `srcset`/`sizes` |
| Celular (lab) — LCP | 5,4 s | **2,4–3,6 s** |
| Celular (lab) — carga completa (`load`) | 11,9 s | **4,0–4,4 s** |
| Celular (lab) — tarefas longas / TBT aproximado | 25 / 1,9 s | **8–9 / 0,8–2,3 s** (muito variável) |
| Celular (lab) — CLS | 0 | 0,02–0,03 (troca tardia de fonte em rede lenta; abaixo do limite "bom" de 0,1) |
| Desktop (lab) — FCP/LCP | 0,64 s | **0,38–0,43 s** |

## O que foi feito
- **Imagens**: WebP gerado com qualidade visualmente equivalente (comparado lado a lado com os JPEG originais), `srcset` 640/1200, JPEG original
  mantido como alternativa; dimensões reservadas (`width`/`height` + `aspect-ratio`), `loading="lazy"`/`decoding="async"` fora da primeira
  tela e **sem lazy** no poster do vídeo; pré-carregamento das fotos de um carrossel quando ele se aproxima da tela.
- **Logo**: 96 px (exibida a 44–48 px) em vez do PNG de 820 px / 1,1 MB.
- **Fontes**: pedido ao Google Fonts reduzido aos pesos usados (Outfit 600–900, Plus Jakarta Sans 400–800 → 2 arquivos variáveis).
- **Font Awesome**: SRI (integridade verificada) e `crossorigin`.
- **Vídeo**: mantido (autoplay sem som, enquadramento completo, loop, botão de pausa). O MP4 já está otimizado para web (`moov` no início,
  H.264, sem trilha de áudio, ~2 Mbps). O poster WebP e o `preload` melhoram o LCP; o vídeo continua sendo o item mais pesado.
- **Animações**: o canvas de partículas agora roda a 30 quadros/s, em resolução 1× (4× menos pixels em telas 2×) e **pausa enquanto o
  vídeo cobre a janela** (as partículas ficam escondidas atrás dele). Efeitos visuais preservados.
- **JS**: `defer`; sem bibliotecas. **CSS/JS** com `?v=hash` e cache de 1 ano (via `_headers`/`.htaccess`).
- **Build** copia só os arquivos usados (mídia sem uso, backups e scripts não vão para a hospedagem).
- **Compressão**: gzip/brotli depende da hospedagem (já previsto no `.htaccess`; Netlify/Cloudflare comprimem sozinhos).

## Oportunidades que dependem de decisão/arquivos externos
1. **Hospedar Google Fonts e Font Awesome no próprio domínio** (remove 2 origens de terceiros e simplifica a CSP). Font Awesome sozinho pesa
   **268 KB** (solid 153 KB + brands 115 KB) para ~40 ícones. Exige baixar os arquivos de fonte (Google/cdnjs) para o projeto — **não foi feito
   sem sua aprovação**. Alternativa: trocar os ícones por um sprite SVG (~15 KB).
2. **Vídeo**: reencodar com ffmpeg (H.264 de menor bitrate + versão WebM/AV1) pode reduzir bastante os 2,1 MB; exige ferramenta externa e
   validação visual. Há também um segundo arquivo (`animação-do-home.mp4`, com acento e com trilha de áudio, 2,4 MB) que **não é usado**.
3. **Minificar** `styles.css` (70 KB) e `app.js` (35 KB): ganho pequeno após gzip; precisa de uma ferramenta (Node/esbuild).
4. **Logo vetorial (SVG)**: permitiria favicon SVG e logo nítida em qualquer tamanho.
5. **Medir em campo**: instalar Search Console + relatório de Core Web Vitals; opcionalmente RUM leve.
