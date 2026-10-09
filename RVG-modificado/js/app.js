/* ==========================================================================
   RVG SOLUÇÕES INTEGRADAS — APP
   Módulos: fundo (partículas) · vídeo do hero · navbar · entrada dos blocos ·
            carrosséis · filtro · proposta técnica · formulário · "power up" dos serviços
   Sem dependências. A História é estática (sem módulo de animação).
   ========================================================================== */
(() => {
    'use strict';

    /* ---------------------------------------------------------------
       Helpers
       --------------------------------------------------------------- */
    const $ = (sel, ctx = document) => ctx.querySelector(sel);
    const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
    const clamp = (v, min = 0, max = 1) => Math.min(max, Math.max(min, v));

    const mqReduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const mqDesktop = window.matchMedia('(min-width: 992px)');
    const reducedMotion = () => mqReduced.matches;

    const WHATSAPP_NUMBER = '5551982124987';
    /* E-mail: rafaelvidor@rvgsoluçõesintegradas.com.br
       Em links mailto o domínio acentuado segue o padrão IDN (punycode) — é o mesmo endereço,
       apenas na forma ASCII que os clientes de e-mail e servidores esperam. */
    const EMAIL = 'rafaelvidor@xn--rvgsoluesintegradas-cyb80a.com.br';

    /* O vídeo da home deve iniciar sozinho mesmo quando o sistema pede "reduzir movimento"
       (era o que o pausava antes). O botão de pausa fica sempre visível. Para voltar a respeitar
       a preferência do sistema também no vídeo, troque para false. */
    const AUTOPLAY_VIDEO_WITH_REDUCED_MOTION = true;

    /* Agendador único de scroll (1 leitura por frame) */
    const scrollSubscribers = [];
    let scrollQueued = false;
    const runScroll = () => {
        scrollQueued = false;
        const y = window.scrollY;
        const vh = window.innerHeight;
        scrollSubscribers.forEach((fn) => fn(y, vh));
    };
    const requestScroll = () => {
        if (!scrollQueued) {
            scrollQueued = true;
            requestAnimationFrame(runScroll);
        }
    };
    window.addEventListener('scroll', requestScroll, { passive: true });

    /* Evento de layout: recalcula geometrias (resize, filtro, fontes, imagens) */
    const layoutSubscribers = [];
    let layoutQueued = false;
    const requestLayout = () => {
        if (layoutQueued) return;
        layoutQueued = true;
        requestAnimationFrame(() => {
            layoutQueued = false;
            layoutSubscribers.forEach((fn) => fn());
            runScroll();
        });
    };
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(requestLayout, 140);
    });
    window.addEventListener('load', requestLayout);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(requestLayout);

    /* ---------------------------------------------------------------
       1. Fundo: partículas douradas/ciano (sutil)
       --------------------------------------------------------------- */
    function initParticles() {
        const canvas = $('#bg-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        // Pontos suaves: resolução 1× basta (4× menos pixels que em telas 2×) e 30 quadros/s são imperceptíveis aqui
        const dpr = 1;
        const FRAME_MS = 1000 / 30;
        let w = 0;
        let h = 0;
        let particles = [];
        let rafId = null;
        let lastFrame = 0;
        let hidden = false; // true enquanto o vídeo da home cobre a janela (partículas ficariam escondidas)

        const resize = () => {
            w = window.innerWidth;
            h = window.innerHeight;
            canvas.width = w * dpr;
            canvas.height = h * dpr;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        };

        const seed = () => {
            const count = w < 768 ? 18 : 42;
            particles = Array.from({ length: count }, () => ({
                x: Math.random() * w,
                y: Math.random() * h,
                r: Math.random() * 1.4 + 0.5,
                c: Math.random() > 0.25 ? '255,184,0' : '69,230,255',
                vx: (Math.random() - 0.5) * 0.25,
                vy: (Math.random() - 0.5) * 0.25,
                a: Math.random() * 0.45 + 0.15,
            }));
        };

        const draw = () => {
            ctx.clearRect(0, 0, w, h);
            for (const p of particles) {
                p.x += p.vx;
                p.y += p.vy;
                if (p.x < 0) p.x = w;
                if (p.x > w) p.x = 0;
                if (p.y < 0) p.y = h;
                if (p.y > h) p.y = 0;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r * 3, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${p.c},${p.a * 0.12})`;
                ctx.fill();
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${p.c},${p.a})`;
                ctx.fill();
            }
        };

        const loop = (now) => {
            if (!hidden && now - lastFrame >= FRAME_MS) {
                lastFrame = now;
                draw();
            }
            rafId = requestAnimationFrame(loop);
        };
        const start = () => {
            if (rafId || reducedMotion() || document.hidden) return;
            rafId = requestAnimationFrame(loop);
        };
        const stop = () => {
            if (rafId) cancelAnimationFrame(rafId);
            rafId = null;
        };

        resize();
        seed();
        draw();
        start();

        window.addEventListener('resize', () => { resize(); seed(); draw(); });
        document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
        mqReduced.addEventListener('change', () => (reducedMotion() ? stop() : start()));

        // Não desenha enquanto o vídeo ocupa praticamente toda a área visível abaixo do cabeçalho
        const stage = $('.hero_stage');
        if (stage && 'IntersectionObserver' in window) {
            const nav = $('.navbar_component');
            new IntersectionObserver(([entry]) => {
                const usable = window.innerHeight - (nav ? nav.offsetHeight : 0);
                hidden = entry.isIntersecting && entry.intersectionRect.height >= usable * 0.9;
                if (!hidden) draw();
            }, { threshold: [0, 0.25, 0.5, 0.75, 0.9, 1] }).observe(stage);
        }
    }

    /* ---------------------------------------------------------------
       2. Vídeo do hero — começa ao abrir a página, em loop e sem som.
          Causas tratadas: (a) a lógica antiga pausava o vídeo com "reduzir movimento";
          (b) navegadores adiam o autoplay com a aba oculta; (c) bloqueio de autoplay.
          Sempre há um botão visível para pausar/reproduzir.
       --------------------------------------------------------------- */
    function initHeroVideo() {
        const video = $('#hero-video');
        const button = $('#hero-video-toggle');
        if (!video) return;

        // Atributos exigidos pelos navegadores para permitir o autoplay
        video.muted = true;
        video.defaultMuted = true;
        video.loop = true;
        video.playsInline = true;

        let pausedByUser = false;
        const icon = button ? $('i', button) : null;

        const syncUI = () => {
            if (!button) return;
            const playing = !video.paused && !video.ended;
            const label = playing ? 'Pausar vídeo' : 'Reproduzir vídeo';
            button.classList.toggle('is-paused', !playing);
            button.setAttribute('aria-pressed', String(!playing));
            button.setAttribute('aria-label', label);
            button.setAttribute('title', label);
            if (icon) icon.className = playing ? 'fa-solid fa-pause' : 'fa-solid fa-play';
        };

        const tryPlay = () => {
            if (pausedByUser || !video.paused) return;
            const attempt = video.play();
            if (attempt && attempt.catch) attempt.catch(() => syncUI());
        };

        ['play', 'playing', 'pause', 'ended'].forEach((name) => video.addEventListener(name, syncUI));
        ['loadeddata', 'canplay'].forEach((name) => video.addEventListener(name, tryPlay));
        document.addEventListener('visibilitychange', () => { if (!document.hidden) tryPlay(); });
        window.addEventListener('pageshow', tryPlay);

        // Se o navegador bloquear o autoplay, a primeira interação da pessoa libera a reprodução
        // (o próprio botão do vídeo cuida da sua ação: ignorá-lo aqui evita iniciar e pausar no mesmo clique)
        const unlock = (e) => {
            if (button && e.target instanceof Node && button.contains(e.target)) return;
            tryPlay();
        };
        ['pointerdown', 'keydown', 'touchstart'].forEach((name) => window.addEventListener(name, unlock, { once: true, passive: true }));

        if (button) {
            button.addEventListener('click', () => {
                if (video.paused) {
                    pausedByUser = false;
                    const attempt = video.play();
                    if (attempt && attempt.catch) attempt.catch(() => syncUI());
                } else {
                    pausedByUser = true;
                    video.pause();
                }
            });
        }

        if (reducedMotion() && !AUTOPLAY_VIDEO_WITH_REDUCED_MOTION) {
            pausedByUser = true;
            video.pause();
        }

        syncUI();
        tryPlay();
    }

    /* ---------------------------------------------------------------
       3. Navbar: menu mobile + destaque da seção atual
       --------------------------------------------------------------- */
    function initNavbar() {
        const toggle = $('#mobile-toggle');
        const menu = $('#nav-menu');

        if (toggle && menu) {
            const setOpen = (open) => {
                menu.classList.toggle('is-open', open);
                document.body.classList.toggle('menu-open', open);
                toggle.setAttribute('aria-expanded', String(open));
                toggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
                const icon = $('i', toggle);
                if (icon) icon.className = open ? 'fa-solid fa-xmark' : 'fa-solid fa-bars';
            };

            toggle.addEventListener('click', (e) => {
                e.stopPropagation();
                setOpen(!menu.classList.contains('is-open'));
            });
            $$('a', menu).forEach((link) => link.addEventListener('click', () => setOpen(false)));
            document.addEventListener('click', (e) => {
                if (menu.classList.contains('is-open') && !menu.contains(e.target) && !toggle.contains(e.target)) setOpen(false);
            });
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && menu.classList.contains('is-open')) setOpen(false);
            });
            mqDesktop.addEventListener('change', () => setOpen(false));
        }

        const sections = $$('main section[id]');
        const links = $$('.navbar_link');
        let current = '';

        scrollSubscribers.push(() => {
            let active = sections.length ? sections[0].id : '';
            for (const s of sections) {
                if (s.getBoundingClientRect().top <= 140) active = s.id;
            }
            // Localização não tem link próprio no menu: destaca "Contato"
            if (active === 'localizacao') active = 'contato';
            if (active === current) return;
            current = active;
            links.forEach((l) => l.classList.toggle('is-active', l.getAttribute('href') === `#${active}`));
        });
    }

    /* ---------------------------------------------------------------
       4. Entrada dos blocos ao aparecer na tela (com pequena sequência
          entre blocos irmãos). A História não participa.
       --------------------------------------------------------------- */
    function initReveal() {
        const items = $$('[data-reveal]');
        const showAll = () => items.forEach((el) => el.classList.add('is-inview'));

        if (!('IntersectionObserver' in window) || reducedMotion()) {
            showAll();
            mqReduced.addEventListener('change', () => { if (reducedMotion()) showAll(); });
            return;
        }

        // Sequência: irmãos revelados juntos entram com 120 ms de diferença
        const groups = new Map();
        items.forEach((el) => {
            if (el.style.getPropertyValue('--reveal-delay')) return;
            const siblings = groups.get(el.parentElement) || [];
            siblings.push(el);
            groups.set(el.parentElement, siblings);
        });
        groups.forEach((list) => {
            if (list.length > 1) list.forEach((el, i) => el.style.setProperty('--reveal-delay', `${Math.min(i * 0.12, 0.36)}s`));
        });

        const io = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-inview');
                    io.unobserve(entry.target);
                }
            });
        }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
        items.forEach((el) => io.observe(el));
        mqReduced.addEventListener('change', () => { if (reducedMotion()) showAll(); });
    }

    /* ---------------------------------------------------------------
       5. Carrosséis (automático, manual, swipe, pausa).
          Serviço com uma única imagem = apresentação estática, sem controles.
       --------------------------------------------------------------- */
    function initCarousels() {
        $$('.carousel_component').forEach((carousel) => {
            const track = $('.carousel_track', carousel);
            const slides = $$('.carousel_slide', carousel);
            const prevBtn = $('.carousel_button.is-prev', carousel);
            const nextBtn = $('.carousel_button.is-next', carousel);
            const playBtn = $('.carousel_play-toggle', carousel);
            const counter = $('.carousel_counter', carousel);
            const dotsWrap = $('.carousel_dots', carousel);
            if (!track || !slides.length) return;

            const total = slides.length;
            const interval = parseInt(carousel.dataset.interval, 10) || 4000;
            let index = 0;
            let timer = null;
            let playing = carousel.dataset.autoplay !== 'false' && !reducedMotion();
            let hovered = false;
            let focused = false;
            let visible = true;

            // Uma única imagem: remove qualquer controle de troca do DOM
            // (sem setas, contador, pontos, play/pausa, troca automática ou gesto de arrastar).
            if (total <= 1) {
                [prevBtn, nextBtn, $('.carousel_controls', carousel), dotsWrap].forEach((el) => el && el.remove());
                carousel.classList.add('is-static');
                carousel.removeAttribute('role');
                carousel.removeAttribute('aria-roledescription');
                return;
            }

            // Carrega todas as fotos do carrossel pouco antes de ele aparecer, para a troca não "piscar"
            if ('IntersectionObserver' in window) {
                const preload = new IntersectionObserver((entries, obs) => {
                    if (!entries.some((e) => e.isIntersecting)) return;
                    $$('img', carousel).forEach((img) => { img.loading = 'eager'; });
                    obs.disconnect();
                }, { rootMargin: '600px 0px' });
                preload.observe(carousel);
            }

            const dots = [];
            if (dotsWrap) {
                dotsWrap.innerHTML = '';
                for (let i = 0; i < total; i++) {
                    const dot = document.createElement('button');
                    dot.type = 'button';
                    dot.className = 'carousel_dot';
                    dot.setAttribute('aria-label', `Navegar para foto ${i + 1}`);
                    dot.addEventListener('click', (e) => { e.stopPropagation(); goTo(i); restart(); });
                    dotsWrap.appendChild(dot);
                    dots.push(dot);
                }
            }

            function render() {
                track.style.transform = `translateX(-${index * 100}%)`;
                dots.forEach((d, i) => d.classList.toggle('is-active', i === index));
                if (counter) counter.textContent = `${index + 1} / ${total}`;
            }
            function goTo(i) { index = (i + total) % total; render(); }
            function stop() { clearInterval(timer); timer = null; }
            function start() {
                stop();
                if (playing && !hovered && !focused && visible) timer = setInterval(() => goTo(index + 1), interval);
            }
            function restart() { if (playing) start(); }

            function setPlayUI() {
                if (!playBtn) return;
                playBtn.innerHTML = playing ? '<i class="fa-solid fa-pause"></i>' : '<i class="fa-solid fa-play"></i>';
                const label = playing ? 'Pausar rotação automática' : 'Iniciar rotação automática';
                playBtn.setAttribute('title', label);
                playBtn.setAttribute('aria-label', label);
                playBtn.classList.toggle('is-paused', !playing);
            }

            prevBtn && prevBtn.addEventListener('click', (e) => { e.stopPropagation(); goTo(index - 1); restart(); });
            nextBtn && nextBtn.addEventListener('click', (e) => { e.stopPropagation(); goTo(index + 1); restart(); });
            playBtn && playBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                playing = !playing;
                setPlayUI();
                playing ? start() : stop();
            });

            // Pausa com mouse ou foco do teclado. Toque não conta como "hover" (evita ficar pausado).
            carousel.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') { hovered = true; stop(); } });
            carousel.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') { hovered = false; if (!focused) start(); } });
            carousel.addEventListener('focusin', (e) => {
                if (e.target.matches(':focus-visible')) { focused = true; stop(); } // só foco por teclado
            });
            carousel.addEventListener('focusout', (e) => {
                if (carousel.contains(e.relatedTarget)) return;
                focused = false;
                start();
            });

            let sx = 0;
            let sy = 0;
            carousel.addEventListener('touchstart', (e) => {
                if (e.touches.length === 1) { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }
            }, { passive: true });
            carousel.addEventListener('touchend', (e) => {
                if (e.changedTouches.length !== 1) return;
                const dx = e.changedTouches[0].clientX - sx;
                const dy = e.changedTouches[0].clientY - sy;
                if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
                    goTo(index + (dx < 0 ? 1 : -1));
                    restart();
                }
            }, { passive: true });

            // Só gira quando visível na tela
            if ('IntersectionObserver' in window) {
                new IntersectionObserver(([entry]) => {
                    visible = entry.isIntersecting;
                    visible ? start() : stop();
                }).observe(carousel);
            }

            setPlayUI();
            render();
            start();
        });
    }

    /* ---------------------------------------------------------------
       6. Filtro de serviços
       --------------------------------------------------------------- */
    function initServicesFilter() {
        const buttons = $$('.services_filter-button');
        const cards = $$('.services_item');

        buttons.forEach((btn) => {
            btn.setAttribute('aria-pressed', String(btn.classList.contains('is-active')));
            btn.addEventListener('click', () => {
                buttons.forEach((b) => { b.classList.remove('is-active'); b.setAttribute('aria-pressed', 'false'); });
                btn.classList.add('is-active');
                btn.setAttribute('aria-pressed', 'true');

                const filter = btn.dataset.filter;
                cards.forEach((card) => {
                    const show = filter === 'all' || card.dataset.category === filter;
                    card.style.display = show ? '' : 'none';
                    if (show && !reducedMotion()) {
                        card.classList.remove('is-filtered-in');
                        void card.offsetWidth;
                        card.classList.add('is-filtered-in');
                    }
                });
                requestLayout();
            });
        });
    }

    /* ---------------------------------------------------------------
       7. Solicitação de Proposta Técnica
       --------------------------------------------------------------- */
    function initProposal() {
        let property = 'Condomínio Residencial';
        const options = $$('#property-type-group .proposal_option');
        const checks = $$('.proposal_check-grid input[type="checkbox"]');
        const summary = $('#sim-summary-text');
        const error = $('#sim-error');
        const btnWa = $('#btn-send-sim-wa');
        const btnMail = $('#btn-send-sim-mail');

        const selected = () => checks.filter((c) => c.checked).map((c) => c.value);

        // Resumo montado com nós de texto (sem innerHTML): nenhum valor é interpretado como HTML
        const strong = (text) => {
            const node = document.createElement('strong');
            node.textContent = text;
            return node;
        };

        const update = () => {
            if (!summary) return;
            const services = selected();
            if (error) error.textContent = '';
            const parts = [document.createTextNode('Imóvel: '), strong(property)];
            if (services.length) {
                parts.push(
                    document.createTextNode(' | Soluções: '),
                    strong(`${services.length} selecionada(s)`),
                    document.createTextNode(` (${services[0]}${services.length > 1 ? ' e mais...' : ''})`)
                );
            } else {
                parts.push(document.createTextNode(' | Nenhuma solução selecionada ainda.'));
            }
            summary.replaceChildren(...parts);
        };

        options.forEach((btn) => btn.addEventListener('click', () => {
            options.forEach((b) => { b.classList.remove('is-active'); b.setAttribute('aria-pressed', 'false'); });
            btn.classList.add('is-active');
            btn.setAttribute('aria-pressed', 'true');
            property = btn.dataset.type;
            update();
        }));
        checks.forEach((c) => c.addEventListener('change', update));

        const guard = () => {
            const services = selected();
            if (!services.length) {
                if (error) error.textContent = 'Selecione ao menos uma solução para enviar a solicitação.';
                return null;
            }
            return services;
        };

        btnWa && btnWa.addEventListener('click', () => {
            const services = guard();
            if (!services) return;
            const message = `*SOLICITAÇÃO DE ORÇAMENTO - SITE RVG*\n\n` +
                `*Tipo de Imóvel:* ${property}\n` +
                `*Serviços Desejados:*\n` +
                services.map((s) => `• ${s}`).join('\n') +
                `\n\n_Gostaria de agendar uma vistoria/orçamento para o meu projeto._`;
            window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, '_blank', 'noopener');
        });

        btnMail && btnMail.addEventListener('click', () => {
            const services = guard();
            if (!services) return;
            const subject = `Solicitação de Orçamento RVG - ${property}`;
            const body = `Olá equipe RVG Soluções Integradas,\n\n` +
                `Gostaria de um orçamento técnico com os seguintes detalhes:\n\n` +
                `Tipo de Imóvel: ${property}\n` +
                `Serviços Desejados:\n` +
                services.map((s) => `- ${s}`).join('\n') +
                `\n\nPor favor, entrem em contato.\nAtenciosamente.`;
            window.location.href = `mailto:${EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        });
    }

    /* ---------------------------------------------------------------
       8. Formulário de contato (WhatsApp / E-mail)
       --------------------------------------------------------------- */
    function initContactForm() {
        const form = $('#contact-form');
        const btnEmail = $('#btn-submit-email');
        if (!form) return;

        // Entradas do visitante: removem caracteres de controle (evita quebra de linha injetada em
        // assunto/cabeçalhos do e-mail) e respeitam limites de tamanho, além do maxlength do HTML.
        const oneLine = (value, max) => String(value).replace(/[\u0000-\u001F\u007F-\u009F\u2028\u2029]+/g, ' ').replace(/\s{2,}/g, ' ').trim().slice(0, max);
        const multiLine = (value, max) => String(value).replace(/\r\n?/g, '\n').replace(/[\u0000-\u0009\u000B-\u001F\u007F-\u009F\u2028\u2029]/g, '').trim().slice(0, max);

        const send = (type) => {
            const name = oneLine($('#name').value, 120);
            const phone = oneLine($('#phone').value, 30);
            const email = oneLine($('#email').value, 120) || 'Não informado';
            const service = oneLine($('#service').value, 80);
            const text = multiLine($('#message').value, 1500) || 'Sem descrição adicional.';

            if (type === 'whatsapp') {
                const message = `*CONTATO DIRETO - SITE RVG SOLUÇÕES INTEGRADAS*\n\n` +
                    `*Nome/Razão:* ${name}\n` +
                    `*Telefone/WhatsApp:* ${phone}\n` +
                    `*E-mail:* ${email}\n` +
                    `*Serviço de Interesse:* ${service}\n\n` +
                    `*Descrição:* ${text}`;
                window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, '_blank', 'noopener');
            } else {
                const subject = `Contato do Site RVG - ${name} (${service})`;
                const body = `Nome / Razão Social: ${name}\n` +
                    `Telefone / WhatsApp: ${phone}\n` +
                    `E-mail: ${email}\n` +
                    `Serviço de Interesse: ${service}\n\n` +
                    `Descrição do Projeto:\n${text}`;
                window.location.href = `mailto:${EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
            }
        };

        form.addEventListener('submit', (e) => { e.preventDefault(); send('whatsapp'); });
        btnEmail && btnEmail.addEventListener('click', () => (form.checkValidity() ? send('email') : form.reportValidity()));
    }

    /* ---------------------------------------------------------------
       9. POWER UP — blecaute + energia percorrendo conduítes (SVG).
          Ao rolar até Serviços: o fundo escurece, um alimentador horizontal
          acende, desce pelo tronco central e energiza cada bloco em sequência.
       --------------------------------------------------------------- */
    function initPower() {
        const section = $('.section_power');
        if (!section) return;
        const svg = $('.power_circuit', section);
        const list = $('.services_list', section);
        const blackout = $('.power_blackout');
        const statusText = $('.power_status-text', section);
        const spark = $('.power_spark', svg);
        const groups = {
            base: $('.power_circuit-base', svg),
            glow: $('.power_circuit-glow', svg),
            core: $('.power_circuit-core', svg),
            flow: $('.power_circuit-flow', svg),
            nodes: $('.power_circuit-nodes', svg),
        };
        const NS = 'http://www.w3.org/2000/svg';

        section.classList.add('js-power');

        const FEED_SCROLL = 340;   // px de scroll para "energizar" o alimentador horizontal
        const FRONT_RATIO = 0.72;  // frente de energia = 72% da altura da viewport

        let main = null;           // { paths, length, hLength, yVertical }
        let branches = [];         // { paths, length, junction, card, node }
        let maxFront = -Infinity;  // trava: energia entregue não "desliga" ao voltar o scroll
        let state = '';

        const path = (d, group) => {
            const p = document.createElementNS(NS, 'path');
            p.setAttribute('d', d);
            group.appendChild(p);
            return p;
        };

        const makeLine = (d) => {
            const set = {
                base: path(d, groups.base),
                glow: path(d, groups.glow),
                core: path(d, groups.core),
                flow: path(d, groups.flow),
            };
            const length = set.core.getTotalLength();
            [set.glow, set.core].forEach((p) => {
                p.style.strokeDasharray = `${length} ${length}`;
                p.style.strokeDashoffset = `${length}`;
            });
            return { set, length };
        };

        const node = (cx, cy, r = 4.5) => {
            const c = document.createElementNS(NS, 'circle');
            c.setAttribute('cx', cx);
            c.setAttribute('cy', cy);
            c.setAttribute('r', r);
            c.setAttribute('class', 'power_node');
            groups.nodes.appendChild(c);
            return c;
        };

        const build = () => {
            Object.values(groups).forEach((g) => g.replaceChildren());
            main = null;
            branches = [];

            const cards = $$('.services_item', list).filter((c) => c.offsetParent !== null);
            if (!cards.length) return;

            const sr = section.getBoundingClientRect();
            const lr = list.getBoundingClientRect();
            const twoColumns = getComputedStyle(list).gridTemplateColumns.split(' ').length > 1;

            const rel = (r) => ({
                left: r.left - sr.left,
                right: r.right - sr.left,
                top: r.top - sr.top,
                bottom: r.bottom - sr.top,
            });

            const L = rel(lr);
            const xTrunk = twoColumns ? (L.left + L.right) / 2 : L.left + 8;
            const yFeeder = L.top - 36;
            const radius = Math.min(26, Math.max(6, xTrunk / 2));
            const yVertical = yFeeder + radius;

            const junctions = cards.map((card) => {
                const c = rel(card.getBoundingClientRect());
                // posição da junção independe de transformações momentâneas (hover/entrada)
                const y = c.top + (twoColumns ? 64 : 44);
                const toLeft = (c.left + c.right) / 2 < xTrunk;
                return { card, y, xEnd: toLeft ? c.right : c.left };
            });

            const yEnd = Math.max(...junctions.map((j) => j.y));
            const mainD = `M 0 ${yFeeder} H ${xTrunk - radius} Q ${xTrunk} ${yFeeder} ${xTrunk} ${yVertical} V ${yEnd}`;
            const m = makeLine(mainD);
            main = { ...m, yVertical, hLength: m.length - (yEnd - yVertical) };

            branches = junctions.map((j) => {
                const b = makeLine(`M ${xTrunk} ${j.y} H ${j.xEnd}`);
                node(xTrunk, j.y, 3);
                return { ...b, junction: main.hLength + (j.y - yVertical), card: j.card, node: node(j.xEnd, j.y) };
            });
            node(0, yFeeder, 3);
        };

        const draw = (line, amount) => {
            const drawn = clamp(amount, 0, line.length);
            const offset = line.length - drawn;
            line.set.glow.style.strokeDashoffset = offset;
            line.set.core.style.strokeDashoffset = offset;
            line.set.flow.classList.toggle('is-live', drawn >= line.length - 0.5);
            return drawn;
        };

        const setState = (next) => {
            if (next === state) return;
            state = next;
            section.classList.toggle('is-header-powered', next !== 'off');
            section.classList.toggle('is-fully-powered', next === 'full');
            if (statusText) {
                statusText.textContent = next === 'full' ? 'SISTEMA ENERGIZADO' : next === 'charging' ? 'ENERGIZANDO CIRCUITOS…' : 'SISTEMA DESENERGIZADO';
            }
        };

        const update = (y, vh) => {
            const sr = section.getBoundingClientRect();

            // Blecaute: escurece ao entrar, clareia ao sair
            if (blackout) {
                const enter = clamp((vh * 0.9 - sr.top) / (vh * 0.5));
                const exit = clamp(sr.bottom / (vh * 0.6));
                blackout.style.opacity = reducedMotion() ? 0 : (Math.min(enter, exit) * 0.94).toFixed(3);
            }

            if (!main) return;

            const front = reducedMotion() ? Infinity : vh * FRONT_RATIO - sr.top;
            maxFront = Math.max(maxFront, front);

            let energy;
            if (maxFront <= main.yVertical) {
                energy = main.hLength * clamp((maxFront - (main.yVertical - FEED_SCROLL)) / FEED_SCROLL);
            } else {
                energy = main.hLength + (maxFront - main.yVertical);
            }

            const mainDrawn = draw(main, energy);
            let powered = 0;
            branches.forEach((b) => {
                const drawn = draw(b, energy - b.junction);
                const on = drawn >= b.length - 0.5;
                b.card.classList.toggle('is-powered', on);
                b.node.classList.toggle('is-live', on);
                if (on) powered++;
            });

            // Faísca na frente de energia
            if (spark) {
                const active = mainDrawn > 0 && mainDrawn < main.length && !reducedMotion();
                spark.classList.toggle('is-active', active);
                if (active) {
                    const pt = main.set.core.getPointAtLength(mainDrawn);
                    spark.setAttribute('cx', pt.x);
                    spark.setAttribute('cy', pt.y);
                }
            }

            setState(powered === branches.length && branches.length ? 'full' : energy > main.hLength * 0.12 ? 'charging' : 'off');
        };

        layoutSubscribers.push(build);
        scrollSubscribers.push(update);
        build();
    }

    /* ---------------------------------------------------------------
       Boot
       --------------------------------------------------------------- */
    document.addEventListener('DOMContentLoaded', () => {
        initParticles();
        initHeroVideo();
        initNavbar();
        initCarousels();
        initServicesFilter();
        initProposal();
        initContactForm();
        initPower();
        initReveal();
        requestLayout();
    });
})();
