/* ==========================================================================
   RVG SOLUÇÕES INTEGRADAS - JAVASCRIPT APPLICATION LOGIC
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. CANVAS GOLD PARTICLE BACKGROUND ---
    initParticleCanvas();

    // --- 2. MOBILE MENU TOGGLE ---
    const mobileToggle = document.getElementById('mobile-toggle');
    const navMenu = document.getElementById('nav-menu');

    if (mobileToggle && navMenu) {
        mobileToggle.addEventListener('click', () => {
            navMenu.classList.toggle('active');
            const icon = mobileToggle.querySelector('i');
            if (navMenu.classList.contains('active')) {
                icon.className = 'fa-solid fa-xmark';
            } else {
                icon.className = 'fa-solid fa-bars';
            }
        });

        // Close menu on link click
        navMenu.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                navMenu.classList.remove('active');
                if (mobileToggle.querySelector('i')) {
                    mobileToggle.querySelector('i').className = 'fa-solid fa-bars';
                }
            });
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
