// site-content-loader.js — Fronixplayers Live Content Loader
// Add this before </body> in your index.html:
// <script type="module" src="site-content-loader.js"></script>
//
// This script fetches all content from Firebase and updates the DOM live.
// If a field is empty in Firebase, the original HTML content is kept as fallback.

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore, doc, getDoc, collection, getDocs
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyC6w88P1Nrgp4djwrjJf0K2i2l6xQG8FEI",
  authDomain: "fronix-afde1.firebaseapp.com",
  projectId: "fronix-afde1",
  storageBucket: "fronix-afde1.appspot.com",
  messagingSenderId: "942976075894",
  appId: "1:942976075894:web:dfab62b417f89cc66c3757"
};

const app = initializeApp(firebaseConfig, "content-loader");
const db  = getFirestore(app);

/* ── Utility: safely set text/html ── */
function setText(selector, value, html = false) {
  if (!value) return;
  const el = document.querySelector(selector);
  if (!el) return;
  html ? (el.innerHTML = value) : (el.textContent = value);
}
function setAttr(selector, attr, value) {
  if (!value) return;
  const el = document.querySelector(selector);
  if (el) el.setAttribute(attr, value);
}
function setAll(selector, value) {
  if (!value) return;
  document.querySelectorAll(selector).forEach(el => el.textContent = value);
}

/* ══════════════════════════════════
   SECTION LOADERS
══════════════════════════════════ */

/* ── HERO ── */
function applyHero(d) {
  if (!d) return;
  if (d.heroBadge)    setText('.hero-badge', d.heroBadge);
  if (d.heroLine1)    setText('.hero-title span:first-child, [data-hero-line1]', d.heroLine1);
  if (d.heroDesc)     setText('.hero-desc', d.heroDesc);
  if (d.heroBtn1)     setText('.hero-actions .btn-primary span', d.heroBtn1);

  // Multi-line title
  if (d.heroLine1 || d.heroLine2 || d.heroLine3) {
    const title = document.querySelector('.hero-title');
    if (title) {
      const l1 = d.heroLine1 || '';
      const l2 = d.heroLine2 || '';
      const l3 = d.heroLine3 || '';
      title.innerHTML = `
        ${l1 ? l1 + '<br>' : ''}
        ${l2 ? `<span class="gradient-text">${l2}</span><br>` : ''}
        ${l3 || ''}
      `;
    }
  }

  // Stats
  const statNums = document.querySelectorAll('.stat-pill .stat-num');
  const statLbls = document.querySelectorAll('.stat-pill .stat-lbl');
  if (statNums[0] && d.heroStat1Val) statNums[0].textContent = d.heroStat1Val;
  if (statNums[1] && d.heroStat2Val) statNums[1].textContent = d.heroStat2Val;
  if (statNums[2] && d.heroStat3Val) statNums[2].textContent = d.heroStat3Val;
  if (statLbls[0] && d.heroStat1Lbl) statLbls[0].textContent = d.heroStat1Lbl;
  if (statLbls[1] && d.heroStat2Lbl) statLbls[1].textContent = d.heroStat2Lbl;
  if (statLbls[2] && d.heroStat3Lbl) statLbls[2].textContent = d.heroStat3Lbl;
}

/* ── ABOUT ── */
function applyAbout(d, acro) {
  if (!d) return;
  if (d.aboutTag)    setText('.about .section-tag', d.aboutTag);
  if (d.aboutLead)   setText('.about-lead', d.aboutLead);
  if (d.aboutBadge) {
    const badge = document.querySelector('.about-badge strong');
    if (badge) badge.textContent = d.aboutBadge;
  }
  if (d.aboutTitle1 || d.aboutTitle2) {
    const t = document.querySelector('.about-content .section-title');
    if (t) t.innerHTML = `${d.aboutTitle1 || 'Discover the Heart'}<br>of <span class="gradient-text">${d.aboutTitle2 || 'Our Agency'}</span>`;
  }

  // Acronym
  if (acro) {
    const letters = { F: acro.acroF, R: acro.acroR, O: acro.acroO, N: acro.acroN, I: acro.acroI, X: acro.acroX };
    document.querySelectorAll('.acronym-item').forEach(item => {
      const letter = item.querySelector('.letter');
      const text   = item.querySelector('p');
      if (letter && text && letters[letter.textContent]) {
        text.textContent = letters[letter.textContent];
      }
    });
  }
}

/* ── CONTACT ── */
function applyContact(d) {
  if (!d) return;
  if (d.contactPhone) {
    document.querySelectorAll('[href^="tel:"], .contact-item a[href*="alvo"]').forEach(el => {
      el.textContent = d.contactPhone;
    });
    // The phone link in contact details
    const phoneEl = document.querySelector('.contact-item a[href*="alvo"]');
    if (phoneEl) phoneEl.textContent = d.contactPhone;
  }
  if (d.contactEmail) {
    document.querySelectorAll('a[href^="mailto:"]').forEach(el => {
      el.textContent = d.contactEmail;
      el.href = `mailto:${d.contactEmail}`;
    });
  }
  if (d.contactAddress) {
    document.querySelectorAll('.contact-item span').forEach(el => {
      if (el.closest('.contact-item')?.querySelector('.fa-map-marker-alt')) {
        el.textContent = d.contactAddress;
      }
    });
  }
  if (d.contactWhatsapp) {
    document.querySelectorAll('a[href*="alvo.chat"]').forEach(el => el.href = d.contactWhatsapp);
  }
  if (d.contactFormspree) {
    const form = document.querySelector('.contact-form');
    if (form) form.action = `https://formspree.io/f/${d.contactFormspree}`;
  }
}

