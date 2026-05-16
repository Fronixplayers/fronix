// js/landing.js — FronixLearner Landing Page Logic

import {
    auth, db,
    createUserWithEmailAndPassword, signInWithEmailAndPassword,
    sendPasswordResetEmail, signOut, onAuthStateChanged,
    doc, setDoc, getDoc, getDocs, collection, query, orderBy, serverTimestamp
} from './firebase-config.js';

// ─── TOAST ───────────────────────────────────────────
function showToast(msg, type = 'info') {
    const t = document.getElementById('toast');
    t.innerHTML = `<div class="toast-inner ${type}"><i class="fas fa-${type === 'error' ? 'exclamation-circle' : type === 'success' ? 'check-circle' : 'info-circle'}"></i><span>${msg}</span></div>`;
    t.style.display = 'block';
    setTimeout(() => t.style.display = 'none', 4500);
}

// ─── HERO SLIDER ─────────────────────────────────────
let currentSlide = 0;
const slides = document.querySelectorAll('.slide');
if (slides.length) {
    setInterval(() => {
        slides[currentSlide].classList.remove('active');
        currentSlide = (currentSlide + 1) % slides.length;
        slides[currentSlide].classList.add('active');
    }, 4000);
}

// ─── NAV ─────────────────────────────────────────────
window.toggleMenu = () => document.getElementById('navLinks').classList.toggle('active');
document.querySelectorAll('.nav-links a').forEach(a => a.addEventListener('click', () => {
    document.getElementById('navLinks').classList.remove('active');
}));

// ─── COURSES LOADER ───────────────────────────────────
async function loadCourses() {
    const grid = document.getElementById('courseGrid');
    grid.innerHTML = `<p style="grid-column:1/-1; text-align:center; color:#999;">Loading courses…</p>`;
    try {
        const q = query(collection(db, "courses"), orderBy("createdAt", "desc"));
        const snap = await getDocs(q);
        grid.innerHTML = "";
        if (snap.empty) {
            grid.innerHTML = `<p style="grid-column:1/-1; text-align:center; color:#999;">No courses published yet.</p>`;
            return;
        }
        snap.forEach(d => {
            const c = d.data();
            const vidId = (c.playlist && c.playlist.length) ? c.playlist[0].videoId : c.videoId || '';
            const thumb = vidId ? `https://img.youtube.com/vi/${vidId}/hqdefault.jpg` : 'https://via.placeholder.com/400x220';
            const priceBadge = c.isFree !== false
                ? `<span class="badge badge-free"><i class="fas fa-lock-open"></i> Free</span>`
                : `<span class="badge badge-paid"><i class="fas fa-lock"></i> Paid</span>`;
            grid.innerHTML += `
            <div class="course-card" data-title="${(c.title||'').toLowerCase()}" data-cat="${(c.category||'').toLowerCase()}">
                <div class="thumb-container">
                    <img src="${thumb}" class="course-img" alt="${c.title}">
                    <div class="play-overlay"><i class="fas fa-play-circle play-icon"></i></div>
                </div>
                <div class="course-content">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
                        <span class="course-tag">${c.category || 'General'}</span>
                        ${priceBadge}
                    </div>
                    <h3 class="course-title">${c.title}</h3>
                    <p class="course-desc">By ${c.instructor || 'Instructor'}</p>
                    <div class="course-footer">
                        <span><i class="fas fa-video"></i> ${c.playlist ? c.playlist.length : 1} Lessons</span>
                        <button onclick="window.openModal('login')" class="btn btn-fill" style="padding:8px 18px; font-size:0.85rem;">
                            <i class="fas fa-play"></i> Start
                        </button>
                    </div>
                </div>
            </div>`;
        });
    } catch (err) {
        showToast("Could not load courses: " + err.message, 'error');
        grid.innerHTML = `<p style="grid-column:1/-1; text-align:center; color:red;">Error loading courses.</p>`;
    }
}

window.filterCourses = () => {
    const q = document.getElementById('searchInput').value.toLowerCase();
    document.querySelectorAll('.course-card').forEach(c => {
        c.style.display = (c.dataset.title.includes(q) || c.dataset.cat.includes(q)) ? '' : 'none';
    });
};

// ─── AUTH MODAL ───────────────────────────────────────
let currentMode = 'login';

window.openModal = (mode) => {
    document.getElementById('authModal').classList.add('active');
    window.switchMode(mode);
};
window.closeModal = () => document.getElementById('authModal').classList.remove('active');
document.getElementById('authModal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) window.closeModal();
});

