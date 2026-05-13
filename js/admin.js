// js/admin.js — FronixLearner Admin (Drive Links Manager + all fixes)

import {
    auth, db,
    onAuthStateChanged, signOut,
    collection, addDoc, getDoc, doc, onSnapshot,
    query, updateDoc, where, orderBy, deleteDoc, serverTimestamp
} from './firebase-config.js';

let tempPlaylist   = [];
let editingCourseId = null;
let draggedIndex   = null;

// ─── TOAST ──────────────────────────────────────────────
function showToast(msg, type = 'info') {
    const t = document.getElementById('toast');
    const icon = type === 'error' ? 'exclamation-circle'
               : type === 'success' ? 'check-circle'
               : 'info-circle';
    t.innerHTML = `<div class="toast-inner ${type}">
        <i class="fas fa-${icon}"></i><span>${msg}</span></div>`;
    t.style.display = 'block';
    clearTimeout(t._timer);
    t._timer = setTimeout(() => { t.style.display = 'none'; }, 4500);
}

// ─── AUTH ────────────────────────────────────────────────
onAuthStateChanged(auth, async (user) => {
    if (!user) { window.location.href = 'index.html'; return; }
    const snap = await getDoc(doc(db, 'users', user.uid));
    if (snap.exists() && snap.data().role === 'Admin') {
        initAdmin();
    } else {
        showToast('Admin access only.', 'error');
        setTimeout(() => window.location.href = 'index.html', 1500);
    }
});

function initAdmin() {
    loadStats();
    loadCategories();
    loadCourses();
    loadDriveLinks();   // NEW
    loadStudents();
    loadVerifications();
    loadSupportTickets();
    renderPlaylist();
    updatePricingUI();
}

// ─── NAV ─────────────────────────────────────────────────
window.switchTab = (tab, el) => {
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    if (el) el.classList.add('active');
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    const sec = document.getElementById(tab + 'Section');
    if (sec) sec.classList.add('active');
    if (window.innerWidth <= 900) {
        document.querySelector('aside')?.classList.remove('active');
        document.querySelector('.sidebar-overlay')?.classList.remove('active');
    }
};

window.toggleSidebar = () => {
    document.querySelector('aside')?.classList.toggle('active');
    document.querySelector('.sidebar-overlay')?.classList.toggle('active');
};

window.logout = () => signOut(auth).then(() => window.location.href = 'index.html');

// ─── STATS ───────────────────────────────────────────────
function loadStats() {
    onSnapshot(query(collection(db, 'users'), where('role', '==', 'Student')), snap => {
        document.getElementById('statStudents').innerText = snap.size;
    });
    onSnapshot(collection(db, 'courses'), snap => {
        document.getElementById('statCourses').innerText = snap.size;
    });
    onSnapshot(query(collection(db, 'support_tickets'), where('status', '==', 'open')), snap => {
        document.getElementById('statChats').innerText = snap.size;
        const badge = document.getElementById('chatUnreadBadge');
        if (badge) {
            badge.style.display = snap.size > 0 ? 'inline' : 'none';
            badge.innerText = snap.size;
        }
    });
}

// ─── CATEGORIES ──────────────────────────────────────────
async function loadCategories() {
    const catRef = collection(db, 'categories');
    onSnapshot(query(catRef, orderBy('name')), async snap => {
        const sel = document.getElementById('cCat');
        if (!sel) return;
        sel.innerHTML = '';
        if (snap.empty) {
            const defaults = ['Web Development','Python & Data','Design','Marketing','Business','BBA'];
            for (const name of defaults) await addDoc(catRef, { name });
            return;
        }
        snap.forEach(d => {
            const opt = document.createElement('option');
            opt.value = d.data().name;
            opt.textContent = d.data().name;
            opt.setAttribute('data-id', d.id);
            sel.appendChild(opt);
        });
    });
}

window.addCategory = async () => {
    const name = document.getElementById('newCatInput').value.trim();
    if (!name) { showToast('Enter a category name.', 'error'); return; }
    await addDoc(collection(db, 'categories'), { name });
    document.getElementById('newCatInput').value = '';
    showToast('Category added!', 'success');
};

window.deleteCategory = async () => {
    const sel = document.getElementById('cCat');
    const opt = sel.options[sel.selectedIndex];
    if (!opt) return;
    if (confirm(`Delete category "${opt.value}"?`)) {
        await deleteDoc(doc(db, 'categories', opt.getAttribute('data-id')));
        showToast('Category deleted.', 'success');
    }
};

// ─── YOUTUBE PARSER ──────────────────────────────────────
function extractVideoId(url) {
    url = url.trim();
    const patterns = [
        /youtu\.be\/([a-zA-Z0-9_-]{11})/,
        /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
        /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
        /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
        /^([a-zA-Z0-9_-]{11})$/
    ];
    for (const p of patterns) { const m = url.match(p); if (m) return m[1]; }
    return null;
}

window.previewLesson = () => {
    const url     = document.getElementById('lVid').value.trim();
    const vid     = extractVideoId(url);
    const preview = document.getElementById('ytPreview');
    if (!preview) return;
    if (vid) {
        preview.src = `https://img.youtube.com/vi/${vid}/mqdefault.jpg`;
        preview.style.display = 'block';
    } else {
        preview.style.display = 'none';
    }
};

// ─── PLAYLIST (DRAG TO REORDER) ──────────────────────────
window.addLesson = () => {
    const title  = document.getElementById('lTitle').value.trim();
    const rawUrl = document.getElementById('lVid').value.trim();
    const videoId = extractVideoId(rawUrl);
    if (!title || !rawUrl) { showToast('Fill lesson title and YouTube link.', 'error'); return; }
    if (!videoId)           { showToast('Invalid YouTube link.', 'error'); return; }
    tempPlaylist.push({ title, videoId });
    renderPlaylist();
    document.getElementById('lTitle').value = '';
    document.getElementById('lVid').value   = '';
    const p = document.getElementById('ytPreview');
    if (p) p.style.display = 'none';
    showToast(`Lesson "${title}" added! ✅`, 'success');
};

function renderPlaylist() {
    const l = document.getElementById('lessonList');
    if (!l) return;
    if (tempPlaylist.length === 0) {
        l.innerHTML = `<p style="color:#aaa;font-size:0.83rem;text-align:center;padding:10px;">
            No lessons added yet</p>`;
        return;
    }
    l.innerHTML = tempPlaylist.map((lesson, idx) => `
        <div class="lesson-list-item" draggable="true"
             ondragstart="window.onDragStart(${idx})"
             ondragover="window.onDragOver(event)"
             ondrop="window.onDrop(${idx})"
             style="cursor:grab;user-select:none;opacity:${draggedIndex === idx ? 0.4 : 1};">
            <div style="display:flex;align-items:center;gap:10px;flex:1;min-width:0;">
                <i class="fas fa-grip-vertical" style="color:#ccc;flex-shrink:0;"></i>
                <div style="min-width:0;">
                    <div style="font-weight:700;font-size:0.87rem;">${idx+1}. ${lesson.title}</div>
                    <div style="font-size:0.74rem;color:#aaa;">ID: ${lesson.videoId}</div>
                </div>
            </div>
            <button type="button" class="del-btn" onclick="window.deleteLesson(${idx})"
                    title="Remove">
                <i class="fas fa-trash"></i>
            </button>
        </div>`).join('');
}

