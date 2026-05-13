// js/student.js — FronixLearner (FIXED: dashboard badge, ID tab logic, avatar, support)

import {
    auth, db,
    onAuthStateChanged, signOut,
    collection, addDoc, getDoc, doc, onSnapshot,
    query, orderBy, serverTimestamp, updateDoc,
    where, limit, increment
} from './firebase-config.js';

let currentUser   = null;
let currentCourseId = null;
let currentPlaylist = [];
let currentCourseDriveLink = '';
let currentCourseTitle = '';
let selectedAvatar = '';

// ─── TOAST ──────────────────────────────────────────────
function showToast(msg, type = 'info') {
    const t = document.getElementById('toast');
    const icon = type === 'error' ? 'exclamation-circle'
               : type === 'success' ? 'check-circle'
               : 'info-circle';
    t.innerHTML = `<div class="toast-inner ${type}"><i class="fas fa-${icon}"></i><span>${msg}</span></div>`;
    t.style.display = 'block';
    clearTimeout(t._timer);
    t._timer = setTimeout(() => { t.style.display = 'none'; }, 5000);
}

// ─── AUTH ────────────────────────────────────────────────
onAuthStateChanged(auth, (user) => {
    if (!user) { window.location.href = 'index.html'; return; }

    // Save last login time every session
    updateDoc(doc(db, 'users', user.uid), {
        lastLogin: serverTimestamp()
    }).catch(() => {}); // silent fail if user doc not ready yet

    // Real-time listener so UI updates immediately when admin changes data
    onSnapshot(doc(db, 'users', user.uid), (snap) => {
        if (!snap.exists()) { signOut(auth).then(() => window.location.href = 'index.html'); return; }

        const data = snap.data();
        if (data.isBlocked) {
            showToast('🚫 Your account has been blocked. Contact support.', 'error');
            setTimeout(() => signOut(auth).then(() => window.location.href = 'index.html'), 3000);
            return;
        }

        currentUser = { ...data, uid: user.uid };
        if (!currentUser.avatar)
            currentUser.avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`;

        updateUI();
        loadCourses();
        loadCourseResources();
    });
});

// ─── UPDATE UI ───────────────────────────────────────────
function updateUI() {
    const u = currentUser;

    // General profile elements
    const nameEl   = document.getElementById('welcomeName');
    const avatarEl = document.getElementById('headerAvatar');
    const vStatus  = document.getElementById('verificationStatus');

    if (nameEl)   nameEl.innerText  = u.name   || 'Student';
    if (avatarEl) avatarEl.src      = u.avatar;

    // ── Build status text ──
    let statusText, statusColor, dashText;
    if (u.isVerified) {
        statusText = '✓ Verified Student';
        statusColor = '#10b981';
        dashText = '✓ Verified';
    } else if (u.verificationPending) {
        statusText = '⏳ Pending Verification';
        statusColor = '#f59e0b';
        dashText = 'Pending';
    } else if (u.verificationRejected) {
        statusText = '❌ Verification Rejected';
        statusColor = '#ef4444';
        dashText = 'Rejected';
    } else {
        statusText = 'Unverified';
        statusColor = '#ef4444';
        dashText = 'Not Verified';
    }

    if (vStatus) { vStatus.innerText = statusText; vStatus.style.color = statusColor; }

    // FIX: update dashboard stat badge (separate element from profile badge)
    const dashBadge = document.getElementById('dashVerifiedBadge');
    if (dashBadge) {
        dashBadge.innerText = dashText;
        dashBadge.style.color = statusColor;
        dashBadge.style.fontSize = '0.9rem';
    }

    // Profile → General tab badge
    const profileBadge = document.getElementById('verifiedBadge');
    if (profileBadge) {
        profileBadge.innerText = statusText;
        profileBadge.style.color = statusColor;
    }

    // ── ID Verification tab logic ──
    const uploadSection = document.getElementById('uploadSection');
    const pendingMsg    = document.getElementById('pendingMsg');
    const verifiedMsg   = document.getElementById('verifiedMsg');
    const rejectedMsg   = document.getElementById('rejectedMsg');
    const idHeader      = document.getElementById('idVerifyHeader');

    // Hide all first
    [uploadSection, pendingMsg, verifiedMsg, rejectedMsg].forEach(el => {
        if (el) el.style.display = 'none';
    });

    if (u.isVerified) {
        // FIX: when verified — show ONLY verified message, hide "Upload your ID" heading
        if (verifiedMsg) verifiedMsg.style.display = 'block';
        if (idHeader)    idHeader.style.display     = 'none';

    } else if (u.verificationRejected) {
        if (idHeader)      idHeader.style.display    = 'block';
        if (uploadSection) uploadSection.style.display = 'block';
        if (rejectedMsg) {
            rejectedMsg.style.display = 'block';
            const r = document.getElementById('rejectionReason');
            if (r) r.innerText = u.rejectionReason || 'No specific reason given.';
        }

    } else if (u.verificationPending) {
        if (idHeader)   idHeader.style.display   = 'block';
        if (pendingMsg) pendingMsg.style.display  = 'block';

    } else {
        // Not submitted yet
        if (idHeader)      idHeader.style.display      = 'block';
        if (uploadSection) uploadSection.style.display = 'block';
    }
}

// ─── NAVIGATION ──────────────────────────────────────────
window.switchView = (view, el) => {
    ['viewCourses', 'viewResources', 'viewSupport'].forEach(id => {
        const e = document.getElementById(id);
        if (e) e.style.display = 'none';
    });

    const target = document.getElementById('view' + view.charAt(0).toUpperCase() + view.slice(1));
    if (target) target.style.display = 'block';

    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    if (el) el.classList.add('active');

    if (view === 'support') loadMyTickets();

    // Close sidebar on mobile
    if (window.innerWidth <= 900) {
        document.querySelector('aside')?.classList.remove('open');
        document.querySelector('.sidebar-overlay')?.classList.remove('active');
    }
};

window.toggleSidebar = () => {
    document.querySelector('aside')?.classList.toggle('open');
    document.querySelector('.sidebar-overlay')?.classList.toggle('active');
};

// ─── SESSION TIME TRACKER ────────────────────────────────
let _sessionStart = Date.now();

async function saveSessionTime() {
    if (!currentUser?.uid) return;
    const elapsed = Math.floor((Date.now() - _sessionStart) / 1000); // seconds
    if (elapsed < 5) return; // ignore tiny bounces
    try {
        await updateDoc(doc(db, 'users', currentUser.uid), {
            totalTimeSpent: increment(elapsed)
        });
    } catch (e) { /* silent */ }
}

// Save on tab close / navigation away
window.addEventListener('beforeunload', saveSessionTime);
// Also save on manual logout
window.logout = () => {
    saveSessionTime().finally(() =>
        signOut(auth).then(() => window.location.href = 'index.html')
    );
};

window.addEventListener('resize', () => {
    if (window.innerWidth > 900) {
        document.querySelector('aside')?.classList.remove('open');
        document.querySelector('.sidebar-overlay')?.classList.remove('active');
    }
});

// ─── COURSES ─────────────────────────────────────────────
function loadCourses() {
    onSnapshot(query(collection(db, 'courses'), orderBy('createdAt', 'desc')), (snap) => {
        const g = document.getElementById('courseGrid');
        const countEl = document.getElementById('statCoursesCount');
        if (countEl) countEl.innerText = snap.size;

        g.innerHTML = '';
        if (snap.empty) {
            g.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px;color:#999;">
                <i class="fas fa-book-open" style="font-size:3rem;display:block;margin-bottom:12px;"></i>
                No courses published yet.</div>`;
            return;
        }

        snap.forEach(d => {
            const c = d.data();
            const firstVid = c.playlist?.length ? c.playlist[0].videoId : (c.videoId || '');
            const thumb = c.customThumbnail
                || (firstVid ? `https://img.youtube.com/vi/${firstVid}/hqdefault.jpg`
                    : `https://placehold.co/400x220/4F46E5/white?text=${encodeURIComponent(c.title||'Course')}`);
            const price = c.isFree !== false
                ? `<span class="badge badge-free"><i class="fas fa-lock-open"></i> Free</span>`
                : `<span class="badge badge-paid"><i class="fas fa-lock"></i> Paid</span>`;
            const lessons = c.playlist?.length || 1;

            g.innerHTML += `
            <div class="course-card" onclick="window.openCourse('${d.id}')">
                <div style="position:relative;">
                    <img class="course-thumbnail" src="${thumb}" alt="${c.title}"
                         onerror="this.src='https://placehold.co/400x220/4F46E5/white?text=Course'">
                    <div class="play-hover" style="position:absolute;inset:0;background:rgba(0,0,0,0.28);
                         display:flex;align-items:center;justify-content:center;opacity:0;transition:0.3s;">
                        <i class="fas fa-play-circle" style="font-size:3rem;color:white;"></i>
                    </div>
                </div>
                <div class="course-badge">${price}</div>
                <div class="course-info">
                    <h4>${c.title}</h4>
                    <p>${c.instructor || ''} • ${lessons} lesson${lessons !== 1 ? 's' : ''}</p>
                </div>
            </div>`;
        });

        // Hover effect
        document.querySelectorAll('.course-card').forEach(card => {
            const h = card.querySelector('.play-hover');
            card.addEventListener('mouseenter', () => { if (h) h.style.opacity = '1'; });
            card.addEventListener('mouseleave', () => { if (h) h.style.opacity = '0'; });
        });
    });
}

