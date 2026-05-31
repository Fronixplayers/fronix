// ============================================================
// portfolio-content-loader.js — D Sran Portfolio Live Loader
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore, doc, getDoc, collection, getDocs
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ⚠️ APNI FIREBASE CONFIG DAALO (same jo admin.html mein hai)
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig, "portfolio-loader");
const db  = getFirestore(app);

async function fetchSection(name) {
  try {
    const snap = await getDoc(doc(db, 'portfolio', name));
    return snap.exists() ? snap.data() : null;
  } catch(e) { console.warn('[Loader] fetchSection:', name, e.message); return null; }
}
async function fetchList(colName) {
  try {
    const snap = await getDocs(collection(db, colName));
    const items = [];
    snap.forEach(d => items.push({ id: d.id, ...d.data() }));
    return items;
  } catch(e) { console.warn('[Loader] fetchList:', colName, e.message); return []; }
}

/* ── HERO ── */
function applyHero(d) {
  if (!d) return;
  if (d.heroName) {
    const h1 = document.querySelector('#home h1');
    if (h1) {
      const parts = d.heroName.trim().split(' ');
      const first = parts.slice(0,2).join(' ');
      const last  = parts.slice(2).join(' ');
      h1.innerHTML = `Hi, I'm <span class="gradient-text-primary">${first}</span> <span class="gradient-text-warm">${last}</span> 👋`;
    }
  }
  if (d.heroBadge) {
    const badge = document.querySelector('#home .badge-gradient');
    if (badge) badge.innerHTML = `<span class="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span> ${d.heroBadge}`;
  }
  if (d.heroTagline) {
    const roleP = document.querySelector('#home .space-y-3 p');
    if (roleP) roleP.innerHTML = `A Passionate <span class="gradient-text-primary font-bold">${d.heroTagline}</span>`;
  }
  if (d.heroSubline) {
    const subs = document.querySelectorAll('#home .space-y-3 p');
    if (subs[1]) subs[1].textContent = d.heroSubline;
  }
  if (d.heroCta1Link) {
    const btn = document.querySelector('#home a[href^="tel"]');
    if (btn) btn.href = d.heroCta1Link;
  }
  if (d.heroCta1Text) {
    const btn = document.querySelector('#home a[href^="tel"]');
    if (btn) btn.innerHTML = `<i class="fas fa-phone mr-2"></i> ${d.heroCta1Text}`;
  }
  if (d.heroEmail) {
    const copyBtn = document.getElementById('copyEmailBtn');
    if (copyBtn) copyBtn.dataset.email = d.heroEmail;
  }
  if (d.heroImage) {
    const img = document.querySelector('#home .hero-image-container img, #home img[alt*="Diljeet"]');
    if (img) img.src = d.heroImage;
  }
  if (d.heroExpBadge) {
    const exp = document.querySelector('#home .glass-modern .text-white.font-bold');
    if (exp) exp.textContent = d.heroExpBadge;
  }
  if (d.heroWhatsapp) {
    const wa = document.querySelector('a[href*="wa.me"]');
    if (wa) wa.href = `https://wa.me/${d.heroWhatsapp.replace(/\D/g,'')}`;
  }
}

/* ── SOCIALS ── */
function applySocials(d) {
  if (!d) return;
  if (d.socialEmail)    document.querySelectorAll('a[href^="mailto"]').forEach(a => { a.href = `mailto:${d.socialEmail}`; if(a.textContent.includes('@')) a.textContent = d.socialEmail; });
  if (d.socialTwitter)  document.querySelectorAll('a[href*="x.com"], a[href*="twitter"]').forEach(a => a.href = d.socialTwitter);
  if (d.socialInstagram)document.querySelectorAll('a[href*="instagram"]').forEach(a => a.href = d.socialInstagram);
  if (d.socialLinkedin) document.querySelectorAll('a[href*="linkedin"]').forEach(a => a.href = d.socialLinkedin);
}

