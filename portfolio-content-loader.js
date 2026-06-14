// portfolio-content-loader.js — D Sran Portfolio Live Loader
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

async function fetchSection(name) {
  try { const s = await getDoc(doc(db,'portfolio',name)); return s.exists()?s.data():null; }
  catch(e) { console.warn('[DSran] fetch err:',name,e.message); return null; }
}
async function fetchList(col) {
  try {
    const s = await getDocs(collection(db,col));
    const r=[]; s.forEach(d=>r.push({id:d.id,...d.data()})); return r;
  } catch(e) { console.warn('[DSran] list err:',col,e.message); return []; }
}

// Get nth grid div inside a section id — Tailwind .grid class querySelector fix
function getGrid(sectionId, nth=0) {
  const sec = document.getElementById(sectionId);
  if (!sec) { console.warn('[DSran] section not found:', sectionId); return null; }
  // Find all divs that have grid-like classes (md:grid-cols or grid-cols)
  const divs = sec.querySelectorAll('div[class*="grid"]');
  // Return the one that contains the actual items (not header divs)
  // We want the grid that has service-card or portfolio-item children
  for (let d of divs) {
    if (d.children.length >= 1) return d;
  }
  return divs[nth] || null;
}

/* ─── HERO ─── */
function applyHero(d) {
  if (!d) return;
  if (d.heroName) {
    const h1 = document.querySelector('#home h1');
    if (h1) {
      const p = d.heroName.trim().split(' ');
      h1.innerHTML = `Hi, I'm <span class="gradient-text-primary">${p.slice(0,2).join(' ')}</span> <span class="gradient-text-warm">${p.slice(2).join(' ')}</span> 👋`;
    }
  }
  if (d.heroBadge) { const b=document.querySelector('#home .badge-gradient'); if(b) b.innerHTML=`<span class="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span> ${d.heroBadge}`; }
  if (d.heroTagline) { const p=document.querySelector('#home .space-y-3 p'); if(p) p.innerHTML=`A Passionate <span class="gradient-text-primary font-bold">${d.heroTagline}</span>`; }
  if (d.heroSubline) { const ps=document.querySelectorAll('#home .space-y-3 p'); if(ps[1]) ps[1].textContent=d.heroSubline; }
  if (d.heroCta1Link) { const a=document.querySelector('#home a[href^="tel"]'); if(a) a.href=d.heroCta1Link; }
  if (d.heroCta1Text) { const a=document.querySelector('#home a[href^="tel"]'); if(a) a.innerHTML=`<i class="fas fa-phone mr-2"></i> ${d.heroCta1Text}`; }
  if (d.heroEmail)   { const b=document.getElementById('copyEmailBtn'); if(b) b.dataset.email=d.heroEmail; }
  if (d.heroImage)   { const img=document.querySelector('#home .hero-image-container img')||document.querySelector('#home img'); if(img) img.src=d.heroImage; }
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
  const counters = document.querySelectorAll('.counter');
  const nums=[d.stat1Num,d.stat2Num,d.stat3Num,d.stat4Num];
  const lbls=[d.stat1Lbl,d.stat2Lbl,d.stat3Lbl,d.stat4Lbl];
  counters.forEach((c,i) => {
    if (nums[i]) c.dataset.target = nums[i];
    // label p is sibling in same reveal-modern div
    const p = c.closest('.reveal-modern')?.querySelector('p');
    if (p && lbls[i]) p.textContent = lbls[i];
    // animate
    const target = parseInt(c.dataset.target)||0;
    let cur=0; c.textContent='0';
    const step=Math.max(1,Math.floor(target/60));
    const t=setInterval(()=>{ cur=Math.min(cur+step,target); c.textContent=cur; if(cur>=target)clearInterval(t); },30);
  });
}