window.switchMode = (mode) => {
    currentMode = mode;
    const btns = document.querySelectorAll('.toggle-btn');
    const nameGroup = document.getElementById('nameGroup');
    const extraFields = document.getElementById('extraFields');
    const termsGroup = document.getElementById('termsGroup');
    const forgotLinks = document.getElementById('forgotLinks');
    const backLink = document.getElementById('backToLoginLink');
    const title = document.getElementById('formTitle');
    const btn = document.getElementById('submitBtn');
    const roleGroup = document.getElementById('roleGroup');
    const adminOption = document.getElementById('adminOption');

    // Reset required
    ['fullName','age','phone','state','city'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.required = false;
    });

    if (mode === 'login') {
        btns[0].classList.add('active'); btns[1].classList.remove('active');
        nameGroup.classList.add('hidden'); extraFields.classList.add('hidden');
        termsGroup.classList.add('hidden');
        forgotLinks.classList.remove('hidden'); backLink.classList.add('hidden');
        roleGroup.classList.remove('hidden');
        // Show Admin option only on Login
        if (adminOption) adminOption.style.display = '';
        title.innerText = "Welcome Back"; btn.innerHTML = '<i class="fas fa-arrow-right"></i> Access Dashboard';
    } else if (mode === 'signup') {
        btns[0].classList.remove('active'); btns[1].classList.add('active');
        nameGroup.classList.remove('hidden'); extraFields.classList.remove('hidden');
        termsGroup.classList.remove('hidden');
        forgotLinks.classList.add('hidden'); backLink.classList.add('hidden');
        roleGroup.classList.remove('hidden');
        // Hide Admin option — only Students can sign up
        if (adminOption) adminOption.style.display = 'none';
        // Force select to Student if Admin was selected
        const roleEl = document.getElementById('role');
        if (roleEl && roleEl.value === 'Admin') roleEl.value = 'Student';
        ['fullName','age','phone','state','city'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.required = true;
        });
        title.innerText = "Create Account"; btn.innerHTML = '<i class="fas fa-user-plus"></i> Sign Up';
    } else if (mode === 'reset') {
        btns[0].classList.remove('active'); btns[1].classList.remove('active');
        nameGroup.classList.add('hidden'); extraFields.classList.add('hidden');
        termsGroup.classList.add('hidden');
        forgotLinks.classList.add('hidden'); backLink.classList.remove('hidden');
        roleGroup.classList.add('hidden');
        if (adminOption) adminOption.style.display = 'none';
        title.innerText = "Reset Password"; btn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Reset Link';
    }
};

// ─── TERMS MODAL ──────────────────────────────────────
window.openTerms = (e) => {
    e.preventDefault();
    document.getElementById('termsModal').classList.add('active');
};
window.closeTerms = () => document.getElementById('termsModal').classList.remove('active');
window.acceptTerms = () => {
    document.getElementById('termsCheck').checked = true;
    window.closeTerms();
};