/* ── STATS ── */
function applyStats(d) {
  if (!d) return;
  const counters = document.querySelectorAll('.counter');
  const statNums = [d.stat1Num, d.stat2Num, d.stat3Num, d.stat4Num];
  const statLbls = [d.stat1Lbl, d.stat2Lbl, d.stat3Lbl, d.stat4Lbl];
  counters.forEach((c, i) => {
    if (statNums[i]) { c.dataset.target = statNums[i]; c.textContent = '0'; }
    // label is the next p sibling inside same div
    const lbl = c.closest('div')?.parentElement?.querySelector('p');
    if (lbl && statLbls[i]) lbl.textContent = statLbls[i];
  });
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
  // Exact selector: #services section ke andar .grid jo md:grid-cols-2 lg:grid-cols-3 hai
  const grid = document.querySelector('#services .grid');
  if (!grid) return;
  const colorMap = { primary:'gradient-bg-primary', warm:'gradient-bg-warm', cool:'gradient-bg-cool' };
  const fallback = ['primary','warm','cool','primary','warm','cool'];
  grid.innerHTML = items.map((s, i) => {
    const cls = colorMap[s.color] || colorMap[fallback[i % 3]];
    const tags = (s.tags||'').split(',').map(t=>t.trim()).filter(Boolean);
    return `
      <div class="service-card reveal-modern">
        <div class="service-icon ${cls}">
          <i class="fas ${s.icon||'fa-star'} text-white"></i>
        </div>
        <h3 class="text-xl md:text-2xl font-bold mb-3">${s.title||'Service'}</h3>
        <p class="text-gray-600 mb-4 text-sm md:text-base">${s.description||''}</p>
        ${tags.length ? `<div class="flex flex-wrap gap-2">${tags.map(t=>`<span class="badge-modern text-xs">${t}</span>`).join('')}</div>` : ''}
      </div>`;
  }).join('');
}

/* ── PORTFOLIO / PROJECTS ── */
function applyProjects(items) {
  if (!items || !items.length) return;
  // Exact selector: #portfolio section ke andar .grid
  const grid = document.querySelector('#portfolio .grid');
  if (!grid) return;
  grid.innerHTML = items.map(p => `
    <div class="portfolio-item-modern reveal-modern">
      <img src="${p.image||'assets/images/certficates/business-negotation-KWI.jpg'}" alt="${p.title||''}">
      <div class="portfolio-overlay">
        <h3 class="text-xl md:text-2xl font-bold text-white mb-2">${p.title||'Project'}</h3>
        <p class="text-white mb-4">${p.category||''}</p>
        ${p.url ? `<a href="${p.url}" target="_blank" class="btn-modern btn-glass text-white">View Project</a>` : ''}
      </div>
    </div>`).join('');
}

/* ── PRESS / ARTICLES ── */
function applyPress(items) {
  if (!items || !items.length) return;
  // Exact selector: #press section ke andar .grid
  const grid = document.querySelector('#press .grid');
  if (!grid) return;
  grid.innerHTML = items.map(p => {
    const initials = (p.source||'PR').substring(0,2).toUpperCase();
    return `
      <div class="glass-card p-6 reveal-modern">
        ${p.image ? `
        <div class="overflow-hidden rounded-2xl mb-6">
          <img src="${p.image}" alt="${p.title||''}" class="w-full h-auto hover:scale-110 transition-transform duration-500">
        </div>` : ''}
        <div class="flex items-center gap-3 mb-4">
          <div class="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-700 rounded-xl flex items-center justify-center text-white font-bold">
            ${initials}
          </div>
          <div>
            <p class="font-bold text-gray-800">${p.source||''}</p>
            <p class="text-sm text-gray-500">${p.date||''}</p>
          </div>
        </div>
        <h3 class="text-xl md:text-2xl font-bold mb-3">${p.title||''}</h3>
        <p class="text-gray-600 mb-4 text-sm md:text-base">${p.description||''}</p>
        ${p.url ? `<a href="${p.url}" target="_blank" class="inline-flex items-center gap-2 text-purple-600 font-semibold hover:gap-4 transition-all">Read Article <i class="fas fa-arrow-right"></i></a>` : ''}
      </div>`;
  }).join('');
}