/* ─── SERVICES ─── */
function applyServices(items) {
  if (!items.length) return;
  // #services section ke andar pehla grid div jo service-card contain karta ho
  const sec = document.getElementById('services');
  if (!sec) return;
  // Find the grid div — it's the direct parent of service-card divs
  const grid = sec.querySelector('.service-card')?.parentElement;
  if (!grid) { console.warn('[DSran] services grid parent not found'); return; }

  const cm={primary:'gradient-bg-primary',warm:'gradient-bg-warm',cool:'gradient-bg-cool'};
  const df=['primary','warm','cool','primary','warm','cool'];
  grid.innerHTML = items.map((s,i)=>{
    const cls=cm[s.color]||cm[df[i%3]];
    const tags=(s.tags||'').split(',').map(t=>t.trim()).filter(Boolean);
    return `<div class="service-card reveal-modern">
      <div class="service-icon ${cls}"><i class="fas ${s.icon||'fa-star'} text-white"></i></div>
      <h3 class="text-xl md:text-2xl font-bold mb-3">${s.title||'Service'}</h3>
      <p class="text-gray-600 mb-4 text-sm md:text-base">${s.description||''}</p>
      ${tags.length?`<div class="flex flex-wrap gap-2">${tags.map(t=>`<span class="badge-modern text-xs">${t}</span>`).join('')}</div>`:''}
    </div>`;
  }).join('');
  console.log('[DSran] ✅ Services injected:',items.length);
}

/* ─── PORTFOLIO ─── */
function applyProjects(items) {
  if (!items.length) return;
  const sec = document.getElementById('portfolio');
  if (!sec) return;
  // Find grid — parent of portfolio-item-modern
  const grid = sec.querySelector('.portfolio-item-modern')?.parentElement;
  if (!grid) { console.warn('[DSran] portfolio grid parent not found'); return; }

  grid.innerHTML = items.map(p=>`
    <div class="portfolio-item-modern reveal-modern">
      <img src="${p.image||'assets/images/certficates/business-negotation-KWI.jpg'}" alt="${p.title||''}">
      <div class="portfolio-overlay">
        <h3 class="text-xl md:text-2xl font-bold text-white mb-2">${p.title||'Project'}</h3>
        <p class="text-white mb-4">${p.category||''}</p>
        ${p.url?`<a href="${p.url}" target="_blank" class="btn-modern btn-glass text-white">View Project</a>`:''}
      </div>
    </div>`).join('');
  console.log('[DSran] ✅ Projects injected:',items.length);
}

/* ─── PRESS ─── */
function applyPress(items) {
  if (!items.length) return;
  const sec = document.getElementById('press');
  if (!sec) return;
  // Find grid — parent of glass-card inside press section
  const grid = sec.querySelector('.glass-card')?.parentElement;
  if (!grid) { console.warn('[DSran] press grid parent not found'); return; }

  grid.innerHTML = items.map(p=>`
    <div class="glass-card p-6 reveal-modern">
      ${p.image?`<div class="overflow-hidden rounded-2xl mb-6"><img src="${p.image}" alt="${p.title||''}" class="w-full h-auto hover:scale-110 transition-transform duration-500"></div>`:''}
      <div class="flex items-center gap-3 mb-4">
        <div class="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-700 rounded-xl flex items-center justify-center text-white font-bold">
          ${(p.source||'PR').substring(0,2).toUpperCase()}
        </div>
        <div>
          <p class="font-bold text-gray-800">${p.source||''}</p>
          <p class="text-sm text-gray-500">${p.date||''}</p>
        </div>
      </div>
      <h3 class="text-xl md:text-2xl font-bold mb-3">${p.title||''}</h3>
      <p class="text-gray-600 mb-4 text-sm md:text-base">${p.description||''}</p>
      ${p.url?`<a href="${p.url}" target="_blank" class="inline-flex items-center gap-2 text-purple-600 font-semibold hover:gap-4 transition-all">Read Article <i class="fas fa-arrow-right"></i></a>`:''}
    </div>`).join('');
  console.log('[DSran] ✅ Press injected:',items.length);
}