window.onDragStart = (idx) => { draggedIndex = idx; };
window.onDragOver  = (e)   => { e.preventDefault(); };
window.onDrop      = (idx) => {
    if (draggedIndex === null || draggedIndex === idx) return;
    const [lesson] = tempPlaylist.splice(draggedIndex, 1);
    tempPlaylist.splice(idx, 0, lesson);
    draggedIndex = null;
    renderPlaylist();
    showToast('Lessons reordered! ✅', 'success');
};

window.deleteLesson = (idx) => {
    tempPlaylist.splice(idx, 1);
    renderPlaylist();
};

// ─── THUMBNAIL ───────────────────────────────────────────
window.previewThumbnail = () => {
    const input   = document.getElementById('cThumb');
    const preview = document.getElementById('thumbPreview');
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = (e) => { preview.src = e.target.result; preview.style.display = 'block'; };
        reader.readAsDataURL(input.files[0]);
    }
};

async function readFileAsBase64(file) {
    return new Promise(resolve => {
        const r = new FileReader();
        r.onload = e => resolve(e.target.result);
        r.readAsDataURL(file);
    });
}

// ─── PRICING ─────────────────────────────────────────────
window.updatePricingUI = () => {
    const free = document.getElementById('priceFree').checked;
    document.getElementById('optFree').classList.toggle('selected',  free);
    document.getElementById('optPaid').classList.toggle('selected', !free);
};