// ─── RESOURCES HUB ───────────────────────────────────────
function loadCourseResources() {
    const container = document.getElementById('courseResourcesList');
    if (!container) return;

    onSnapshot(query(collection(db, 'courses'), orderBy('createdAt', 'desc')), (snap) => {
        container.innerHTML = '';
        let found = 0;

        snap.forEach(d => {
            const c = d.data();
            if (!c.driveLink) return;
            found++;
            const isVer = currentUser?.isVerified;
            const onclick = isVer
                ? `window.open('${c.driveLink}','_blank')`
                : `window.showVerifyAlert()`;

            container.innerHTML += `
            <div class="resource-card" onclick="${onclick}">
                <div style="display:flex;align-items:center;gap:16px;flex:1;min-width:0;">
                    <div class="res-icon" style="background:#e8f5e9;color:#10b981;">
                        <i class="fab fa-google-drive"></i>
                    </div>
                    <div class="res-info" style="min-width:0;">
                        <h3 style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${c.title} — Notes</h3>
                        <p>${c.category || 'Course'} • ${isVer ? 'Click to open Drive' : 'Verified Students Only'}</p>
                    </div>
                </div>
                <div class="lock-badge ${isVer ? 'status-unlocked' : 'status-locked'}">
                    <i class="fas fa-${isVer ? 'lock-open' : 'lock'}"></i>
                    ${isVer ? 'Open' : 'Locked'}
                </div>
            </div>`;
        });

        if (!found) {
            container.innerHTML = `<p style="color:#bbb;text-align:center;padding:40px;font-size:0.9rem;">
                No course notes have been added by admin yet.</p>`;
        }
    });
}

