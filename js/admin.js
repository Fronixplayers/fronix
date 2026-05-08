// js/admin.js — FronixLearner Admin Dashboard (UPDATED: Drag Reorder, KYC Reasons, Resource Mgmt)

import {
    auth, db,
    onAuthStateChanged, signOut,
    collection, addDoc, getDoc, doc, onSnapshot,
    query, updateDoc, where, orderBy, deleteDoc, serverTimestamp
} from './firebase-config.js';

let tempPlaylist = [];
let editingCourseId = null;
let draggedIndex = null;

// ─── TOAST ──────────────────────────────────────────────
function showToast(msg, type = 'info') {
    const t = document.getElementById('toast');
    t.innerHTML = `<div class="toast-inner ${type}"><i class="fas fa-${type==='error'?'exclamation-circle':type==='success'?'check-circle':'info-circle'}"></i><span>${msg}</span></div>`;
    t.style.display = 'block';
    setTimeout(() => t.style.display = 'none', 4500);
}

// ─── AUTH GUARD ─────────────────────────────────────────
onAuthStateChanged(auth, async (user) => {
    if (user) {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists() && snap.data().role === 'Admin') {
            initAdmin();
        } else {
            showToast("Admin access only.", 'error');
            setTimeout(() => window.location.href = 'index.html', 1500);
        }
    } else {
        window.location.href = 'index.html';
    }
});

function initAdmin() {
    loadStats();
    loadCategories();
    loadCourses();
    loadStudents();
    loadVerifications();
    loadSupportTickets();
    renderPlaylist();
    updatePricingUI();
}

// ─── NAVIGATION ─────────────────────────────────────────
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

// ─── STATS ──────────────────────────────────────────────
function loadStats() {
    onSnapshot(query(collection(db,"users"), where("role","==","Student")), snap => {
        document.getElementById('statStudents').innerText = snap.size;
    });
    onSnapshot(collection(db,"courses"), snap => {
        document.getElementById('statCourses').innerText = snap.size;
    });
    onSnapshot(query(collection(db,"support_tickets"), where("status","==","open")), snap => {
        document.getElementById('statChats').innerText = snap.size;
        const badge = document.getElementById('chatUnreadBadge');
        if (badge) { badge.style.display = snap.size > 0 ? 'inline' : 'none'; badge.innerText = snap.size; }
    });
}

