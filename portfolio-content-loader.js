// ============================================================
// portfolio-content-loader.js — D Sran Portfolio Live Loader
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore, doc, getDoc, collection, getDocs
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ⚠️ APNI FIREBASE CONFIG DAALO (same jo admin.html mein hai)
const firebaseConfig = {
  apiKey: "AIzaSyBXc9uq0r3tNzodrQNVelO_JtW4hT_wKEM",
  authDomain: "diljeetsinghsran-fd322.firebaseapp.com",
  projectId: "diljeetsinghsran-fd322",
  storageBucket: "diljeetsinghsran-fd322.firebasestorage.app",
  messagingSenderId: "806630457133",
  appId: "1:806630457133:web:bfd789de366f803aa99da4",
  measurementId: "G-B9QYBD5F81"
};

const app = initializeApp(firebaseConfig, "portfolio-loader");
const db  = getFirestore(app);

/* ── Utility helpers ── */
function setText(sel, val) {
  if (!val) return;
  const el = document.querySelector(sel);
  if (el) el.textContent = val;
}
function setHtml(sel, val) {
  if (!val) return;
  const el = document.querySelector(sel);
  if (el) el.innerHTML = val;
}
function setAttr(sel, attr, val) {
  if (!val) return;
  const el = document.querySelector(sel);
  if (el) el.setAttribute(attr, val);
}
function setAllAttr(sel, attr, val) {
  if (!val) return;
  document.querySelectorAll(sel).forEach(el => el.setAttribute(attr, val));
}
function setAllText(sel, val) {
  if (!val) return;
  document.querySelectorAll(sel).forEach(el => el.textContent = val);
}

/* ── Firebase fetch helpers ── */
async function fetchSection(name) {
  try {
    const snap = await getDoc(doc(db, 'portfolio', name));
    return snap.exists() ? snap.data() : null;
  } catch(e) { console.warn('[Loader] fetchSection error:', name, e.message); return null; }
}
async function fetchList(colName) {
  try {
    const snap = await getDocs(collection(db, colName));
    const items = [];
    snap.forEach(d => items.push({ id: d.id, ...d.data() }));
    return items;
  } catch(e) { console.warn('[Loader] fetchList error:', colName, e.message); return []; }
}

/* ══════════════════════════════════════
   SECTION APPLIERS
══════════════════════════════════════ */

/* ── HERO ── */
function applyHero(d) {
  if (!d) return;

  // Name in h1
  if (d.heroName) {
    const h1 = document.querySelector('#home h1');
    if (h1) {
      h1.innerHTML = `Hi, I'm <span class="gradient-text-primary">${d.heroName.split(' ').slice(0,2).join(' ')}</span>
        <span class="gradient-text-warm">${d.heroName.split(' ').slice(2).join(' ')}</span> 👋`;
    }
  }

  // Badge
  if (d.heroBadge) {
    const badge = document.querySelector('#home .badge-gradient');
    if (badge) badge.innerHTML = `<span class="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span> ${d.heroBadge}`;
  }

  // Tagline (roles paragraph)
  if (d.heroTagline) {
    const roleP = document.querySelector('#home .space-y-3 p:first-of-type');
    if (roleP) roleP.innerHTML = `A Passionate <span class="gradient-text-primary font-bold">${d.heroTagline}</span>`;
  }

  // Sub-line (experience / countries)
  if (d.heroSubline) {
    const subP = document.querySelector('#home .space-y-3 p:last-of-type');
    if (subP) subP.textContent = d.heroSubline;
  }

  // CTA Button 1
  if (d.heroCta1Text) {
    const btn1 = document.querySelector('#home a[href^="tel"]');
    if (btn1) { btn1.innerHTML = `<i class="fas fa-phone mr-2"></i> ${d.heroCta1Text}`; }
  }
  if (d.heroCta1Link) {
    const btn1 = document.querySelector('#home a[href^="tel"]');
    if (btn1) btn1.href = d.heroCta1Link;
  }

  // Email (copy button)
  if (d.heroEmail) {
    const copyBtn = document.getElementById('copyEmailBtn');
    if (copyBtn) copyBtn.dataset.email = d.heroEmail;
    // Also update mailto links
    document.querySelectorAll('a[href^="mailto"]').forEach(a => {
      a.href = `mailto:${d.heroEmail}`;
      if (a.textContent.includes('@')) a.textContent = d.heroEmail;
    });
  }

  // Profile image
  if (d.heroImage) {
    const img = document.querySelector('#home img[alt*="Diljeet"], #home .hero-image-container img');
    if (img) img.src = d.heroImage;
  }

  // Experience badge (inside image)
  if (d.heroExpBadge) {
    const expEl = document.querySelector('#home .glass-modern .text-white.font-bold');
    if (expEl) expEl.textContent = d.heroExpBadge;
  }

  // WhatsApp floating button
  if (d.heroWhatsapp) {
    const wa = document.querySelector('a[href*="wa.me"]');
    if (wa) wa.href = `https://wa.me/${d.heroWhatsapp.replace(/\D/g,'')}`;
  }
}

