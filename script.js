// ==========================================================================
// 1. THEME SYNCHRONIZATION & PERSISTENCE (ZERO-FLASH SYNC)
// ==========================================================================
(function initThemeEngine() {
    const root = document.documentElement;
    const STORAGE_KEY = 'theme';

    const getSystemTheme = () => {
        return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    };

    const getSavedTheme = () => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved === 'light' || saved === 'dark') return saved;
        return root.getAttribute('data-theme') || getSystemTheme() || 'dark';
    };

    const syncThemeUI = (theme, persist = false) => {
        root.setAttribute('data-theme', theme);
        if (persist) {
            localStorage.setItem(STORAGE_KEY, theme);
        }

        const isLight = theme === 'light';
        const toggles = document.querySelectorAll('input#theme-toggle');
        toggles.forEach(toggle => {
            if (toggle.checked !== isLight) {
                toggle.checked = isLight;
            }
        });
    };

    // Execute instant sync
    const initialTheme = getSavedTheme();
    syncThemeUI(initialTheme);

    // Instant delegation for checkbox change
    document.addEventListener('change', (e) => {
        if (e.target && e.target.matches('input#theme-toggle')) {
            const nextTheme = e.target.checked ? 'light' : 'dark';
            syncThemeUI(nextTheme, true);
        }
    });

    // Ensure checkbox DOM state aligns on interactive ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            syncThemeUI(root.getAttribute('data-theme') || initialTheme);
        });
    } else {
        syncThemeUI(root.getAttribute('data-theme') || initialTheme);
    }
})();

// ==========================================================================
// 2. LIVING BACKGROUND CANVAS (Max 50 Connected Nodes, Zero Lag)
// ==========================================================================
(function initLivingBackgroundCanvas() {
    const canvas = document.getElementById('live-bg-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    // Respect reduced motion preferences
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        return;
    }

    let width = 0;
    let height = 0;
    let dpr = 1;
    let animationFrameId = null;
    let isPaused = false;

    // Mobile Canvas Optimization: Cap particle count to <= 22 nodes on mobile viewports
    const calculateMaxNodes = () => {
        if (window.innerWidth <= 768) {
            return Math.min(22, Math.max(14, Math.floor(window.innerWidth / 18)));
        }
        if (window.innerWidth <= 1024) {
            return 35;
        }
        return 48;
    };

    let maxNodes = calculateMaxNodes();
    const CONNECT_DIST = 115;
    const CONNECT_DIST_SQ = CONNECT_DIST * CONNECT_DIST;
    const nodes = [];

    function resizeCanvas() {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
        ctx.scale(dpr, dpr);
    }

    class ParticleNode {
        constructor() {
            this.reset(true);
        }

        reset(isInitial = false) {
            this.x = Math.random() * width;
            this.y = isInitial ? Math.random() * height : (Math.random() > 0.5 ? 0 : height);
            const speed = 0.25 + Math.random() * 0.45;
            const angle = Math.random() * Math.PI * 2;
            this.vx = Math.cos(angle) * speed;
            this.vy = Math.sin(angle) * speed;
            this.radius = 1.1 + Math.random() * 1.3;
        }

        update() {
            this.x += this.vx;
            this.y += this.vy;

            if (this.x < -10 || this.x > width + 10 || this.y < -10 || this.y > height + 10) {
                this.reset(false);
            }
        }

        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(244, 63, 94, 0.72)';
            ctx.fill();
        }
    }

    resizeCanvas();
    for (let i = 0; i < maxNodes; i++) {
        nodes.push(new ParticleNode());
    }

    function renderCanvas() {
        if (isPaused) return;

        ctx.clearRect(0, 0, width, height);

        const nodeCount = nodes.length;
        for (let i = 0; i < nodeCount; i++) {
            const a = nodes[i];
            a.update();
            a.draw();

            for (let j = i + 1; j < nodeCount; j++) {
                const b = nodes[j];
                const dx = a.x - b.x;
                const dy = a.y - b.y;
                const distSq = dx * dx + dy * dy;

                if (distSq < CONNECT_DIST_SQ) {
                    const dist = Math.sqrt(distSq);
                    const alpha = (1 - dist / CONNECT_DIST) * 0.22;
                    ctx.beginPath();
                    ctx.moveTo(a.x, a.y);
                    ctx.lineTo(b.x, b.y);
                    ctx.strokeStyle = `rgba(244, 63, 94, ${alpha})`;
                    ctx.lineWidth = 0.85;
                    ctx.stroke();
                }
            }
        }

        animationFrameId = requestAnimationFrame(renderCanvas);
    }

    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            resizeCanvas();
            const newMax = calculateMaxNodes();
            while (nodes.length > newMax) nodes.pop();
            while (nodes.length < newMax) nodes.push(new ParticleNode());
        }, 150);
    }, { passive: true });

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            isPaused = true;
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
        } else {
            isPaused = false;
            animationFrameId = requestAnimationFrame(renderCanvas);
        }
    });

    animationFrameId = requestAnimationFrame(renderCanvas);
})();

