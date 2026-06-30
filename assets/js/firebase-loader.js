/* ============================================================
 * D Sran Portfolio — Firebase Content Loader
 * DO NOT EDIT unless you know what you're doing
 * ============================================================ */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, getDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* ── CONFIG — obfuscated split to slow scrapers ── */
const _c = [
  'AIzaSyBXc9uq0r3t',
  'NzodrQNVelO_JtW4hT_wKEM'
].join('');
const _p = 'diljeetsinghsran-fd322';
const _cfg = {
  apiKey:            _c,
  authDomain:        `${_p}.firebaseapp.com`,
  projectId:         _p,
  storageBucket:     `${_p}.firebasestorage.app`,
  messagingSenderId: '806630457133',
  appId:             '1:806630457133:web:bfd789de366f803aa99da4'
};

const _app = initializeApp(_cfg, 'dsran-v5');
const _db  = getFirestore(_app);

/* ── Fetch helpers ── */
async function _get(name) {
  try {
    const s = await getDoc(doc(_db, 'portfolio', name));
    return s.exists() ? s.data() : null;
  } catch(e) { return null; }
}
async function _list(col) {
  try {
    const s = await getDocs(collection(_db, col));
    const r = [];
    s.forEach(d => r.push({ id: d.id, ...d.data() }));
    return r;
  } catch(e) { return []; }
}

/* ── Grid ID map ── */
const _grids = { services:'services-grid', portfolio:'portfolio-grid', press:'press-grid', certificates:'cert-grid' };
const _g = id => document.getElementById(_grids[id]) || null;

/* ════════════════════════════════
   SECTION APPLIERS
════════════════════════════════ */
function _hero(d) {
  if (!d) return;
  if (d.heroName) {
    const h = document.querySelector('#home h1');
    if (h) { const p=d.heroName.trim().split(' '); h.innerHTML=`Hi, I'm <span class="gradient-text-primary">${p.slice(0,2).join(' ')}</span> <span class="gradient-text-warm">${p.slice(2).join(' ')}</span> 👋`; }
  }
  if (d.heroBadge)   { const b=document.querySelector('#home .badge-gradient'); if(b) b.innerHTML=`<span class="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span> ${d.heroBadge}`; }
  if (d.heroTagline) { const p=document.querySelector('#home .space-y-3 p'); if(p) p.innerHTML=`A Passionate <span class="gradient-text-primary font-bold">${d.heroTagline}</span>`; }
  if (d.heroSubline) { const ps=document.querySelectorAll('#home .space-y-3 p'); if(ps[1]) ps[1].textContent=d.heroSubline; }
  if (d.heroCta1Link){ const a=document.querySelector('#home a[href^="tel"]'); if(a) a.href=d.heroCta1Link; }
  if (d.heroCta1Text){ const a=document.querySelector('#home a[href^="tel"]'); if(a) a.innerHTML=`<i class="fas fa-phone mr-2"></i>${d.heroCta1Text}`; }
  if (d.heroImage)   { const i=document.querySelector('#home .hero-image-container img')||document.querySelector('#home img[alt*="Diljeet"]'); if(i) i.src=d.heroImage; }
  if (d.heroWhatsapp){ document.querySelectorAll('a[href*="wa.me"]').forEach(a=>a.href=`https://wa.me/${d.heroWhatsapp.replace(/\D/g,'')}`); }
}

function _socials(d) {
  if (!d) return;
  if (d.socialEmail)    document.querySelectorAll('a[href^="mailto"]').forEach(a=>{a.href=`mailto:${d.socialEmail}`;if(a.textContent.includes('@'))a.textContent=d.socialEmail;});
  if (d.socialTwitter)  document.querySelectorAll('a[href*="x.com"],a[href*="twitter"]').forEach(a=>a.href=d.socialTwitter);
  if (d.socialInstagram)document.querySelectorAll('a[href*="instagram"]').forEach(a=>a.href=d.socialInstagram);
  if (d.socialLinkedin) document.querySelectorAll('a[href*="linkedin"]').forEach(a=>a.href=d.socialLinkedin);
}

function _stats(d) {
  if (!d) return;
  const cs = document.querySelectorAll('.counter');
  [[d.stat1Num,d.stat1Lbl],[d.stat2Num,d.stat2Lbl],[d.stat3Num,d.stat3Lbl],[d.stat4Num,d.stat4Lbl]].forEach(([num,lbl],i)=>{
    if (!cs[i]) return;
    if (num) cs[i].dataset.target = num;
    const p = cs[i].closest('.reveal-modern')?.querySelector('p'); if(p&&lbl) p.textContent=lbl;
    const target=parseInt(cs[i].dataset.target)||0; let cur=0; cs[i].textContent='0';
    const step=Math.max(1,Math.floor(target/60));
    const t=setInterval(()=>{cur=Math.min(cur+step,target);cs[i].textContent=cur;if(cur>=target)clearInterval(t);},30);
  });
}