/* ── SOCIALS ── */
function applySocials(d) {
  if (!d) return;
  if (d.socialEmail) {
    document.querySelectorAll('a[href^="mailto"]').forEach(a => {
      a.href = `mailto:${d.socialEmail}`;
      if (a.textContent.trim().includes('@')) a.textContent = d.socialEmail;
    });
  }
  if (d.socialTwitter)  document.querySelectorAll('a[href*="x.com"], a[href*="twitter"]').forEach(a => a.href = d.socialTwitter);
  if (d.socialInstagram) document.querySelectorAll('a[href*="instagram"]').forEach(a => a.href = d.socialInstagram);
  if (d.socialLinkedin)  document.querySelectorAll('a[href*="linkedin"]').forEach(a => a.href = d.socialLinkedin);
}

/* ── STATS ── */
function applyStats(d) {
  if (!d) return;
  const counters = document.querySelectorAll('.counter');
  const labels   = document.querySelectorAll('#services ~ section .text-gray-600.font-medium, section .counter ~ p, section .counter + p');

  const statData = [
    { num: d.stat1Num, lbl: d.stat1Lbl },
    { num: d.stat2Num, lbl: d.stat2Lbl },
    { num: d.stat3Num, lbl: d.stat3Lbl },
    { num: d.stat4Num, lbl: d.stat4Lbl },
  ];

  counters.forEach((counter, i) => {
    if (statData[i] && statData[i].num) {
      counter.dataset.target = statData[i].num;
      counter.textContent = '0';
    }
  });

  // Update labels — find all p tags inside stat blocks
  const statSection = document.querySelector('.counter')?.closest('section') ||
                      document.querySelector('.counter')?.closest('.glass-card');
  if (statSection) {
    const pTags = statSection.querySelectorAll('p.text-gray-600');
    pTags.forEach((p, i) => {
      if (statData[i] && statData[i].lbl) p.textContent = statData[i].lbl;
    });
  }

  // Re-run counter animation
  animateCounters();
}

function animateCounters() {
  document.querySelectorAll('.counter').forEach(counter => {
    const target = parseInt(counter.dataset.target) || 0;
    let current = 0;
    const step = Math.max(1, Math.floor(target / 60));
    counter.textContent = '0';
    const timer = setInterval(() => {
      current = Math.min(current + step, target);
      counter.textContent = current;
      if (current >= target) clearInterval(timer);
    }, 30);
  });
}