// ─── PUBLISH / EDIT COURSE ───────────────────────────────
window.publishCourse = async (e) => {
    e.preventDefault();
    const title       = document.getElementById('cTitle').value.trim();
    const instructor  = document.getElementById('cInst').value.trim();
    const description = document.getElementById('cDesc').value.trim();
    const category    = document.getElementById('cCat').value;
    const driveLink   = document.getElementById('cDriveLink').value.trim();
    const isFree      = document.getElementById('priceFree').checked;
    const thumbFile   = document.getElementById('cThumb').files[0];

    if (!title || !instructor || tempPlaylist.length === 0) {
        showToast('Fill title, instructor and add at least 1 lesson.', 'error'); return;
    }

    const btn = document.querySelector('#courseForm button[type="submit"]');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Publishing…';

    try {
        const customThumbnail = thumbFile ? await readFileAsBase64(thumbFile) : null;
        const data = {
            title, instructor, description, category, driveLink, isFree,
            playlist: tempPlaylist,
            ...(customThumbnail && { customThumbnail })
        };

        if (editingCourseId) {
            await updateDoc(doc(db, 'courses', editingCourseId), data);
            showToast('✅ Course updated!', 'success');
            window.cancelEdit();
        } else {
            data.createdAt = serverTimestamp();
            await addDoc(collection(db, 'courses'), data);
            showToast('🚀 Course published live!', 'success');
        }

        document.getElementById('courseForm').reset();
        tempPlaylist = [];
        renderPlaylist();
        document.getElementById('thumbPreview').style.display = 'none';
        updatePricingUI();
    } catch (err) {
        showToast('Error: ' + err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-rocket"></i> Publish Course — Goes Live Immediately';
    }
};

window.cancelEdit = () => {
    editingCourseId = null;
    document.getElementById('courseForm').reset();
    tempPlaylist = [];
    renderPlaylist();
    updatePricingUI();
    document.getElementById('formModeLabel').innerHTML =
        '<i class="fas fa-plus-circle" style="color:var(--primary);"></i> Publish New Course via YouTube';
    document.getElementById('cancelEditBtn').style.display = 'none';
    document.getElementById('thumbPreview').style.display = 'none';
};

// ─── LOAD COURSES (table) ────────────────────────────────
function loadCourses() {
    const tbody = document.getElementById('courseTable').querySelector('tbody');
    onSnapshot(query(collection(db, 'courses'), orderBy('createdAt', 'desc')), snap => {
        tbody.innerHTML = '';
        if (snap.empty) {
            tbody.innerHTML = '<tr><td colspan="7" class="no-data">No courses yet.</td></tr>';
            return;
        }
        snap.forEach(d => {
            const c = d.data();
            const n = c.playlist?.length || 1;
            const driveBtn = c.driveLink
                ? `<a href="${c.driveLink}" target="_blank" class="action-btn"
                      style="background:#e3f2fd;color:#1976d2;">
                      <i class="fab fa-google-drive"></i> Open</a>`
                : '<span style="color:#ccc;">—</span>';

            tbody.innerHTML += `
            <tr>
                <td><strong>${c.title}</strong></td>
                <td>${c.instructor}</td>
                <td>${c.category || '—'}</td>
                <td>
                    <span class="badge ${c.isFree !== false ? 'badge-free' : 'badge-paid'}">
                        ${c.isFree !== false ? 'Free' : 'Paid'}
                    </span>
                </td>
                <td>${n}</td>
                <td>${driveBtn}</td>
                <td style="white-space:nowrap;">
                    <button class="action-btn" style="background:#f0f9ff;color:#0284c7;"
                            onclick="window.editCourse('${d.id}')">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="action-btn btn-trash" onclick="window.deleteCourse('${d.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>`;
        });
    });
}

window.editCourse = async (id) => {
    const snap = await getDoc(doc(db, 'courses', id));
    if (!snap.exists()) return;
    const c = snap.data();
    editingCourseId = id;
    document.getElementById('cTitle').value     = c.title       || '';
    document.getElementById('cInst').value      = c.instructor  || '';
    document.getElementById('cDesc').value      = c.description || '';
    document.getElementById('cCat').value       = c.category    || '';
    document.getElementById('cDriveLink').value = c.driveLink   || '';
    document.getElementById('priceFree').checked = c.isFree !== false;
    document.getElementById('pricePaid').checked = c.isFree === false;
    tempPlaylist = c.playlist || [];
    renderPlaylist();
    updatePricingUI();
    document.getElementById('formModeLabel').innerHTML =
        '<i class="fas fa-edit" style="color:var(--primary);"></i> Edit Course';
    document.getElementById('cancelEditBtn').style.display = 'inline-flex';
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast('Course loaded for editing.', 'success');

    // Switch to courses section
    window.switchTab('courses', document.querySelector('.nav-item'));
};

window.deleteCourse = async (id) => {
    if (confirm('Delete this course? This cannot be undone.')) {
        await deleteDoc(doc(db, 'courses', id));
        showToast('Course deleted.', 'success');
    }
};

// ─── DRIVE LINKS MANAGER (NEW) ───────────────────────────
// Loads all courses and lets admin set/update driveLink independently
function loadDriveLinks() {
    const container = document.getElementById('driveLinksList');
    if (!container) return;

    onSnapshot(query(collection(db, 'courses'), orderBy('createdAt', 'desc')), snap => {
        container.innerHTML = '';
        if (snap.empty) {
            container.innerHTML = `<p style="color:#bbb;padding:20px;text-align:center;">
                No courses yet. Publish a course first.</p>`;
            return;
        }
        snap.forEach(d => {
            const c = d.data();
            const inputId  = `dl_${d.id}`;
            const statusId = `dls_${d.id}`;
            container.innerHTML += `
            <div class="drive-link-row">
                <div class="course-name">
                    <i class="fas fa-book" style="color:var(--primary);margin-right:6px;"></i>
                    ${c.title}
                    <div style="font-size:0.78rem;color:#aaa;font-weight:400;margin-top:2px;">
                        ${c.category || '—'} • ${c.playlist?.length || 1} lessons
                    </div>
                </div>
                <input type="url" id="${inputId}" placeholder="https://drive.google.com/drive/folders/..."
                       value="${c.driveLink || ''}"
                       style="flex:2;min-width:200px;margin-bottom:0;">
                <button class="save-btn" onclick="window.saveDriveLink('${d.id}','${inputId}','${statusId}')">
                    <i class="fas fa-save"></i> Save
                </button>
                ${c.driveLink
                    ? `<a href="${c.driveLink}" target="_blank" class="open-btn">
                           <i class="fab fa-google-drive"></i> Open
                       </a>`
                    : ''}
                <span id="${statusId}" style="font-size:0.78rem;font-weight:700;"></span>
            </div>`;
        });
    });
}

window.saveDriveLink = async (courseId, inputId, statusId) => {
    const link   = document.getElementById(inputId)?.value.trim() || '';
    const status = document.getElementById(statusId);
    try {
        await updateDoc(doc(db, 'courses', courseId), { driveLink: link });
        if (status) { status.innerText = '✓ Saved'; status.style.color = '#10b981'; }
        showToast('Drive link saved!', 'success');
        // Reload drive links so "Open" button appears/disappears
        loadDriveLinks();
    } catch (err) {
        if (status) { status.innerText = '✗ Failed'; status.style.color = '#ef4444'; }
        showToast('Save failed: ' + err.message, 'error');
    }
};

// ─── STUDENTS ────────────────────────────────────────────
// ─── STUDENTS (card grid) ────────────────────────────────
let _allStudents = []; // cached for search filter

function loadStudents() {
    const grid = document.getElementById('studentCardGrid');
    if (!grid) return;

    onSnapshot(query(collection(db, 'users'), where('role', '==', 'Student')), snap => {
        _allStudents = [];
        snap.forEach(d => _allStudents.push({ uid: d.id, ...d.data() }));

        // Sort: newest joined first
        _allStudents.sort((a, b) => {
            const ta = a.createdAt ? a.createdAt.toMillis() : 0;
            const tb = b.createdAt ? b.createdAt.toMillis() : 0;
            return tb - ta;
        });

        const badge = document.getElementById('studentCountBadge');
        if (badge) badge.innerText = _allStudents.length;

        renderStudentCards(_allStudents);
    });
}

function renderStudentCards(list) {
    const grid = document.getElementById('studentCardGrid');
    if (!grid) return;

    if (!list.length) {
        grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:50px;color:#bbb;">
            <i class="fas fa-users" style="font-size:2.5rem;display:block;margin-bottom:12px;opacity:0.3;"></i>
            No students found.</div>`;
        return;
    }

    grid.innerHTML = list.map(u => {
        // ── Verification status ──
        const isVer  = u.isVerified;
        const isPend = u.verificationPending;
        const isRej  = u.verificationRejected;
        const verColor = isVer ? '#10b981' : isPend ? '#f59e0b' : isRej ? '#ef4444' : '#94a3b8';
        const verBg    = isVer ? '#dcfce7' : isPend ? '#fef9c3' : isRej ? '#fee2e2' : '#f1f5f9';
        const verTxt   = isVer ? '✓ Verified' : isPend ? '⏳ Pending' : isRej ? '✗ Rejected' : 'Unverified';

        // ── Joined date ──
        let joinedTxt = '—';
        if (u.createdAt) {
            joinedTxt = u.createdAt.toDate().toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
        }

        // ── Last login ──
        let lastLoginTxt = '—';
        let lastLoginFull = '';
        if (u.lastLogin) {
            const d2   = u.lastLogin.toDate();
            const now  = new Date();
            const diff = Math.floor((now - d2) / 1000);
            if (diff < 60)             lastLoginTxt = 'Just now';
            else if (diff < 3600)      lastLoginTxt = Math.floor(diff/60) + 'm ago';
            else if (diff < 86400)     lastLoginTxt = Math.floor(diff/3600) + 'h ago';
            else if (diff < 86400*7)   lastLoginTxt = Math.floor(diff/86400) + 'd ago';
            else                       lastLoginTxt = d2.toLocaleDateString('en-IN');
            lastLoginFull = d2.toLocaleString('en-IN', { dateStyle:'medium', timeStyle:'short' });
        }

        // ── Time spent on website ──
        let timeSpentTxt = '—';
        if (u.totalTimeSpent && u.totalTimeSpent > 0) {
            const secs = u.totalTimeSpent;
            if (secs < 60)         timeSpentTxt = secs + 's';
            else if (secs < 3600)  timeSpentTxt = Math.floor(secs/60) + 'm ' + (secs%60) + 's';
            else {
                const h = Math.floor(secs/3600);
                const m = Math.floor((secs%3600)/60);
                timeSpentTxt = h + 'h ' + m + 'm';
            }
        }

        // ── Avatar ──
        const avatar = u.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.uid}`;

        // ── Block button ──
        const blockBtn = u.isBlocked
            ? `<button class="action-btn btn-unblock" onclick="window.toggleBlockUser('${u.uid}',false)" style="flex:1;justify-content:center;">
                   <i class="fas fa-lock-open"></i> Unblock
               </button>`
            : `<button class="action-btn btn-block" onclick="window.toggleBlockUser('${u.uid}',true)" style="flex:1;justify-content:center;">
                   <i class="fas fa-ban"></i> Block
               </button>`;

        // ── Optional fields from signup ──
        const phone    = u.phone    ? `<div class="sinfo-row"><i class="fas fa-phone"></i><span>${u.phone}</span></div>` : '';
        const college  = u.college  ? `<div class="sinfo-row"><i class="fas fa-university"></i><span>${u.college}</span></div>` : '';
        const course   = u.course   ? `<div class="sinfo-row"><i class="fas fa-book"></i><span>${u.course}</span></div>` : '';
        const location = u.location ? `<div class="sinfo-row"><i class="fas fa-map-marker-alt"></i><span>${u.location}</span></div>` : '';

        const blockedBanner = u.isBlocked
            ? `<div style="background:#fee2e2;color:#ef4444;font-size:0.76rem;font-weight:700;
                           padding:4px 10px;border-radius:6px;margin-bottom:10px;text-align:center;">
                   🚫 Account Blocked
               </div>` : '';

        return `
        <div class="student-card" data-name="${(u.name||'').toLowerCase()}" data-email="${(u.email||'').toLowerCase()}">
            ${blockedBanner}
            <!-- Header: avatar + name + email + verify badge -->
            <div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:14px;">
                <img src="${avatar}" alt=""
                     style="width:48px;height:48px;border-radius:50%;object-fit:cover;
                            border:2px solid ${verColor};flex-shrink:0;"
                     onerror="this.src='https://api.dicebear.com/7.x/avataaars/svg?seed=${u.uid}'">
                <div style="flex:1;min-width:0;">
                    <div style="font-weight:800;font-size:0.97rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                        ${u.name || 'Unknown'}
                    </div>
                    <div style="color:#888;font-size:0.79rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-bottom:5px;">
                        ${u.email || '—'}
                    </div>
                    <span style="background:${verBg};color:${verColor};font-size:0.72rem;font-weight:700;
                                 padding:2px 9px;border-radius:20px;">${verTxt}</span>
                </div>
            </div>

            <!-- Signup details -->
            <div style="background:#f8fafc;border-radius:10px;padding:11px 13px;margin-bottom:12px;
                        border:1px solid #e5e7eb;font-size:0.82rem;">
                <div class="sinfo-row"><i class="fas fa-calendar-alt"></i><span>Joined: <strong>${joinedTxt}</strong></span></div>
                ${phone}${college}${course}${location}
                ${(!phone && !college && !course && !location)
                    ? '<div style="color:#ccc;font-size:0.79rem;font-style:italic;">No extra details at signup</div>' : ''}
            </div>

            <!-- Activity stats -->
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px;">
                <div style="background:#f0f9ff;border-radius:8px;padding:9px 11px;border:1px solid #bae6fd;">
                    <div style="font-size:0.69rem;color:#0284c7;font-weight:700;margin-bottom:2px;text-transform:uppercase;letter-spacing:0.03em;">Last Login</div>
                    <div style="font-weight:800;font-size:0.9rem;color:#0369a1;" title="${lastLoginFull}">${lastLoginTxt}</div>
                </div>
                <div style="background:#f0fdf4;border-radius:8px;padding:9px 11px;border:1px solid #bbf7d0;">
                    <div style="font-size:0.69rem;color:#16a34a;font-weight:700;margin-bottom:2px;text-transform:uppercase;letter-spacing:0.03em;">Time on Site</div>
                    <div style="font-weight:800;font-size:0.9rem;color:#15803d;">${timeSpentTxt}</div>
                </div>
            </div>

            <!-- Actions -->
            <div style="display:flex;gap:8px;">${blockBtn}</div>
        </div>`;
    }).join('');
}