/* ── CERTIFICATES ── */
function applyCertificates(items) {
  if (!items || !items.length) return;
  // Exact selector: #certificates section ke andar .grid
  const grid = document.querySelector('#certificates .grid');
  if (!grid) return;

  const iconColors = [
    'from-orange-500 to-red-600',
    'from-blue-500 to-blue-700',
    'from-green-500 to-emerald-700',
    'from-purple-500 to-purple-700',
    'from-yellow-500 to-orange-600',
    'from-pink-500 to-rose-600',
  ];

  grid.innerHTML = items.map((c, i) => {
    const color = iconColors[i % iconColors.length];
    return `
      <div class="glass-card overflow-hidden reveal-modern group">
        ${c.image ? `
        <div class="overflow-hidden">
          <img src="${c.image}" alt="${c.title||''}"
               class="w-full h-64 object-cover cursor-pointer hover:scale-110 transition-transform duration-500 certificate-image">
        </div>` : `
        <div class="w-full h-40 bg-gradient-to-br ${color} flex items-center justify-center">
          <i class="fas fa-certificate text-white text-5xl opacity-40"></i>
        </div>`}
        <div class="p-6">
          <div class="flex items-center gap-3 mb-4">
            <div class="w-14 h-14 bg-gradient-to-r ${color} rounded-xl flex items-center justify-center text-white">
              <i class="fas fa-award text-2xl"></i>
            </div>
            <span class="text-sm font-semibold text-gray-500">${c.year||''}</span>
          </div>
          <h3 class="text-xl font-bold mb-2">${c.title||'Certificate'}</h3>
          <p class="text-gray-600 mb-4 text-sm">Issued by ${c.issuer||''}</p>
          ${c.url ? `
          <div class="flex items-center gap-2 text-sm text-purple-600">
            <i class="fas fa-external-link-alt"></i>
            <a href="${c.url}" target="_blank" class="font-semibold hover:underline">Verify Certificate</a>
          </div>` : ''}
        </div>
      </div>`;
  }).join('');

  // Re-attach lightbox if it exists
  if (typeof initCertLightbox === 'function') initCertLightbox();
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
      if (a.textContent.trim().match(/^\+|^9/)) a.textContent = d.contactPhone;
    });
  }
  if (d.contactLocation) {
    // Location: #contact section mein gradient-text-cool class wala p
    const loc = document.querySelector('#contact .gradient-text-cool');
    if (loc) loc.textContent = d.contactLocation;
  }
  if (d.contactFormspree) {
    const form = document.getElementById('contactForm');
    if (form) form.action = `https://formspree.io/f/${d.contactFormspree}`;
  }
}

