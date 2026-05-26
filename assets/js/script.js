/**
 * Diljeet Singh Sran - Modern Portfolio 2026
 * Premium JavaScript
 * Design by Altmediia
 */

// ==================== //
// SMOOTH SCROLL
// ==================== //

const SmoothScroll = {
    init() {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                const href = this.getAttribute('href');
                if (href === '#') return;
                
                e.preventDefault();
                const target = document.querySelector(href);
                
                if (target) {
                    const navbarHeight = document.getElementById('navbar')?.offsetHeight || 0;
                    const targetPosition = target.offsetTop - navbarHeight - 20;
                    
                    window.scrollTo({
                        top: targetPosition,
                        behavior: 'smooth'
                    });
                }
            });
        });
    }
};

// ==================== //
// MOBILE MENU
// ==================== //

const MobileMenu = {
    menuBtn: null,
    menu: null,
    links: [],
    
    init() {
        this.menuBtn = document.getElementById('mobileMenuBtn');
        this.menu = document.getElementById('mobileNav');
        this.links = document.querySelectorAll('.mobile-link');
        
        if (!this.menuBtn || !this.menu) return;
        
        this.menuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggle();
        });
        
        this.links.forEach(link => {
            link.addEventListener('click', () => this.close());
        });
        
        document.addEventListener('click', (e) => {
            if (!this.menu.contains(e.target) && !this.menuBtn.contains(e.target)) {
                this.close();
            }
        });
    },
    
    toggle() {
        this.menu.classList.toggle('hidden');
    },
    
    close() {
        this.menu.classList.add('hidden');
    }
};

// ==================== //
// NAVBAR SCROLL
// ==================== //

const NavbarScroll = {
    navbar: null,
    scrollThreshold: 50,
    
    init() {
        this.navbar = document.getElementById('navbar');
        if (!this.navbar) return;
        
        window.addEventListener('scroll', () => this.handleScroll(), { passive: true });
    },
    
    handleScroll() {
        const currentScroll = window.scrollY;
        
        if (currentScroll > this.scrollThreshold) {
            this.navbar.classList.add('scrolled');
        } else {
            this.navbar.classList.remove('scrolled');
        }
    }
};

// ==================== //
// SCROLL REVEAL
// ==================== //

const ScrollReveal = {
    elements: [],
    observer: null,
    
    init() {
        this.elements = document.querySelectorAll('.reveal-modern');
        if (this.elements.length === 0) return;
        
        const options = {
            threshold: 0.1,
            rootMargin: "0px 0px -100px 0px"
        };
        
        this.observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const delay = entry.target.dataset.delay || 0;
                    setTimeout(() => {
                        entry.target.classList.add('active');
                    }, delay);
                    this.observer.unobserve(entry.target);
                }
            });
        }, options);
        
        // Add stagger delays
        this.elements.forEach((el, index) => {
            const sectionElements = Array.from(this.elements).filter(e => 
                e.closest('section') === el.closest('section')
            );
            const indexInSection = sectionElements.indexOf(el);
            el.dataset.delay = indexInSection * 100;
            this.observer.observe(el);
        });
    }
};

// ==================== //
// COPY EMAIL
// ==================== //

const CopyEmail = {
    button: null,
    email: 'sranhub@gmail.com',
    
    init() {
        this.button = document.getElementById('copyEmailBtn');
        if (!this.button) return;
        
        this.button.addEventListener('click', () => this.copyToClipboard());
    },
    
    async copyToClipboard() {
        try {
            await navigator.clipboard.writeText(this.email);
            this.showSuccess();
        } catch (err) {
            console.error('Failed to copy:', err);
            this.showFallback();
        }
    },
    
    showSuccess() {
        const originalHTML = this.button.innerHTML;
        const originalClasses = this.button.className;
        
        this.button.innerHTML = '<i class="fas fa-check mr-2"></i> Copied!';
        this.button.className = 'btn-modern btn-gradient-primary';
        
        setTimeout(() => {
            this.button.innerHTML = originalHTML;
            this.button.className = originalClasses;
        }, 2500);
    },
    
    showFallback() {
        const textArea = document.createElement('textarea');
        textArea.value = this.email;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.select();
        
        try {
            document.execCommand('copy');
            this.showSuccess();
        } catch (err) {
            console.error('Fallback failed:', err);
        }
        
        document.body.removeChild(textArea);
    }
};

// ==================== //
// CONTACT FORM
// ==================== //