window.showVerifyAlert = () => {
    showToast('🔒 Verify your College ID to access course notes!', 'error');
    window.openProfile();
    window.switchProfileTab('id');
};

// ─── COURSE PLAYER ───────────────────────────────────────
window.openCourse = async (id) => {
    currentCourseId = id;
    // FIX: show modal using flex
    const modal = document.getElementById('courseModal');
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    const snap = await getDoc(doc(db, 'courses', id));
    if (!snap.exists()) return;
    const c = snap.data();
    currentCourseTitle     = c.title || '';
    currentCourseDriveLink = c.driveLink || '';
    currentPlaylist = c.playlist?.length
        ? c.playlist
        : (c.videoId ? [{ title: c.title || 'Lesson 1', videoId: c.videoId }] : []);

    window.loadVideo(0);
    window.switchTab('lessons');
};

window.loadVideo = (idx) => {
    if (!currentPlaylist[idx]) return;
    const lesson = currentPlaylist[idx];

    // Clean embed — no related videos, no share, no branding
    const embedUrl = `https://www.youtube-nocookie.com/embed/${lesson.videoId}` +
        `?autoplay=1&rel=0&modestbranding=1&iv_load_policy=3&fs=1&controls=1`;

    document.getElementById('playerFrame').src = embedUrl;

    const titleEl = document.getElementById('currentLessonTitle');
    if (titleEl) titleEl.innerText = lesson.title || `Lesson ${idx + 1}`;

    // Render playlist
    const container = document.getElementById('playlistContainer');
    if (container) {
        container.innerHTML = currentPlaylist.map((l, i) => `
            <div class="lesson-item ${i === idx ? 'active' : ''}" onclick="window.loadVideo(${i})">
                <div class="lesson-num">${i + 1}</div>
                <div style="flex:1;min-width:0;line-height:1.3;">${l.title || 'Lesson ' + (i+1)}</div>
                ${i === idx ? '<i class="fas fa-play" style="color:var(--primary);font-size:0.72rem;flex-shrink:0;"></i>' : ''}
            </div>`).join('');
    }
};