/* ─── CERTIFICATES ─── */
function applyCertificates(items) {
  if (!items.length) return;
  const sec = document.getElementById('certificates');
  if (!sec) return;
  // Find grid — parent of glass-card inside certificates section
  const grid = sec.querySelector('.glass-card')?.parentElement;
  if (!grid) { console.warn('[DSran] certificates grid parent not found'); return; }

  const colors=['from-orange-500 to-red-600','from-blue-500 to-blue-700','from-green-500 to-emerald-700','from-purple-500 to-purple-700','from-yellow-500 to-orange-600','from-pink-500 to-rose-600'];
  grid.innerHTML = items.map((c,i)=>{
    const col=colors[i%colors.length];
    return `<div class="glass-card overflow-hidden reveal-modern group">
      ${c.image
        ?`<div class="overflow-hidden"><img src="${c.image}" alt="${c.title||''}" class="w-full h-64 object-cover cursor-pointer hover:scale-110 transition-transform duration-500 certificate-image"></div>`
        :`<div class="w-full h-40 bg-gradient-to-br ${col} flex items-center justify-center"><i class="fas fa-certificate text-white text-5xl opacity-40"></i></div>`
      }
      <div class="p-6">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-14 h-14 bg-gradient-to-r ${col} rounded-xl flex items-center justify-center text-white">
            <i class="fas fa-award text-2xl"></i>
          </div>
          <span class="text-sm font-semibold text-gray-500">${c.year||''}</span>
        </div>
        <h3 class="text-xl font-bold mb-2">${c.title||'Certificate'}</h3>
        <p class="text-gray-600 mb-4 text-sm">Issued by ${c.issuer||''}</p>
        ${c.url?`<div class="flex items-center gap-2 text-sm text-purple-600"><i class="fas fa-external-link-alt"></i><a href="${c.url}" target="_blank" class="font-semibold hover:underline">Verify Certificate</a></div>`:''}
      </div>
    </div>`;
  }).join('');
  console.log('[DSran] ✅ Certificates injected:',items.length);
}

/* ─── CONTACT ─── */
function applyContact(d) {
  if (!d) return;
  if (d.contactEmail) document.querySelectorAll('a[href^="mailto"]').forEach(a=>{a.href=`mailto:${d.contactEmail}`;if(a.textContent.trim().includes('@'))a.textContent=d.contactEmail;});
  if (d.contactPhone) document.querySelectorAll('a[href^="tel"]').forEach(a=>{a.href=`tel:${d.contactPhone.replace(/\s/g,'')}`;if(a.textContent.trim().match(/^\+|^9/))a.textContent=d.contactPhone;});
  if (d.contactFormspree) { const f=document.getElementById('contactForm'); if(f) f.action=`https://formspree.io/f/${d.contactFormspree}`; }
}

/* ─── FOOTER ─── */
function applyFooter(d) {
  if (!d) return;
  if (d.footerName)      { const e=document.querySelector('footer .gradient-text-primary'); if(e) e.textContent=d.footerName; }
  if (d.footerCopyright) { const e=document.querySelector('footer p.text-gray-600')||document.querySelector('footer p.text-sm'); if(e) e.textContent=d.footerCopyright; }
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
  console.log('[DSran] 🔄 Firebase se load ho raha hai...');
  try {
    const [hero,socials,stats,contact,footer,seo,services,projects,certificates,press] = await Promise.all([
      fetchSection('hero'), fetchSection('socials'), fetchSection('stats'),
      fetchSection('contact'), fetchSection('footer'), fetchSection('seo'),
      fetchList('services'), fetchList('projects'),
      fetchList('certificates'), fetchList('press')
    ]);

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

    console.log('[DSran] ✅ Sab load ho gaya!');
  } catch(e) {
    console.error('[DSran] ❌ Error:', e.message);
  }
})();
