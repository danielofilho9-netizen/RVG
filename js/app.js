/* ==========================================================================
   RVG SOLUÇÕES INTEGRADAS - JAVASCRIPT APPLICATION LOGIC
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. CANVAS GOLD PARTICLE BACKGROUND ---
    initParticleCanvas();

    // --- 1.1 INTERACTIVE & AUTOMATIC SERVICE CAROUSELS ---
    initCarousels();

    // --- 2. MOBILE MENU TOGGLE ---
    const mobileToggle = document.getElementById('mobile-toggle');
    const navMenu = document.getElementById('nav-menu');

    if (mobileToggle && navMenu) {
        const toggleMenu = (open) => {
            const shouldOpen = open !== undefined ? open : !navMenu.classList.contains('active');
            if (shouldOpen) {
                navMenu.classList.add('active');
                document.body.classList.add('menu-open');
                const icon = mobileToggle.querySelector('i');
                if (icon) icon.className = 'fa-solid fa-xmark';
            } else {
                navMenu.classList.remove('active');
                document.body.classList.remove('menu-open');
                const icon = mobileToggle.querySelector('i');
                if (icon) icon.className = 'fa-solid fa-bars';
            }
        };

        mobileToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleMenu();
        });

        // Close menu on link or action click
        navMenu.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                toggleMenu(false);
            });
        });

        // Close when clicking outside
        document.addEventListener('click', (e) => {
            if (navMenu.classList.contains('active') && !navMenu.contains(e.target) && !mobileToggle.contains(e.target)) {
                toggleMenu(false);
            }
        });
    }

    // --- 3. SERVICES CATEGORY FILTER ---
    const filterBtns = document.querySelectorAll('.filter-btn');
    const serviceCards = document.querySelectorAll('.service-card');

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const filterValue = btn.getAttribute('data-filter');

            serviceCards.forEach(card => {
                const category = card.getAttribute('data-category');
                if (filterValue === 'all' || category === filterValue) {
                    card.style.display = 'flex';
                    card.style.animation = 'fadeIn 0.4s ease forwards';
                } else {
                    card.style.display = 'none';
                }
            });
        });
    });

    // --- 4. INTERACTIVE SIMULATOR CALCULATOR ---
    let selectedProperty = 'Condomínio Residencial';
    const propertyBtns = document.querySelectorAll('#property-type-group .sim-option-btn');
    const serviceCheckboxes = document.querySelectorAll('.sim-checkbox-grid input[type="checkbox"]');
    const summaryText = document.getElementById('sim-summary-text');
    const btnSendSimWa = document.getElementById('btn-send-sim-wa');
    const btnSendSimMail = document.getElementById('btn-send-sim-mail');

    // Property Selection
    propertyBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            propertyBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedProperty = btn.getAttribute('data-type');
            updateSimulatorSummary();
        });
    });

    // Checkbox Listener
    serviceCheckboxes.forEach(chk => {
        chk.addEventListener('change', updateSimulatorSummary);
    });

    function getSelectedServices() {
        const services = [];
        serviceCheckboxes.forEach(chk => {
            if (chk.checked) {
                services.push(chk.value);
            }
        });
        return services;
    }

    function updateSimulatorSummary() {
        const selectedServices = getSelectedServices();
        if (selectedServices.length === 0) {
            summaryText.innerHTML = `Imóvel: <strong>${selectedProperty}</strong> | Nenhuma solução selecionada ainda.`;
        } else {
            summaryText.innerHTML = `Imóvel: <strong>${selectedProperty}</strong> | Soluções: <strong>${selectedServices.length} selecionada(s)</strong> (${selectedServices[0]}${selectedServices.length > 1 ? ' e mais...' : ''})`;
        }
    }

    // Simulator -> WhatsApp
    if (btnSendSimWa) {
        btnSendSimWa.addEventListener('click', () => {
            const selectedServices = getSelectedServices();
            if (selectedServices.length === 0) {
                alert('Por favor, selecione ao menos um serviço no simulador.');
                return;
            }

            const message = `*SOLICITAÇÃO DE ORÇAMENTO - SITE RVG*\n\n` +
                `*Tipo de Imóvel:* ${selectedProperty}\n` +
                `*Serviços Desejados:*\n` +
                selectedServices.map(s => `• ${s}`).join('\n') +
                `\n\n_Gostaria de agendar uma vistoria/orçamento para o meu projeto._`;

            const whatsappUrl = `https://wa.me/5551982124987?text=${encodeURIComponent(message)}`;
            window.open(whatsappUrl, '_blank');
        });
    }

    // Simulator -> E-mail
    if (btnSendSimMail) {
        btnSendSimMail.addEventListener('click', () => {
            const selectedServices = getSelectedServices();
            if (selectedServices.length === 0) {
                alert('Por favor, selecione ao menos um serviço no simulador.');
                return;
            }

            const subject = `Solicitação de Orçamento RVG - ${selectedProperty}`;
            const body = `Olá equipe RVG Soluções Integradas,\n\n` +
                `Gostaria de um orçamento técnico com os seguintes detalhes:\n\n` +
                `Tipo de Imóvel: ${selectedProperty}\n` +
                `Serviços Desejados:\n` +
                selectedServices.map(s => `- ${s}`).join('\n') +
                `\n\nPor favor, entrem em contato.\nAtenciosamente.`;

            const mailtoUrl = `mailto:rvg.solucoes.integradas@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
            window.location.href = mailtoUrl;
        });
    }

    // --- 5. CONTACT FORM SUBMISSIONS (WHATSAPP AND EMAIL) ---
    const contactForm = document.getElementById('contact-form');
    const btnSubmitEmail = document.getElementById('btn-submit-email');

    if (contactForm) {
        // Default Submit -> WhatsApp
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            sendFormData('whatsapp');
        });

        // Email Button Click
        if (btnSubmitEmail) {
            btnSubmitEmail.addEventListener('click', () => {
                if (contactForm.checkValidity()) {
                    sendFormData('email');
                } else {
                    contactForm.reportValidity();
                }
            });
        }
    }

    function sendFormData(type) {
        const name = document.getElementById('name').value;
        const phone = document.getElementById('phone').value;
        const email = document.getElementById('email').value || 'Não informado';
        const service = document.getElementById('service').value;
        const messageText = document.getElementById('message').value || 'Sem descrição adicional.';

        if (type === 'whatsapp') {
            const message = `*CONTATO DIRETO - SITE RVG SOLUÇÕES INTEGRADAS*\n\n` +
                `*Nome/Razão:* ${name}\n` +
                `*Telefone/WhatsApp:* ${phone}\n` +
                `*E-mail:* ${email}\n` +
                `*Serviço de Interesse:* ${service}\n\n` +
                `*Descrição:* ${messageText}`;

            const whatsappUrl = `https://wa.me/5551982124987?text=${encodeURIComponent(message)}`;
            window.open(whatsappUrl, '_blank');
        } else if (type === 'email') {
            const subject = `Contato do Site RVG - ${name} (${service})`;
            const body = `Nome / Razão Social: ${name}\n` +
                `Telefone / WhatsApp: ${phone}\n` +
                `E-mail: ${email}\n` +
                `Serviço de Interesse: ${service}\n\n` +
                `Descrição do Projeto:\n${messageText}`;

            const mailtoUrl = `mailto:rvg.solucoes.integradas@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
            window.location.href = mailtoUrl;
        }
    }

    // --- 6. SCROLL SPY FOR HEADER LINKS ---
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-link');

    window.addEventListener('scroll', () => {
        let current = '';
        const scrollY = window.pageYOffset;

        sections.forEach(section => {
            const sectionTop = section.offsetTop - 120;
            const sectionHeight = section.offsetHeight;
            if (scrollY >= sectionTop && scrollY < sectionTop + sectionHeight) {
                current = section.getAttribute('id');
            }
        });

        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${current}`) {
                link.classList.add('active');
            }
        });
    });

});

/* Background Canvas Particles Implementation */
function initParticleCanvas() {
    const canvas = document.getElementById('bg-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    window.addEventListener('resize', () => {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    });

    const particles = [];
    const particleCount = Math.floor(width < 768 ? 25 : 55);

    for (let i = 0; i < particleCount; i++) {
        particles.push({
            x: Math.random() * width,
            y: Math.random() * height,
            radius: Math.random() * 2 + 1,
            color: Math.random() > 0.3 ? '#FFB800' : '#00E5FF',
            vx: (Math.random() - 0.5) * 0.4,
            vy: (Math.random() - 0.5) * 0.4,
            alpha: Math.random() * 0.5 + 0.2
        });
    }

    function animate() {
        ctx.clearRect(0, 0, width, height);

        particles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;

            if (p.x < 0) p.x = width;
            if (p.x > width) p.x = 0;
            if (p.y < 0) p.y = height;
            if (p.y > height) p.y = 0;

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.alpha;
            ctx.shadowBlur = 10;
            ctx.shadowColor = p.color;
            ctx.fill();
        });

        requestAnimationFrame(animate);
    }

    animate();
}

