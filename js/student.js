// js/student.js — FronixLearner Student Dashboard (ALL 7 FIXES)

import {
    auth, db,
    onAuthStateChanged, signOut,
    collection, addDoc, getDoc, doc, onSnapshot,
    query, orderBy, serverTimestamp, updateDoc, increment,
    where, limit, getDocs
} from './firebase-config.js';

let currentUser = null;
let currentCourseId = null;
let currentPlaylist = [];
let selectedAvatar = "";
const avatarSeeds = ['Felix','Aneka','Mittens','Bubba','Sorelle','Destiny','Shadow','Max'];
const BBA_DRIVE_LINK = "https://drive.google.com/drive/folders/1DNaT7uUiVoHKQkj8LejyUmKASot2gQz1";

// ─── TOAST ─────────────────────────────────────────────
function showToast(msg, type = 'info') {
    const t = document.getElementById('toast');
    t.innerHTML = `<div class="toast-inner ${type}"><i class="fas fa-${type==='error'?'exclamation-circle':type==='success'?'check-circle':'info-circle'}"></i><span>${msg}</span></div>`;
    t.style.display = 'block';
    setTimeout(() => t.style.display = 'none', 5000);
}

// ─── AUTH GUARD ──────────────────────────────────────────
onAuthStateChanged(auth, async (user) => {
    if (user) {
        onSnapshot(doc(db, "users", user.uid), (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                if (data.isBlocked) {
                    // FIX 6: Toast notification when blocked
                    showToast("🚫 Your account has been blocked by admin. Contact support.", 'error');
                    setTimeout(() => {
                        signOut(auth).then(() => window.location.href = 'index.html');
                    }, 3000);
                    return;
                }
                currentUser = { ...data, uid: user.uid };
                if (!currentUser.avatar) currentUser.avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`;
                updateUI();
                loadCourses();
                loadCourseResources(); // FIX 7: load course-based drive links
            } else {
                signOut(auth).then(() => window.location.href = 'index.html');
            }
        });
    } else {
        window.location.href = 'index.html';
    }
});

// ─── UPDATE UI ──────────────────────────────────────────
function updateUI() {
    const nameEl = document.getElementById('welcomeName');
    const avatarEl = document.getElementById('headerAvatar');
    const badgeEl = document.getElementById('verifiedBadge');
    const lockBadge = document.getElementById('bbaLockStatus');

    if (nameEl) nameEl.innerText = currentUser.name || 'Student';
    if (avatarEl) avatarEl.src = currentUser.avatar;
    if (badgeEl) badgeEl.innerText = currentUser.isVerified ? "Yes ✓" : "No";

    if (lockBadge) {
        if (currentUser.isVerified) {
            lockBadge.className = 'lock-badge status-unlocked';
            lockBadge.innerHTML = '<i class="fas fa-lock-open"></i> Access';
        } else {
            lockBadge.className = 'lock-badge status-locked';
            lockBadge.innerHTML = '<i class="fas fa-lock"></i> Locked';
        }
    }

    const uploadSection = document.getElementById('uploadSection');
    const pendingMsg = document.getElementById('pendingMsg');
    const verifiedMsg = document.getElementById('verifiedMsg');
    const rejectedMsg = document.getElementById('rejectedMsg');

    // FIX 5: Show rejection reason if rejected
    if (currentUser.isVerified) {
        if (uploadSection) uploadSection.style.display = 'none';
        if (pendingMsg) pendingMsg.style.display = 'none';
        if (verifiedMsg) verifiedMsg.style.display = 'block';
        if (rejectedMsg) rejectedMsg.style.display = 'none';
    } else if (currentUser.verificationRejected) {
        if (uploadSection) uploadSection.style.display = 'block';
        if (pendingMsg) pendingMsg.style.display = 'none';
        if (verifiedMsg) verifiedMsg.style.display = 'none';
        if (rejectedMsg) {
            rejectedMsg.style.display = 'block';
            const reasonEl = document.getElementById('rejectionReason');
            if (reasonEl) reasonEl.innerText = currentUser.rejectionReason || 'No reason provided.';
        }
    } else if (currentUser.verificationPending) {
        if (uploadSection) uploadSection.style.display = 'none';
        if (pendingMsg) pendingMsg.style.display = 'block';
        if (verifiedMsg) verifiedMsg.style.display = 'none';
        if (rejectedMsg) rejectedMsg.style.display = 'none';
    } else {
        if (uploadSection) uploadSection.style.display = 'block';
        if (pendingMsg) pendingMsg.style.display = 'none';
        if (verifiedMsg) verifiedMsg.style.display = 'none';
        if (rejectedMsg) rejectedMsg.style.display = 'none';
    }

    const vStatus = document.getElementById('verificationStatus');
    if (vStatus) vStatus.innerText = currentUser.isVerified
        ? "✓ Verified Student"
        : (currentUser.verificationPending ? "⏳ Pending Verification"
        : (currentUser.verificationRejected ? "❌ Verification Rejected" : "Unverified Student"));
}

// ─── NAVIGATION ─────────────────────────────────────────
window.switchView = (view, el) => {
    ['viewCourses','viewResources','viewSupport'].forEach(id => {
        const el2 = document.getElementById(id);
        if (el2) el2.style.display = 'none';
    });
    const target = document.getElementById('view' + view.charAt(0).toUpperCase() + view.slice(1));
    if (target) target.style.display = 'block';
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    if (el) el.classList.add('active');
    if (view === 'support') loadMyTickets();
    if (window.innerWidth <= 900) {
        document.querySelector('aside')?.classList.remove('open');
        document.querySelector('.sidebar-overlay')?.classList.remove('active');
    }
};

window.toggleSidebar = () => {
    document.querySelector('aside')?.classList.toggle('open');
    document.querySelector('.sidebar-overlay')?.classList.toggle('active');
};
window.logout = () => signOut(auth).then(() => window.location.href = 'index.html');

// ─── COURSES ────────────────────────────────────────────
function loadCourses() {
    onSnapshot(query(collection(db, "courses"), orderBy("createdAt", "desc")), (snap) => {
        const g = document.getElementById('courseGrid');
        g.innerHTML = "";
        if (snap.empty) {
            g.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px;color:#999;">
                <i class="fas fa-book-open" style="font-size:3rem;margin-bottom:12px;display:block;"></i>No courses yet.</div>`;
            return;
        }
        snap.forEach(d => {
            const c = d.data();
            const firstVid = (c.playlist && c.playlist.length > 0) ? c.playlist[0].videoId : (c.videoId || '');
            // FIX: Use custom thumbnail if set, else YouTube thumb
            const thumb = c.customThumbnail || (firstVid
                ? `https://img.youtube.com/vi/${firstVid}/hqdefault.jpg`
                : `https://placehold.co/400x220/4F46E5/white?text=${encodeURIComponent(c.title||'Course')}`);
            const priceBadge = c.isFree !== false
                ? `<span class="badge badge-free"><i class="fas fa-lock-open"></i> Free</span>`
                : `<span class="badge badge-paid"><i class="fas fa-lock"></i> Paid</span>`;
            const totalLessons = (c.playlist && c.playlist.length) ? c.playlist.length : 1;
            g.innerHTML += `
            <div class="course-card" onclick="window.openCourse('${d.id}')">
                <div style="position:relative;">
                    <img class="course-thumbnail" src="${thumb}" alt="${c.title}"
                         onerror="this.src='https://placehold.co/400x220/4F46E5/white?text=Course'">
                    <div style="position:absolute;inset:0;background:rgba(0,0,0,0.28);display:flex;align-items:center;justify-content:center;opacity:0;transition:0.3s;" class="play-hover">
                        <i class="fas fa-play-circle" style="font-size:3rem;color:white;"></i>
                    </div>
                </div>
                <div class="course-badge">${priceBadge}</div>
                <div class="course-info">
                    <h4>${c.title}</h4>
                    <p>${c.instructor || ''} • ${totalLessons} lesson${totalLessons > 1 ? 's' : ''}</p>
                </div>
            </div>`;
        });
        document.querySelectorAll('.course-card').forEach(card => {
            card.addEventListener('mouseenter', () => { const h = card.querySelector('.play-hover'); if (h) h.style.opacity='1'; });
            card.addEventListener('mouseleave', () => { const h = card.querySelector('.play-hover'); if (h) h.style.opacity='0'; });
        });
    });
}

// FIX 7: Load course resources (drive links admin set per course)
function loadCourseResources() {
    const container = document.getElementById('courseResourcesList');
    if (!container) return;
    onSnapshot(query(collection(db, "courses"), orderBy("createdAt", "desc")), (snap) => {
        container.innerHTML = "";
        snap.forEach(d => {
            const c = d.data();
            if (!c.driveLink) return; // only courses with a drive link
            const isVerified = currentUser?.isVerified;
            container.innerHTML += `
            <div class="resource-card" onclick="${isVerified ? `window.open('${c.driveLink}','_blank')` : `window.showVerifyAlert()`}" style="margin-bottom:14px;">
                <div style="display:flex;align-items:center;gap:18px;flex:1;min-width:0;">
                    <div class="res-icon" style="background:#e8f5e9;color:#10b981;flex-shrink:0;">
                        <i class="fab fa-google-drive"></i>
                    </div>
                    <div class="res-info" style="min-width:0;">
                        <h3 style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${c.title} — Notes</h3>
                        <p>${c.category || 'Course'} • ${isVerified ? 'Click to open Drive' : 'Verified Students Only'}</p>
                    </div>
                </div>
                <div class="lock-badge ${isVerified ? 'status-unlocked' : 'status-locked'}" style="flex-shrink:0;">
                    <i class="fas fa-${isVerified ? 'lock-open' : 'lock'}"></i> ${isVerified ? 'Open' : 'Locked'}
                </div>
            </div>`;
        });
        if (!container.innerHTML) {
            container.innerHTML = `<p style="color:#bbb;text-align:center;padding:30px;font-size:0.9rem;">No course notes added yet by admin.</p>`;
        }
    });
}

window.showVerifyAlert = () => {
    showToast("🔒 Get your College ID verified to access course notes!", 'error');
    window.openProfile();
    window.switchProfileTab('id');
};

// ─── COURSE PLAYER ──────────────────────────────────────
window.openCourse = async (id) => {
    currentCourseId = id;
    document.getElementById('courseModal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
    const snap = await getDoc(doc(db, "courses", id));
    if (!snap.exists()) return;
    const c = snap.data();
    currentPlaylist = (c.playlist && c.playlist.length > 0) ? c.playlist
        : (c.videoId ? [{ title: c.title || 'Lesson 1', videoId: c.videoId }] : []);
    document.getElementById('likeCount').innerText = c.likes || 0;
    window.loadVideo(0);
    window.switchTab('lessons');
};

window.loadVideo = (idx) => {
    if (!currentPlaylist || !currentPlaylist[idx]) return;
    const lesson = currentPlaylist[idx];
    const embedUrl = `https://www.youtube-nocookie.com/embed/${lesson.videoId}?autoplay=1&rel=0&modestbranding=1`;
    document.getElementById('playerFrame').src = embedUrl;
    const titleEl = document.getElementById('currentLessonTitle');
    if (titleEl) titleEl.innerText = lesson.title || `Lesson ${idx + 1}`;
    const container = document.getElementById('playlistContainer');
    if (container) {
        container.innerHTML = currentPlaylist.map((l, i) => `
            <div class="lesson-item ${i===idx?'active':''}" onclick="window.loadVideo(${i})">
                <div class="lesson-num">${i+1}</div>
                <div style="flex:1;min-width:0;font-weight:${i===idx?'700':'500'};font-size:0.88rem;line-height:1.3;">${l.title||'Lesson '+(i+1)}</div>
                ${i===idx?'<i class="fas fa-play" style="color:var(--primary);font-size:0.75rem;flex-shrink:0;"></i>':''}
            </div>`).join('');
    }
};

window.switchTab = (t) => {
    document.querySelectorAll('#courseModal .tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('#courseModal .tab').forEach(el => el.classList.remove('active'));
    const tabEl = document.getElementById(t + 'Tab');
    if (tabEl) tabEl.classList.add('active');
    const map = { lessons:0, drive:1, chat:2 };
    const tabs = document.querySelectorAll('#courseModal .tab');
    if (tabs[map[t]]) tabs[map[t]].classList.add('active');
    if (t === 'drive') {
        const div = document.getElementById('driveAccessMsg');
        if (div) {
            div.innerHTML = currentUser?.isVerified
                ? `<div style="text-align:center;padding:30px;cursor:pointer;" onclick="window.open('${BBA_DRIVE_LINK}','_blank')">
                    <i class="fab fa-google-drive" style="font-size:3rem;color:#4285F4;margin-bottom:12px;display:block;"></i>
                    <strong style="font-size:1.1rem;">Open Course Resources</strong>
                    <p style="color:#888;margin-top:8px;font-size:0.88rem;">Verified Access ✓</p>
                   </div>`
                : `<div style="text-align:center;padding:30px;">
                    <i class="fas fa-lock" style="font-size:3rem;color:#ef4444;margin-bottom:12px;display:block;"></i>
                    <strong>Verification Required</strong>
                    <p style="color:#888;margin-top:8px;font-size:0.88rem;">Upload College ID in Profile → ID Verification.</p>
                    <button onclick="document.getElementById('courseModal').style.display='none';window.openProfile();window.switchProfileTab('id');" class="btn btn-fill" style="margin-top:16px;padding:10px 20px;">
                        <i class="fas fa-id-card"></i> Verify Now
                    </button>
                   </div>`;
        }
    } else if (t === 'chat') {
        loadCourseComments();
    }
};

window.toggleLike = async () => {
    if (!currentCourseId || !currentUser) return;
    await updateDoc(doc(db, "courses", currentCourseId), { likes: increment(1) });
    const el = document.getElementById('likeCount');
    if (el) el.innerText = parseInt(el.innerText || '0') + 1;
};

let commentsUnsub = null;
function loadCourseComments() {
    if (commentsUnsub) commentsUnsub();
    const q = query(collection(db,"comments"), where("courseId","==",currentCourseId), orderBy("createdAt","asc"));
    commentsUnsub = onSnapshot(q, (snap) => {
        const l = document.getElementById('chatList');
        if (!l) return;
        l.innerHTML = "";
        if (snap.empty) { l.innerHTML = `<p style="text-align:center;color:#bbb;padding:20px;font-size:0.88rem;">No discussion yet. Be the first!</p>`; return; }
        snap.forEach(d => {
            const m = d.data();
            const isMe = m.userId === currentUser?.uid;
            l.innerHTML += `<div class="chat-msg ${isMe?'mine':'other'}">
                ${!isMe?`<div class="sender">${m.userName}</div>`:''}
                <div>${m.text}</div></div>`;
        });
        l.scrollTop = l.scrollHeight;
    }, () => {});
}

window.handleSend = async () => {
    const input = document.getElementById('interactionInput');
    const txt = input ? input.value.trim() : '';
    if (!txt || !currentUser || !currentCourseId) return;
    await addDoc(collection(db, "comments"), {
        courseId: currentCourseId, text: txt,
        userName: currentUser.name, userId: currentUser.uid,
        createdAt: serverTimestamp()
    });
    input.value = "";
};
document.getElementById('interactionInput')?.addEventListener('keypress', e => { if (e.key==='Enter') window.handleSend(); });

window.closeCourseModal = () => {
    document.getElementById('courseModal').style.display = 'none';
    document.getElementById('playerFrame').src = '';
    document.body.style.overflow = '';
    if (commentsUnsub) { commentsUnsub(); commentsUnsub = null; }
};

// ─── RESOURCES ──────────────────────────────────────────
window.accessDrive = () => {
    if (currentUser?.isVerified) window.open(BBA_DRIVE_LINK, '_blank');
    else { showToast("🔒 Verify your College ID first!", 'error'); window.openProfile(); window.switchProfileTab('id'); }
};

// ─── LEADERBOARD ────────────────────────────────────────
window.openLeaderboard = () => {
    document.getElementById('leaderboardModal').style.display = 'flex';
    const list = document.getElementById('lbList');
    list.innerHTML = `<p style="text-align:center;padding:20px;color:#999;">Loading…</p>`;
    try {
        const q = query(collection(db,"users"), where("role","==","Student"), orderBy("xp","desc"), limit(10));
        onSnapshot(q, (snap) => {
            list.innerHTML = "";
            let r = 1;
            snap.forEach(d => {
                const u = d.data();
                const rc = r===1?'gold':r===2?'silver':r===3?'bronze':'';
                list.innerHTML += `<div class="lb-item">
                    <div class="lb-rank ${rc}">#${r++}</div>
                    <div class="lb-user">
                        <img class="lb-avatar" src="${u.avatar||`https://api.dicebear.com/7.x/avataaars/svg?seed=${u.name}`}" alt="${u.name}" onerror="this.style.display='none'">
                        <span>${u.name}</span>
                    </div>
                    <div style="font-weight:800;color:#f59e0b;">${u.xp||0} XP</div>
                </div>`;
            });
            if (snap.empty) list.innerHTML = '<p style="text-align:center;color:#999;padding:20px;">No rankings yet.</p>';
        }, () => { list.innerHTML = '<p style="text-align:center;color:#999;padding:20px;">No rankings yet.</p>'; });
    } catch(e) { list.innerHTML = '<p style="text-align:center;color:#999;padding:20px;">No rankings yet.</p>'; }
};

// ─── PROFILE ────────────────────────────────────────────
window.openProfile = () => {
    document.getElementById('profileModal').style.display = 'flex';
    document.getElementById('profileNameDisplay').innerText = currentUser?.name || '';
    document.getElementById('profileCurrentAvatar').src = currentUser?.avatar || '';
    document.getElementById('settingsName').value = currentUser?.name || '';
    document.getElementById('settingsBio').value = currentUser?.bio || '';
    const grid = document.getElementById('avatarGrid');
    grid.innerHTML = "";
    avatarSeeds.forEach(seed => {
        const url = `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;
        grid.innerHTML += `<img src="${url}" class="avatar-option ${currentUser?.avatar===url?'selected':''}" onclick="window.selectAvatar(this,'${url}')">`;
    });
    window.switchProfileTab('edit');
    updateUI();
    loadCertWallet();
};

window.switchProfileTab = (tab) => {
    document.querySelectorAll('.p-tab').forEach(t => t.classList.remove('active'));
    ['tab-edit','tab-certs','tab-id'].forEach(id => { const el = document.getElementById(id); if (el) el.style.display='none'; });
    const map = { edit:['tab-edit',0], certs:['tab-certs',1], id:['tab-id',2] };
    const [elId, idx] = map[tab] || ['tab-edit',0];
    const el = document.getElementById(elId);
    if (el) el.style.display = 'block';
    const tabs = document.querySelectorAll('.p-tab');
    if (tabs[idx]) tabs[idx].classList.add('active');
};

window.selectAvatar = (el, url) => {
    document.querySelectorAll('.avatar-option').forEach(i => i.classList.remove('selected'));
    el.classList.add('selected');
    selectedAvatar = url;
};

window.saveProfile = async () => {
    const newName = document.getElementById('settingsName').value.trim();
    const newBio = document.getElementById('settingsBio').value.trim();
    if (!newName) return showToast("Name cannot be empty.", 'error');
    await updateDoc(doc(db, "users", currentUser.uid), { name: newName, bio: newBio, avatar: selectedAvatar || currentUser.avatar });
    showToast("Profile updated! ✅", 'success');
    document.getElementById('profileModal').style.display = 'none';
};

async function loadCertWallet() {
    const list = document.getElementById('walletList');
    list.innerHTML = "";
    const ids = currentUser.completedCourses || [];
    if (!ids.length) { list.innerHTML = "<p style='color:#999;text-align:center;padding:20px;'>No certificates yet.</p>"; return; }
    for (const id of ids) {
        const cSnap = await getDoc(doc(db, "courses", id));
        if (cSnap.exists()) {
            list.innerHTML += `<div style="padding:12px;border:1px solid #eee;margin-bottom:8px;border-radius:8px;display:flex;align-items:center;gap:10px;">
                <i class="fas fa-certificate" style="color:#fbbf24;font-size:1.4rem;"></i>
                <strong>${cSnap.data().title}</strong></div>`;
        }
    }
}

// FIX 2: KYC Upload — fix "Failed to read file" — use proper async FileReader
window.submitVerification = async () => {
    const fileInput = document.getElementById('idProofInput');
    const file = fileInput?.files?.[0];
    if (!file) return showToast("Please select an image file.", 'error');

    // FIX: Accept any image format, increase size tolerance
    if (!file.type.startsWith('image/')) return showToast("Only image files are accepted (JPG, PNG, WEBP, etc.)", 'error');
    if (file.size > 5 * 1024 * 1024) return showToast("Image must be under 5MB.", 'error');

    const btn = document.querySelector('#uploadSection .btn-upload-id');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading…'; }

    try {
        // FIX: Proper FileReader with Promise — no race condition
        const base64 = await readFileAsBase64(file);

        await updateDoc(doc(db, "users", currentUser.uid), {
            verificationPending: true,
            verificationRejected: false,
            rejectionReason: '',
            idProofUrl: base64,
            submittedAt: serverTimestamp()
        });
        showToast("✅ ID submitted! Admin will review shortly.", 'success');
        document.getElementById('uploadSection').style.display = 'none';
        document.getElementById('pendingMsg').style.display = 'block';
    } catch (err) {
        console.error('KYC Upload error:', err);
        showToast("Upload failed: " + (err.message || 'Unknown error. Try a smaller image.'), 'error');
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-upload"></i> Submit ID'; }
    }
};

// FIX: Reliable base64 reader
function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
        // Try canvas-based compression first for large files
        if (file.size > 1.5 * 1024 * 1024) {
            const img = new Image();
            const url = URL.createObjectURL(file);
            img.onload = () => {
                URL.revokeObjectURL(url);
                const canvas = document.createElement('canvas');
                const maxDim = 1200;
                let w = img.width, h = img.height;
                if (w > maxDim || h > maxDim) {
                    if (w > h) { h = Math.round(h * maxDim / w); w = maxDim; }
                    else { w = Math.round(w * maxDim / h); h = maxDim; }
                }
                canvas.width = w; canvas.height = h;
                canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                resolve(canvas.toDataURL('image/jpeg', 0.8));
            };
            img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image load failed')); };
            img.src = url;
        } else {
            const reader = new FileReader();
            reader.onloadend = () => {
                if (reader.result) resolve(reader.result);
                else reject(new Error('FileReader returned empty result'));
            };
            reader.onerror = () => reject(new Error('FileReader failed to read file'));
            reader.readAsDataURL(file);
        }
    });
}

// ─── SUPPORT SYSTEM ─────────────────────────────────────
window.submitTicket = async () => {
    const subject = document.getElementById('ticketSubject').value.trim();
    const message = document.getElementById('ticketMessage').value.trim();
    const category = document.getElementById('ticketCategory').value;
    if (!subject || !message) return showToast("Please fill subject and message.", 'error');
    if (!currentUser) return;
    const btn = document.getElementById('submitTicketBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting…';
    try {
        await addDoc(collection(db, "support_tickets"), {
            studentId: currentUser.uid,
            studentName: currentUser.name,
            studentEmail: currentUser.email || '',
            subject, message, category,
            status: 'open',
            adminReply: '',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
        showToast("✅ Ticket submitted! Admin will reply soon.", 'success');
        document.getElementById('ticketSubject').value = '';
        document.getElementById('ticketMessage').value = '';
        loadMyTickets();
    } catch (err) {
        showToast("Failed: " + err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Ticket';
    }
};

function loadMyTickets() {
    if (!currentUser) return;
    const container = document.getElementById('myTicketsList');
    if (!container) return;
    container.innerHTML = `<p style="color:#999;text-align:center;padding:20px;">Loading…</p>`;
    try {
        const q = query(collection(db,"support_tickets"), where("studentId","==",currentUser.uid), orderBy("createdAt","desc"));
        onSnapshot(q, (snap) => {
            container.innerHTML = "";
            if (snap.empty) {
                container.innerHTML = `<div style="text-align:center;padding:40px;color:#bbb;">
                    <i class="fas fa-ticket-alt" style="font-size:2.5rem;margin-bottom:12px;display:block;"></i>No tickets yet.</div>`;
                return;
            }
            snap.forEach(d => {
                const t = d.data();
                const statusColor = t.status==='resolved'?'#10b981':t.status==='in-progress'?'#f59e0b':'#6366f1';
                const statusIcon = t.status==='resolved'?'fa-check-circle':t.status==='in-progress'?'fa-clock':'fa-circle-dot';
                const date = t.createdAt ? new Date(t.createdAt.toDate()).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}) : '';
                container.innerHTML += `
                <div class="ticket-card">
                    <div class="ticket-header">
                        <div>
                            <span class="ticket-cat-badge">${t.category||'General'}</span>
                            <h4 style="margin:6px 0 0;font-size:0.98rem;">${t.subject}</h4>
                            <p style="color:#888;font-size:0.8rem;margin-top:3px;">${date}</p>
                        </div>
                        <span style="color:${statusColor};font-weight:700;font-size:0.82rem;display:flex;align-items:center;gap:5px;flex-shrink:0;">
                            <i class="fas ${statusIcon}"></i> ${t.status.charAt(0).toUpperCase()+t.status.slice(1)}
                        </span>
                    </div>
                    <p style="color:#555;font-size:0.88rem;margin:10px 0;line-height:1.5;">${t.message}</p>
                    ${t.adminReply
                        ? `<div class="admin-reply-box"><div style="font-weight:700;color:#4F46E5;font-size:0.82rem;margin-bottom:5px;"><i class="fas fa-shield-alt"></i> Admin Reply</div><p style="margin:0;font-size:0.88rem;color:#374151;line-height:1.5;">${t.adminReply}</p></div>`
                        : `<p style="color:#aaa;font-size:0.82rem;font-style:italic;">Awaiting admin reply…</p>`}
                </div>`;
            });
        }, () => {
            // Fallback without orderBy if index missing
            getDocs(query(collection(db,"support_tickets"), where("studentId","==",currentUser.uid))).then(snap => {
                container.innerHTML = snap.empty
                    ? `<p style="text-align:center;color:#bbb;padding:30px;">No tickets yet.</p>`
                    : '<p style="color:#888;text-align:center;padding:20px;font-size:0.85rem;">Create a Firestore index for support_tickets (studentId + createdAt) for better performance.</p>';
            });
        });
    } catch(e) {
        container.innerHTML = `<p style="color:#888;text-align:center;padding:20px;">Unable to load tickets.</p>`;
    }
}