window.filterStudents = (q) => {
    const term = q.toLowerCase().trim();
    if (!term) { renderStudentCards(_allStudents); return; }
    renderStudentCards(_allStudents.filter(u =>
        (u.name  || '').toLowerCase().includes(term) ||
        (u.email || '').toLowerCase().includes(term) ||
        (u.college || '').toLowerCase().includes(term) ||
        (u.phone  || '').toLowerCase().includes(term)
    ));
};

window.toggleBlockUser = async (uid, block) => {
    await updateDoc(doc(db, 'users', uid), { isBlocked: block });
    showToast(block ? '✓ Student blocked.' : '✓ Student unblocked.', 'success');
};rderBy, deleteDoc, serverTimestamp
} from './firebase-config.js';

let tempPlaylist   = [];
let editingCourseId = null;
let draggedIndex   = null;

// ─── TOAST ──────────────────────────────────────────────
function showToast(msg, type = 'info') {
    const t = document.getElementById('toast');
    const icon = type === 'error' ? 'exclamation-circle'
               : type === 'success' ? 'check-circle'
               : 'info-circle';
    t.innerHTML = `<div class="toast-inner ${type}">
        <i class="fas fa-${icon}"></i><span>${msg}</span></div>`;
    t.style.display = 'block';
    clearTimeout(t._timer);
    t._timer = setTimeout(() => { t.style.display = 'none'; }, 4500);
}

// ─── AUTH ────────────────────────────────────────────────
onAuthStateChanged(auth, async (user) => {
    if (!user) { window.location.href = 'index.html'; return; }
    const snap = await getDoc(doc(db, 'users', user.uid));
    if (snap.exists() && snap.data().role === 'Admin') {
        initAdmin();
    } else {
        showToast('Admin access only.', 'error');
        setTimeout(() => window.location.href = 'index.html', 1500);
    }
});

function initAdmin() {
    loadStats();
    loadCategories();
    loadCourses();
    loadDriveLinks();   // NEW
    loadStudents();
    loadVerifications();
    loadSupportTickets();
    renderPlaylist();
    updatePricingUI();
}

// ─── NAV ─────────────────────────────────────────────────
window.switchTab = (tab, el) => {
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    if (el) el.classList.add('active');
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    const sec = document.getElementById(tab + 'Section');
    if (sec) sec.classList.add('active');
    if (window.innerWidth <= 900) {
        document.querySelector('aside')?.classList.remove('active');
        document.querySelector('.sidebar-overlay')?.classList.remove('active');
    }
};

window.toggleSidebar = () => {
    document.querySelector('aside')?.classList.toggle('active');
    document.querySelector('.sidebar-overlay')?.classList.toggle('active');
};

window.logout = () => signOut(auth).then(() => window.location.href = 'index.html');

// ─── STATS ───────────────────────────────────────────────
function loadStats() {
    onSnapshot(query(collection(db, 'users'), where('role', '==', 'Student')), snap => {
        document.getElementById('statStudents').innerText = snap.size;
    });
    onSnapshot(collection(db, 'courses'), snap => {
        document.getElementById('statCourses').innerText = snap.size;
    });
    onSnapshot(query(collection(db, 'support_tickets'), where('status', '==', 'open')), snap => {
        document.getElementById('statChats').innerText = snap.size;
        const badge = document.getElementById('chatUnreadBadge');
        if (badge) {
            badge.style.display = snap.size > 0 ? 'inline' : 'none';
            badge.innerText = snap.size;
        }
    });
}

