/* ================================================
   ALTMEDIIA — firebase-loader.js
   Firebase content loader — isolated from UI logic
   Collection: 'site' (documents per section)
   Lists: services, projects, reviews,
          certificates, articles, team, popups
   ================================================ */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import {
  getFirestore, doc, getDoc, collection, getDocs
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

/* ── CONFIG — split to deter scraping ── */
const _k1 = 'AIzaSyCVwfal';
const _k2 = '_dqsPpluVA5Iy6-R8Kl31-Rg';
/* ⚠️ REPLACE below with your real altmediia Firebase config:
   Firebase Console → altmediia project → Project Settings → Your apps → Config */
const _pid = 'altmediia';
const _cfg = {
  apiKey:            _k1 + _k2,
  authDomain:        `${_pid}.firebaseapp.com`,
  projectId:         _pid,
  storageBucket:     `${_pid}.appspot.com`,
  messagingSenderId: '942976075894',
  appId:             '1:942976075894:web:altmediia-main'
};

const _app = initializeApp(_cfg, 'altmediia-site');
const _db  = getFirestore(_app);

/* ── Helpers ── */
async function _sec(name) {
  try { const s = await getDoc(doc(_db, 'site', name)); return s.exists() ? s.data() : null; }
  catch(e) { console.warn('[ALT]', name, e.message); return null; }
}
async function _col(name) {
  try {
    const s = await getDocs(collection(_db, name));
    const r = []; s.forEach(d => r.push({ _id: d.id, ...d.data() })); return r;
  } catch(e) { console.warn('[ALT]', name, e.message); return []; }
}

/* ══════════════════════════════
   SECTION APPLIERS
══════════════════════════════ */

/* ── HERO ── */
function _hero(d) {
  if (!d) return;
  if (d.badge)    { const el = document.querySelector('#hero .badge'); if(el) el.innerHTML = `<span class="dot"></span> ${d.badge}`; }
  if (d.h1Line1)  { const el = document.querySelector('#hero h1'); if(el) el.innerHTML = `${d.h1Line1} <span class="gt">${d.h1Line2||''}</span><br>${d.h1Line3||''}`; }
  if (d.desc)     { const el = document.querySelector('#hero .hero-desc'); if(el) el.textContent = d.desc; }
  if (d.btn1Text) { const el = document.querySelector('#hero .btn-primary'); if(el) { el.textContent = d.btn1Text; if(d.btn1Link) el.href = d.btn1Link; } }
  if (d.btn2Text) { const el = document.querySelector('#hero .btn-outline'); if(el) { el.textContent = d.btn2Text; if(d.btn2Link) el.href = d.btn2Link; } }
  if (d.heroImg)  { const el = document.querySelector('#hero .hero-img img'); if(el) el.src = d.heroImg; }
  // Stats
  const stats = document.querySelectorAll('.hstat');
  [['stat1Num','stat1Lbl'],['stat2Num','stat2Lbl'],['stat3Num','stat3Lbl']].forEach(([n,l], i) => {
    if (!stats[i]) return;
    const num = stats[i].querySelector('.hstat-num'); if(num && d[n]) num.dataset.target = d[n];
    const lbl = stats[i].querySelector('.hstat-lbl'); if(lbl && d[l]) lbl.textContent = d[l];
  });
  // Re-run counter after update
  if (window._revealObs) document.querySelectorAll('.hero-stats').forEach(el => window._revealObs.observe(el));
}

/* ── ABOUT ── */
function _about(d) {
  if (!d) return;
  if (d.aboutImg)    { const el = document.querySelector('#about .about-img-wrap img'); if(el) el.src = d.aboutImg; }
  if (d.aboutBadge)  { const el = document.querySelector('#about .about-float-badge span'); if(el) el.textContent = d.aboutBadge; }
  if (d.clients)     { const el = document.querySelector('[data-stat="clients"] .ams-num'); if(el) el.textContent = d.clients; }
  if (d.students)    { const el = document.querySelector('[data-stat="students"] .ams-num'); if(el) el.textContent = d.students; }
  if (d.experience)  { const el = document.querySelector('[data-stat="exp"] .ams-num'); if(el) el.textContent = d.experience; }
  if (d.storyTitle)  { const el = document.querySelector('#about .about-story h2'); if(el) el.innerHTML = d.storyTitle; }
  if (d.storyText)   { const el = document.querySelector('#about .about-story p'); if(el) el.textContent = d.storyText; }
}

/* ── TEAM ── */
function _team(items) {
  if (!items.length) return;
  const grid = document.getElementById('team-grid');
  if (!grid) return;
  grid.innerHTML = items.map(m => `
    <div class="card team-card reveal">
      <img src="${m.image||'images/Team/placeholder.jpg'}" alt="${m.name||''}" class="team-img"
           onerror="this.src='https://via.placeholder.com/300x300?text=Photo'">
      <div class="team-info">
        <h3>${m.name||'Team Member'}</h3>
        <div class="team-role">${m.role||''}</div>
        <p class="team-bio">${m.bio||''}</p>
        <div class="team-skills">
          ${(m.skills||'').split(',').map(s=>s.trim()).filter(Boolean).map(s=>`<span class="tskill">${s}</span>`).join('')}
        </div>
      </div>
    </div>`).join('');
  _reObserve('.team-card');
}

/* ── SERVICES ── */
function _services(items) {
  if (!items.length) return;
  const grid = document.getElementById('services-grid');
  if (!grid) return;
  grid.innerHTML = items.map(s => `
    <div class="card svc-card reveal">
      <div class="svc-icon">${s.icon||'⚡'}</div>
      <h3>${s.title||''}</h3>
      <p>${s.description||''}</p>
      <div class="svc-tags">
        ${(s.tags||'').split(',').map(t=>t.trim()).filter(Boolean).map(t=>`<span class="svc-tag">${t}</span>`).join('')}
      </div>
    </div>`).join('');
  _reObserve('.svc-card');
}

/* ── WORK / PORTFOLIO ── */
function _projects(items) {
  if (!items.length) return;
  const grid = document.getElementById('work-grid');
  if (!grid) return;
  grid.innerHTML = items.map(p => `
    <div class="work-item" data-cat="${p.category||'all'}">
      <img src="${p.image||''}" alt="${p.title||''}" loading="lazy"
           onerror="this.parentElement.style.background='var(--dark3)'">
      <div class="work-overlay">
        <span>${p.title||''}</span>
        ${p.url ? `<a href="${p.url}" target="_blank" style="margin-left:auto;color:var(--gold);font-size:14px;"><i class="fas fa-external-link-alt"></i></a>` : ''}
      </div>
    </div>`).join('');
  // Re-init filters
  initFilter('work-grid', 'wfilter-btn');
  initShowMore('workShowMore', '#work-grid .work-item', 12);
}

/* ── REVIEWS ── */
function _reviews(items) {
  if (!items.length) return;
  const grid = document.getElementById('reviews-grid');
  if (!grid) return;
  grid.innerHTML = items.map(r => `
    <div class="review-img-wrap" data-cat="${r.category||'all'}">
      <img src="${r.image||''}" alt="Review" loading="lazy">
    </div>`).join('');
  initFilter('reviews-grid', 'rfilter-btn');
  initShowMore('reviewsShowMore', '#reviews-grid .review-img-wrap', 10);
}

/* ── CERTIFICATES ── */
function _certificates(items) {
  if (!items.length) return;
  const grid = document.getElementById('certs-grid');
  if (!grid) return;
  grid.innerHTML = items.map(c => `
    <div class="cert-img-wrap" data-cat="${c.category||'all'}" title="${c.title||''}">
      <img src="${c.image||''}" alt="${c.title||'Certificate'}" loading="lazy">
    </div>`).join('');
  initFilter('certs-grid', 'cfilter-btn');
  initShowMore('certsShowMore', '#certs-grid .cert-img-wrap', 12);
}

/* ── ARTICLES ── */
function _articles(items) {
  if (!items.length) return;
  const grid = document.getElementById('articles-grid');
  if (!grid) return;
  grid.innerHTML = items.map(a => `
    <a href="${a.url||'#'}" target="_blank" class="card article-card reveal" rel="noopener noreferrer">
      ${a.image ? `<img src="${a.image}" alt="${a.title||''}" class="art-img">` : ''}
      <div class="art-body">
        <div class="art-source">${a.source||''}</div>
        <div class="art-title">${a.title||''}</div>
        <div class="art-desc">${a.description||''}</div>
        <span class="art-link">Read Article <i class="fas fa-arrow-right"></i></span>
      </div>
    </a>`).join('');
  _reObserve('.article-card');
}

/* ── CONTACT ── */
function _contact(d) {
  if (!d) return;
  if (d.email) {
    document.querySelectorAll('a[href^="mailto"]').forEach(a => { a.href = `mailto:${d.email}`; if(a.textContent.includes('@')) a.textContent = d.email; });
    const el = document.getElementById('contactEmailVal'); if(el) el.textContent = d.email;
  }
  if (d.phone) {
    document.querySelectorAll('a[href^="tel"]').forEach(a => a.href = `tel:${d.phone.replace(/\s/g,'')}`);
    const el = document.getElementById('contactPhoneVal'); if(el) el.textContent = d.phone;
  }
  if (d.address) { const el = document.getElementById('contactAddrVal'); if(el) el.textContent = d.address; }
  if (d.whatsapp) { const el = document.getElementById('waBtn'); if(el) el.href = `https://wa.me/${d.whatsapp.replace(/\D/g,'')}`; }
  if (d.formspree) { const f = document.getElementById('contactForm'); if(f) f.action = `https://formspree.io/f/${d.formspree}`; }
  if (d.linkedin) document.querySelectorAll('a[href*="linkedin"]').forEach(a => a.href = d.linkedin);
  if (d.instagram) document.querySelectorAll('a[href*="instagram"]').forEach(a => a.href = d.instagram);
  if (d.googleBiz) document.querySelectorAll('a[href*="g.co"]').forEach(a => a.href = d.googleBiz);
}

/* ── FOOTER ── */
function _footer(d) {
  if (!d) return;
  if (d.tagline)    { const el = document.querySelector('.footer-brand p'); if(el) el.textContent = d.tagline; }
  if (d.copyright)  { const el = document.querySelector('.footer-bottom p'); if(el) el.textContent = d.copyright; }
}

/* ── SEO ── */
function _seo(d) {
  if (!d) return;
  if (d.title) document.title = d.title;
  if (d.desc) {
    let m = document.querySelector('meta[name="description"]');
    if (!m) { m = document.createElement('meta'); m.name = 'description'; document.head.appendChild(m); }
    m.content = d.desc;
  }
}

/* ── POPUPS ── */
function _popup(items) {
  const active = items.find(p => p.active);
  if (!active) return;
  const delay = (parseInt(active.delay) || 0) * 1000;
  const key   = 'alt_popup_' + active._id;

  if (active.showOn === 'once' && sessionStorage.getItem(key)) return;
  if (active.showOn === 'daily') {
    const last = localStorage.getItem(key);
    if (last === new Date().toDateString()) return;
  }

  setTimeout(() => {
    const bg = active.bgColor || '#0a0a0f';
    const wrap = document.createElement('div');
    wrap.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.75);backdrop-filter:blur(6px);';

    wrap.innerHTML = `
      <div style="background:${bg};border:1px solid rgba(245,166,35,.25);border-radius:20px;padding:32px;max-width:420px;width:90%;position:relative;animation:_altPop .4s ease;">
        <button id="_altClose" style="position:absolute;top:14px;right:14px;background:rgba(255,255,255,.1);border:none;width:30px;height:30px;border-radius:50%;color:#fff;cursor:pointer;font-size:14px;">✕</button>
        ${active.image ? `<img src="${active.image}" style="width:100%;border-radius:12px;margin-bottom:18px;max-height:180px;object-fit:cover;">` : ''}
        ${active.title ? `<h3 style="font-family:Syne,sans-serif;font-size:1.3rem;font-weight:800;color:#fff;margin-bottom:10px;">${active.title}</h3>` : ''}
        ${active.body ? `<p style="color:#8a8a9a;font-size:.9rem;line-height:1.7;margin-bottom:${active.btnText?'20px':'0'};">${active.body}</p>` : ''}
        ${active.btnText ? `<a href="${active.btnUrl||'#'}" style="display:inline-block;background:linear-gradient(135deg,#f5a623,#ff6b35);color:#000;padding:11px 24px;border-radius:50px;text-decoration:none;font-weight:700;font-size:.88rem;">${active.btnText}</a>` : ''}
      </div>`;

    if (!document.getElementById('_altPopStyle')) {
      const st = document.createElement('style');
      st.id = '_altPopStyle';
      st.textContent = '@keyframes _altPop{from{opacity:0;transform:scale(.9)}to{opacity:1;transform:scale(1)}}';
      document.head.appendChild(st);
    }

    document.body.appendChild(wrap);
    const close = () => {
      wrap.remove();
      if (active.showOn === 'once') sessionStorage.setItem(key, '1');
      if (active.showOn === 'daily') localStorage.setItem(key, new Date().toDateString());
    };
    document.getElementById('_altClose').onclick = close;
    wrap.addEventListener('click', e => { if (e.target === wrap) close(); });
  }, delay);
}