function _services(items) {
  if (!items.length) return;
  const grid=_g('services'); if(!grid) return;
  const cm={primary:'gradient-bg-primary',warm:'gradient-bg-warm',cool:'gradient-bg-cool'};
  const df=['primary','warm','cool'];
  grid.innerHTML=items.map((s,i)=>{
    const cls=cm[s.color]||cm[df[i%3]];
    const tags=(s.tags||'').split(',').map(t=>t.trim()).filter(Boolean);
    return `<div class="service-card reveal-modern active">
      <div class="service-icon ${cls}"><i class="fas ${s.icon||'fa-star'} text-white"></i></div>
      <h3 class="text-xl md:text-2xl font-bold mb-3">${s.title||''}</h3>
      <p class="text-gray-600 mb-4 text-sm md:text-base">${s.description||''}</p>
      ${tags.length?`<div class="flex flex-wrap gap-2">${tags.map(t=>`<span class="badge-modern text-xs">${t}</span>`).join('')}</div>`:''}
    </div>`;
  }).join('');
}

function _projects(items) {
  if (!items.length) return;
  const grid=_g('portfolio'); if(!grid) return;
  grid.innerHTML=items.map(p=>`
    <div class="portfolio-item-modern reveal-modern active" style="height:300px;">
      <img src="${p.image||'assets/images/placeholder.jpg'}" alt="${p.title||''}" style="width:100%;height:100%;object-fit:cover;display:block;">
      <div class="portfolio-overlay">
        <h3 class="text-xl font-bold text-white mb-2">${p.title||''}</h3>
        <p class="text-white mb-4">${p.category||''}</p>
        ${p.url?`<a href="${p.url}" target="_blank" class="btn-modern btn-glass text-white">View Project</a>`:''}
      </div>
    </div>`).join('');
}

function _press(items) {
  if (!items.length) return;
  const grid=_g('press'); if(!grid) return;
  grid.innerHTML=items.map(p=>`
    <div class="glass-card p-6 reveal-modern active">
      ${p.image?`<div class="overflow-hidden rounded-2xl mb-6"><img src="${p.image}" alt="" class="w-full h-auto hover:scale-110 transition-transform duration-500"></div>`:''}
      <div class="flex items-center gap-3 mb-4">
        <div class="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-700 rounded-xl flex items-center justify-center text-white font-bold">${(p.source||'PR').substring(0,2).toUpperCase()}</div>
        <div><p class="font-bold text-gray-800">${p.source||''}</p><p class="text-sm text-gray-500">${p.date||''}</p></div>
      </div>
      <h3 class="text-xl font-bold mb-3">${p.title||''}</h3>
      <p class="text-gray-600 mb-4 text-sm">${p.description||''}</p>
      ${p.url?`<a href="${p.url}" target="_blank" class="inline-flex items-center gap-2 text-purple-600 font-semibold">Read Article <i class="fas fa-arrow-right"></i></a>`:''}
    </div>`).join('');
}

function _certs(items) {
  if (!items.length) return;
  const grid=_g('certificates'); if(!grid) return;
  const cols=['from-orange-500 to-red-600','from-blue-500 to-blue-700','from-green-500 to-emerald-700','from-purple-500 to-purple-700','from-yellow-500 to-orange-600','from-pink-500 to-rose-600'];
  grid.innerHTML=items.map((c,i)=>{
    const col=cols[i%cols.length];
    return `<div class="glass-card overflow-hidden reveal-modern active group">
      ${c.image
        ?`<div class="overflow-hidden"><img src="${c.image}" alt="${c.title||''}" class="w-full h-64 object-cover cursor-pointer hover:scale-110 transition-transform duration-500 certificate-image"></div>`
        :`<div class="w-full h-40 bg-gradient-to-br ${col} flex items-center justify-center"><i class="fas fa-certificate text-white text-5xl opacity-40"></i></div>`}
      <div class="p-6">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-14 h-14 bg-gradient-to-r ${col} rounded-xl flex items-center justify-center text-white"><i class="fas fa-award text-2xl"></i></div>
          <span class="text-sm font-semibold text-gray-500">${c.year||''}</span>
        </div>
        <h3 class="text-xl font-bold mb-2">${c.title||'Certificate'}</h3>
        <p class="text-gray-600 mb-4 text-sm">Issued by ${c.issuer||''}</p>
        ${c.url?`<div class="flex items-center gap-2 text-sm text-purple-600"><i class="fas fa-external-link-alt"></i><a href="${c.url}" target="_blank" class="font-semibold hover:underline">Verify Certificate</a></div>`:''}
      </div>
    </div>`;
  }).join('');
}