/* ── SERVICES ── */
function applyServices(items) {
  if (!items || !items.length) return;
  const grid = document.querySelector('#services .grid.md\\:grid-cols-2');
  if (!grid) return;

  const colorMap = {
    primary: 'gradient-bg-primary',
    warm:    'gradient-bg-warm',
    cool:    'gradient-bg-cool',
  };
  const colors = ['primary','warm','cool','primary','warm','cool'];

  grid.innerHTML = items.map((s, i) => {
    const colorClass = colorMap[s.color] || colorMap[colors[i % 3]];
    const tags = (s.tags || '').split(',').map(t => t.trim()).filter(Boolean);
    return `
      <div class="service-card reveal-modern">
        <div class="service-icon ${colorClass}">
          <i class="fas ${s.icon || 'fa-star'} text-white"></i>
        </div>
        <h3 class="text-xl md:text-2xl font-bold mb-3">${s.title || 'Service'}</h3>
        <p class="text-gray-600 mb-4 text-sm md:text-base">${s.description || ''}</p>
        ${tags.length ? `<div class="flex flex-wrap gap-2">${tags.map(t=>`<span class="badge-modern text-xs">${t}</span>`).join('')}</div>` : ''}
      </div>
    `;
  }).join('');
}

/* ── PORTFOLIO / PROJECTS ── */
function applyProjects(items) {
  if (!items || !items.length) return;
  const grid = document.querySelector('#portfolio .grid.md\\:grid-cols-2');
  if (!grid) return;

  grid.innerHTML = items.map(p => `
    <div class="portfolio-item-modern reveal-modern">
      <img src="${p.image || 'assets/images/certficates/business-negotation-KWI.jpg'}" alt="${p.title || ''}">
      <div class="portfolio-overlay">
        <h3 class="text-xl md:text-2xl font-bold text-white mb-2">${p.title || 'Project'}</h3>
        <p class="text-white mb-4">${p.category || ''}</p>
        ${p.url ? `<a href="${p.url}" target="_blank" class="btn-modern btn-glass text-white">View Project</a>` : ''}
      </div>
    </div>
  `).join('');
}

/* ── CERTIFICATES ── */
function applyCertificates(items) {
  if (!items || !items.length) return;
  const grid = document.querySelector('#certificates .grid');
  if (!grid) return;

  grid.innerHTML = items.map(c => `
    <div class="glass-card p-6 reveal-modern">
      ${c.image ? `<img src="${c.image}" alt="${c.title||''}" class="w-full rounded-xl mb-4 object-cover" style="max-height:180px;">` : ''}
      <h3 class="text-lg font-bold mb-1">${c.title || 'Certificate'}</h3>
      <p class="text-sm text-gray-500 mb-2">${c.issuer || ''} ${c.year ? '• '+c.year : ''}</p>
      ${c.url ? `<a href="${c.url}" target="_blank" class="text-sm gradient-text-primary font-semibold">Verify ↗</a>` : ''}
    </div>
  `).join('');
}

/* ── PRESS / ARTICLES ── */
function applyPress(items) {
  if (!items || !items.length) return;
  // Find press section by looking for a section that contains press-related content
  const pressSection = document.querySelector('#press, section[id*="press"], section[id*="article"]');
  if (!pressSection) return;
  const grid = pressSection.querySelector('.grid');
  if (!grid) return;

  grid.innerHTML = items.map(p => `
    <div class="glass-card p-6 reveal-modern">
      ${p.image ? `<img src="${p.image}" alt="${p.title||''}" class="w-full rounded-xl mb-4 object-cover" style="max-height:160px;">` : ''}
      <div class="flex items-center gap-2 mb-2">
        <span class="badge-modern text-xs">${p.source || 'Press'}</span>
        ${p.date ? `<span class="text-xs text-gray-500">${p.date}</span>` : ''}
      </div>
      <h3 class="text-base font-bold mb-2">${p.title || ''}</h3>
      ${p.description ? `<p class="text-sm text-gray-600 mb-3">${p.description}</p>` : ''}
      ${p.url ? `<a href="${p.url}" target="_blank" class="text-sm gradient-text-primary font-semibold">Read Article ↗</a>` : ''}
    </div>
  `).join('');
}