/* ── FOOTER ── */
function applyFooter(d) {
  if (!d) return;
  if (d.footerName) {
    const el = document.querySelector('footer .gradient-text-primary');
    if (el) el.textContent = d.footerName;
  }
  if (d.footerCopyright) {
    const el = document.querySelector('footer p.text-gray-600, footer p.text-sm');
    if (el) el.textContent = d.footerCopyright;
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
  const setMeta = (sel, val) => {
    if (!val) return;
    let m = document.querySelector(sel);
    if (!m) { m = document.createElement('meta'); document.head.appendChild(m); }
    m.content = val;
  };
  setMeta('meta[name="description"]', d.seoDesc);
  setMeta('meta[name="keywords"]', d.seoKeywords);
  if (d.seoCanonical) {
    let l = document.querySelector('link[rel="canonical"]');
    if (!l) { l = document.createElement('link'); l.rel='canonical'; document.head.appendChild(l); }
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
  const active = popups.filter(p => p.active).sort((a,b)=>(a.delay||0)-(b.delay||0));
  if (!document.getElementById('fpx-styles')) {
    const s = document.createElement('style');
    s.id = 'fpx-styles';
    s.textContent = `.fpx-overlay{position:fixed;inset:0;z-index:99990;background:rgba(0,0,0,.65);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;opacity:0;pointer-events:none;transition:opacity .35s}.fpx-overlay.fpx-show{opacity:1;pointer-events:all}.fpx-modal{background:var(--fpx-bg,#0e0e1f);border:1px solid rgba(139,92,246,.2);border-radius:20px;overflow:hidden;max-width:480px;width:92vw;transform:scale(.88) translateY(20px);transition:transform .35s cubic-bezier(.34,1.56,.64,1);box-shadow:0 40px 100px rgba(0,0,0,.7);position:relative}.fpx-overlay.fpx-show .fpx-modal{transform:scale(1) translateY(0)}.fpx-img{width:100%;max-height:220px;object-fit:cover;display:block}.fpx-body{padding:24px}.fpx-title{font-size:1.2rem;font-weight:700;color:#fff;margin-bottom:10px}.fpx-text{font-size:.9rem;color:#aaa;line-height:1.65;margin-bottom:18px}.fpx-btn{display:inline-flex;align-items:center;gap:8px;padding:11px 24px;border-radius:10px;text-decoration:none;background:linear-gradient(135deg,#8b5cf6,#7c3aed);color:#fff;font-weight:700;font-size:.9rem;transition:.2s}.fpx-close{position:absolute;top:12px;right:12px;width:32px;height:32px;border-radius:8px;background:rgba(0,0,0,.4);border:1px solid rgba(255,255,255,.1);cursor:pointer;color:#aaa;font-size:1rem;display:flex;align-items:center;justify-content:center;transition:.2s}.fpx-corner{position:fixed;bottom:24px;right:24px;z-index:99991;max-width:310px;width:92vw;background:var(--fpx-bg,#0e0e1f);border:1px solid rgba(139,92,246,.2);border-radius:16px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.6);transform:translateY(120%);opacity:0;transition:transform .4s cubic-bezier(.34,1.4,.64,1),opacity .3s;pointer-events:none}.fpx-corner.fpx-show{transform:translateY(0);opacity:1;pointer-events:all}.fpx-banner{position:fixed;top:0;left:0;right:0;z-index:99992;background:#0e0e1f;border-bottom:1px solid rgba(139,92,246,.2);padding:12px 20px;display:flex;align-items:center;gap:14px;flex-wrap:wrap;transform:translateY(-110%);opacity:0;transition:transform .4s,opacity .3s;pointer-events:none}.fpx-banner.fpx-show{transform:translateY(0);opacity:1;pointer-events:all}.fpx-banner .fpx-img{width:44px;height:44px;border-radius:8px;object-fit:cover}.fpx-banner .fpx-body{flex:1;padding:0;display:flex;align-items:center;gap:14px;flex-wrap:wrap}.fpx-banner .fpx-title{font-size:.9rem;margin:0}.fpx-banner .fpx-text{font-size:.8rem;margin:0;flex:1}.fpx-banner .fpx-btn{padding:7px 14px;font-size:.8rem}.fpx-banner .fpx-close{position:static;width:26px;height:26px}`;
    document.head.appendChild(s);
  }
  active.forEach((popup, index) => {
    setTimeout(() => {
      const key = `fpx_${popup.id}`;
      const freq = popup.showOn || 'every';
      if (freq==='once' && sessionStorage.getItem(key)) return;
      if (freq==='daily') { const t=new Date().toDateString(); if(localStorage.getItem(key)===t) return; localStorage.setItem(key,t); }
      if (freq==='once') sessionStorage.setItem(key,'1');
      const img = popup.image ? `<img class="fpx-img" src="${popup.image}" alt="">` : '';
      const btn = (popup.btnText&&popup.btnUrl) ? `<a class="fpx-btn" href="${popup.btnUrl}" target="_blank">${popup.btnText} ↗</a>` : '';
      const type = popup.type||'center';
      let el = document.createElement('div');
      if (type==='top-banner') {
        el.className='fpx-banner';
        el.innerHTML=`${img}<div class="fpx-body"><div class="fpx-title">${popup.title||''}</div><div class="fpx-text">${popup.body||''}</div>${btn}</div><button class="fpx-close" onclick="this.closest('.fpx-banner').classList.remove('fpx-show')">✕</button>`;
        document.body.appendChild(el);
        requestAnimationFrame(()=>requestAnimationFrame(()=>el.classList.add('fpx-show')));
        setTimeout(()=>el.classList.remove('fpx-show'),8000);
      } else if (type==='bottom-right') {
        el.className='fpx-corner';
        el.style.setProperty('--fpx-bg', popup.bgColor||'#0e0e1f');
        el.innerHTML=`${img}<div class="fpx-body" style="padding:16px"><div class="fpx-title">${popup.title||''}</div><div class="fpx-text">${popup.body||''}</div>${btn}</div><button class="fpx-close" onclick="this.closest('.fpx-corner').classList.remove('fpx-show')">✕</button>`;
        document.body.appendChild(el);
        requestAnimationFrame(()=>requestAnimationFrame(()=>el.classList.add('fpx-show')));
        setTimeout(()=>el.classList.remove('fpx-show'),8000);
      } else {
        el.className='fpx-overlay';
        el.innerHTML=`<div class="fpx-modal" style="--fpx-bg:${popup.bgColor||'#0e0e1f'}">${img}<div class="fpx-body"><div class="fpx-title">${popup.title||''}</div><div class="fpx-text">${popup.body||''}</div>${btn}</div><button class="fpx-close" onclick="this.closest('.fpx-overlay').classList.remove('fpx-show')">✕</button></div>`;
        el.addEventListener('click', e => { if(e.target===el) el.classList.remove('fpx-show'); });
        document.body.appendChild(el);
        requestAnimationFrame(()=>requestAnimationFrame(()=>el.classList.add('fpx-show')));
      }
    }, ((popup.delay||0) + index*0.8)*1000);
  });
}

/* ══════════════════════════════════════
   MAIN
══════════════════════════════════════ */
(async () => {
  console.log('[D Sran] 🔄 Firebase se data load ho raha hai...');
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

    if (services.length)     { applyServices(services);     console.log('[D Sran] ✅ Services:', services.length); }
    if (projects.length)     { applyProjects(projects);     console.log('[D Sran] ✅ Projects:', projects.length); }
    if (press.length)        { applyPress(press);           console.log('[D Sran] ✅ Press:', press.length); }
    if (certificates.length) { applyCertificates(certificates); console.log('[D Sran] ✅ Certificates:', certificates.length); }
    if (popups.length)       { applyPopups(popups);         console.log('[D Sran] ✅ Popups:', popups.length); }

    console.log('[D Sran] ✅ Sab kuch load ho gaya!');
  } catch(e) {
    console.error('[D Sran] ❌ Error:', e.message);
  }
})();