function _countries(items) {
  if (!items || !items.length) return;
  const el = document.getElementById('countriesCount');
  if (el) el.textContent = items.length + '+';
  const html = items.map(c=>`
    <div class="flag-pill">
      <img src="https://flagcdn.com/48x36/${(c.code||'').toLowerCase()}.png"
           alt="${c.name||''}" style="width:28px;height:21px;border-radius:4px;object-fit:cover;" onerror="this.style.display='none'">
      <span>${c.name||''}</span>
    </div>`).join('');
  const t1=document.getElementById('flagTrack1');
  const t2=document.getElementById('flagTrack2');
  if (t1) t1.innerHTML=html+html;
  if (t2) t2.innerHTML=html+html;
}

function _contact(d) {
  if (!d) return;
  if (d.contactEmail) {
    document.querySelectorAll('a[href^="mailto"]').forEach(a=>{a.href=`mailto:${d.contactEmail}`;if(a.textContent.trim().includes('@'))a.textContent=d.contactEmail;});
  }
  if (d.contactPhone) {
    document.querySelectorAll('a[href^="tel"]').forEach(a=>a.href=`tel:${d.contactPhone.replace(/\s/g,'')}`);
    const pd=document.getElementById('contactPhoneDisplay'); if(pd) pd.textContent=d.contactPhone;
  }
  if (d.contactLocation) {
    const ld=document.getElementById('contactLocationDisplay'); if(ld) ld.textContent=d.contactLocation;
  }
  if (d.contactWhatsapp) {
    document.querySelectorAll('a[href*="wa.me"]').forEach(a=>a.href=`https://wa.me/${d.contactWhatsapp.replace(/\D/g,'')}`);
  }
  if (d.contactFormspree) {
    const f=document.getElementById('contactForm'); if(f) f.action=`https://formspree.io/f/${d.contactFormspree}`;
  }
}

function _footer(d) {
  if (!d) return;
  if (d.footerName)     { const e=document.querySelector('footer .gradient-text-primary'); if(e) e.textContent=d.footerName; }
  if (d.footerCopyright){ const e=document.querySelector('footer p.text-gray-600')||document.querySelector('footer p.text-sm'); if(e) e.textContent=d.footerCopyright; }
  if (d.footerEmail)    document.querySelectorAll('footer a[href^="mailto"]').forEach(a=>a.href=`mailto:${d.footerEmail}`);
  if (d.footerTwitter)  document.querySelectorAll('footer a[href*="x.com"],footer a[href*="twitter"]').forEach(a=>a.href=d.footerTwitter);
  if (d.footerInstagram)document.querySelectorAll('footer a[href*="instagram"]').forEach(a=>a.href=d.footerInstagram);
  if (d.footerLinkedin) document.querySelectorAll('footer a[href*="linkedin"]').forEach(a=>a.href=d.footerLinkedin);
}

function _seo(d) {
  if (!d) return;
  if (d.seoTitle) document.title=d.seoTitle;
  if (d.seoDesc) { let m=document.querySelector('meta[name="description"]'); if(!m){m=document.createElement('meta');m.name='description';document.head.appendChild(m);} m.content=d.seoDesc; }
}

/* ════════════════════════════════
   CONTACT FORM SUBMIT
════════════════════════════════ */
function _initForm() {
  const form = document.getElementById('contactForm');
  if (!form) return;
  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    const btn = document.getElementById('contactSubmitBtn');
    const ok  = document.getElementById('formSuccess');
    const err = document.getElementById('formError');
    ok.classList.add('hidden');
    err.classList.add('hidden');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Sending...';
    try {
      const res = await fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { 'Accept': 'application/json' }
      });
      if (res.ok) {
        ok.classList.remove('hidden');
        form.reset();
        btn.innerHTML = '<i class="fas fa-check mr-2"></i> Message Sent!';
        setTimeout(() => { btn.disabled=false; btn.innerHTML='<i class="fas fa-paper-plane mr-2"></i> Send Message'; }, 3000);
      } else { throw new Error(); }
    } catch(_) {
      err.classList.remove('hidden');
      btn.disabled=false;
      btn.innerHTML='<i class="fas fa-paper-plane mr-2"></i> Send Message';
    }
  });
}

/* ════════════════════════════════
   MAIN INIT
════════════════════════════════ */
(async () => {
  const [hero,socials,stats,contact,footer,seo,services,projects,certs,press,countries] = await Promise.all([
    _get('hero'),_get('socials'),_get('stats'),_get('contact'),_get('footer'),_get('seo'),
    _list('services'),_list('projects'),_list('certificates'),_list('press'),_list('countries')
  ]);
  _hero(hero);
  _socials(socials);
  _stats(stats);
  _services(services);
  _projects(projects);
  _press(press);
  _certs(certs);
  _countries(countries);
  _contact(contact);
  _footer(footer);
  _seo(seo);
  _initForm();
})();