/* ── CONTACT ── */
function applyContact(d) {
  if (!d) return;
  if (d.contactEmail) {
    document.querySelectorAll('a[href^="mailto"]').forEach(a => {
      a.href = `mailto:${d.contactEmail}`;
      if (a.textContent.trim().includes('@')) a.textContent = d.contactEmail;
    });
  }
  if (d.contactPhone) {
    document.querySelectorAll('a[href^="tel"]').forEach(a => {
      a.href = `tel:${d.contactPhone.replace(/\s/g,'')}`;
      if (a.textContent.trim().startsWith('+') || a.textContent.trim().startsWith('9')) {
        a.textContent = d.contactPhone;
      }
    });
  }
  if (d.contactLocation) {
    // Location p tag inside contact section
    const locEl = document.querySelector('#contact .gradient-text-cool');
    if (locEl) locEl.textContent = d.contactLocation;
  }
  if (d.contactFormspree) {
    const form = document.getElementById('contactForm');
    if (form) form.setAttribute('action', `https://formspree.io/f/${d.contactFormspree}`);
  }
}

/* ── FOOTER ── */
function applyFooter(d) {
  if (!d) return;
  if (d.footerName) {
    const nameEl = document.querySelector('footer .gradient-text-primary');
    if (nameEl) nameEl.textContent = d.footerName;
  }
  if (d.footerCopyright) {
    const copy = document.querySelector('footer p.text-gray-600');
    if (copy) copy.textContent = d.footerCopyright;
  }
  if (d.footerEmail)     document.querySelectorAll('footer a[href^="mailto"]').forEach(a => a.href = `mailto:${d.footerEmail}`);
  if (d.footerTwitter)   document.querySelectorAll('footer a[href*="x.com"], footer a[href*="twitter"]').forEach(a => a.href = d.footerTwitter);
  if (d.footerInstagram) document.querySelectorAll('footer a[href*="instagram"]').forEach(a => a.href = d.footerInstagram);
  if (d.footerLinkedin)  document.querySelectorAll('footer a[href*="linkedin"]').forEach(a => a.href = d.footerLinkedin);
}

/* ── SEO ── */
function applySEO(d) {
  if (!d) return;
  if (d.seoTitle) document.title = d.seoTitle;
  if (d.seoDesc) {
    let m = document.querySelector('meta[name="description"]');
    if (!m) { m = document.createElement('meta'); m.name = 'description'; document.head.appendChild(m); }
    m.content = d.seoDesc;
  }
  if (d.seoKeywords) {
    let m = document.querySelector('meta[name="keywords"]');
    if (!m) { m = document.createElement('meta'); m.name = 'keywords'; document.head.appendChild(m); }
    m.content = d.seoKeywords;
  }
  if (d.seoCanonical) {
    let l = document.querySelector('link[rel="canonical"]');
    if (!l) { l = document.createElement('link'); l.rel = 'canonical'; document.head.appendChild(l); }
    l.href = d.seoCanonical;
  }
  if (d.seoOgImage) {
    let m = document.querySelector('meta[property="og:image"]');
    if (!m) { m = document.createElement('meta'); m.setAttribute('property','og:image'); document.head.appendChild(m); }
    m.content = d.seoOgImage;
  }
}

