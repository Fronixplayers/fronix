// popup-loader.js — Fronixplayers Live Popup System
// Add this before </body> in your index.html:
// <script type="module" src="popup-loader.js"></script>

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore, collection, getDocs, query, where
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyC6w88P1Nrgp4djwrjJf0K2i2l6xQG8FEI",
  authDomain: "fronix-afde1.firebaseapp.com",
  projectId: "fronix-afde1",
  storageBucket: "fronix-afde1.appspot.com",
  messagingSenderId: "942976075894",
  appId: "1:942976075894:web:dfab62b417f89cc66c3757"
};

const app = initializeApp(firebaseConfig, "popup-loader");
const db  = getFirestore(app);

/* ── Inject global styles once ── */
const style = document.createElement('style');
style.textContent = `
.fpx-overlay {
  position: fixed; inset: 0; z-index: 99990;
  background: rgba(0,0,0,0.65); backdrop-filter: blur(6px);
  display: flex; align-items: center; justify-content: center;
  opacity: 0; pointer-events: none;
  transition: opacity .35s ease;
}
.fpx-overlay.fpx-show { opacity: 1; pointer-events: all; }

/* ---------- CENTER MODAL ---------- */
.fpx-modal {
  background: var(--fpx-bg, #0c1419);
  border: 1px solid rgba(0,210,133,0.18);
  border-radius: 20px; overflow: hidden;
  max-width: 480px; width: 92vw;
  transform: scale(.88) translateY(20px);
  transition: transform .35s cubic-bezier(.34,1.56,.64,1);
  box-shadow: 0 40px 100px rgba(0,0,0,.7), 0 0 40px rgba(0,210,133,0.08);
  position: relative;
}
.fpx-overlay.fpx-show .fpx-modal { transform: scale(1) translateY(0); }

.fpx-img { width: 100%; max-height: 220px; object-fit: cover; display: block; }
.fpx-body { padding: 24px; }
.fpx-title { font-family: 'Syne', sans-serif; font-size: 1.25rem; font-weight: 700; color: #e8f4f0; margin-bottom: 10px; }
.fpx-text  { font-size: .93rem; color: #8aab9e; line-height: 1.65; margin-bottom: 18px; }
.fpx-btn {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 11px 24px; border-radius: 10px; text-decoration: none;
  background: linear-gradient(135deg, #00d285, #00b870);
  color: #000; font-weight: 700; font-size: .92rem;
  font-family: 'Syne', sans-serif; transition: .2s;
}
.fpx-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,210,133,.35); }
.fpx-close {
  position: absolute; top: 12px; right: 12px; z-index: 2;
  width: 32px; height: 32px; border-radius: 8px;
  background: rgba(0,0,0,.45); border: 1px solid rgba(255,255,255,.1);
  cursor: pointer; color: #aaa; font-size: 1rem;
  display: flex; align-items: center; justify-content: center;
  transition: .2s;
}
.fpx-close:hover { color: #fff; background: rgba(255,77,109,.3); border-color: rgba(255,77,109,.4); }

/* ---------- BOTTOM-RIGHT CORNER ---------- */
.fpx-corner {
  position: fixed; bottom: 24px; right: 24px; z-index: 99991;
  max-width: 320px; width: 92vw;
  background: var(--fpx-bg, #0c1419);
  border: 1px solid rgba(0,210,133,0.2);
  border-radius: 16px; overflow: hidden;
  box-shadow: 0 20px 60px rgba(0,0,0,.6);
  transform: translateY(120%); opacity: 0;
  transition: transform .4s cubic-bezier(.34,1.4,.64,1), opacity .3s;
  pointer-events: none;
}
.fpx-corner.fpx-show { transform: translateY(0); opacity: 1; pointer-events: all; }
.fpx-corner .fpx-img { max-height: 140px; }
.fpx-corner .fpx-body { padding: 16px; }
.fpx-corner .fpx-title { font-size: 1rem; }
.fpx-corner .fpx-text  { font-size: .83rem; margin-bottom: 12px; }
.fpx-corner .fpx-btn   { padding: 8px 18px; font-size: .84rem; }
.fpx-corner .fpx-close { top: 8px; right: 8px; width: 26px; height: 26px; font-size: .8rem; }

/* ---------- TOP BANNER ---------- */
.fpx-banner {
  position: fixed; top: 0; left: 0; right: 0; z-index: 99992;
  background: linear-gradient(135deg, #0c1419 0%, #061a12 100%);
  border-bottom: 1px solid rgba(0,210,133,0.25);
  padding: 12px 20px;
  display: flex; align-items: center; gap: 14px; flex-wrap: wrap;
  transform: translateY(-110%); opacity: 0;
  transition: transform .4s ease, opacity .3s;
  box-shadow: 0 4px 30px rgba(0,0,0,.4);
  pointer-events: none;
}
.fpx-banner.fpx-show { transform: translateY(0); opacity: 1; pointer-events: all; }
.fpx-banner .fpx-img  { width: 48px; height: 48px; border-radius: 8px; object-fit: cover; }
.fpx-banner .fpx-body { flex: 1; padding: 0; display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
.fpx-banner .fpx-title { font-family: 'Syne', sans-serif; font-size: .95rem; font-weight: 700; color: #e8f4f0; margin: 0; }
.fpx-banner .fpx-text  { font-size: .82rem; color: #8aab9e; margin: 0; flex: 1; min-width: 120px; }
.fpx-banner .fpx-btn   { padding: 7px 16px; font-size: .82rem; white-space: nowrap; }
.fpx-banner .fpx-close { position: static; width: 28px; height: 28px; flex-shrink: 0; }

/* ---------- FULLSCREEN ---------- */
.fpx-fullscreen {
  display: flex; align-items: center; justify-content: center;
  background: rgba(0,0,0,.92);
}
.fpx-fullscreen .fpx-modal {
  max-width: 560px; width: 94vw;
  max-height: 90vh; overflow-y: auto;
}

/* ---------- DARK NEON ACCENT LINE ---------- */
.fpx-modal::before, .fpx-corner::before {
  content: '';
  position: absolute; top: 0; left: 0; right: 0; height: 3px;
  background: linear-gradient(90deg, #00d285, #00aaff, #00d285);
  background-size: 200%;
  animation: fpxShimmer 2.5s linear infinite;
}
@keyframes fpxShimmer { to { background-position: 200%; } }
`;
document.head.appendChild(style);