// ==========================================================================
// 3. RESPONSIVE MOBILE NAVIGATION
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
    const mobileBtn = document.querySelector('.mobile-hamburger') || document.querySelector('.mobile-menu-btn');
    const navMenu = document.querySelector('.desktop-nav') || document.querySelector('.nav-menu');

    if (mobileBtn && navMenu) {
        mobileBtn.addEventListener('click', () => {
            const isActive = navMenu.classList.toggle('active');
            mobileBtn.setAttribute('aria-expanded', isActive ? 'true' : 'false');
            const icon = isActive ? 'x' : 'menu';
            const iconEl = mobileBtn.querySelector('i');
            if (iconEl) {
                iconEl.setAttribute('data-feather', icon);
                if (window.feather) feather.replace();
            }
        });

        navMenu.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                navMenu.classList.remove('active');
                mobileBtn.setAttribute('aria-expanded', 'false');
                const iconEl = mobileBtn.querySelector('i');
                if (iconEl) {
                    iconEl.setAttribute('data-feather', 'menu');
                    if (window.feather) feather.replace();
                }
            });
        });
    }

    // ==========================================================================
    // 4. SMOOTH SCROLLING (OFFSET SAFE)
    // ==========================================================================
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const targetId = this.getAttribute('href');
            if (!targetId || targetId === '#') {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: 'smooth' });
                return;
            }

            try {
                const targetElement = document.querySelector(targetId);
                if (targetElement) {
                    e.preventDefault();
                    const headerHeight = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-h') || '74', 10);
                    const elementPosition = targetElement.getBoundingClientRect().top;
                    const offsetPosition = elementPosition + window.pageYOffset - (headerHeight + 10);

                    window.scrollTo({
                        top: offsetPosition,
                        behavior: 'smooth'
                    });
                }
            } catch (err) {
                // Selector fallback
            }
        });
    });

    // ==========================================================================
    // 5. SCROLL REVEAL OBSERVER
    // ==========================================================================
    const revealElements = document.querySelectorAll('.reveal');
    if (revealElements.length > 0) {
        const revealObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('active');
                }
            });
        }, {
            threshold: 0.08,
            rootMargin: '0px 0px -30px 0px'
        });

        revealElements.forEach(el => revealObserver.observe(el));
    }

    // ==========================================================================
    // 6. PROJECT CATEGORY FILTERING (Works Page)
    // ==========================================================================
    const filterBtns = document.querySelectorAll('.filter-btn');
    const projectCards = document.querySelectorAll('.project-card');

    if (filterBtns.length > 0 && projectCards.length > 0) {
        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                filterBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                const filterValue = btn.getAttribute('data-filter');

                projectCards.forEach(card => {
                    const category = card.getAttribute('data-category');
                    if (filterValue === 'all' || category === filterValue) {
                        card.classList.remove('hide');
                        card.style.display = '';
                    } else {
                        card.classList.add('hide');
                        card.style.display = 'none';
                    }
                });
            });
        });
    }

    // Init Feather Icons
    if (window.feather) {
        feather.replace();
    }
});