// ─── HANDLE AUTH ──────────────────────────────────────
window.handleAuth = async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const role = document.getElementById('role')?.value || 'Student';
    const btn = document.getElementById('submitBtn');

    btn.disabled = true;
    const orig = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing…';

    try {
        if (currentMode === 'reset') {
            await sendPasswordResetEmail(auth, email);
            showToast("Reset link sent to your email!", 'success');
            window.switchMode('login');

        } else if (currentMode === 'signup') {
            // Terms check
            if (!document.getElementById('termsCheck').checked) {
                showToast("Please accept Terms & Conditions to sign up.", 'error');
                btn.disabled = false; btn.innerHTML = orig; return;
            }
            const name = document.getElementById('fullName').value.trim();
            const age = document.getElementById('age').value;
            const phone = document.getElementById('phone').value.trim();
            const state = document.getElementById('state').value.trim();
            const city = document.getElementById('city').value.trim();

            // FIX 1: Validate all fields
            if (!name) { showToast("⚠️ Full Name is required.", 'error'); btn.disabled=false; btn.innerHTML=orig; return; }
            if (!age || age < 5 || age > 100) { showToast("⚠️ Please enter a valid age.", 'error'); btn.disabled=false; btn.innerHTML=orig; return; }
            if (!phone || phone.length < 8) { showToast("⚠️ Please enter a valid phone number.", 'error'); btn.disabled=false; btn.innerHTML=orig; return; }
            if (!state) { showToast("⚠️ State is required.", 'error'); btn.disabled=false; btn.innerHTML=orig; return; }
            if (!city) { showToast("⚠️ City is required.", 'error'); btn.disabled=false; btn.innerHTML=orig; return; }

            const cred = await createUserWithEmailAndPassword(auth, email, password);
            await setDoc(doc(db, "users", cred.user.uid), {
                name, email, role, age, phone, state, city,
                termsAccepted: true,
                termsAcceptedAt: serverTimestamp(),
                createdAt: serverTimestamp(),
                lastActive: serverTimestamp(),
                isBlocked: false
            });
            showToast("Account created! Redirecting…", 'success');
            setTimeout(() => {
                window.location.href = role === 'Admin' ? 'admin.html' : 'student.html';
            }, 800);

        } else {
            const cred = await signInWithEmailAndPassword(auth, email, password);
            const snap = await getDoc(doc(db, "users", cred.user.uid));
            if (!snap.exists()) throw new Error("User profile not found.");
            const data = snap.data();
            if (data.isBlocked) { await signOut(auth); throw new Error("Your account is blocked by admin."); }
            if (data.role !== role) throw new Error(`Role mismatch: This is a ${data.role} account.`);
            await setDoc(doc(db, "users", cred.user.uid), { lastActive: serverTimestamp() }, { merge: true });
            showToast("Login successful! Redirecting…", 'success');
            setTimeout(() => {
                window.location.href = role === 'Admin' ? 'admin.html' : 'student.html';
            }, 600);
        }
    } catch (err) {
        let msg = err.message;
        if (msg.includes('user-not-found') || msg.includes('invalid-credential') || msg.includes('INVALID_LOGIN_CREDENTIALS')) msg = "❌ No account found with this email or incorrect password.";
        else if (msg.includes('wrong-password')) msg = "❌ Incorrect password. Please try again.";
        else if (msg.includes('email-already-in-use')) msg = "⚠️ This email is already registered. Please log in.";
        else if (msg.includes('weak-password')) msg = "⚠️ Password must be at least 6 characters.";
        else if (msg.includes('too-many-requests')) msg = "🔒 Too many failed attempts. Account temporarily locked. Try again later or reset password.";
        else if (msg.includes('blocked')) msg = "🚫 " + msg;
        else if (msg.includes('Role mismatch')) msg = "⚠️ " + msg.replace('Role mismatch: ', '');
        else if (msg.includes('network')) msg = "📶 Network error. Check your internet connection.";
        showToast(msg, 'error');
        btn.disabled = false; btn.innerHTML = orig;
    }
};

// ─── CONTACT FORM ─────────────────────────────────────
const contactForm = document.getElementById('contactForm');
if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
        e.preventDefault();
        showToast("Message sent! We'll get back to you soon.", 'success');
        contactForm.reset();
    });
}

// ─── INIT ─────────────────────────────────────────────
loadCourses();
loadWebsiteContent();
loadReviews();
loadTeam();
loadBlog();
loadLandingPopups();
// ─── WEBSITE CONTENT LOADER ──────────────────────────────
async function loadWebsiteContent() {
    try {
        const snap = await getDoc(doc(db, 'website', 'content'));
        if (!snap.exists()) return;
        const d = snap.data();

        // Hero
        if (d.hero) {
            const h = d.hero;
            if (h.title) {
                const el = document.getElementById('heroTitle');
                if (el) el.innerHTML = h.title;
            }
            if (h.sub) {
                const el = document.getElementById('heroSub');
                if (el) el.innerText = h.sub;
            }
            // Slides
            const slides = document.querySelectorAll('.slide');
            const urls = [h.slide1, h.slide2, h.slide3].filter(Boolean);
            if (urls.length && slides.length) {
                urls.forEach((url, i) => { if (slides[i]) slides[i].style.backgroundImage = `url('${url}')`; });
            }
        }

        // About
        if (d.about) {
            const a = d.about;
            const setTxt = (id, val) => { const el = document.getElementById(id); if (el && val) el.innerText = val; };
            if (a.title) { const el = document.getElementById('aboutTitle'); if (el) el.innerText = a.title; }
            setTxt('aboutP1', a.p1); setTxt('aboutP2', a.p2);
            if (a.img) { const el = document.getElementById('aboutImg'); if (el) el.src = a.img; }
            setTxt('stat1Num', a.stat1Num); setTxt('stat1Label', a.stat1Label);
            setTxt('stat2Num', a.stat2Num); setTxt('stat2Label', a.stat2Label);
            setTxt('stat3Num', a.stat3Num); setTxt('stat3Label', a.stat3Label);
        }

        // Contact
        if (d.contact) {
            const c = d.contact;
            const setTxt = (id, val) => { const el = document.getElementById(id); if (el && val) el.innerText = val; };
            setTxt('contactAddr', c.address); setTxt('contactEmail', c.email); setTxt('contactPhone', c.phone);
            setTxt('footerTag', c.footerTag);
            const setHref = (id, val) => { const el = document.getElementById(id); if (el && val) el.href = val; };
            setHref('socFb', c.fb); setHref('socInsta', c.insta); setHref('socYt', c.yt);
        }

        // Popups loaded via loadLandingPopups()
    } catch(e) { console.warn('loadWebsiteContent:', e); }
}