// ─── CATEGORIES ──────────────────────────────────────────
async function loadCategories() {
    const catRef = collection(db, 'categories');
    onSnapshot(query(catRef, orderBy('name')), async snap => {
        const sel = document.getElementById('cCat');
        if (!sel) return;
        sel.innerHTML = '';
        if (snap.empty) {
            const defaults = ['Web Development','Python & Data','Design','Marketing','Business','BBA'];
            for (const name of defaults) await addDoc(catRef, { name });
            return;
        }
        snap.forEach(d => {
            const opt = document.createElement('option');
            opt.value = d.data().name;
            opt.textContent = d.data().name;
            opt.setAttribute('data-id', d.id);
            sel.appendChild(opt);
        });
    });
}

window.addCategory = async () => {
    const name = document.getElementById('newCatInput').value.trim();
    if (!name) { showToast('Enter a category name.', 'error'); return; }
    await addDoc(collection(db, 'categories'), { name });
    document.getElementById('newCatInput').value = '';
    showToast('Category added!', 'success');
};

window.deleteCategory = async () => {
    const sel = document.getElementById('cCat');
    const opt = sel.options[sel.selectedIndex];
    if (!opt) return;
    if (confirm(`Delete category "${opt.value}"?`)) {
        await deleteDoc(doc(db, 'categories', opt.getAttribute('data-id')));
        showToast('Category deleted.', 'success');
    }
};

// ─── YOUTUBE PARSER ──────────────────────────────────────
function extractVideoId(url) {
    url = url.trim();
    const patterns = [
        /youtu\.be\/([a-zA-Z0-9_-]{11})/,
        /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
        /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
        /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
        /^([a-zA-Z0-9_-]{11})$/
    ];
    for (const p of patterns) { const m = url.match(p); if (m) return m[1]; }
    return null;
}

window.previewLesson = () => {
    const url     = document.getElementById('lVid').value.trim();
    const vid     = extractVideoId(url);
    const preview = document.getElementById('ytPreview');
    if (!preview) return;
    if (vid) {
        preview.src = `https://img.youtube.com/vi/${vid}/mqdefault.jpg`;
        preview.style.display = 'block';
    } else {
        preview.style.display = 'none';
    }
};

// ─── PLAYLIST (DRAG TO REORDER) ──────────────────────────
window.addLesson = () => {
    const title  = document.getElementById('lTitle').value.trim();
    const rawUrl = document.getElementById('lVid').value.trim();
    const videoId = extractVideoId(rawUrl);
    if (!title || !rawUrl) { showToast('Fill lesson title and YouTube link.', 'error'); return; }
    if (!videoId)           { showToast('Invalid YouTube link.', 'error'); return; }
    tempPlaylist.push({ title, videoId });
    renderPlaylist();
    document.getElementById('lTitle').value = '';
    document.getElementById('lVid').value   = '';
    const p = document.getElementById('ytPreview');
    if (p) p.style.display = 'none';
    showToast(`Lesson "${title}" added! ✅`, 'success');
};

function renderPlaylist() {
    const l = document.getElementById('lessonList');
    if (!l) return;
    if (tempPlaylist.length === 0) {
        l.innerHTML = `<p style="color:#aaa;font-size:0.83rem;text-align:center;padding:10px;">
            No lessons added yet</p>`;
        return;
    }
    l.innerHTML = tempPlaylist.map((lesson, idx) => `
        <div class="lesson-list-item" draggable="true"
             ondragstart="window.onDragStart(${idx})"
             ondragover="window.onDragOver(event)"
             ondrop="window.onDrop(${idx})"
             style="cursor:grab;user-select:none;opacity:${draggedIndex === idx ? 0.4 : 1};">
            <div style="display:flex;align-items:center;gap:10px;flex:1;min-width:0;">
                <i class="fas fa-grip-vertical" style="color:#ccc;flex-shrink:0;"></i>
                <div style="min-width:0;">
                    <div style="font-weight:700;font-size:0.87rem;">${idx+1}. ${lesson.title}</div>
                    <div style="font-size:0.74rem;color:#aaa;">ID: ${lesson.videoId}</div>
                </div>
            </div>
            <button type="button" class="del-btn" onclick="window.deleteLesson(${idx})"
                    title="Remove">
                <i class="fas fa-trash"></i>
            </button>
        </div>`).join('');
}

window.onDragStart = (idx) => { draggedIndex = idx; };
window.onDragOver  = (e)   => { e.preventDefault(); };
window.onDrop      = (idx) => {
    if (draggedIndex === null || draggedIndex === idx) return;
    const [lesson] = tempPlaylist.splice(draggedIndex, 1);
    tempPlaylist.splice(idx, 0, lesson);
    draggedIndex = null;
    renderPlaylist();
    showToast('Lessons reordered! ✅', 'success');
};

window.deleteLesson = (idx) => {
    tempPlaylist.splice(idx, 1);
    renderPlaylist();
};

// ─── THUMBNAIL ───────────────────────────────────────────
window.previewThumbnail = () => {
    const input   = document.getElementById('cThumb');
    const preview = document.getElementById('thumbPreview');
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = (e) => { preview.src = e.target.result; preview.style.display = 'block'; };
        reader.readAsDataURL(input.files[0]);
    }
};

async function readFileAsBase64(file) {
    return new Promise(resolve => {
        const r = new FileReader();
        r.onload = e => resolve(e.target.result);
        r.readAsDataURL(file);
    });
}

// ─── PRICING ─────────────────────────────────────────────
window.updatePricingUI = () => {
    const free = document.getElementById('priceFree').checked;
    document.getElementById('optFree').classList.toggle('selected',  free);
    document.getElementById('optPaid').classList.toggle('selected', !free);
};