/* ── Re-observe helper ── */
function _reObserve(sel) {
  if (!window._revealObs) return;
  document.querySelectorAll(sel).forEach(el => {
    el.classList.add('reveal');
    window._revealObs.observe(el);
  });
}

/* ══════════════════════════════
   MAIN INIT
══════════════════════════════ */
(async () => {
  try {
    const [hero, about, contact, footer, seo,
           services, team, projects, reviews, certs, articles, popups
    ] = await Promise.all([
      _sec('hero'), _sec('about'), _sec('contact'), _sec('footer'), _sec('seo'),
      _col('services'), _col('team'), _col('projects'),
      _col('reviews'), _col('certificates'), _col('articles'), _col('popups')
    ]);

    _hero(hero);
    _about(about);
    _contact(contact);
    _footer(footer);
    _seo(seo);
    if (services.length)  _services(services);
    if (team.length)      _team(team);
    if (projects.length)  _projects(projects);
    if (reviews.length)   _reviews(reviews);
    if (certs.length)     _certificates(certs);
    if (articles.length)  _articles(articles);
    if (popups.length)    _popup(popups);

    console.log('[Altmediia] ✅ Content loaded from Firebase');
  } catch(e) {
    console.warn('[Altmediia] Firebase load failed:', e.message);
  }
})();
