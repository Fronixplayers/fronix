// portfolio-content-loader.js — D Sran Portfolio Live Loader v4 FINAL
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, getDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBXc9uq0r3tNzodrQNVelO_JtW4hT_wKEM",
  authDomain: "diljeetsinghsran-fd322.firebaseapp.com",
  projectId: "diljeetsinghsran-fd322",
  storageBucket: "diljeetsinghsran-fd322.firebasestorage.app",
  messagingSenderId: "806630457133",
  appId: "1:806630457133:web:bfd789de366f803aa99da4"
};

const app = initializeApp(firebaseConfig, "portfolio-loader");
const db  = getFirestore(app);

async function fsGet(name) {
  try { const s=await getDoc(doc(db,'portfolio',name)); return s.exists()?s.data():null; }
  catch(e){ console.warn('[DSran]',name,e.message); return null; }
}
async function fsList(col) {
  try { const s=await getDocs(collection(db,col)); const r=[]; s.forEach(d=>r.push({id:d.id,...d.data()})); return r; }
  catch(e){ console.warn('[DSran]',col,e.message); return []; }
}

// DIRECT ID lookup — index.html mein IDs already hain
function getGrid(sectionId) {
  const idMap = {
    'services':     'services-grid',
    'portfolio':    'portfolio-grid',
    'press':        'press-grid',
    'certificates': 'cert-grid'
  };
  const el = document.getElementById(idMap[sectionId]);
  if (!el) console.warn('[DSran] Grid not found:', idMap[sectionId]);
  return el;
}

/* ─── HERO ─── */
function applyHero(d) {
  if (!d) return;
  if (d.heroName) {
    const h1=document.querySelector('#home h1');
    if (h1) { const p=d.heroName.trim().split(' '); h1.innerHTML=`Hi, I'm <span class="gradient-text-primary">${p.slice(0,2).join(' ')}</span> <span class="gradient-text-warm">${p.slice(2).join(' ')}</span> 👋`; }
  }
  if (d.heroBadge)   { const b=document.querySelector('#home .badge-gradient'); if(b) b.innerHTML=`<span class="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span> ${d.heroBadge}`; }
  if (d.heroTagline) { const p=document.querySelector('#home .space-y-3 p'); if(p) p.innerHTML=`A Passionate <span class="gradient-text-primary font-bold">${d.heroTagline}</span>`; }
  if (d.heroSubline) { const ps=document.querySelectorAll('#home .space-y-3 p'); if(ps[1]) ps[1].textContent=d.heroSubline; }
  if (d.heroCta1Link){ const a=document.querySelector('#home a[href^="tel"]'); if(a) a.href=d.heroCta1Link; }
  if (d.heroCta1Text){ const a=document.querySelector('#home a[href^="tel"]'); if(a) a.innerHTML=`<i class="fas fa-phone mr-2"></i>${d.heroCta1Text}`; }
  if (d.heroEmail)   { const b=document.getElementById('copyEmailBtn'); if(b) b.dataset.email=d.heroEmail; }
  if (d.heroImage)   { const img=document.querySelector('#home .hero-image-container img')||document.querySelector('#home img[alt*="Diljeet"]'); if(img) img.src=d.heroImage; }
  if (d.heroWhatsapp){ const wa=document.querySelector('a[href*="wa.me"]'); if(wa) wa.href=`https://wa.me/${d.heroWhatsapp.replace(/\D/g,'')}`; }
}

/* ─── SOCIALS ─── */
function applySocials(d) {
  if (!d) return;
  if (d.socialEmail)    document.querySelectorAll('a[href^="mailto"]').forEach(a=>{a.href=`mailto:${d.socialEmail}`;if(a.textContent.includes('@'))a.textContent=d.socialEmail;});
  if (d.socialTwitter)  document.querySelectorAll('a[href*="x.com"],a[href*="twitter"]').forEach(a=>a.href=d.socialTwitter);
  if (d.socialInstagram)document.querySelectorAll('a[href*="instagram"]').forEach(a=>a.href=d.socialInstagram);
  if (d.socialLinkedin) document.querySelectorAll('a[href*="linkedin"]').forEach(a=>a.href=d.socialLinkedin);
}

/* ─── STATS ─── */
function applyStats(d) {
  if (!d) return;
  const counters=document.querySelectorAll('.counter');
  [[d.stat1Num,d.stat1Lbl],[d.stat2Num,d.stat2Lbl],[d.stat3Num,d.stat3Lbl],[d.stat4Num,d.stat4Lbl]].forEach(([num,lbl],i)=>{
    if(!counters[i]) return;
    if(num) counters[i].dataset.target=num;
    const p=counters[i].closest('.reveal-modern')?.querySelector('p'); if(p&&lbl) p.textContent=lbl;
    const target=parseInt(counters[i].dataset.target)||0; let cur=0; counters[i].textContent='0';
    const step=Math.max(1,Math.floor(target/60));
    const t=setInterval(()=>{cur=Math.min(cur+step,target);counters[i].textContent=cur;if(cur>=target)clearInterval(t);},30);
  });
}

