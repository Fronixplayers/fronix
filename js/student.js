// js/student.js — FronixLearner Student Dashboard (UPDATED: Resources, Video Player)

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
                loadCourseResources();
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
    const statBadge = document.getElementById('statVerifiedBadge');
    const lockBadge = document.getElementById('bbaLockStatus');

    if (nameEl) nameEl.innerText = currentUser.name || 'Student';
    if (avatarEl) avatarEl.src = currentUser.avatar;
    if (statBadge) statBadge.innerText = currentUser.isVerified ? "Yes ✓" : "No";

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
    const idUploadHeader = document.getElementById('idUploadHeader');

    if (currentUser.isVerified) {
        if (uploadSection) uploadSection.style.display = 'none';
        if (pendingMsg) pendingMsg.style.display = 'none';
        if (verifiedMsg) verifiedMsg.style.display = 'block';
        if (rejectedMsg) rejectedMsg.style.display = 'none';
        if (idUploadHeader) idUploadHeader.style.display = 'none';
    } else if (currentUser.verificationRejected) {
        if (uploadSection) uploadSection.style.display = 'block';
        if (pendingMsg) pendingMsg.style.display = 'none';
        if (verifiedMsg) verifiedMsg.style.display = 'none';
        if (idUploadHeader) idUploadHeader.style.display = 'block';
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
        if (idUploadHeader) idUploadHeader.style.display = 'block';
    } else {
        if (uploadSection) uploadSection.style.display = 'block';
        if (pendingMsg) pendingMsg.style.display = 'none';
        if (verifiedMsg) verifiedMsg.style.display = 'none';
        if (rejectedMsg) rejectedMsg.style.display = 'none';
        if (idUploadHeader) idUploadHeader.style.display = 'block';
    }

    const vStatus = document.getElementById('verificationStatus');
    if (vStatus) vStatus.innerText = currentUser.isVerified
        ? "✓ Verified Student"
        : (currentUser.verificationPending ? "⏳ Pending Verification"
        : (currentUser.verificationRejected ? "❌ Verification Rejected" : "Unverified Student"));

    // Update profile verified badge
    const profileVerifiedBadge = document.getElementById('profileVerifiedBadge');
    if (profileVerifiedBadge) {
        profileVerifiedBadge.innerText = currentUser.isVerified
            ? "✓ Verified"
            : (currentUser.verificationPending ? "⏳ Pending"
            : (currentUser.verificationRejected ? "❌ Rejected" : "Unverified"));
        profileVerifiedBadge.style.background = currentUser.isVerified ? '#dcfce7' : (currentUser.verificationPending ? '#fff7ed' : '#fee2e2');
        profileVerifiedBadge.style.color = currentUser.isVerified ? '#16a34a' : (currentUser.verificationPending ? '#c2410c' : '#ef4444');
    }

    // Stat box verified badge
    const verifiedBadge = document.getElementById('verifiedBadge');
    if (verifiedBadge) verifiedBadge.innerText = currentUser.isVerified ? "Yes ✓" : "No";
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