// ─── REVIEWS LOADER ───────────────────────────────────────
async function loadReviews() {
    const grid = document.getElementById('reviewGallery');
    if (!grid) return;
    try {
        const snap = await getDocs(query(collection(db, 'website_reviews'), orderBy('createdAt', 'desc')));
        if (snap.empty) {
            grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:#bbb;">No reviews yet.</p>';
            return;
        }
        grid.innerHTML = '';
        snap.forEach(d => {
            const r = d.data();
            grid.innerHTML += `
            <div style="background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 14px rgba(0,0,0,0.07);
                        border:1px solid #f1f5f9;transition:0.25s;" 
                 onmouseover="this.style.transform='translateY(-4px)';this.style.boxShadow='0 12px 28px rgba(0,0,0,0.12)'"
                 onmouseout="this.style.transform='';this.style.boxShadow='0 4px 14px rgba(0,0,0,0.07)'">
                <img src="${r.image}" alt="${r.name}" loading="lazy"
                     style="width:100%;display:block;object-fit:cover;border-bottom:1px solid #f1f5f9;">
                <div style="padding:14px 16px;">
                    <div style="font-weight:700;font-size:0.95rem;">${r.name}</div>
                    <div style="color:#888;font-size:0.82rem;">${r.role || 'Student'}</div>
                </div>
            </div>`;
        });
    } catch(e) { console.warn('loadReviews:', e); }
}

// ─── TEAM LOADER ──────────────────────────────────────────
async function loadTeam() {
    const grid = document.getElementById('teamGrid');
    if (!grid) return;
    try {
        const snap = await getDocs(query(collection(db, 'website_team'), orderBy('createdAt', 'asc')));
        if (snap.empty) {
            // Fallback to hardcoded if no firebase data
            grid.innerHTML = `
            <div class="team-card">
                <img src="images/diljeet-singh-sran.jpg" class="team-img" alt="Diljeet"
                     onerror="this.src='https://api.dicebear.com/7.x/avataaars/svg?seed=Diljeet'">
                <h3 class="team-name">Diljeet Singh Sran</h3>
                <p class="team-role">Founder</p>
                <div class="team-social"><a href="#"><i class="fab fa-linkedin"></i></a></div>
            </div>
            <div class="team-card">
                <img src="images/rishabh.jpeg" class="team-img" alt="Rishabh"
                     onerror="this.src='https://api.dicebear.com/7.x/avataaars/svg?seed=Rishabh'">
                <h3 class="team-name">Rishabh</h3>
                <p class="team-role">CEO</p>
                <div class="team-social"><a href="#"><i class="fab fa-linkedin"></i></a></div>
            </div>`;
            return;
        }
        grid.innerHTML = '';
        snap.forEach(d => {
            const t = d.data();
            const li = t.linkedin ? `<a href="${t.linkedin}" target="_blank"><i class="fab fa-linkedin"></i></a>` : '';
            const ig = t.insta    ? `<a href="${t.insta}"    target="_blank"><i class="fab fa-instagram"></i></a>` : '';
            grid.innerHTML += `
            <div class="team-card">
                <img src="${t.photo || 'https://api.dicebear.com/7.x/avataaars/svg?seed='+t.name}"
                     class="team-img" alt="${t.name}"
                     onerror="this.src='https://api.dicebear.com/7.x/avataaars/svg?seed=${t.name}'">
                <h3 class="team-name">${t.name}</h3>
                <p class="team-role">${t.role}</p>
                <div class="team-social">${li}${ig}</div>
            </div>`;
        });
    } catch(e) { console.warn('loadTeam:', e); }
}