// ─── PUBLISH / EDIT COURSE ───────────────────────────────
window.publishCourse = async (e) => {
    e.preventDefault();
    const title       = document.getElementById('cTitle').value.trim();
    const instructor  = document.getElementById('cInst').value.trim();
    const description = document.getElementById('cDesc').value.trim();
    const category    = document.getElementById('cCat').value;
    const driveLink   = document.getElementById('cDriveLink').value.trim();
    const isFree      = document.getElementById('priceFree').checked;
    const thumbFile   = document.getElementById('cThumb').files[0];

    if (!title || !instructor || tempPlaylist.length === 0) {
        showToast('Fill title, instructor and add at least 1 lesson.', 'error'); return;
    }

    const btn = document.querySelector('#courseForm button[type="submit"]');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Publishing…';

    try {
        const customThumbnail = thumbFile ? await readFileAsBase64(thumbFile) : null;
        const data = {
            title, instructor, description, category, driveLink, isFree,
            playlist: tempPlaylist,
            ...(customThumbnail && { customThumbnail })
        };

        if (editingCourseId) {
            await updateDoc(doc(db, 'courses', editingCourseId), data);
            showToast('✅ Course updated!', 'success');
            window.cancelEdit();
        } else {
            data.createdAt = serverTimestamp();
            await addDoc(collection(db, 'courses'), data);
            showToast('🚀 Course published live!', 'success');
        }

        document.getElementById('courseForm').reset();
        tempPlaylist = [];
        renderPlaylist();
        document.getElementById('thumbPreview').style.display = 'none';
        updatePricingUI();
    } catch (err) {
        showToast('Error: ' + err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-rocket"></i> Publish Course — Goes Live Immediately';
    }
};

window.cancelEdit = () => {
    editingCourseId = null;
    document.getElementById('courseForm').reset();
    tempPlaylist = [];
    renderPlaylist();
    updatePricingUI();
    document.getElementById('formModeLabel').innerHTML =
        '<i class="fas fa-plus-circle" style="color:var(--primary);"></i> Publish New Course via YouTube';
    document.getElementById('cancelEditBtn').style.display = 'none';
    document.getElementById('thumbPreview').style.display = 'none';
};

// ─── LOAD COURSES (table) ────────────────────────────────
function loadCourses() {
    const tbody = document.getElementById('courseTable').querySelector('tbody');
    onSnapshot(query(collection(db, 'courses'), orderBy('createdAt', 'desc')), snap => {
        tbody.innerHTML = '';
        if (snap.empty) {
            tbody.innerHTML = '<tr><td colspan="7" class="no-data">No courses yet.</td></tr>';
            return;
        }
        snap.forEach(d => {
            const c = d.data();
            const n = c.playlist?.length || 1;
            const driveBtn = c.driveLink
                ? `<a href="${c.driveLink}" target="_blank" class="action-btn"
                      style="background:#e3f2fd;color:#1976d2;">
                      <i class="fab fa-google-drive"></i> Open</a>`
                : '<span style="color:#ccc;">—</span>';

            tbody.innerHTML += `
            <tr>
                <td><strong>${c.title}</strong></td>
                <td>${c.instructor}</td>
                <td>${c.category || '—'}</td>
                <td>
                    <span class="badge ${c.isFree !== false ? 'badge-free' : 'badge-paid'}">
                        ${c.isFree !== false ? 'Free' : 'Paid'}
                    </span>
                </td>
                <td>${n}</td>
                <td>${driveBtn}</td>
                <td style="white-space:nowrap;">
                    <button class="action-btn" style="background:#f0f9ff;color:#0284c7;"
                            onclick="window.editCourse('${d.id}')">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="action-btn btn-trash" onclick="window.deleteCourse('${d.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>`;
        });
    });
}

window.editCourse = async (id) => {
    const snap = await getDoc(doc(db, 'courses', id));
    if (!snap.exists()) return;
    const c = snap.data();
    editingCourseId = id;
    document.getElementById('cTitle').value     = c.title       || '';
    document.getElementById('cInst').value      = c.instructor  || '';
    document.getElementById('cDesc').value      = c.description || '';
    document.getElementById('cCat').value       = c.category    || '';
    document.getElementById('cDriveLink').value = c.driveLink   || '';
    document.getElementById('priceFree').checked = c.isFree !== false;
    document.getElementById('pricePaid').checked = c.isFree === false;
    tempPlaylist = c.playlist || [];
    renderPlaylist();
    updatePricingUI();
    document.getElementById('formModeLabel').innerHTML =
        '<i class="fas fa-edit" style="color:var(--primary);"></i> Edit Course';
    document.getElementById('cancelEditBtn').style.display = 'inline-flex';
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast('Course loaded for editing.', 'success');

    // Switch to courses section
    window.switchTab('courses', document.querySelector('.nav-item'));
};

window.deleteCourse = async (id) => {
    if (confirm('Delete this course? This cannot be undone.')) {
        await deleteDoc(doc(db, 'courses', id));
        showToast('Course deleted.', 'success');
    }
};

// ─── DRIVE LINKS MANAGER (NEW) ───────────────────────────
// Loads all courses and lets admin set/update driveLink independently
function loadDriveLinks() {
    const container = document.getElementById('driveLinksList');
    if (!container) return;

    onSnapshot(query(collection(db, 'courses'), orderBy('createdAt', 'desc')), snap => {
        container.innerHTML = '';
        if (snap.empty) {
            container.innerHTML = `<p style="color:#bbb;padding:20px;text-align:center;">
                No courses yet. Publish a course first.</p>`;
            return;
        }
        snap.forEach(d => {
            const c = d.data();
            const inputId  = `dl_${d.id}`;
            const statusId = `dls_${d.id}`;
            container.innerHTML += `
            <div class="drive-link-row">
                <div class="course-name">
                    <i class="fas fa-book" style="color:var(--primary);margin-right:6px;"></i>
                    ${c.title}
                    <div style="font-size:0.78rem;color:#aaa;font-weight:400;margin-top:2px;">
                        ${c.category || '—'} • ${c.playlist?.length || 1} lessons
                    </div>
                </div>
                <input type="url" id="${inputId}" placeholder="https://drive.google.com/drive/folders/..."
                       value="${c.driveLink || ''}"
                       style="flex:2;min-width:200px;margin-bottom:0;">
                <button class="save-btn" onclick="window.saveDriveLink('${d.id}','${inputId}','${statusId}')">
                    <i class="fas fa-save"></i> Save
                </button>
                ${c.driveLink
                    ? `<a href="${c.driveLink}" target="_blank" class="open-btn">
                           <i class="fab fa-google-drive"></i> Open
                       </a>`
                    : ''}
                <span id="${statusId}" style="font-size:0.78rem;font-weight:700;"></span>
            </div>`;
        });
    });
}

window.saveDriveLink = async (courseId, inputId, statusId) => {
    const link   = document.getElementById(inputId)?.value.trim() || '';
    const status = document.getElementById(statusId);
    try {
        await updateDoc(doc(db, 'courses', courseId), { driveLink: link });
        if (status) { status.innerText = '✓ Saved'; status.style.color = '#10b981'; }
        showToast('Drive link saved!', 'success');
        // Reload drive links so "Open" button appears/disappears
        loadDriveLinks();
    } catch (err) {
        if (status) { status.innerText = '✗ Failed'; status.style.color = '#ef4444'; }
        showToast('Save failed: ' + err.message, 'error');
    }
};

// ─── STUDENTS ────────────────────────────────────────────
function loadStudents() {
    const tbody = document.getElementById('studentTable').querySelector('tbody');
    onSnapshot(query(collection(db, 'users'), where('role', '==', 'Student')), snap => {
        tbody.innerHTML = '';
        if (snap.empty) {
            tbody.innerHTML = '<tr><td colspan="6" class="no-data">No students yet.</td></tr>';
            return;
        }
        snap.forEach(d => {
            const u = d.data();
            const sc   = u.isVerified ? '#10b981' : u.verificationPending ? '#f59e0b' : '#ef4444';
            const stxt = u.isVerified ? '✓ Verified' : u.verificationPending ? '⏳ Pending' : '❌ Unverified';

            // Format last login
            let lastLoginTxt = '<span style="color:#ccc;">—</span>';
            if (u.lastLogin) {
                const d2  = u.lastLogin.toDate();
                const now  = new Date();
                const diff = Math.floor((now - d2) / 1000); // seconds
                let ago;
                if (diff < 60)              ago = 'Just now';
                else if (diff < 3600)       ago = `${Math.floor(diff/60)}m ago`;
                else if (diff < 86400)      ago = `${Math.floor(diff/3600)}h ago`;
                else if (diff < 86400 * 7)  ago = `${Math.floor(diff/86400)}d ago`;
                else                        ago = d2.toLocaleDateString('en-IN');
                const fullDate = d2.toLocaleString('en-IN', { dateStyle:'medium', timeStyle:'short' });
                lastLoginTxt = `<span title="${fullDate}" style="font-size:0.82rem;color:#555;cursor:default;">${ago}</span>`;
            }

            tbody.innerHTML += `
            <tr>
                <td>${u.name || '—'}</td>
                <td>${u.email}</td>
                <td>${u.location || '—'}</td>
                <td><span style="color:${sc};font-weight:700;">${stxt}</span></td>
                <td>${lastLoginTxt}</td>
                <td>
                    ${u.isBlocked
                        ? `<button class="action-btn btn-unblock"
                               onclick="window.toggleBlockUser('${d.id}',false)">
                               <i class="fas fa-lock-open"></i> Unblock</button>`
                        : `<button class="action-btn btn-block"
                               onclick="window.toggleBlockUser('${d.id}',true)">
                               <i class="fas fa-ban"></i> Block</button>`}
                </td>
            </tr>`;
        });
    });
}

window.toggleBlockUser = async (uid, block) => {
    await updateDoc(doc(db, 'users', uid), { isBlocked: block });
    showToast(block ? '✓ Student blocked.' : '✓ Student unblocked.', 'success');
};

// ─── VERIFICATIONS ───────────────────────────────────────
function loadVerifications() {
    const tbody = document.getElementById('verificationTable').querySelector('tbody');
    onSnapshot(query(collection(db, 'users'), where('verificationPending', '==', true)), snap => {
        tbody.innerHTML = '';
        if (snap.empty) {
            tbody.innerHTML = '<tr><td colspan="3" class="no-data">No pending verifications.</td></tr>';
            return;
        }
        snap.forEach(d => {
            const u    = d.data();
            const date = u.idUploadedAt
                ? new Date(u.idUploadedAt.toDate()).toLocaleDateString('en-IN') : '—';
            tbody.innerHTML += `
            <tr>
                <td>
                    <strong>${u.name}</strong><br>
                    <small style="color:#888;">${u.email}</small>
                    ${u.idImage
                        ? `<br><button type="button" class="action-btn"
                                style="background:#eef2ff;color:var(--primary);margin-top:6px;font-size:0.74rem;"
                                onclick="window.viewIDImage('${u.idImage}')">
                                <i class="fas fa-image"></i> View ID</button>`
                        : ''}
                </td>
                <td>${date}</td>
                <td style="white-space:nowrap;">
                    <button type="button" class="action-btn btn-approve"
                            onclick="window.verifyUser('${d.id}',true)">
                        <i class="fas fa-check"></i> Approve
                    </button>
                    <button type="button" class="action-btn btn-reject"
                            onclick="window.promptReject('${d.id}')" style="margin-top:4px;">
                        <i class="fas fa-times"></i> Reject
                    </button>
                </td>
            </tr>`;
        });
    });
}

window.viewIDImage = (url) => {
    const lb = document.createElement('div');
    lb.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.82);display:flex;' +
                       'align-items:center;justify-content:center;z-index:10000;';
    lb.innerHTML = `<div style="position:relative;max-width:90vw;max-height:90vh;">
        <img src="${url}" style="max-width:90vw;max-height:85vh;border-radius:12px;object-fit:contain;">
        <button onclick="this.closest('div').parentElement.remove()"
                style="position:absolute;top:-14px;right:-14px;background:white;border:none;
                       border-radius:50%;width:32px;height:32px;font-size:1rem;cursor:pointer;
                       box-shadow:0 2px 8px rgba(0,0,0,0.3);">×</button>
    </div>`;
    lb.addEventListener('click', e => { if (e.target === lb) lb.remove(); });
    document.body.appendChild(lb);
};

