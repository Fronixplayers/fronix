/* ================================================
   ALTMEDIIA — app.js  |  UI Logic Only
   No Firebase here — see firebase-loader.js
   ================================================ */

/* ── NAVBAR ── */
(function() {
  const nav  = document.getElementById('navbar');
  const ham  = document.getElementById('hamBtn');
  const mNav = document.getElementById('mobileNav');

  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 50);
  });

  if (ham && mNav) {
    ham.addEventListener('click', () => {
      ham.classList.toggle('open');
      mNav.classList.toggle('open');
    });
    mNav.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        ham.classList.remove('open');
        mNav.classList.remove('open');
      });
    });
  }

  // Active nav on scroll
  const sections = document.querySelectorAll('section[id]');
  window.addEventListener('scroll', () => {
    let cur = '';
    sections.forEach(s => { if (window.scrollY >= s.offsetTop - 100) cur = s.id; });
    document.querySelectorAll('.nav-links a').forEach(a => {
      a.classList.remove('active');
      if (a.getAttribute('href') === '#' + cur) a.classList.add('active');
    });
  }, { passive: true });
})();

/* ── SMOOTH SCROLL ── */
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const t = document.querySelector(a.getAttribute('href'));
    if (t) { e.preventDefault(); t.scrollIntoView({ behavior: 'smooth' }); }
  });
});

/* ── SCROLL REVEAL ── */
(function() {
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('on'); obs.unobserve(e.target); }
    });
  }, { threshold: 0.1 });
  document.querySelectorAll('.reveal').forEach(el => obs.observe(el));
  window._revealObs = obs;
})();

/* ── COUNTER ANIMATION ── */
(function() {
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.querySelectorAll('.counter').forEach(c => {
        const target = parseInt(c.dataset.target) || 0;
        let cur = 0;
        const step = Math.max(1, Math.floor(target / 60));
        const t = setInterval(() => {
          cur = Math.min(cur + step, target);
          c.textContent = cur;
          if (cur >= target) clearInterval(t);
        }, 25);
      });
      obs.unobserve(e.target);
    });
  }, { threshold: 0.4 });
  document.querySelectorAll('.stats-row,.hero-stats').forEach(el => obs.observe(el));
})();

/* ── PORTFOLIO / WORK FILTER ── */
window.initFilter = function(gridId, filterClass) {
  const btns = document.querySelectorAll(`.${filterClass}`);
  const grid = document.getElementById(gridId);
  if (!grid || !btns.length) return;

  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      btns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const cat = btn.dataset.filter;
      grid.querySelectorAll('[data-cat]').forEach(item => {
        const match = cat === 'all' || item.dataset.cat.includes(cat);
        item.style.display = match ? '' : 'none';
      });
    });
  });

  // Activate "All" by default
  const allBtn = document.querySelector(`.${filterClass}[data-filter="all"]`);
  if (allBtn) allBtn.click();
};

/* ── SHOW MORE ── */
window.initShowMore = function(btnId, itemSelector, count) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  const items = document.querySelectorAll(itemSelector);
  items.forEach((item, i) => { if (i >= count) item.classList.add('hidden-item'); });
  let shown = false;
  btn.addEventListener('click', () => {
    shown = !shown;
    items.forEach((item, i) => { if (i >= count) item.classList.toggle('hidden-item', !shown); });
    btn.textContent = shown ? 'Show Less' : 'Show More';
  });
};

/* ── LIGHTBOX for certificates ── */
(function() {
  const lb  = document.getElementById('lightbox');
  const img = document.getElementById('lbImg');
  const cls = document.getElementById('lbClose');
  if (!lb || !img) return;

  document.addEventListener('click', e => {
    const cert = e.target.closest('.cert-img-wrap img');
    if (cert) { img.src = cert.src; lb.classList.add('open'); }
  });
  const close = () => lb.classList.remove('open');
  if (cls) cls.addEventListener('click', close);
  lb.addEventListener('click', e => { if (e.target === lb) close(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
})();

/* ── CONTACT FORM ── */
(function() {
  const form = document.getElementById('contactForm');
  if (!form) return;
  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    const btn     = form.querySelector('[type="submit"]');
    const success = document.getElementById('formSuccess');
    const error   = document.getElementById('formError');
    if (success) success.classList.remove('ok');
    if (error)   error.classList.remove('err');

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';

    try {
      const res = await fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { 'Accept': 'application/json' }
      });
      if (res.ok) {
        if (success) success.classList.add('ok');
        form.reset();
        btn.innerHTML = '<i class="fas fa-check"></i> Sent!';
        setTimeout(() => { btn.disabled = false; btn.innerHTML = 'Send Message <i class="fas fa-paper-plane"></i>'; }, 3000);
      } else { throw new Error(); }
    } catch (_) {
      if (error) error.classList.add('err');
      btn.disabled = false;
      btn.innerHTML = 'Send Message <i class="fas fa-paper-plane"></i>';
    }
  });
})();

/* ── NEWSLETTER ── */
(function() {
  const form = document.getElementById('newsletterForm');
  if (!form) return;
  form.addEventListener('submit', e => {
    e.preventDefault();
    const inp = form.querySelector('input');
    if (inp && inp.value.trim()) {
      inp.value = '';
      alert('✅ Subscribed! Thank you.');
    }
  });
})();

/* ── TICKER duplicate for seamless loop ── */
(function() {
  const track = document.querySelector('.ticker-track');
  if (track) track.innerHTML += track.innerHTML;
})();