const ContactForm = {
    form: null,
    submitButton: null,
    
    init() {
        this.form = document.getElementById('contactForm');
        if (!this.form) return;
        
        this.submitButton = this.form.querySelector('button[type="submit"]');
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
    },
    
    handleSubmit(e) {
        e.preventDefault();
        
        const originalText = this.submitButton.innerHTML;
        
        if (!this.validateForm()) {
            this.showNotification('Please fill all fields correctly.', 'error');
            return;
        }
        
        this.submitButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Sending...';
        this.submitButton.disabled = true;
        
        const formData = new FormData(this.form);
        const data = Object.fromEntries(formData);
        
        // Simulate sending
        setTimeout(() => {
            console.log('Form data:', data);
            
            this.submitButton.innerHTML = '<i class="fas fa-check mr-2"></i> Sent!';
            
            setTimeout(() => {
                this.submitButton.innerHTML = originalText;
                this.submitButton.disabled = false;
                this.form.reset();
                this.showNotification('Message sent successfully!', 'success');
            }, 2000);
        }, 1500);
    },
    
    validateForm() {
        const inputs = this.form.querySelectorAll('input[required], textarea[required]');
        let isValid = true;
        
        inputs.forEach(input => {
            if (!input.value.trim()) {
                isValid = false;
                input.classList.add('border-red-500');
            } else {
                input.classList.remove('border-red-500');
            }
        });
        
        return isValid;
    },
    
    showNotification(message, type) {
        const notification = document.createElement('div');
        const bgColor = type === 'success' ? 'from-green-400 to-green-600' : 'from-red-400 to-red-600';
        const icon = type === 'success' ? 'fa-check' : 'fa-exclamation';
        
        notification.className = 'fixed top-24 right-6 glass-modern rounded-2xl p-5 shadow-2xl z-50 transform transition-all duration-500';
        notification.style.transform = 'translateX(400px)';
        notification.innerHTML = `
            <div class="flex items-center gap-3">
                <div class="w-12 h-12 bg-gradient-to-r ${bgColor} rounded-full flex items-center justify-center text-white">
                    <i class="fas ${icon} text-xl"></i>
                </div>
                <div>
                    <p class="font-bold text-gray-800">${type === 'success' ? 'Success!' : 'Error!'}</p>
                    <p class="text-sm text-gray-600">${message}</p>
                </div>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        setTimeout(() => {
            notification.style.transform = 'translateX(400px)';
            setTimeout(() => notification.remove(), 500);
        }, 5000);
    }
};

// ==================== //
// BACK TO TOP BUTTON
// ==================== //

const BackToTop = {
    button: null,
    showThreshold: 500,
    
    init() {
        this.button = document.getElementById('backToTop');
        if (!this.button) return;
        
        window.addEventListener('scroll', () => this.handleScroll(), { passive: true });
        this.button.addEventListener('click', () => this.scrollToTop());
    },
    
    handleScroll() {
        if (window.scrollY > this.showThreshold) {
            this.button.classList.remove('hidden');
            this.button.classList.add('flex');
        } else {
            this.button.classList.add('hidden');
            this.button.classList.remove('flex');
        }
    },
    
    scrollToTop() {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    }
};

// ==================== //
// COUNTER ANIMATION
// ==================== //

const CounterAnimation = {
    counters: [],
    observer: null,
    
    init() {
        this.counters = document.querySelectorAll('.counter');
        if (this.counters.length === 0) return;
        
        const options = {
            threshold: 0.5
        };
        
        this.observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.animateCounter(entry.target);
                    this.observer.unobserve(entry.target);
                }
            });
        }, options);
        
        this.counters.forEach(counter => this.observer.observe(counter));
    },
    
    animateCounter(counter) {
        const target = parseInt(counter.getAttribute('data-target'));
        const duration = 2000;
        const increment = target / (duration / 16);
        let current = 0;
        
        const updateCounter = () => {
            current += increment;
            if (current < target) {
                counter.textContent = Math.ceil(current);
                requestAnimationFrame(updateCounter);
            } else {
                counter.textContent = target;
            }
        };
        
        updateCounter();
    }
};

// ==================== //
// TYPING EFFECT
// ==================== //

const TypingEffect = {
    element: null,
    texts: [],
    currentIndex: 0,
    currentText: '',
    isDeleting: false,
    typeSpeed: 100,
    deleteSpeed: 50,
    pauseTime: 2000,
    
    init(elementId, texts) {
        this.element = document.getElementById(elementId);
        if (!this.element) return;
        
        this.texts = texts;
        this.type();
    },
    
    type() {
        const fullText = this.texts[this.currentIndex];
        
        if (this.isDeleting) {
            this.currentText = fullText.substring(0, this.currentText.length - 1);
        } else {
            this.currentText = fullText.substring(0, this.currentText.length + 1);
        }
        
        this.element.textContent = this.currentText;
        
        let speed = this.isDeleting ? this.deleteSpeed : this.typeSpeed;
        
        if (!this.isDeleting && this.currentText === fullText) {
            speed = this.pauseTime;
            this.isDeleting = true;
        } else if (this.isDeleting && this.currentText === '') {
            this.isDeleting = false;
            this.currentIndex = (this.currentIndex + 1) % this.texts.length;
            speed = 500;
        }
        
        setTimeout(() => this.type(), speed);
    }
};

// ==================== //
// PARALLAX EFFECT
// ==================== //

const ParallaxEffect = {
    elements: [],
    
    init() {
        this.elements = document.querySelectorAll('.parallax');
        if (this.elements.length === 0) return;
        
        window.addEventListener('scroll', () => this.handleScroll(), { passive: true });
    },
    
    handleScroll() {
        const scrolled = window.scrollY;
        
        this.elements.forEach(element => {
            const speed = element.dataset.speed || 0.5;
            const yPos = -(scrolled * speed);
            element.style.transform = `translateY(${yPos}px)`;
        });
    }
};

// ==================== //
// LAZY LOAD IMAGES
// ==================== //

const LazyLoadImages = {
    images: [],
    observer: null,
    
    init() {
        this.images = document.querySelectorAll('img[data-src]');
        if (this.images.length === 0) return;
        
        const options = {
            root: null,
            rootMargin: '100px',
            threshold: 0.01
        };
        
        this.observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.loadImage(entry.target);
                }
            });
        }, options);
        
        this.images.forEach(img => this.observer.observe(img));
    },
    
    loadImage(img) {
        const src = img.getAttribute('data-src');
        if (!src) return;
        
        const tempImg = new Image();
        tempImg.onload = () => {
            img.src = src;
            img.classList.add('animate-fade-up');
            img.removeAttribute('data-src');
            this.observer.unobserve(img);
        };
        tempImg.src = src;
    }
};

// ==================== //
// CURSOR EFFECT (OPTIONAL)
// ==================== //

const CursorEffect = {
    cursor: null,
    cursorDot: null,
    
    init() {
        // Create cursor elements
        this.cursor = document.createElement('div');
        this.cursor.className = 'custom-cursor';
        this.cursor.style.cssText = `
            width: 40px;
            height: 40px;
            border: 2px solid rgba(102, 126, 234, 0.5);
            border-radius: 50%;
            position: fixed;
            pointer-events: none;
            z-index: 9999;
            transition: all 0.2s ease;
            transform: translate(-50%, -50%);
        `;
        
        this.cursorDot = document.createElement('div');
        this.cursorDot.className = 'custom-cursor-dot';
        this.cursorDot.style.cssText = `
            width: 8px;
            height: 8px;
            background: linear-gradient(135deg, #667eea, #764ba2);
            border-radius: 50%;
            position: fixed;
            pointer-events: none;
            z-index: 10000;
            transform: translate(-50%, -50%);
        `;
        
        document.body.appendChild(this.cursor);
        document.body.appendChild(this.cursorDot);
        
        // Track mouse movement
        document.addEventListener('mousemove', (e) => {
            this.cursorDot.style.left = e.clientX + 'px';
            this.cursorDot.style.top = e.clientY + 'px';
            
            setTimeout(() => {
                this.cursor.style.left = e.clientX + 'px';
                this.cursor.style.top = e.clientY + 'px';
            }, 100);
        });
        
        // Hover effects
        const hoverElements = document.querySelectorAll('a, button, .btn-modern');
        hoverElements.forEach(el => {
            el.addEventListener('mouseenter', () => {
                this.cursor.style.transform = 'translate(-50%, -50%) scale(1.5)';
                this.cursor.style.borderColor = 'rgba(102, 126, 234, 0.8)';
            });
            
            el.addEventListener('mouseleave', () => {
                this.cursor.style.transform = 'translate(-50%, -50%) scale(1)';
                this.cursor.style.borderColor = 'rgba(102, 126, 234, 0.5)';
            });
        });
    }
};

// ==================== //
// PAGE LOAD ANIMATION
// ==================== //

const PageLoad = {
    init() {
        window.addEventListener('load', () => {
            document.body.classList.add('loaded');
            
            // Add entrance animations
            const heroElements = document.querySelectorAll('.animate-fade-up, .animate-scale-in');
            heroElements.forEach((el, index) => {
                setTimeout(() => {
                    el.style.opacity = '1';
                }, index * 150);
            });
        });
    }
};

// ==================== //
// INITIALIZE ALL
// ==================== //

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Modern Portfolio 2026 Initializing...');
    
    // Initialize core modules
    SmoothScroll.init();
    MobileMenu.init();
    NavbarScroll.init();
    ScrollReveal.init();
    CopyEmail.init();
    ContactForm.init();
    BackToTop.init();
    CounterAnimation.init();
    ParallaxEffect.init();
    LazyLoadImages.init();
    PageLoad.init();
    
    // Optional: Custom cursor (uncomment if you want)
    // CursorEffect.init();
    
    console.log('✨ Modern Portfolio Ready!');
});

// ==================== //
// UTILITY FUNCTIONS
// ==================== //

const Utils = {
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },
    
    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },
    
    isInViewport(element) {
        const rect = element.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
    }
};