window.verifyUser = async (uid, approved) => {
    await updateDoc(doc(db, 'users', uid), {
        isVerified:          approved,
        verificationPending: false,
        verificationRejected: false,
        rejectionReason:     ''
    });
    showToast(approved ? '✅ Student verified!' : '✅ Done.', 'success');
};

// ─── REJECT WITH REASON ──────────────────────────────────
window.promptReject = (uid) => {
    document.getElementById('rejectModal')?.remove();
    const modal = document.createElement('div');
    modal.id = 'rejectModal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:9999;' +
                          'display:flex;align-items:center;justify-content:center;padding:20px;';
    modal.innerHTML = `
    <div style="background:white;border-radius:16px;padding:28px;width:420px;max-width:95vw;
                box-shadow:0 20px 50px rgba(0,0,0,0.2);">
        <h3 style="margin:0 0 6px;font-weight:800;">
            <i class="fas fa-times-circle" style="color:#ef4444;"></i> Reject Verification
        </h3>
        <p style="color:#888;font-size:0.87rem;margin-bottom:14px;">
            This reason will be shown to the student so they know how to fix it.
        </p>
        <label style="font-size:0.8rem;font-weight:700;color:#666;display:block;margin-bottom:6px;">
            Rejection Reason *
        </label>
        <textarea id="rejectReasonInput" rows="3"
            placeholder="e.g. ID is blurry — please upload a clearer photo. Or: Name on ID doesn't match."
            style="width:100%;padding:10px 14px;border:1.5px solid #e5e7eb;border-radius:10px;
                   outline:none;font-family:inherit;font-size:0.9rem;resize:vertical;
                   margin-bottom:14px;box-sizing:border-box;"></textarea>
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
            <button onclick="window.submitReject('${uid}')"
                    class="action-btn btn-reject"
                    style="flex:1;justify-content:center;padding:10px;min-width:120px;">
                <i class="fas fa-paper-plane"></i> Send Rejection
            </button>
            <button onclick="document.getElementById('rejectModal').remove()"
                    style="background:#f3f4f6;color:#888;border:none;border-radius:8px;
                           padding:10px 18px;cursor:pointer;font-weight:700;font-family:inherit;">
                Cancel
            </button>
        </div>
    </div>`;
    document.body.appendChild(modal);
    document.getElementById('rejectReasonInput').focus();
};

