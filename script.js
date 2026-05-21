$(document).ready(function () {

    /* --- Custom Cursor --- */
    const cursor = document.querySelector('.cursor');
    const follower = document.querySelector('.cursor-follower');
    let mouseX = 0, mouseY = 0, followerX = 0, followerY = 0;

    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        cursor.style.left = mouseX + 'px';
        cursor.style.top = mouseY + 'px';
    });

    function animateFollower() {
        followerX += (mouseX - followerX) * 0.12;
        followerY += (mouseY - followerY) * 0.12;
        follower.style.left = followerX + 'px';
        follower.style.top = followerY + 'px';
        requestAnimationFrame(animateFollower);
    }
    animateFollower();

    $('a, button').on('mouseenter', () => {
        cursor.style.width = '1.5rem';
        cursor.style.height = '1.5rem';
        follower.style.width = '5rem';
        follower.style.height = '5rem';
        follower.style.borderColor = 'rgba(0, 210, 133, 0.6)';
    }).on('mouseleave', () => {
        cursor.style.width = '1rem';
        cursor.style.height = '1rem';
        follower.style.width = '3rem';
        follower.style.height = '3rem';
        follower.style.borderColor = 'rgba(0, 210, 133, 0.4)';
    });

    /* --- Mobile Menu Toggle --- */
    $('#menuToggle').on('click', function () {
        $(this).toggleClass('active');
        $('#navbar').toggleClass('active');
    });

    /* --- Close menu on nav link click --- */
    $('.nav-link').on('click', function () {
        $('#menuToggle').removeClass('active');
        $('#navbar').removeClass('active');
    });

    /* --- Header scroll effect --- */
    $(window).on('scroll', function () {
        if ($(window).scrollTop() > 60) {
            $('.header').addClass('scrolled');
        } else {
            $('.header').removeClass('scrolled');
        }

        /* Active nav link on scroll */
        $('section').each(function () {
            let top = $(window).scrollTop();
            let offset = $(this).offset().top - 150;
            let height = $(this).outerHeight();
            let id = $(this).attr('id');

            if (top >= offset && top < offset + height) {
                $('.nav-link').removeClass('active');
                $(`.nav-link[href="#${id}"]`).addClass('active');
            }
        });

        /* Scroll to top button */
        if ($(window).scrollTop() > 300) {
            $('#scrollTop').addClass('visible');
        } else {
            $('#scrollTop').removeClass('visible');
        }
    });

    /* --- Scroll to top --- */
    $('#scrollTop').on('click', function () {
        $('html, body').animate({ scrollTop: 0 }, 600, 'swing');
    });

    /* --- Reveal on scroll --- */
    const revealElements = document.querySelectorAll(
        '.service-card, .project-card, .team-card, .stat-card, .acronym-item, .about-grid, .contact-grid'
    );

    revealElements.forEach(el => el.classList.add('reveal'));

    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry, i) => {
            if (entry.isIntersecting) {
                setTimeout(() => {
                    entry.target.classList.add('active');
                }, i * 80);
                revealObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    revealElements.forEach(el => revealObserver.observe(el));

    /* --- Counter animation --- */
    function animateCounter(el) {
        const target = parseInt(el.getAttribute('data-target'));
        const duration = 1800;
        const step = target / (duration / 16);
        let current = 0;

        const timer = setInterval(() => {
            current += step;
            if (current >= target) {
                el.textContent = target;
                clearInterval(timer);
            } else {
                el.textContent = Math.floor(current);
            }
        }, 16);
    }

    const counterObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateCounter(entry.target);
                counterObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });

    document.querySelectorAll('.counter').forEach(el => counterObserver.observe(el));

    /* --- Smooth hover glow on cards --- */
    document.querySelectorAll('.glass-card').forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const xPercent = (x / rect.width) * 100;
            const yPercent = (y / rect.height) * 100;
            card.style.setProperty('--mouse-x', xPercent + '%');
            card.style.setProperty('--mouse-y', yPercent + '%');
        });
    });

});