/* ==========================================================================
   CARROSSEL / SLIDER COMPONENT LOGIC (INTERATIVO & AUTOMÁTICO)
   ========================================================================== */
function initCarousels() {
    const carousels = document.querySelectorAll('.service-carousel');

    carousels.forEach(carousel => {
        const track = carousel.querySelector('.carousel-track');
        const slides = carousel.querySelectorAll('.carousel-slide');
        const prevBtn = carousel.querySelector('.carousel-prev');
        const nextBtn = carousel.querySelector('.carousel-next');
        const playBtn = carousel.querySelector('.carousel-play-toggle');
        const counter = carousel.querySelector('.carousel-counter');
        const dotsContainer = carousel.querySelector('.carousel-dots-container');

        if (!track || slides.length === 0) return;

        let currentIndex = 0;
        const totalSlides = slides.length;
        const intervalTime = parseInt(carousel.dataset.interval, 10) || 4000;
        let timer = null;
        let isPlaying = carousel.dataset.autoplay !== 'false';
        let isHovered = false;

        // Se houver apenas 1 slide, oculta os controles de navegação
        if (totalSlides <= 1) {
            if (prevBtn) prevBtn.style.display = 'none';
            if (nextBtn) nextBtn.style.display = 'none';
            if (playBtn) playBtn.style.display = 'none';
            if (counter) counter.style.display = 'none';
            if (dotsContainer) dotsContainer.style.display = 'none';
            return;
        }

        // Gera os indicadores em formato de pontos (dots) navegáveis
        if (dotsContainer) {
            dotsContainer.innerHTML = '';
            for (let i = 0; i < totalSlides; i++) {
                const dot = document.createElement('button');
                dot.type = 'button';
                dot.className = `carousel-dot ${i === 0 ? 'active' : ''}`;
                dot.setAttribute('aria-label', `Navegar para slide ${i + 1}`);
                dot.addEventListener('click', (e) => {
                    e.stopPropagation();
                    goToSlide(i);
                    resetAutoplay();
                });
                dotsContainer.appendChild(dot);
            }
        }

        const dots = dotsContainer ? dotsContainer.querySelectorAll('.carousel-dot') : [];

        function updateUI() {
            track.style.transform = `translateX(-${currentIndex * 100}%)`;

            dots.forEach((dot, idx) => {
                dot.classList.toggle('active', idx === currentIndex);
            });

            if (counter) {
                counter.textContent = `${currentIndex + 1} / ${totalSlides}`;
            }
        }

        function goToSlide(index) {
            if (index < 0) {
                currentIndex = totalSlides - 1;
            } else if (index >= totalSlides) {
                currentIndex = 0;
            } else {
                currentIndex = index;
            }
            updateUI();
        }

        function nextSlide() {
            goToSlide(currentIndex + 1);
        }

        function prevSlide() {
            goToSlide(currentIndex - 1);
        }

        // Controle do Temporizador de Rotação Automática (4s)
        function startTimer() {
            stopTimer();
            if (isPlaying && !isHovered) {
                timer = setInterval(nextSlide, intervalTime);
            }
        }

        function stopTimer() {
            if (timer) {
                clearInterval(timer);
                timer = null;
            }
        }

        function resetAutoplay() {
            if (isPlaying) {
                startTimer();
            }
        }

        // Botões Manuais Anterior e Próximo
        if (prevBtn) {
            prevBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                prevSlide();
                resetAutoplay();
            });
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                nextSlide();
                resetAutoplay();
            });
        }

        // Botão Play/Pausa
        if (playBtn) {
            playBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                isPlaying = !isPlaying;
                if (isPlaying) {
                    playBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
                    playBtn.setAttribute('title', 'Pausar rotação automática');
                    playBtn.setAttribute('aria-label', 'Pausar rotação automática');
                    playBtn.classList.remove('paused');
                    startTimer();
                } else {
                    playBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
                    playBtn.setAttribute('title', 'Iniciar rotação automática');
                    playBtn.setAttribute('aria-label', 'Iniciar rotação automática');
                    playBtn.classList.add('paused');
                    stopTimer();
                }
            });
        }

        // Pausa automática no Hover
        carousel.addEventListener('mouseenter', () => {
            isHovered = true;
            stopTimer();
        });

        carousel.addEventListener('mouseleave', () => {
            isHovered = false;
            if (isPlaying) {
                startTimer();
            }
        });

        // Suporte a Gesto de Arrastar / Swipe em Dispositivos Móveis e Touch
        let touchStartX = 0;
        let touchStartY = 0;
        let touchEndX = 0;
        let touchEndY = 0;
        const swipeThreshold = 40;

        carousel.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                touchStartX = e.touches[0].clientX;
                touchStartY = e.touches[0].clientY;
            }
        }, { passive: true });

        carousel.addEventListener('touchend', (e) => {
            if (e.changedTouches.length === 1) {
                touchEndX = e.changedTouches[0].clientX;
                touchEndY = e.changedTouches[0].clientY;
                handleSwipe();
            }
        }, { passive: true });

        function handleSwipe() {
            const diffX = touchEndX - touchStartX;
            const diffY = touchEndY - touchStartY;

            // Garante que o swipe horizontal é intencional
            if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > swipeThreshold) {
                if (diffX < 0) {
                    nextSlide(); // Arrasto para a esquerda -> próximo
                } else {
                    prevSlide(); // Arrasto para a direita -> anterior
                }
                resetAutoplay();
            }
        }

        // Inicializa o primeiro estado e liga o temporizador se ativado
        updateUI();
        if (isPlaying) {
            startTimer();
        }
    });
}
