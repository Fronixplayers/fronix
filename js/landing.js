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
        if (msg.includes('user-not-found') || msg.includes('invalid-credential')) msg = "No account found with this email.";
        if (msg.includes('wrong-password')) msg = "Incorrect password.";
        if (msg.includes('email-already-in-use')) msg = "Email is already registered.";
        if (msg.includes('weak-password')) msg = "Password must be at least 6 characters.";
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