/* ── Session / daily frequency helpers ── */
function shouldShow(popup) {
  const key = `fpx_${popup.id}`;
  const freq = popup.showOn || 'every';
  if (freq === 'every') return true;
  if (freq === 'once') {
    if (sessionStorage.getItem(key)) return false;
    sessionStorage.setItem(key, '1');
    return true;
  }
  if (freq === 'daily') {
    const last = localStorage.getItem(key);
    const today = new Date().toDateString();
    if (last === today) return false;
    localStorage.setItem(key, today);
    return true;
  }
  return true;
}

/* ── Build popup HTML ── */
function buildPopup(p) {
  const imgHtml = p.image
    ? `<img class="fpx-img" src="${p.image}" alt="${p.title || ''}" loading="lazy">`
    : '';
  const btnHtml = (p.btnText && p.btnUrl)
    ? `<a class="fpx-btn" href="${p.btnUrl}" target="_blank" rel="noopener">
         ${p.btnText} <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor"><path d="M6.5 1H11v4.5M11 1 5 7M2 3H1v8h8V9"/></svg>
       </a>`
    : '';

  const type    = p.type || 'center';
  const bgColor = p.bgColor || '#0c1419';

  /* BANNER */
  if (type === 'top-banner') {
    const el = document.createElement('div');
    el.className = 'fpx-banner';
    el.style.setProperty('--fpx-bg', bgColor);
    el.innerHTML = `
      ${p.image ? `<img class="fpx-img" src="${p.image}" alt="">` : ''}
      <div class="fpx-body">
        ${p.title ? `<div class="fpx-title">${p.title}</div>` : ''}
        ${p.body  ? `<div class="fpx-text">${p.body}</div>`   : ''}
        ${btnHtml}
      </div>
      <button class="fpx-close" aria-label="Close">&#x2715;</button>
    `;
    el.querySelector('.fpx-close').addEventListener('click', () => dismiss(null, el, type));
    return { el, type };
  }

  /* CORNER */
  if (type === 'bottom-right') {
    const el = document.createElement('div');
    el.className = 'fpx-corner';
    el.style.setProperty('--fpx-bg', bgColor);
    el.innerHTML = `
      ${imgHtml}
      <div class="fpx-body">
        ${p.title ? `<div class="fpx-title">${p.title}</div>` : ''}
        ${p.body  ? `<div class="fpx-text">${p.body}</div>`   : ''}
        ${btnHtml}
      </div>
      <button class="fpx-close" aria-label="Close">&#x2715;</button>
    `;
    el.querySelector('.fpx-close').addEventListener('click', () => dismiss(null, el, type));
    return { el, type };
  }

  /* CENTER / FULLSCREEN */
  const overlay = document.createElement('div');
  overlay.className = type === 'fullscreen' ? 'fpx-overlay fpx-fullscreen' : 'fpx-overlay';
  overlay.innerHTML = `
    <div class="fpx-modal" style="--fpx-bg:${bgColor}">
      ${imgHtml}
      <div class="fpx-body">
        ${p.title ? `<div class="fpx-title">${p.title}</div>` : ''}
        ${p.body  ? `<div class="fpx-text">${p.body}</div>`   : ''}
        ${btnHtml}
      </div>
      <button class="fpx-close" aria-label="Close">&#x2715;</button>
    </div>
  `;
  overlay.querySelector('.fpx-close').addEventListener('click', () => dismiss(overlay, null, type));
  overlay.addEventListener('click', e => { if (e.target === overlay) dismiss(overlay, null, type); });
  return { el: overlay, type };
}

function dismiss(overlay, floater, type) {
  if (overlay) {
    overlay.classList.remove('fpx-show');
    setTimeout(() => overlay.remove(), 400);
  }
  if (floater) {
    floater.classList.remove('fpx-show');
    setTimeout(() => floater.remove(), 500);
  }
}

/* ── Schedule a popup ── */
function schedulePopup(popup, index) {
  const delay  = ((popup.delay || 0) + index * 0.8) * 1000; // slight offset per popup
  setTimeout(() => {
    if (!shouldShow(popup)) return;
    const { el, type } = buildPopup(popup);
    document.body.appendChild(el);
    // Force reflow then animate in
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('fpx-show')));

    // Auto-dismiss corner/banner after 8s
    if (type === 'bottom-right' || type === 'top-banner') {
      setTimeout(() => dismiss(null, el, type), 8000);
    }
  }, delay);
}

/* ── Main: fetch & fire ── */
(async () => {
  try {
    const snap = await getDocs(
      query(collection(db, 'popups'), where('active', '==', true))
    );
    const popups = [];
    snap.forEach(d => popups.push({ id: d.id, ...d.data() }));

    // Sort by delay ascending
    popups.sort((a, b) => (a.delay || 0) - (b.delay || 0));

    popups.forEach((p, i) => schedulePopup(p, i));
  } catch (e) {
    console.warn('[FPX Popups]', e.message);
  }
})();