/* ─── SERVICES ─── */
function applyServices(items) {
  if (!items.length) return;
  const grid=getGrid('services'); if(!grid) return;
  const cm={primary:'gradient-bg-primary',warm:'gradient-bg-warm',cool:'gradient-bg-cool'};
  const df=['primary','warm','cool','primary','warm','cool'];
  grid.innerHTML=items.map((s,i)=>{
    const cls=cm[s.color]||cm[df[i%3]];
    const tags=(s.tags||'').split(',').map(t=>t.trim()).filter(Boolean);
    return `<div class="service-card reveal-modern">
      <div class="service-icon ${cls}"><i class="fas ${s.icon||'fa-star'}" style="color:white;font-size:36px;"></i></div>
      <h3 style="font-size:1.25rem;font-weight:700;margin-bottom:12px;">${s.title||''}</h3>
      <p style="color:#6c757d;margin-bottom:16px;font-size:0.9rem;">${s.description||''}</p>
      ${tags.length?`<div style="display:flex;flex-wrap:wrap;gap:8px;">${tags.map(t=>`<span class="badge-modern" style="font-size:0.75rem;">${t}</span>`).join('')}</div>`:''}
    </div>`;
  }).join('');
  console.log('[DSran] ✅ Services:',items.length);
}

/* ─── PORTFOLIO ─── */
function applyProjects(items) {
  if (!items.length) return;
  const grid=getGrid('portfolio'); if(!grid) return;
  grid.innerHTML=items.map(p=>`
    <div class="portfolio-item-modern reveal-modern">
      <img src="${p.image||'assets/images/certficates/business-negotation-KWI.jpg'}" alt="${p.title||''}" style="width:100%;height:100%;object-fit:cover;">
      <div class="portfolio-overlay">
        <h3 style="font-size:1.25rem;font-weight:700;color:white;margin-bottom:8px;">${p.title||''}</h3>
        <p style="color:rgba(255,255,255,0.85);margin-bottom:16px;">${p.category||''}</p>
        ${p.url?`<a href="${p.url}" target="_blank" class="btn-modern btn-glass" style="color:white;">View Project</a>`:''}
      </div>
    </div>`).join('');
  console.log('[DSran] ✅ Projects:',items.length);
}