window.switchTab = (t) => {
    document.querySelectorAll('#courseModal .tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('#courseModal .tab').forEach(el => el.classList.remove('active'));

    const tabEl = document.getElementById(t + 'Tab');
    if (tabEl) tabEl.classList.add('active');

    const tabBtns = document.querySelectorAll('#courseModal .tab');
    const map = { lessons: 0, drive: 1 };
    if (tabBtns[map[t]]) tabBtns[map[t]].classList.add('active');

    if (t === 'drive') {
        const div = document.getElementById('driveAccessMsg');
        if (!div) return;
        const isVer  = currentUser?.isVerified;
        const link   = currentCourseDriveLink;

        if (isVer && link) {
            div.innerHTML = `
            <div style="text-align:center;padding:30px;cursor:pointer;" onclick="window.open('${link}','_blank')">
                <i class="fab fa-google-drive" style="font-size:3rem;color:#4285F4;display:block;margin-bottom:12px;"></i>
                <strong style="font-size:1rem;">Open ${currentCourseTitle} Notes</strong>
                <p style="color:#888;margin-top:8px;font-size:0.85rem;">Verified Access ✓ — Click to open Google Drive</p>
            </div>`;
        } else if (isVer) {
            div.innerHTML = `
            <div style="text-align:center;padding:30px;">
                <i class="fas fa-file-alt" style="font-size:3rem;color:#ccc;display:block;margin-bottom:12px;"></i>
                <strong>No Notes Added Yet</strong>
                <p style="color:#888;margin-top:8px;font-size:0.85rem;">Admin hasn't added resources for this course.</p>
            </div>`;
        } else {
            div.innerHTML = `
            <div style="text-align:center;padding:30px;">
                <i class="fas fa-lock" style="font-size:3rem;color:#ef4444;display:block;margin-bottom:12px;"></i>
                <strong>Verification Required</strong>
                <p style="color:#888;margin-top:8px;font-size:0.85rem;">Upload your College ID in Profile → ID Verify.</p>
                <button onclick="document.getElementById('courseModal').style.display='none';
                                 document.body.style.overflow='';
                                 window.openProfile();window.switchProfileTab('id');"
                    class="btn" style="margin-top:14px;padding:9px 20px;">
                    <i class="fas fa-id-card"></i> Verify Now
                </button>
            </div>`;
        }
    }
};

window.closeCourseModal = () => {
    document.getElementById('courseModal').style.display = 'none';
    document.getElementById('playerFrame').src = '';
    document.body.style.overflow = '';
};

// ─── SUPPORT TICKETS ─────────────────────────────────────
function loadMyTickets() {
    const container = document.getElementById('studentTicketList');
    if (!container || !currentUser) return;

    // FIX: Use only where clause, then sort in JavaScript to avoid needing composite index
    onSnapshot(
        query(collection(db, 'support_tickets'),
              where('studentUid', '==', currentUser.uid)),
        snap => {
            container.innerHTML = '';
            if (snap.empty) {
                container.innerHTML = `<p style="color:#bbb;text-align:center;padding:20px;font-size:0.9rem;">
                    No tickets yet. Create one above.</p>`;
                return;
            }
            
            // Sort tickets by createdAt in JavaScript
            const tickets = [];
            snap.forEach(d => {
                const t = d.data();
                tickets.push({ id: d.id, ...t });
            });
            
            // Sort by createdAt descending (newest first)
            tickets.sort((a, b) => {
                if (!a.createdAt) return 1;
                if (!b.createdAt) return -1;
                return b.createdAt.toMillis() - a.createdAt.toMillis();
            });
            
            // Render sorted tickets
            tickets.forEach(ticket => {
                const date = ticket.createdAt
                    ? new Date(ticket.createdAt.toDate()).toLocaleDateString('en-IN') : '';
                const sc = ticket.status === 'resolved'    ? '#10b981'
                         : ticket.status === 'in-progress' ? '#f59e0b' : '#6366f1';
                container.innerHTML += `
                <div style="background:#f8fafc;border-radius:10px;padding:13px 14px;margin-bottom:8px;
                            border:1.5px solid #e5e7eb;cursor:pointer;border-left:4px solid ${sc};"
                     onclick="window.openTicketDetail('${ticket.id}')">
                    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
                        <div style="flex:1;min-width:0;">
                            <strong style="font-size:0.9rem;">${ticket.subject}</strong>
                            <p style="color:#999;font-size:0.8rem;margin:3px 0 0;">
                                ${ticket.category || 'General'} • ${date}
                            </p>
                        </div>
                        <span style="color:${sc};font-size:0.72rem;font-weight:700;white-space:nowrap;flex-shrink:0;">
                            ${ticket.status.toUpperCase()}
                        </span>
                    </div>
                </div>`;
            });
        }
    );
}

window.openTicketDetail = async (ticketId) => {
    const snap = await getDoc(doc(db, 'support_tickets', ticketId));
    if (!snap.exists()) return;
    const t = snap.data();
    const date = t.createdAt ? new Date(t.createdAt.toDate()).toLocaleString('en-IN') : '';

    document.getElementById('ticketDetailContent').innerHTML = `
    <div style="background:#f8fafc;border-radius:10px;padding:16px;margin-bottom:12px;border:1.5px solid #e5e7eb;">
        <span style="background:#eef2ff;color:var(--primary);padding:2px 10px;border-radius:10px;
                     font-size:0.76rem;font-weight:700;">${t.category || 'General'}</span>
        <h3 style="margin:8px 0 4px;font-size:0.97rem;">${t.subject}</h3>
        <p style="color:#999;font-size:0.8rem;margin:0 0 10px;">${date}</p>
        <div style="background:white;padding:12px;border-radius:8px;border:1px solid #eee;">
            <p style="margin:0;font-size:0.9rem;line-height:1.6;color:#374151;">${t.message}</p>
        </div>
    </div>
    ${t.adminReply ? `
    <div style="background:#e8f5e9;border-radius:10px;padding:14px;border-left:4px solid #10b981;">
        <p style="color:#10b981;font-weight:700;font-size:0.82rem;margin:0 0 6px;">
            <i class="fas fa-user-shield"></i> Admin Response
        </p>
        <p style="margin:0;font-size:0.9rem;line-height:1.5;color:#333;">${t.adminReply}</p>
    </div>` : `
    <p style="color:#bbb;font-size:0.85rem;text-align:center;padding:12px 0;">
        No admin reply yet. Check back later.
    </p>`}`;

    document.getElementById('ticketDetailPanel').style.display = 'block';
};

window.createTicket = async (e) => {
    e.preventDefault();
    const subject  = document.getElementById('ticketSubject').value.trim();
    const category = document.getElementById('ticketCategory').value;
    const message  = document.getElementById('ticketMessage').value.trim();

    if (!subject || !message) { showToast('Please fill all fields.', 'error'); return; }

    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending…';

    try {
        await addDoc(collection(db, 'support_tickets'), {
            studentUid:   currentUser.uid,
            studentName:  currentUser.name,
            studentEmail: currentUser.email,
            subject, category, message,
            status:    'open',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
        showToast('✅ Ticket submitted! Admin will reply soon.', 'success');
        document.getElementById('ticketForm').reset();
        loadMyTickets();
    } catch (err) {
        showToast('Error: ' + err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Ticket';
    }
};

// ─── PROFILE ─────────────────────────────────────────────
window.openProfile = () => {
    document.getElementById('profileModal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
    window.switchProfileTab('general');
};

window.closeProfileModal = () => {
    document.getElementById('profileModal').style.display = 'none';
    document.body.style.overflow = '';
};

window.switchProfileTab = (tab) => {
    document.querySelectorAll('.p-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.profile-tab-content').forEach(c => c.style.display = 'none');

    const btn = document.querySelector(`[data-tab="${tab}"]`);
    if (btn) btn.classList.add('active');

    const el = document.getElementById(tab + 'Tab');
    if (el) el.style.display = 'block';

    // Load leaderboard when tab opened
    if (tab === 'leaderboard') loadLeaderboard();
};

// ─── ID UPLOAD (with compression — supports 3–5 MB images) ──────────────────
window.uploadID = async () => {
    const file = document.getElementById('idFileInput').files[0];
    if (!file) { showToast('Please select an image file.', 'error'); return; }

    // Validate: only images, max 5 MB original size
    if (!file.type.startsWith('image/')) {
        showToast('Only image files are allowed (JPG, PNG, etc.)', 'error'); return;
    }
    const MAX_MB = 5;
    if (file.size > MAX_MB * 1024 * 1024) {
        showToast(`File too large. Maximum allowed size is ${MAX_MB} MB.`, 'error'); return;
    }

    const btn = document.querySelector('#uploadSection button[type="button"]');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Compressing & Uploading…'; }

    try {
        // Compress image in-browser → keep Firestore doc under ~900 KB
        const compressedBase64 = await compressImageToBase64(file, 900);

        await updateDoc(doc(db, 'users', currentUser.uid), {
            idImage:              compressedBase64,
            verificationPending:  true,
            verificationRejected: false,
            idUploadedAt:         serverTimestamp()
        });
        showToast('✅ ID uploaded! Admin will review soon.', 'success');
        document.getElementById('idFileInput').value = '';
    } catch (err) {
        showToast('Upload failed: ' + err.message, 'error');
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Upload ID'; }
    }
};

/**
 * Compress an image File to a base64 JPEG string whose decoded size
 * stays under `targetKB` kilobytes. Shrinks dimensions if > 1600 px
 * and tries quality steps 0.85 → 0.1 until the target is met.
 */
function compressImageToBase64(file, targetKB = 900) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('Could not read file.'));
        reader.onload = (ev) => {
            const img = new Image();
            img.onerror = () => reject(new Error('Could not load image.'));
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let { width, height } = img;

                // Scale down if largest dimension > 1600 px
                const MAX_PX = 1600;
                if (width > MAX_PX || height > MAX_PX) {
                    if (width >= height) { height = Math.round(height * MAX_PX / width); width = MAX_PX; }
                    else                  { width  = Math.round(width  * MAX_PX / height); height = MAX_PX; }
                }
                canvas.width  = width;
                canvas.height = height;
                canvas.getContext('2d').drawImage(img, 0, 0, width, height);

                // Try decreasing JPEG quality until decoded size ≤ targetKB
                const qualities = [0.85, 0.75, 0.65, 0.5, 0.35, 0.2, 0.1];
                let result = canvas.toDataURL('image/jpeg', 0.85);
                for (const q of qualities) {
                    result = canvas.toDataURL('image/jpeg', q);
                    // base64 length → approx byte size: (len * 3/4)
                    if ((result.length * 3 / 4) <= targetKB * 1024) break;
                }
                resolve(result);
            };
            img.src = ev.target.result;
        };
        reader.readAsDataURL(file);
    });
}