// ─── COURSE RESOURCES (IMPROVED) ─────────────────────────
function loadCourseResources() {
    const container = document.getElementById('courseResourcesList');
    if (!container) return;
    // Show personal drive link if admin assigned one
    onSnapshot(doc(db, "users", currentUser.uid), (userSnap) => {
        const userData = userSnap.data() || {};
        const personalLink = userData.personalDriveLink || '';
        let personalHtml = '';
        if (personalLink) {
            personalHtml = `
            <div class="resource-card" onclick="window.open('${personalLink}','_blank')" style="margin-bottom:14px;border:2px solid #4285F4;">
                <div style="display:flex;align-items:center;gap:18px;flex:1;min-width:0;">
                    <div class="res-icon" style="background:#e3f2fd;color:#4285F4;flex-shrink:0;">
                        <i class="fab fa-google-drive"></i>
                    </div>
                    <div class="res-info" style="min-width:0;">
                        <h3 style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">📂 Your Personal Resources</h3>
                        <p>Shared by Admin • Click to open your Drive folder</p>
                    </div>
                </div>
                <div class="lock-badge status-unlocked" style="flex-shrink:0;">
                    <i class="fas fa-lock-open"></i> Open
                </div>
            </div>`;
        }
        onSnapshot(query(collection(db, "courses"), orderBy("createdAt", "desc")), (snap) => {
            let coursesHtml = '';
            snap.forEach(d => {
                const c = d.data();
                if (!c.driveLink) return;
                const isVerified = currentUser?.isVerified;
                coursesHtml += `
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
            container.innerHTML = personalHtml + coursesHtml;
            if (!container.innerHTML.trim()) {
                container.innerHTML = `<p style="color:#bbb;text-align:center;padding:30px;font-size:0.9rem;">No course notes added yet by admin.</p>`;
            }
        });
    });
}

window.showVerifyAlert = () => {
    showToast("🔒 Get your College ID verified to access course notes!", 'error');
    window.openProfile();
    window.switchProfileTab('id');
};

// ─── COURSE PLAYER (IMPROVED) ────────────────────────────
let currentCourseDriveLink = '';
let currentCourseTitle = '';

window.openCourse = async (id) => {
    currentCourseId = id;
    document.getElementById('courseModal').classList.add('active');
    document.body.style.overflow = 'hidden';
    const snap = await getDoc(doc(db, "courses", id));
    if (!snap.exists()) return;
    const c = snap.data();
    currentCourseTitle = c.title || '';
    currentPlaylist = (c.playlist && c.playlist.length > 0) ? c.playlist
        : (c.videoId ? [{ title: c.title || 'Lesson 1', videoId: c.videoId }] : []);
    currentCourseDriveLink = c.driveLink || '';
    window.loadVideo(0);
    window.switchTab('lessons');
};

window.loadVideo = (idx) => {
    if (!currentPlaylist || !currentPlaylist[idx]) return;
    const lesson = currentPlaylist[idx];
    // Clean embed URL - no related videos, no branding, no share options
    const embedUrl = `https://www.youtube-nocookie.com/embed/${lesson.videoId}?autoplay=1&rel=0&modestbranding=1&iv_load_policy=3&fs=1&controls=1`;
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
    const map = { lessons:0, drive:1 };
    const tabs = document.querySelectorAll('#courseModal .tab');
    if (tabs[map[t]] !== undefined) tabs[map[t]].classList.add('active');
    if (t === 'drive') {
        const div = document.getElementById('driveAccessMsg');
        if (div) {
            const driveLink = currentCourseDriveLink;
            div.innerHTML = currentUser?.isVerified && driveLink
                ? `<div style="text-align:center;padding:30px;cursor:pointer;" onclick="window.open('${driveLink}','_blank')">
                    <i class="fab fa-google-drive" style="font-size:3rem;color:#4285F4;margin-bottom:12px;display:block;"></i>
                    <strong style="font-size:1.1rem;">Open ${currentCourseTitle} Resources</strong>
                    <p style="color:#888;margin-top:8px;font-size:0.88rem;">Verified Access ✓ — Click to open Google Drive</p>
                   </div>`
                : (currentUser?.isVerified ? 
                    `<div style="text-align:center;padding:30px;">
                    <i class="fas fa-file-alt" style="font-size:3rem;color:#888;margin-bottom:12px;display:block;"></i>
                    <strong>No Resources Yet</strong>
                    <p style="color:#888;margin-top:8px;font-size:0.88rem;">The instructor hasn't added resources for this course yet.</p>
                   </div>`
                    : 
                    `<div style="text-align:center;padding:30px;">
                    <i class="fas fa-lock" style="font-size:3rem;color:#ef4444;margin-bottom:12px;display:block;"></i>
                    <strong>Verification Required</strong>
                    <p style="color:#888;margin-top:8px;font-size:0.88rem;">Upload College ID in Profile → ID Verification.</p>
                    <button onclick="document.getElementById('courseModal').style.display='none';window.openProfile();window.switchProfileTab('id');" class="btn btn-fill" style="margin-top:16px;padding:10px 20px;">
                        <i class="fas fa-id-card"></i> Verify Now
                    </button>
                   </div>`);
        }
    }
};

window.closeCourseModal = () => {
    document.getElementById('courseModal').classList.remove('active');
    document.getElementById('playerFrame').src = '';
    document.body.style.overflow = '';
};

// ─── SUPPORT TICKETS ────────────────────────────────────
function loadMyTickets() {
    const container = document.getElementById('studentTicketList');
    if (!container) return;
    onSnapshot(query(collection(db,"support_tickets"), where("studentUid","==",currentUser.uid), orderBy("createdAt","desc")), snap => {
        container.innerHTML = "";
        if (snap.empty) {
            container.innerHTML = `<div style="text-align:center;padding:40px;color:#999;">
                <i class="fas fa-ticket-alt" style="font-size:2rem;display:block;margin-bottom:10px;"></i>
                No support tickets yet. Create one below.</div>`;
            return;
        }
        snap.forEach(d => {
            const t = d.data();
            const date = t.createdAt ? new Date(t.createdAt.toDate()).toLocaleDateString('en-IN') : '';
            const statusColor = t.status==='resolved'?'#10b981':t.status==='in-progress'?'#f59e0b':'#6366f1';
            container.innerHTML += `
            <div style="background:white;border-radius:12px;padding:14px;margin-bottom:10px;border:1.5px solid #e5e7eb;cursor:pointer;transition:0.2s;border-left:4px solid ${statusColor};"
                 onclick="window.openTicketDetail('${d.id}')">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap;">
                    <div style="flex:1;min-width:0;">
                        <strong>${t.subject}</strong>
                        <p style="color:#888;font-size:0.82rem;margin:4px 0 0;">${t.category||'General'} • ${date}</p>
                    </div>
                    <span style="color:${statusColor};font-size:0.75rem;font-weight:700;white-space:nowrap;">${t.status.toUpperCase()}</span>
                </div>
            </div>`;
        });
    });
}

window.openTicketDetail = async (ticketId) => {
    const snap = await getDoc(doc(db,"support_tickets",ticketId));
    if (!snap.exists()) return;
    const t = snap.data();
    const date = t.createdAt ? new Date(t.createdAt.toDate()).toLocaleString('en-IN') : '';
    document.getElementById('ticketDetailContent').innerHTML = `
    <div style="background:#f8fafc;border-radius:12px;padding:18px;margin-bottom:16px;border:1.5px solid #e5e7eb;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;margin-bottom:12px;">
            <div>
                <span style="background:#eef2ff;color:var(--primary);padding:3px 12px;border-radius:12px;font-size:0.78rem;font-weight:700;">${t.category||'General'}</span>
                <h3 style="margin:8px 0 4px;font-size:1rem;">${t.subject}</h3>
                <p style="color:#888;font-size:0.82rem;margin:0;">${date}</p>
            </div>
            <span style="font-size:0.85rem;font-weight:700;color:#f59e0b;">📋 ${t.status.toUpperCase()}</span>
        </div>
        <div style="background:white;padding:14px;border-radius:8px;border:1px solid #eee;">
            <p style="margin:0;font-size:0.92rem;line-height:1.6;color:#374151;">${t.message}</p>
        </div>
    </div>
    ${t.adminReply ? `
    <div style="background:#e8f5e9;border-radius:12px;padding:16px;margin-bottom:16px;border-left:4px solid #10b981;">
        <div style="font-weight:700;color:#10b981;font-size:0.85rem;margin-bottom:6px;"><i class="fas fa-user-shield"></i> Admin Response</div>
        <p style="margin:0;font-size:0.9rem;line-height:1.5;color:#333;">${t.adminReply}</p>
    </div>` : ''}`;
    document.getElementById('ticketDetailPanel').style.display = 'block';
    document.getElementById('ticketPlaceholder').style.display = 'none';
};

window.createTicket = async (e) => {
    e.preventDefault();
    const subject = document.getElementById('ticketSubject').value.trim();
    const category = document.getElementById('ticketCategory').value;
    const message = document.getElementById('ticketMessage').value.trim();
    
    if (!subject || !message) return showToast("Fill all fields.", 'error');
    
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating…';
    
    try {
        await addDoc(collection(db,"support_tickets"), {
            studentUid: currentUser.uid,
            studentName: currentUser.name,
            studentEmail: currentUser.email,
            subject, category, message,
            status: 'open',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
        showToast("✅ Ticket created! Admin will reply soon.", 'success');
        document.getElementById('ticketForm').reset();
        loadMyTickets();
    } catch(err) {
        showToast("Error: " + err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Ticket';
    }
};

// ─── PROFILE ────────────────────────────────────────────
window.openProfile = () => {
    document.getElementById('profileModal').classList.add('active');
    document.body.style.overflow = 'hidden';
    window.switchProfileTab('general');
};

window.switchProfileTab = (tab) => {
    document.querySelectorAll('.p-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.profile-tab-content').forEach(c => c.style.display = 'none');
    document.querySelector(`[data-tab="${tab}"]`)?.classList.add('active');
    document.getElementById(tab + 'Tab')?.style.display === undefined || (document.getElementById(tab + 'Tab').style.display = 'block');
    const tabs = { general:0, id:1, avatar:2, leaderboard:3 };
    const allTabs = document.querySelectorAll('.profile-tab-content');
    if (allTabs[tabs[tab]]) allTabs[tabs[tab]].style.display = 'block';
};

window.closeProfileModal = () => {
    document.getElementById('profileModal').classList.remove('active');
    document.body.style.overflow = '';
};

// ─── ID VERIFICATION ────────────────────────────────────
window.uploadID = async (e) => {
    const file = document.getElementById('idFileInput').files[0];
    if (!file) return showToast("Select an image.", 'error');
    const reader = new FileReader();
    reader.onload = async (ev) => {
        try {
            await updateDoc(doc(db,"users",currentUser.uid), {
                idImage: ev.target.result,
                verificationPending: true,
                idUploadedAt: serverTimestamp()
            });
            showToast("✅ ID uploaded! Admin will review soon.", 'success');
            document.getElementById('idFileInput').value = '';
        } catch(err) {
            showToast("Error: " + err.message, 'error');
        }
    };
    reader.readAsDataURL(file);
};

// ─── AVATAR SELECTION ────────────────────────────────────
window.selectAvatar = async (seed) => {
    selectedAvatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;
    document.querySelectorAll('.avatar-option').forEach(o => o.classList.remove('selected'));
    event.target.closest('.avatar-option').classList.add('selected');
};

window.saveAvatar = async () => {
    if (!selectedAvatar) return showToast("Select an avatar.", 'error');
    await updateDoc(doc(db,"users",currentUser.uid), { avatar: selectedAvatar });
    currentUser.avatar = selectedAvatar;
    document.getElementById('headerAvatar').src = selectedAvatar;
    showToast("✅ Avatar updated!", 'success');
};

// ─── LEADERBOARD ────────────────────────────────────────
window.openLeaderboard = () => {
    document.getElementById('leaderboardModal').style.display = 'flex';
    const container = document.getElementById('leaderboardContent');
    const leaderboardSection = document.querySelector('[data-tab="leaderboard"]');
    if (leaderboardSection) {
        leaderboardSection.style.display = 'block';
        loadLeaderboard(container);
    }
};

function loadLeaderboard(container) {
    onSnapshot(query(collection(db,"users"), where("role","==","Student"), orderBy("points","desc"), limit(20)), snap => {
        container.innerHTML = "";
        snap.forEach((d, idx) => {
            const u = d.data();
            const ranks = ['🥇','🥈','🥉'];
            const medal = idx < 3 ? ranks[idx] : `${idx+1}.`;
            container.innerHTML += `
            <div class="lb-item">
                <div class="lb-rank">${medal}</div>
                <img class="lb-avatar" src="${u.avatar || 'https://placehold.co/36'}" alt="">
                <div class="lb-user"><strong>${u.name}</strong><br/><small style="color:#888;">${u.email}</small></div>
                <strong style="color:var(--primary);font-size:1.1rem;">${u.points || 0} pts</strong>
            </div>`;
        });
    });
}

window.closeLeaderboardModal = () => {
    document.getElementById('leaderboardModal').style.display = 'none';
};

// ─── RESPONSIVE ─────────────────────────────────────────
window.addEventListener('resize', () => {
    if (window.innerWidth > 900) {
        document.querySelector('aside')?.classList.remove('open');
        document.querySelector('.sidebar-overlay')?.classList.remove('active');
    }
});