/* ─── PRESS ─── */
function applyPress(items) {
  if (!items.length) return;
  const grid=getGrid('press'); if(!grid) return;
  grid.innerHTML=items.map(p=>`
    <div class="glass-card reveal-modern" style="padding:24px;">
      ${p.image?`<div style="overflow:hidden;border-radius:16px;margin-bottom:24px;"><img src="${p.image}" alt="${p.title||''}" style="width:100%;height:auto;transition:transform 0.5s;" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'"></div>`:''}
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
        <div style="width:48px;height:48px;border-radius:12px;background:linear-gradient(135deg,#3b82f6,#1d4ed8);display:flex;align-items:center;justify-content:center;color:white;font-weight:700;flex-shrink:0;">
          ${(p.source||'PR').substring(0,2).toUpperCase()}
        </div>
        <div>
          <p style="font-weight:700;color:#1a1a2e;">${p.source||''}</p>
          <p style="font-size:0.85rem;color:#6c757d;">${p.date||''}</p>
        </div>
      </div>
      <h3 style="font-size:1.2rem;font-weight:700;margin-bottom:12px;">${p.title||''}</h3>
      <p style="color:#6c757d;font-size:0.9rem;margin-bottom:16px;">${p.description||''}</p>
      ${p.url?`<a href="${p.url}" target="_blank" style="display:inline-flex;align-items:center;gap:8px;color:#667eea;font-weight:600;text-decoration:none;">Read Article <i class="fas fa-arrow-right"></i></a>`:''}
    </div>`).join('');
  console.log('[DSran] ✅ Press:',items.length);
}

/* ─── CERTIFICATES ─── */
function applyCertificates(items) {
  if (!items.length) return;
  const grid=getGrid('certificates'); if(!grid) return;
  const gradients=[
    ['#f97316','#dc2626'], ['#3b82f6','#1d4ed8'],
    ['#22c55e','#059669'], ['#a855f7','#7c3aed'],
    ['#eab308','#ea580c'], ['#ec4899','#e11d48']
  ];
  grid.innerHTML=items.map((c,i)=>{
    const [c1,c2]=gradients[i%gradients.length];
    const grad=`linear-gradient(135deg,${c1},${c2})`;
    return `<div class="glass-card reveal-modern" style="overflow:hidden;">
      ${c.image
        ?`<div style="overflow:hidden;"><img src="${c.image}" alt="${c.title||''}" style="width:100%;height:260px;object-fit:cover;cursor:pointer;transition:transform 0.5s;" class="certificate-image" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'"></div>`
        :`<div style="width:100%;height:160px;background:${grad};display:flex;align-items:center;justify-content:center;"><i class="fas fa-certificate" style="color:rgba(255,255,255,0.4);font-size:3rem;"></i></div>`
      }
      <div style="padding:24px;">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
          <div style="width:56px;height:56px;border-radius:14px;background:${grad};display:flex;align-items:center;justify-content:center;flex-shrink:0;">
            <i class="fas fa-award" style="color:white;font-size:1.5rem;"></i>
          </div>
          <span style="font-size:0.85rem;font-weight:600;color:#6c757d;">${c.year||''}</span>
        </div>
        <h3 style="font-size:1.15rem;font-weight:700;margin-bottom:8px;">${c.title||'Certificate'}</h3>
        <p style="color:#6c757d;font-size:0.85rem;margin-bottom:16px;">Issued by ${c.issuer||''}</p>
        ${c.url?`<div style="display:flex;align-items:center;gap:8px;font-size:0.85rem;color:#667eea;"><i class="fas fa-external-link-alt"></i><a href="${c.url}" target="_blank" style="font-weight:600;color:#667eea;text-decoration:none;">Verify Certificate</a></div>`:''}
      </div>
    </div>`;
  }).join('');
  console.log('[DSran] ✅ Certificates:',items.length);
}

/* ─── CONTACT ─── */
function applyContact(d) {
  if (!d) return;
  if (d.contactEmail) document.querySelectorAll('a[href^="mailto"]').forEach(a=>{a.href=`mailto:${d.contactEmail}`;if(a.textContent.trim().includes('@'))a.textContent=d.contactEmail;});
  if (d.contactPhone) document.querySelectorAll('a[href^="tel"]').forEach(a=>{a.href=`tel:${d.contactPhone.replace(/\s/g,'')}`;});
  if (d.contactFormspree){const f=document.getElementById('contactForm');if(f)f.action=`https://formspree.io/f/${d.contactFormspree}`;}
}

/* ─── FOOTER ─── */
function applyFooter(d) {
  if (!d) return;
  if (d.footerName)     {const e=document.querySelector('footer .gradient-text-primary');if(e)e.textContent=d.footerName;}
  if (d.footerCopyright){const e=document.querySelector('footer p.text-gray-600')||document.querySelector('footer p.text-sm');if(e)e.textContent=d.footerCopyright;}
  if (d.footerEmail)     document.querySelectorAll('footer a[href^="mailto"]').forEach(a=>a.href=`mailto:${d.footerEmail}`);
  if (d.footerTwitter)   document.querySelectorAll('footer a[href*="x.com"],footer a[href*="twitter"]').forEach(a=>a.href=d.footerTwitter);
  if (d.footerInstagram) document.querySelectorAll('footer a[href*="instagram"]').forEach(a=>a.href=d.footerInstagram);
  if (d.footerLinkedin)  document.querySelectorAll('footer a[href*="linkedin"]').forEach(a=>a.href=d.footerLinkedin);
}

/* ─── SEO ─── */
function applySEO(d) {
  if (!d) return;
  if (d.seoTitle) document.title=d.seoTitle;
  const m=(sel,name,val)=>{if(!val)return;let e=document.querySelector(sel);if(!e){e=document.createElement('meta');name.startsWith('og:')?e.setAttribute('property',name):e.name=name;document.head.appendChild(e);}e.content=val;};
  m('meta[name="description"]','description',d.seoDesc);
  m('meta[name="keywords"]','keywords',d.seoKeywords);
  m('meta[property="og:image"]','og:image',d.seoOgImage);
}

/* ══ MAIN ══ */
(async () => {
  console.log('[DSran] 🔥 v4 FINAL — Loading...');
  try {
    const [hero,socials,stats,contact,footer,seo,services,projects,certificates,press] = await Promise.all([
      fsGet('hero'),fsGet('socials'),fsGet('stats'),
      fsGet('contact'),fsGet('footer'),fsGet('seo'),
      fsList('services'),fsList('projects'),
      fsList('certificates'),fsList('press')
    ]);

    console.log('[DSran] Data:', {
      hero:!!hero, services:services.length, projects:projects.length,
      certificates:certificates.length, press:press.length
    });

    applyHero(hero);
    applySocials(socials);
    applyStats(stats);
    applyContact(contact);
    applyFooter(footer);
    applySEO(seo);
    applyServices(services);
    applyProjects(projects);
    applyPress(press);
    applyCertificates(certificates);

    // Re-trigger scroll reveal for injected elements
    setTimeout(()=>{
      document.querySelectorAll('.reveal-modern').forEach(el=>{
        if(el.getBoundingClientRect().top < window.innerHeight) el.classList.add('active');
      });
    }, 100);

    console.log('[DSran] ✅ ALL DONE!');
  } catch(e) {
    console.error('[DSran] ❌',e.message);
  }
})();