// ─── AVATAR ──────────────────────────────────────────────
// FIX: accept imgEl directly, no reliance on event.target
window.selectAvatar = (seed, imgEl) => {
    selectedAvatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;
    document.querySelectorAll('.avatar-option').forEach(o => o.classList.remove('selected'));
    if (imgEl) imgEl.classList.add('selected');
};

window.saveAvatar = async () => {
    if (!selectedAvatar) { showToast('Please select an avatar first.', 'error'); return; }
    await updateDoc(doc(db, 'users', currentUser.uid), { avatar: selectedAvatar });
    currentUser.avatar = selectedAvatar;
    const el = document.getElementById('headerAvatar');
    if (el) el.src = selectedAvatar;
    showToast('✅ Avatar saved!', 'success');
};

// ─── LEADERBOARD ─────────────────────────────────────────
function loadLeaderboard() {
    const container = document.getElementById('leaderboardContent');
    if (!container) return;

    onSnapshot(
        query(collection(db, 'users'),
              where('role', '==', 'Student'),
              orderBy('points', 'desc'),
              limit(20)),
        snap => {
            container.innerHTML = '';
            snap.forEach((d, idx) => {
                const u = d.data();
                const medals = ['🥇', '🥈', '🥉'];
                const rank = idx < 3 ? medals[idx] : `${idx + 1}.`;
                container.innerHTML += `
                <div class="lb-item">
                    <div class="lb-rank">${rank}</div>
                    <img class="lb-avatar" src="${u.avatar || 'https://placehold.co/34'}" alt="">
                    <div class="lb-user">
                        <strong style="font-size:0.88rem;">${u.name}</strong>
                        <div style="color:#aaa;font-size:0.76rem;">${u.email}</div>
                    </div>
                    <strong style="color:var(--primary);font-size:0.95rem;">${u.points || 0} pts</strong>
                </div>`;
            });
        }
    );
}