/* ── FOOTER ── */
function applyFooter(d) {
  if (!d) return;
  if (d.footerTagline) {
    const fp = document.querySelector('.footer-col p');
    if (fp) fp.textContent = d.footerTagline;
  }
  if (d.footerCopyright) {
    const fb = document.querySelector('.footer-bottom p');
    if (fb) fb.innerHTML = d.footerCopyright;
  }
  if (d.footerIG) {
    document.querySelectorAll('.footer-socials a[href*="instagram"]').forEach(a => a.href = d.footerIG);
  }
  if (d.footerWA) {
    document.querySelectorAll('.footer-socials a[href*="whatsapp"], .footer-socials a .fa-whatsapp').forEach(el => {
      const a = el.closest ? el.closest('a') : el;
      if (a) a.href = d.footerWA;
    });
  }
  if (d.footerTG) {
    document.querySelectorAll('.footer-socials a[href*="t.me"]').forEach(a => a.href = d.footerTG);
  }
}

/* ── SEO ── */
function applySEO(d) {
  if (!d) return;
  if (d.seoTitle)      document.title = d.seoTitle;
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
    let link = document.querySelector('link[rel="canonical"]');
    if (!link) { link = document.createElement('link'); link.rel = 'canonical'; document.head.appendChild(link); }
    link.href = d.seoCanonical;
  }
  if (d.seoOgImage) {
    let m = document.querySelector('meta[property="og:image"]');
    if (!m) { m = document.createElement('meta'); m.setAttribute('property','og:image'); document.head.appendChild(m); }
    m.content = d.seoOgImage;
  }
}

/* ── SERVICES ── */
function applyServices(items) {
  if (!items || !items.length) return;
  const grid = document.querySelector('.services-grid');
  if (!grid) return;
  grid.innerHTML = items.map(s => `
    <div class="service-card glass-card reveal">
      <div class="service-icon-wrap">
        <i class="fas ${s.icon || 'fa-star'}"></i>
      </div>
      <h3>${s.title || 'Service'}</h3>
      <p>${s.description || ''}</p>
      ${s.price ? `<div class="service-price">${s.price}</div>` : ''}
    </div>
  `).join('');
  // Re-trigger reveal animation
  reObserve('.service-card');
}

/* ── PROJECTS ── */
function applyProjects(items) {
  if (!items || !items.length) return;
  const grid = document.querySelector('.projects-grid');
  if (!grid) return;
  grid.innerHTML = items.map(p => `
    <div class="project-card glass-card reveal">
      ${p.image ? `<div class="project-img-wrap"><img src="${p.image}" alt="${p.title || ''}" loading="lazy"></div>` : ''}
      <div class="project-info">
        ${p.tag ? `<span class="project-tag">${p.tag}</span>` : ''}
        <h3>${p.title || 'Project'}</h3>
        <p>${p.description || ''}</p>
        <div class="project-footer">
          ${p.url ? `<a href="${p.url}" target="_blank" class="project-link">View Project <i class="fas fa-arrow-right"></i></a>` : ''}
          <span><i class="far fa-heart"></i> ${p.likes || 0}</span>
        </div>
      </div>
    </div>
  `).join('');
  reObserve('.project-card');
}

/* ── TEAM ── */
function applyTeam(items) {
  if (!items || !items.length) return;
  const grid = document.querySelector('.team-grid');
  if (!grid) return;
  grid.innerHTML = items.map(m => `
    <div class="team-card glass-card reveal">
      <div class="team-img-wrap">
        <img src="${m.image || 'images/placeholder.jpg'}" alt="${m.name || ''}" onerror="this.src='https://via.placeholder.com/200'">
        <div class="team-social">
          ${m.facebook ? `<a href="${m.facebook}" target="_blank"><i class="fab fa-facebook-f"></i></a>` : ''}
          ${m.telegram ? `<a href="${m.telegram}" target="_blank"><i class="fab fa-telegram"></i></a>` : ''}
          ${m.instagram ? `<a href="${m.instagram}" target="_blank"><i class="fab fa-instagram"></i></a>` : ''}
        </div>
      </div>
      <div class="team-info">
        <h3>${m.name || 'Team Member'}</h3>
        <span class="team-role">${m.role || 'Role'}</span>
      </div>
    </div>
  `).join('');
  reObserve('.team-card');
}

/* ── Re-observe newly created elements for scroll reveal ── */
function reObserve(selector) {
  const els = document.querySelectorAll(selector);
  els.forEach(el => el.classList.add('reveal'));
  if (!window._revealObserver) return;
  els.forEach(el => window._revealObserver.observe(el));
}

/* ══════════════════════════════════
   MAIN FETCH
══════════════════════════════════ */
async function fetchSection(name) {
  try {
    const snap = await getDoc(doc(db, 'site', name));
    return snap.exists() ? snap.data() : null;
  } catch { return null; }
}

async function fetchList(colName) {
  try {
    const snap = await getDocs(collection(db, colName));
    const items = [];
    snap.forEach(d => items.push({ id: d.id, ...d.data() }));
    return items;
  } catch { return []; }
}

(async () => {
  // Parallel fetch everything
  const [
    hero, about, acronym, contact, footer, seo,
    services, projects, team
  ] = await Promise.all([
    fetchSection('hero'),
    fetchSection('about'),
    fetchSection('acronym'),
    fetchSection('contact'),
    fetchSection('footer'),
    fetchSection('seo'),
    fetchList('services'),
    fetchList('projects'),
    fetchList('team')
  ]);

  applyHero(hero);
  applyAbout(about, acronym);
  applyContact(contact);
  applyFooter(footer);
  applySEO(seo);
  if (services.length)  applyServices(services);
  if (projects.length)  applyProjects(projects);
  if (team.length)      applyTeam(team);

  console.log('[FPX Content] Loaded from Firebase ✓');
})();