// ─── CATEGORIES ─────────────────────────────────────────
async function loadCategories() {
    const catRef = collection(db, "categories");
    onSnapshot(query(catRef, orderBy("name")), async snap => {
        const sel = document.getElementById('cCat');
        sel.innerHTML = "";
        if (snap.empty) {
            const defaults = ["Web Development","Python & Data","Design","Marketing","Business","BBA"];
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
    if (!name) return showToast("Enter a category name.", 'error');
    await addDoc(collection(db,"categories"), { name });
    document.getElementById('newCatInput').value = "";
    showToast("Category added!", 'success');
};
window.deleteCategory = async () => {
    const sel = document.getElementById('cCat');
    const opt = sel.options[sel.selectedIndex];
    if (!opt) return;
    if (confirm(`Delete category "${opt.value}"?`)) {
        await deleteDoc(doc(db,"categories", opt.getAttribute('data-id')));
        showToast("Category deleted.", 'success');
    }
};

// ─── YOUTUBE PARSER ─────────────────────────────────────
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
    const url = document.getElementById('lVid').value.trim();
    const vid = extractVideoId(url);
    const preview = document.getElementById('ytPreview');
    if (vid) { preview.src = `https://img.youtube.com/vi/${vid}/mqdefault.jpg`; preview.classList.remove('hidden'); }
    else preview.classList.add('hidden');
};

// ─── PLAYLIST with DRAG-TO-REORDER ──────────────────────
window.addLesson = () => {
    const title = document.getElementById('lTitle').value.trim();
    const rawUrl = document.getElementById('lVid').value.trim();
    const videoId = extractVideoId(rawUrl);
    if (!title || !rawUrl) return showToast("Fill lesson title and YouTube link.", 'error');
    if (!videoId) return showToast("Invalid YouTube link.", 'error');
    tempPlaylist.push({ title, videoId });
    renderPlaylist();
    document.getElementById('lTitle').value = "";
    document.getElementById('lVid').value = "";
    document.getElementById('ytPreview').classList.add('hidden');
    showToast(`Lesson "${title}" added! ✅`, 'success');
};

function renderPlaylist() {
    const l = document.getElementById('lessonList');
    if (!l) return;
    if (tempPlaylist.length === 0) {
        l.innerHTML = `<p style="color:#aaa;font-size:0.85rem;text-align:center;padding:10px;">No lessons added yet</p>`;
        return;
    }
    l.innerHTML = tempPlaylist.map((lesson, idx) => `
        <div class="lesson-list-item" draggable="true" 
             ondragstart="window.onDragStart(${idx})" 
             ondragover="window.onDragOver(event)" 
             ondrop="window.onDrop(${idx})"
             style="cursor:grab;user-select:none;opacity:${draggedIndex===idx?0.5:1};">
            <div style="display:flex;align-items:center;gap:12px;flex:1;min-width:0;">
                <i class="fas fa-grip-vertical" style="color:#aaa;font-size:0.9rem;flex-shrink:0;"></i>
                <div style="min-width:0;">
                    <div style="font-weight:700;">${idx+1}. ${lesson.title}</div>
                    <div style="font-size:0.75rem;color:#888;">ID: ${lesson.videoId}</div>
                </div>
            </div>
            <button type="button" class="del-btn" onclick="window.deleteLesson(${idx})" title="Delete">
                <i class="fas fa-trash"></i>
            </button>
        </div>`).join('');
}

window.onDragStart = (idx) => { draggedIndex = idx; };
window.onDragOver = (e) => { e.preventDefault(); };
window.onDrop = (idx) => {
    if (draggedIndex === null || draggedIndex === idx) return;
    const [lesson] = tempPlaylist.splice(draggedIndex, 1);
    tempPlaylist.splice(idx, 0, lesson);
    draggedIndex = null;
    renderPlaylist();
    showToast("Lessons reordered! ✅", 'success');
};

window.deleteLesson = (idx) => {
    tempPlaylist.splice(idx, 1);
    renderPlaylist();
    showToast("Lesson removed.", 'success');
};

// ─── THUMBNAIL PREVIEW ──────────────────────────────────
window.previewThumbnail = () => {
    const input = document.getElementById('cThumb');
    const preview = document.getElementById('thumbPreview');
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = (e) => {
            preview.src = e.target.result;
            preview.style.display = 'block';
        };
        reader.readAsDataURL(input.files[0]);
    }
};

window.handleThumbnailUpload = async (file) => {
    if (!file) return null;
    const reader = new FileReader();
    return new Promise((resolve) => {
        reader.onload = (e) => resolve(e.target.result);
        reader.readAsDataURL(file);
    });
};

// ─── PRICING UI ─────────────────────────────────────────
window.updatePricingUI = () => {
    const free = document.getElementById('priceFree').checked;
    document.getElementById('optFree').classList.toggle('selected', free);
    document.getElementById('optPaid').classList.toggle('selected', !free);
};

// ─── PUBLISH COURSE ─────────────────────────────────────
window.publishCourse = async (e) => {
    e.preventDefault();
    const title = document.getElementById('cTitle').value.trim();
    const instructor = document.getElementById('cInst').value.trim();
    const description = document.getElementById('cDesc').value.trim();
    const category = document.getElementById('cCat').value;
    const driveLink = document.getElementById('cDriveLink').value.trim();
    const isFree = document.getElementById('priceFree').checked;
    const thumbFile = document.getElementById('cThumb').files[0];

    if (!title || !instructor || tempPlaylist.length === 0) {
        return showToast("Fill title, instructor, and add at least 1 lesson.", 'error');
    }

    const btn = document.querySelector('#courseForm button[type="submit"]');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Publishing…';

    try {
        let customThumbnail = null;
        if (thumbFile) {
            customThumbnail = await window.handleThumbnailUpload(thumbFile);
        }

        const courseData = {
            title, instructor, description, category, driveLink, isFree,
            playlist: tempPlaylist,
            customThumbnail,
            createdAt: serverTimestamp()
        };

        if (editingCourseId) {
            await updateDoc(doc(db, "courses", editingCourseId), courseData);
            showToast("✅ Course updated!", 'success');
            window.cancelEdit();
        } else {
            await addDoc(collection(db, "courses"), courseData);
            showToast("🚀 Course published live!", 'success');
        }

        // Reset form
        document.getElementById('courseForm').reset();
        tempPlaylist = [];
        renderPlaylist();
        document.getElementById('thumbPreview').style.display = 'none';
    } catch (err) {
        showToast("Error: " + err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-rocket"></i> Publish Course — Goes Live Immediately';
    }
};

// ─── LOAD COURSES ────────────────────────────────────────
function loadCourses() {
    const table = document.getElementById('courseTable').querySelector('tbody');
    onSnapshot(query(collection(db, "courses"), orderBy("createdAt", "desc")), snap => {
        table.innerHTML = "";
        if (snap.empty) {
            table.innerHTML = `<tr><td colspan="7" class="no-data">No courses published yet.</td></tr>`;
            return;
        }
        snap.forEach(d => {
            const c = d.data();
            const lessons = (c.playlist && c.playlist.length) ? c.playlist.length : 1;
            const driveBtn = c.driveLink 
                ? `<a href="${c.driveLink}" target="_blank" class="action-btn" style="background:#e3f2fd;color:#1976d2;"><i class="fab fa-google-drive"></i> Open</a>`
                : `<span style="color:#aaa;">—</span>`;
            table.innerHTML += `
            <tr>
                <td><strong>${c.title}</strong></td>
                <td>${c.instructor}</td>
                <td>${c.category || '—'}</td>
                <td><span class="badge ${c.isFree!==false?'badge-free':'badge-paid'}">${c.isFree!==false?'Free':'Paid'}</span></td>
                <td>${lessons}</td>
                <td>${driveBtn}</td>
                <td>
                    <button type="button" class="action-btn" style="background:#f0f9ff;color:#0284c7;" onclick="window.editCourse('${d.id}')">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button type="button" class="action-btn btn-trash" onclick="window.deleteCourse('${d.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>`;
        });
    });
}

window.editCourse = async (id) => {
    const snap = await getDoc(doc(db, "courses", id));
    if (!snap.exists()) return;
    const c = snap.data();
    editingCourseId = id;
    
    document.getElementById('cTitle').value = c.title || '';
    document.getElementById('cInst').value = c.instructor || '';
    document.getElementById('cDesc').value = c.description || '';
    document.getElementById('cCat').value = c.category || '';
    document.getElementById('cDriveLink').value = c.driveLink || '';
    document.getElementById('priceFree').checked = c.isFree !== false;
    document.getElementById('pricePaid').checked = c.isFree === false;
    
    tempPlaylist = c.playlist || [];
    renderPlaylist();
    updatePricingUI();
    
    document.getElementById('formModeLabel').innerHTML = '<i class="fas fa-edit" style="color:var(--primary);"></i> Edit Course';
    document.getElementById('cancelEditBtn').style.display = 'inline-flex';
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast("Course loaded for editing.", 'success');
};

window.cancelEdit = () => {
    editingCourseId = null;
    document.getElementById('courseForm').reset();
    tempPlaylist = [];
    renderPlaylist();
    updatePricingUI();
    document.getElementById('formModeLabel').innerHTML = '<i class="fas fa-plus-circle" style="color:var(--primary);"></i> Publish New Course via YouTube';
    document.getElementById('cancelEditBtn').style.display = 'none';
    document.getElementById('thumbPreview').style.display = 'none';
};

window.deleteCourse = async (id) => {
    if (confirm("Delete this course? This cannot be undone.")) {
        await deleteDoc(doc(db, "courses", id));
        showToast("Course deleted.", 'success');
    }
};

// ─── STUDENTS ───────────────────────────────────────────
function loadStudents() {
    const table = document.getElementById('studentTable').querySelector('tbody');
    onSnapshot(query(collection(db,"users"), where("role","==","Student")), snap => {
        table.innerHTML = "";
        if (snap.empty) {
            table.innerHTML = `<tr><td colspan="6" class="no-data">No students yet.</td></tr>`;
            return;
        }
        snap.forEach(d => {
            const u = d.data();
            const statusColor = u.isVerified ? '#10b981' : (u.verificationPending ? '#f59e0b' : '#ef4444');
            const statusText = u.isVerified ? '✓ Verified' : (u.verificationPending ? '⏳ Pending' : '❌ Unverified');
            const driveCell = u.personalDriveLink
                ? `<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                    <a href="${u.personalDriveLink}" target="_blank" class="action-btn" style="background:#e3f2fd;color:#1976d2;font-size:0.74rem;"><i class="fab fa-google-drive"></i> Open</a>
                    <button type="button" class="action-btn" style="background:#f0f9ff;color:#0284c7;font-size:0.74rem;" onclick="window.setStudentDriveLink('${d.id}','${(u.personalDriveLink||'').replace(/'/g,"\\'")}')"><i class="fas fa-edit"></i></button>
                   </div>`
                : `<button type="button" class="action-btn" style="background:#dcfce7;color:#16a34a;font-size:0.74rem;" onclick="window.setStudentDriveLink('${d.id}','')"><i class="fab fa-google-drive"></i> Add Link</button>`;
            table.innerHTML += `
            <tr>
                <td><strong>${u.name || 'Anonymous'}</strong></td>
                <td>${u.email}</td>
                <td>${u.location || '—'}</td>
                <td><span style="color:${statusColor};font-weight:700;">${statusText}</span></td>
                <td>${driveCell}</td>
                <td>
                    ${u.isBlocked ? `<button class="action-btn btn-unblock" onclick="window.toggleBlockUser('${d.id}',false)"><i class="fas fa-lock-open"></i> Unblock</button>` 
                        : `<button class="action-btn btn-block" onclick="window.toggleBlockUser('${d.id}',true)"><i class="fas fa-ban"></i> Block</button>`}
                </td>
            </tr>`;
        });
    });
}

window.toggleBlockUser = async (uid, block) => {
    await updateDoc(doc(db,"users",uid), { isBlocked: block });
    showToast(block ? "✓ Student blocked." : "✓ Student unblocked.", 'success');
};

// ─── STUDENT PERSONAL DRIVE LINK ────────────────────────
window.setStudentDriveLink = (uid, currentLink) => {
    const existing = document.getElementById('driveLinkModal');
    if (existing) existing.remove();
    const modal = document.createElement('div');
    modal.id = 'driveLinkModal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;';
    modal.innerHTML = `
    <div style="background:white;border-radius:16px;padding:28px;width:460px;max-width:95vw;box-shadow:0 20px 50px rgba(0,0,0,0.2);">
        <h3 style="margin:0 0 6px;font-weight:800;"><i class="fab fa-google-drive" style="color:#4285F4;"></i> Set Student Drive Link</h3>
        <p style="color:#888;font-size:0.88rem;margin-bottom:16px;">This personal Google Drive link will be visible only to this student in their Resources section.</p>
        <label style="font-size:0.82rem;font-weight:700;color:#666;display:block;margin-bottom:6px;">Google Drive URL</label>
        <input type="url" id="studentDriveLinkInput" value="${currentLink}" placeholder="https://drive.google.com/drive/folders/..."
            style="width:100%;padding:10px 14px;border:1.5px solid #e5e7eb;border-radius:10px;outline:none;font-family:inherit;font-size:0.92rem;margin-bottom:16px;box-sizing:border-box;">
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
            <button onclick="window.saveStudentDriveLink('${uid}')" class="action-btn btn-approve" style="flex:1;justify-content:center;padding:10px;min-width:120px;">
                <i class="fas fa-save"></i> Save Link
            </button>
            ${currentLink ? `<button onclick="window.removeStudentDriveLink('${uid}')" class="action-btn btn-reject" style="padding:10px 14px;">
                <i class="fas fa-trash"></i> Remove
            </button>` : ''}
            <button onclick="document.getElementById('driveLinkModal').remove()" style="background:#f3f4f6;color:#888;border:none;border-radius:8px;padding:10px 18px;cursor:pointer;font-weight:700;">Cancel</button>
        </div>
    </div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
    document.getElementById('studentDriveLinkInput').focus();
};

window.saveStudentDriveLink = async (uid) => {
    const link = document.getElementById('studentDriveLinkInput').value.trim();
    if (!link) return showToast("Enter a Google Drive URL.", 'error');
    if (!link.startsWith('http')) return showToast("Enter a valid URL starting with http.", 'error');
    await updateDoc(doc(db,"users",uid), { personalDriveLink: link });
    document.getElementById('driveLinkModal')?.remove();
    showToast("✅ Drive link saved! Student can now access it.", 'success');
};

window.removeStudentDriveLink = async (uid) => {
    if (!confirm("Remove this student's personal Drive link?")) return;
    await updateDoc(doc(db,"users",uid), { personalDriveLink: '' });
    document.getElementById('driveLinkModal')?.remove();
    showToast("Drive link removed.", 'success');
};

// ─── VERIFICATIONS ──────────────────────────────────────
function loadVerifications() {
    const table = document.getElementById('verificationTable').querySelector('tbody');
    onSnapshot(query(collection(db,"users"), where("verificationPending","==",true)), snap => {
        table.innerHTML = "";
        if (snap.empty) {
            table.innerHTML = `<tr><td colspan="3" class="no-data">No pending verifications.</td></tr>`;
            return;
        }
        snap.forEach(d => {
            const u = d.data();
            const date = u.idUploadedAt ? new Date(u.idUploadedAt.toDate()).toLocaleDateString('en-IN') : '—';
            table.innerHTML += `
            <tr>
                <td>
                    <strong>${u.name}</strong><br/>
                    <small style="color:#888;">${u.email}</small>
                    ${u.idImage ? `<br/><button type="button" class="action-btn" style="background:#eef2ff;color:var(--primary);margin-top:6px;font-size:0.75rem;" onclick="window.viewIDImage('${u.idImage}')">
                        <i class="fas fa-image"></i> View ID
                    </button>` : ''}
                </td>
                <td>${date}</td>
                <td>
                    <button type="button" class="action-btn btn-approve" onclick="window.verifyUser('${d.id}',true)">
                        <i class="fas fa-check"></i> Approve
                    </button>
                    <button type="button" class="action-btn btn-reject" onclick="window.promptReject('${d.id}')" style="margin-top:4px;">
                        <i class="fas fa-times"></i> Reject
                    </button>
                </td>
            </tr>`;
        });
    });
}

window.viewIDImage = (url) => {
    const lb = document.createElement('div');
    lb.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;z-index:10000;';
    lb.innerHTML = `<div style="position:relative;max-width:90vw;max-height:90vh;">
        <img src="${url}" style="max-width:90vw;max-height:85vh;border-radius:12px;object-fit:contain;">
        <button onclick="this.closest('div').parentElement.remove()" style="position:absolute;top:-14px;right:-14px;background:white;border:none;border-radius:50%;width:32px;height:32px;font-size:1rem;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,0.3);">×</button>
    </div>`;
    lb.addEventListener('click', e => { if (e.target === lb) lb.remove(); });
    document.body.appendChild(lb);
};

window.verifyUser = async (uid, approved) => {
    await updateDoc(doc(db,"users",uid), {
        isVerified: approved,
        verificationPending: false,
        verificationRejected: false,
        rejectionReason: ''
    });
    showToast(approved ? "✅ Student verified!" : "✅ Done.", approved?'success':'success');
};

// ─── REJECT WITH REASON ─────────────────────────────────
window.promptReject = (uid) => {
    const existing = document.getElementById('rejectModal');
    if (existing) existing.remove();
    const modal = document.createElement('div');
    modal.id = 'rejectModal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;';
    modal.innerHTML = `
    <div style="background:white;border-radius:16px;padding:28px;width:420px;max-width:95vw;box-shadow:0 20px 50px rgba(0,0,0,0.2);">
        <h3 style="margin:0 0 6px;font-weight:800;"><i class="fas fa-times-circle" style="color:#ef4444;"></i> Reject Verification</h3>
        <p style="color:#888;font-size:0.88rem;margin-bottom:16px;">This reason will be shown to the student so they can resubmit.</p>
        <label style="font-size:0.82rem;font-weight:700;color:#666;display:block;margin-bottom:6px;">Rejection Reason *</label>
        <textarea id="rejectReasonInput" rows="3" placeholder="e.g. ID is blurry, please upload a clearer image. Or: ID appears expired. Or: Name on ID doesn't match."
            style="width:100%;padding:10px 14px;border:1.5px solid #e5e7eb;border-radius:10px;outline:none;font-family:inherit;font-size:0.92rem;resize:vertical;margin-bottom:16px;box-sizing:border-box;"></textarea>
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
            <button onclick="window.submitReject('${uid}')" class="action-btn btn-reject" style="flex:1;justify-content:center;padding:10px;min-width:120px;">
                <i class="fas fa-paper-plane"></i> Send Rejection
            </button>
            <button onclick="document.getElementById('rejectModal').remove()" style="background:#f3f4f6;color:#888;border:none;border-radius:8px;padding:10px 18px;cursor:pointer;font-weight:700;white-space:nowrap;">Cancel</button>
        </div>
    </div>`;
    document.body.appendChild(modal);
    document.getElementById('rejectReasonInput').focus();
};

window.submitReject = async (uid) => {
    const reason = document.getElementById('rejectReasonInput').value.trim();
    if (!reason) return showToast("Please provide a rejection reason.", 'error');
    await updateDoc(doc(db,"users",uid), {
        isVerified: false,
        verificationPending: false,
        verificationRejected: true,
        rejectionReason: reason
    });
    document.getElementById('rejectModal')?.remove();
    showToast("❌ Verification rejected with reason sent to student.", 'success');
};

// ─── SUPPORT TICKETS ────────────────────────────────────
function loadSupportTickets() {
    const container = document.getElementById('ticketStudentList');
    if (!container) return;
    onSnapshot(query(collection(db,"support_tickets"), orderBy("createdAt","desc")), snap => {
        container.innerHTML = "";
        if (snap.empty) {
            container.innerHTML = `<div class="no-data" style="text-align:center;padding:40px;">
                <i class="fas fa-ticket-alt" style="font-size:2rem;display:block;margin-bottom:10px;"></i>
                No support tickets yet.</div>`;
            return;
        }
        snap.forEach(d => {
            const t = d.data();
            const statusColor = t.status==='resolved'?'#10b981':t.status==='in-progress'?'#f59e0b':'#6366f1';
            const date = t.createdAt ? new Date(t.createdAt.toDate()).toLocaleDateString('en-IN') : '';
            const div = document.createElement('div');
            div.className = 'ticket-admin-card';
            div.innerHTML = `
            <div style="background:white;border-radius:12px;padding:16px;margin-bottom:12px;border:1.5px solid #e5e7eb;cursor:pointer;transition:0.2s;"
                 onclick="window.openTicket('${d.id}')" id="tc_${d.id}">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">
                    <div style="flex:1;min-width:0;">
                        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;flex-wrap:wrap;">
                            <span style="background:#eef2ff;color:var(--primary);padding:2px 10px;border-radius:12px;font-size:0.75rem;font-weight:700;">${t.category||'General'}</span>
                            <span style="color:${statusColor};font-size:0.78rem;font-weight:700;">${t.status.toUpperCase()}</span>
                        </div>
                        <strong style="font-size:0.95rem;">${t.subject}</strong>
                        <div style="color:#888;font-size:0.8rem;margin-top:2px;">${t.studentName} • ${date}</div>
                    </div>
                    <i class="fas fa-chevron-right" style="color:#aaa;flex-shrink:0;margin-top:4px;"></i>
                </div>
                <p style="color:#555;font-size:0.85rem;margin:8px 0 0;line-height:1.5;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">${t.message}</p>
            </div>`;
            container.appendChild(div);
        });
    });
}

window.openTicket = async (ticketId) => {
    const snap = await getDoc(doc(db,"support_tickets",ticketId));
    if (!snap.exists()) return;
    const t = snap.data();
    const date = t.createdAt ? new Date(t.createdAt.toDate()).toLocaleString('en-IN') : '';
    const detail = document.getElementById('ticketDetailPanel');
    const placeholder = document.getElementById('ticketPlaceholder');
    if (placeholder) placeholder.style.display = 'none';
    if (detail) detail.style.display = 'flex';
    document.getElementById('ticketDetailContent').innerHTML = `
    <div style="background:#f8fafc;border-radius:12px;padding:20px;margin-bottom:16px;border:1.5px solid #e5e7eb;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;flex-wrap:wrap;gap:8px;">
            <div>
                <span style="background:#eef2ff;color:var(--primary);padding:3px 12px;border-radius:12px;font-size:0.78rem;font-weight:700;">${t.category||'General'}</span>
                <h3 style="margin:8px 0 4px;font-size:1.1rem;">${t.subject}</h3>
                <p style="color:#888;font-size:0.82rem;margin:0;">By ${t.studentName} (${t.studentEmail||''}) • ${date}</p>
            </div>
            <select onchange="window.updateTicketStatus('${ticketId}', this.value)"
                    style="padding:6px 12px;border-radius:8px;border:1.5px solid #e5e7eb;font-weight:700;font-size:0.85rem;cursor:pointer;">
                <option value="open" ${t.status==='open'?'selected':''}>🔵 Open</option>
                <option value="in-progress" ${t.status==='in-progress'?'selected':''}>🟡 In Progress</option>
                <option value="resolved" ${t.status==='resolved'?'selected':''}>🟢 Resolved</option>
            </select>
        </div>
        <div style="background:white;padding:14px;border-radius:8px;border:1px solid #eee;">
            <p style="margin:0;font-size:0.92rem;line-height:1.6;color:#374151;">${t.message}</p>
        </div>
    </div>
    ${t.adminReply ? `
    <div style="background:#eef2ff;border-radius:12px;padding:16px;margin-bottom:16px;border-left:4px solid var(--primary);">
        <div style="font-weight:700;color:var(--primary);font-size:0.85rem;margin-bottom:6px;"><i class="fas fa-shield-alt"></i> Your Previous Reply</div>
        <p style="margin:0;font-size:0.9rem;line-height:1.5;">${t.adminReply}</p>
    </div>` : ''}`;
    document.getElementById('adminTicketReplyInput').value = t.adminReply || '';
    document.getElementById('adminTicketReplyInput').dataset.ticketId = ticketId;
};

window.updateTicketStatus = async (ticketId, status) => {
    await updateDoc(doc(db,"support_tickets",ticketId), { status, updatedAt: serverTimestamp() });
    showToast("Status updated!", 'success');
};

window.sendTicketReply = async () => {
    const input = document.getElementById('adminTicketReplyInput');
    const reply = input.value.trim();
    const ticketId = input.dataset.ticketId;
    if (!reply || !ticketId) return showToast("Type a reply first.", 'error');
    const btn = document.getElementById('sendTicketReplyBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending…';
    try {
        await updateDoc(doc(db,"support_tickets",ticketId), {
            adminReply: reply, status: 'resolved', updatedAt: serverTimestamp()
        });
        showToast("✅ Reply sent and ticket resolved!", 'success');
    } catch(err) {
        showToast("Failed: " + err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Reply';
    }
};