/* ── POPUPS ── */
function applyPopups(popups) {
  if (!popups || !popups.length) return;
  const active = popups.filter(p => p.active);
  active.sort((a,b) => (a.delay||0)-(b.delay||0));

  // Inject popup styles once
  if (!document.getElementById('fpx-popup-styles')) {
    const style = document.createElement('style');
    style.id = 'fpx-popup-styles';
    style.textContent = `
    .fpx-overlay{position:fixed;inset:0;z-index:99990;background:rgba(0,0,0,.65);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;opacity:0;pointer-events:none;transition:opacity .35s}
    .fpx-overlay.fpx-show{opacity:1;pointer-events:all}
    .fpx-modal{background:var(--fpx-bg,#0c1419);border:1px solid rgba(139,92,246,.2);border-radius:20px;overflow:hidden;max-width:480px;width:92vw;transform:scale(.88) translateY(20px);transition:transform .35s cubic-bezier(.34,1.56,.64,1);box-shadow:0 40px 100px rgba(0,0,0,.7);position:relative}
    .fpx-overlay.fpx-show .fpx-modal{transform:scale(1) translateY(0)}
    .fpx-img{width:100%;max-height:220px;object-fit:cover;display:block}
    .fpx-body{padding:24px}
    .fpx-title{font-family:inherit;font-size:1.2rem;font-weight:700;color:#fff;margin-bottom:10px}
    .fpx-text{font-size:.9rem;color:#aaa;line-height:1.65;margin-bottom:18px}
    .fpx-btn{display:inline-flex;align-items:center;gap:8px;padding:11px 24px;border-radius:10px;text-decoration:none;background:linear-gradient(135deg,#8b5cf6,#7c3aed);color:#fff;font-weight:700;font-size:.9rem;transition:.2s}
    .fpx-btn:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(139,92,246,.4)}
    .fpx-close{position:absolute;top:12px;right:12px;z-index:2;width:32px;height:32px;border-radius:8px;background:rgba(0,0,0,.4);border:1px solid rgba(255,255,255,.1);cursor:pointer;color:#aaa;font-size:1rem;display:flex;align-items:center;justify-content:center;transition:.2s}
    .fpx-close:hover{color:#fff;background:rgba(244,63,94,.3)}
    .fpx-corner{position:fixed;bottom:24px;right:24px;z-index:99991;max-width:310px;width:92vw;background:var(--fpx-bg,#0c1419);border:1px solid rgba(139,92,246,.2);border-radius:16px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.6);transform:translateY(120%);opacity:0;transition:transform .4s cubic-bezier(.34,1.4,.64,1),opacity .3s;pointer-events:none}
    .fpx-corner.fpx-show{transform:translateY(0);opacity:1;pointer-events:all}
    .fpx-banner{position:fixed;top:0;left:0;right:0;z-index:99992;background:#0c1419;border-bottom:1px solid rgba(139,92,246,.2);padding:12px 20px;display:flex;align-items:center;gap:14px;flex-wrap:wrap;transform:translateY(-110%);opacity:0;transition:transform .4s,opacity .3s;pointer-events:none}
    .fpx-banner.fpx-show{transform:translateY(0);opacity:1;pointer-events:all}
    .fpx-banner .fpx-img{width:44px;height:44px;border-radius:8px;object-fit:cover}
    .fpx-banner .fpx-body{flex:1;padding:0;display:flex;align-items:center;gap:14px;flex-wrap:wrap}
    .fpx-banner .fpx-title{font-size:.9rem;margin:0}
    .fpx-banner .fpx-text{font-size:.8rem;margin:0;flex:1}
    .fpx-banner .fpx-btn{padding:7px 14px;font-size:.8rem}
    .fpx-banner .fpx-close{position:static;width:26px;height:26px;flex-shrink:0}
    `;
    document.head.appendChild(style);
  }

  active.forEach((popup, index) => {
    const delay = ((popup.delay || 0) + index * 0.8) * 1000;
    setTimeout(() => {
      // Frequency check
      const key = `fpx_${popup.id}`;
      const freq = popup.showOn || 'every';
      if (freq === 'once' && sessionStorage.getItem(key)) return;
      if (freq === 'daily') {
        const last = localStorage.getItem(key);
        if (last === new Date().toDateString()) return;
        localStorage.setItem(key, new Date().toDateString());
      }
      if (freq === 'once') sessionStorage.setItem(key, '1');

      const imgHtml = popup.image ? `<img class="fpx-img" src="${popup.image}" alt="">` : '';
      const btnHtml = (popup.btnText && popup.btnUrl)
        ? `<a class="fpx-btn" href="${popup.btnUrl}" target="_blank">${popup.btnText} ↗</a>` : '';
      const type = popup.type || 'center';
      const bg   = popup.bgColor || '#0c1419';

      let el;
      if (type === 'top-banner') {
        el = document.createElement('div');
        el.className = 'fpx-banner';
        el.innerHTML = `${imgHtml}<div class="fpx-body"><div class="fpx-title">${popup.title||''}</div><div class="fpx-text">${popup.body||''}</div>${btnHtml}</div><button class="fpx-close">✕</button>`;
        el.querySelector('.fpx-close').addEventListener('click', () => { el.classList.remove('fpx-show'); setTimeout(()=>el.remove(),400); });
        document.body.appendChild(el);
        requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('fpx-show')));
        setTimeout(() => { el.classList.remove('fpx-show'); setTimeout(()=>el.remove(),400); }, 8000);
      } else if (type === 'bottom-right') {
        el = document.createElement('div');
        el.className = 'fpx-corner';
        el.style.setProperty('--fpx-bg', bg);
        el.innerHTML = `${imgHtml}<div class="fpx-body"><div class="fpx-title">${popup.title||''}</div><div class="fpx-text">${popup.body||''}</div>${btnHtml}</div><button class="fpx-close">✕</button>`;
        el.querySelector('.fpx-close').addEventListener('click', () => { el.classList.remove('fpx-show'); setTimeout(()=>el.remove(),500); });
        document.body.appendChild(el);
        requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('fpx-show')));
        setTimeout(() => { el.classList.remove('fpx-show'); setTimeout(()=>el.remove(),500); }, 8000);
      } else {
        // Center modal (default + fullscreen)
        el = document.createElement('div');
        el.className = 'fpx-overlay';
        el.innerHTML = `<div class="fpx-modal" style="--fpx-bg:${bg}">${imgHtml}<div class="fpx-body"><div class="fpx-title">${popup.title||''}</div><div class="fpx-text">${popup.body||''}</div>${btnHtml}</div><button class="fpx-close">✕</button></div>`;
        el.querySelector('.fpx-close').addEventListener('click', () => { el.classList.remove('fpx-show'); setTimeout(()=>el.remove(),400); });
        el.addEventListener('click', e => { if(e.target===el){ el.classList.remove('fpx-show'); setTimeout(()=>el.remove(),400); } });
        document.body.appendChild(el);
        requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('fpx-show')));
      }
    }, delay);
  });
}

/* ══════════════════════════════════════
   MAIN — Sab kuch parallel fetch karo
══════════════════════════════════════ */
(async () => {
  try {
    const [
      hero, socials, stats, contact, footer, seo,
      services, projects, certificates, press, popups
    ] = await Promise.all([
      fetchSection('hero'),
      fetchSection('socials'),
      fetchSection('stats'),
      fetchSection('contact'),
      fetchSection('footer'),
      fetchSection('seo'),
      fetchList('services'),
      fetchList('projects'),
      fetchList('certificates'),
      fetchList('press'),
      fetchList('popups')
    ]);

    applyHero(hero);
    applySocials(socials);
    applyStats(stats);
    applyContact(contact);
    applyFooter(footer);
    applySEO(seo);
    if (services.length)     applyServices(services);
    if (projects.length)     applyProjects(projects);
    if (certificates.length) applyCertificates(certificates);
    if (press.length)        applyPress(press);
    if (popups.length)       applyPopups(popups);

    console.log('[D Sran Portfolio] ✅ Firebase se content load ho gaya!');
  } catch(e) {
    console.error('[D Sran Portfolio] ❌ Load error:', e.message);
  }
})();