window.submitReject = async (uid) => {
    const reason = document.getElementById('rejectReasonInput').value.trim();
    if (!reason) { showToast('Please provide a reason.', 'error'); return; }
    await updateDoc(doc(db, 'users', uid), {
        isVerified:           false,
        verificationPending:  false,
        verificationRejected: true,
        rejectionReason:      reason
    });
    document.getElementById('rejectModal')?.remove();
    showToast('❌ Rejected — reason sent to student.', 'success');
};

// ─── SUPPORT TICKETS ─────────────────────────────────────
function loadSupportTickets() {
    const container = document.getElementById('ticketStudentList');
    if (!container) return;
    
    // FIX: Load all tickets, then sort in JavaScript to avoid index issues
    onSnapshot(collection(db, 'support_tickets'), snap => {
        container.innerHTML = '';
        if (snap.empty) {
            container.innerHTML = `<p style="color:#bbb;text-align:center;padding:30px;font-size:0.88rem;">
                No support tickets yet.</p>`;
            return;
        }
        
        // Collect and sort tickets
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
            const sc = ticket.status === 'resolved'    ? '#10b981'
                     : ticket.status === 'in-progress' ? '#f59e0b' : '#6366f1';
            const date = ticket.createdAt
                ? new Date(ticket.createdAt.toDate()).toLocaleDateString('en-IN') : '';
            const div = document.createElement('div');
            div.className = 'ticket-admin-card';
            div.innerHTML = `
            <div style="background:white;border-radius:12px;padding:14px 16px;margin-bottom:10px;
                        border:1.5px solid #e5e7eb;cursor:pointer;transition:0.15s;
                        border-left:4px solid ${sc};"
                 onclick="window.openTicket('${ticket.id}')">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
                    <div style="flex:1;min-width:0;">
                        <div style="display:flex;align-items:center;gap:7px;margin-bottom:4px;flex-wrap:wrap;">
                            <span style="background:#eef2ff;color:var(--primary);padding:2px 9px;
                                         border-radius:10px;font-size:0.74rem;font-weight:700;">
                                ${ticket.category || 'General'}
                            </span>
                            <span style="color:${sc};font-size:0.76rem;font-weight:700;">
                                ${ticket.status.toUpperCase()}
                            </span>
                        </div>
                        <strong style="font-size:0.92rem;">${ticket.subject}</strong>
                        <div style="color:#aaa;font-size:0.78rem;margin-top:2px;">
                            ${ticket.studentName} • ${date}
                        </div>
                    </div>
                    <i class="fas fa-chevron-right" style="color:#ccc;flex-shrink:0;margin-top:4px;"></i>
                </div>
                <p style="color:#666;font-size:0.83rem;margin:8px 0 0;line-height:1.5;
                           overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;
                           -webkit-box-orient:vertical;">${ticket.message}</p>
            </div>`;
            container.appendChild(div);
        });
    });
}

window.openTicket = async (ticketId) => {
    const snap = await getDoc(doc(db, 'support_tickets', ticketId));
    if (!snap.exists()) return;
    const t    = snap.data();
    const date = t.createdAt ? new Date(t.createdAt.toDate()).toLocaleString('en-IN') : '';

    document.getElementById('ticketPlaceholder').style.display = 'none';
    const panel = document.getElementById('ticketDetailPanel');
    panel.style.display = 'flex';

    document.getElementById('ticketDetailContent').innerHTML = `
    <div style="background:#f8fafc;border-radius:12px;padding:18px;margin-bottom:14px;
                border:1.5px solid #e5e7eb;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;
                    flex-wrap:wrap;gap:10px;margin-bottom:12px;">
            <div>
                <span style="background:#eef2ff;color:var(--primary);padding:3px 12px;
                             border-radius:12px;font-size:0.77rem;font-weight:700;">
                    ${t.category || 'General'}
                </span>
                <h3 style="margin:8px 0 4px;font-size:1rem;">${t.subject}</h3>
                <p style="color:#aaa;font-size:0.8rem;margin:0;">
                    By ${t.studentName} (${t.studentEmail || ''}) • ${date}
                </p>
            </div>
            <select onchange="window.updateTicketStatus('${ticketId}', this.value)"
                    style="padding:6px 12px;border-radius:8px;border:1.5px solid #e5e7eb;
                           font-weight:700;font-size:0.84rem;cursor:pointer;font-family:inherit;">
                <option value="open"        ${t.status==='open'        ?'selected':''}>🔵 Open</option>
                <option value="in-progress" ${t.status==='in-progress' ?'selected':''}>🟡 In Progress</option>
                <option value="resolved"    ${t.status==='resolved'    ?'selected':''}>🟢 Resolved</option>
            </select>
        </div>
        <div style="background:white;padding:14px;border-radius:8px;border:1px solid #eee;">
            <p style="margin:0;font-size:0.9rem;line-height:1.6;color:#374151;">${t.message}</p>
        </div>
    </div>
    ${t.adminReply ? `
    <div style="background:#eef2ff;border-radius:12px;padding:14px;margin-bottom:14px;
                border-left:4px solid var(--primary);">
        <p style="color:var(--primary);font-weight:700;font-size:0.82rem;margin:0 0 6px;">
            <i class="fas fa-shield-alt"></i> Your Previous Reply
        </p>
        <p style="margin:0;font-size:0.88rem;line-height:1.5;">${t.adminReply}</p>
    </div>` : ''}`;

    document.getElementById('adminTicketReplyInput').value = t.adminReply || '';
    document.getElementById('adminTicketReplyInput').dataset.ticketId = ticketId;
};

window.updateTicketStatus = async (ticketId, status) => {
    await updateDoc(doc(db, 'support_tickets', ticketId), { status, updatedAt: serverTimestamp() });
    showToast('Status updated!', 'success');
};

window.sendTicketReply = async () => {
    const input    = document.getElementById('adminTicketReplyInput');
    const reply    = input.value.trim();
    const ticketId = input.dataset.ticketId;
    if (!reply || !ticketId) { showToast('Type a reply first.', 'error'); return; }

    const btn = document.getElementById('sendTicketReplyBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending…';
    try {
        await updateDoc(doc(db, 'support_tickets', ticketId), {
            adminReply: reply, status: 'resolved', updatedAt: serverTimestamp()
        });
        showToast('✅ Reply sent and ticket resolved!', 'success');
    } catch (err) {
        showToast('Failed: ' + err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Reply';
    }
};