// ─── BLOG LOADER ──────────────────────────────────────────
async function loadBlog() {
    const grid = document.getElementById('blogGrid');
    if (!grid) return;
    try {
        const snap = await getDocs(query(collection(db, 'website_blog'), orderBy('createdAt', 'desc')));
        if (snap.empty) {
            // Fallback hardcoded
            grid.innerHTML = `
            <div class="blog-card"><div class="blog-content"><span class="blog-date">09 Dec 2022</span><h3 class="blog-title">We run Foundations</h3><p class="blog-desc">Building a foundation for lifelong learning across India.</p><a href="#" class="blog-link">Read More <i class="fas fa-arrow-right"></i></a></div></div>
            <div class="blog-card"><div class="blog-content"><span class="blog-date">09 Dec 2022</span><h3 class="blog-title">E-learning Platform</h3><p class="blog-desc">Providing world-class education for free to everyone.</p><a href="#" class="blog-link">Read More <i class="fas fa-arrow-right"></i></a></div></div>
            <div class="blog-card"><div class="blog-content"><span class="blog-date">09 Dec 2022</span><h3 class="blog-title">Social Media Agency</h3><p class="blog-desc">Helping brands grow with expert marketing strategies.</p><a href="#" class="blog-link">Read More <i class="fas fa-arrow-right"></i></a></div></div>`;
            return;
        }
        grid.innerHTML = '';
        snap.forEach(d => {
            const b = d.data();
            grid.innerHTML += `
            <div class="blog-card">
                <div class="blog-content">
                    <span class="blog-date">${b.date || ''}</span>
                    <h3 class="blog-title">${b.title}</h3>
                    <p class="blog-desc">${b.desc || ''}</p>
                    ${b.link ? `<a href="${b.link}" target="_blank" class="blog-link">Read More <i class="fas fa-arrow-right"></i></a>` : ''}
                </div>
            </div>`;
        });
    } catch(e) { console.warn('loadBlog:', e); }
}


// ─── LANDING PAGE POPUPS ──────────────────────────────────────
let _landingPopups = [];
let _landingPopupIdx = 0;

async function loadLandingPopups() {
    try {
        const snap = await getDocs(query(
            collection(db, 'website_popups'),
            orderBy('createdAt', 'desc')
        ));
        _landingPopups = [];
        snap.forEach(d => {
            const p = d.data();
            if (p.active && (p.target === 'landing' || p.target === 'both')) {
                _landingPopups.push(p);
            }
        });
        if (!_landingPopups.length) return;

        _landingPopupIdx = 0;
        // Delay by first popup's delay setting
        const firstDelay = (_landingPopups[0].delay || 1) * 1000;
        setTimeout(() => showLandingPopup(0), firstDelay);
    } catch(e) { console.warn('loadLandingPopups:', e); }
}

function showLandingPopup(idx) {
    const popups = _landingPopups;
    if (!popups.length) return;
    const p = popups[idx];
    const box     = document.getElementById('landingPopupBox');
    const overlay = document.getElementById('landingPopupOverlay');
    if (!box || !overlay) return;

    // Image
    const imgWrap = document.getElementById('lpImgWrap');
    const img     = document.getElementById('lpImg');
    if (p.image) {
        img.src = p.image;
        imgWrap.style.display = 'block';
    } else {
        imgWrap.style.display = 'none';
    }

    // Text
    document.getElementById('lpTitle').innerText  = p.title || '';
    document.getElementById('lpMsg').innerText    = p.msg   || '';

    // Button
    const btnWrap = document.getElementById('lpBtnWrap');
    btnWrap.innerHTML = p.btnText
        ? `<a href="${p.btnLink || '#'}" class="btn btn-fill"
              style="display:inline-flex;justify-content:center;width:100%;"
              target="${p.btnLink ? '_blank' : '_self'}">
               ${p.btnText} <i class="fas fa-arrow-right"></i>
           </a>` : '';

    // Dots for multiple popups
    const dots = document.getElementById('lpDots');
    dots.innerHTML = popups.length > 1
        ? popups.map((_, i) =>
            `<span onclick="window.goLandingPopup(${i})"
                  style="width:8px;height:8px;border-radius:50%;cursor:pointer;transition:0.2s;
                         background:${i === idx ? 'var(--primary)' : '#d1d5db'};
                         display:inline-block;"></span>`).join('')
        : '';

    // Show
    box.style.display = 'block';
    overlay.style.display = 'flex';
    _landingPopupIdx = idx;

    // Auto-advance to next popup after 8s if multiple
    if (popups.length > 1) {
        clearTimeout(box._autoTimer);
        box._autoTimer = setTimeout(() => {
            const next = (idx + 1) % popups.length;
            showLandingPopup(next);
        }, 8000);
    }
}

window.goLandingPopup = (idx) => {
    clearTimeout(document.getElementById('landingPopupBox')?._autoTimer);
    showLandingPopup(idx);
};

window.closeLandingPopup = () => {
    const box     = document.getElementById('landingPopupBox');
    const overlay = document.getElementById('landingPopupOverlay');
    clearTimeout(box?._autoTimer);
    if (box)     box.style.display     = 'none';
    if (overlay) overlay.style.display = 'none';
};

// Close on overlay click
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('landingPopupOverlay')?.addEventListener('click', window.closeLandingPopup);
});
