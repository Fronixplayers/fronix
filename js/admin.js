// js/admin.js — FronixLearner Admin Dashboard (ALL FIXES)

import {
    auth, db,
    onAuthStateChanged, signOut,
    collection, addDoc, getDoc, doc, onSnapshot,
    query, updateDoc, where, orderBy, deleteDoc, serverTimestamp
} from './firebase-config.js';

let tempPlaylist = [];
let editingCourseId = null; // FIX 4: track editing course

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

// ─── FIX 3: PLAYLIST with DRAG-TO-REORDER ───────────────
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
    l.innerHTML = tempPlaylist.map((item, i) => `
        <div class="lesson-list-item" draggable="true" data-idx="${i}"
             ondragstart="window.dragStart(event,${i})"
             ondragover="event.preventDefault()"
             ondrop="window.dragDrop(event,${i})">
            <div style="display:flex;align-items:center;gap:8px;flex:1;min-width:0;">
                <i class="fas fa-grip-vertical" style="color:#aaa;cursor:grab;flex-shrink:0;"></i>
                <img src="https://img.youtube.com/vi/${item.videoId}/default.jpg"
                     style="width:40px;height:28px;border-radius:4px;object-fit:cover;flex-shrink:0;"
                     onerror="this.style.display='none'">
                <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${i+1}. ${item.title}</span>
            </div>
            <div style="display:flex;gap:4px;flex-shrink:0;">
                <button onclick="window.moveLessonUp(${i})" title="Move Up"
                    style="background:#eef2ff;color:var(--primary);border:none;border-radius:6px;padding:3px 7px;cursor:pointer;font-size:0.8rem;"
                    ${i===0?'disabled style="opacity:0.3;"':''}><i class="fas fa-chevron-up"></i></button>
                <button onclick="window.moveLessonDown(${i})" title="Move Down"
                    style="background:#eef2ff;color:var(--primary);border:none;border-radius:6px;padding:3px 7px;cursor:pointer;font-size:0.8rem;"
                    ${i===tempPlaylist.length-1?'disabled style="opacity:0.3;"':''}><i class="fas fa-chevron-down"></i></button>
                <button class="del-btn" onclick="window.remLesson(${i})"><i class="fas fa-times"></i></button>
            </div>
        </div>`).join('');
}

let dragSrcIdx = null;
window.dragStart = (e, idx) => { dragSrcIdx = idx; e.dataTransfer.effectAllowed = 'move'; };
window.dragDrop = (e, targetIdx) => {
    e.preventDefault();
    if (dragSrcIdx === null || dragSrcIdx === targetIdx) return;
    const moved = tempPlaylist.splice(dragSrcIdx, 1)[0];
    tempPlaylist.splice(targetIdx, 0, moved);
    dragSrcIdx = null;
    renderPlaylist();
};
window.moveLessonUp = (i) => { if (i === 0) return; [tempPlaylist[i-1], tempPlaylist[i]] = [tempPlaylist[i], tempPlaylist[i-1]]; renderPlaylist(); };
window.moveLessonDown = (i) => { if (i >= tempPlaylist.length-1) return; [tempPlaylist[i], tempPlaylist[i+1]] = [tempPlaylist[i+1], tempPlaylist[i]]; renderPlaylist(); };
window.remLesson = (i) => { tempPlaylist.splice(i, 1); renderPlaylist(); };

function updatePricingUI() {
    document.querySelectorAll('.pricing-option').forEach(o => o.classList.remove('selected'));
    const checked = document.querySelector('input[name="pricing"]:checked');
    if (checked) checked.closest('.pricing-option')?.classList.add('selected');
}
window.updatePricingUI = updatePricingUI;

// FIX 4: Handle custom thumbnail preview
window.previewThumbnail = () => {
    const file = document.getElementById('cThumb')?.files?.[0];
    const preview = document.getElementById('thumbPreview');
    if (!file || !preview) return;
    const url = URL.createObjectURL(file);
    preview.src = url;
    preview.style.display = 'block';
};

// ─── FIX 4: PUBLISH / UPDATE COURSE ─────────────────────
window.publishCourse = async (e) => {
    e.preventDefault();
    if (tempPlaylist.length === 0) return showToast("Add at least one lesson.", 'error');
    const isFree = (document.querySelector('input[name="pricing"]:checked')?.value || 'free') === 'free';
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ' + (editingCourseId ? 'Updating…' : 'Publishing…');

    try {
        // Handle custom thumbnail
        let customThumbnail = '';
        const thumbFile = document.getElementById('cThumb')?.files?.[0];
        if (thumbFile) {
            customThumbnail = await new Promise((res, rej) => {
                if (thumbFile.size > 2 * 1024 * 1024) { rej(new Error('Thumbnail must be under 2MB')); return; }
                const canvas = document.createElement('canvas');
                const img = new Image();
                const url = URL.createObjectURL(thumbFile);
                img.onload = () => {
                    URL.revokeObjectURL(url);
                    canvas.width = 640; canvas.height = 360;
                    canvas.getContext('2d').drawImage(img, 0, 0, 640, 360);
                    res(canvas.toDataURL('image/jpeg', 0.85));
                };
                img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('Invalid image')); };
                img.src = url;
            });
        }

        // FIX 7: Drive link per course
        const driveLink = document.getElementById('cDriveLink')?.value?.trim() || '';

        const courseData = {
            title: document.getElementById('cTitle').value.trim(),
            instructor: document.getElementById('cInst').value.trim(),
            category: document.getElementById('cCat').value,
            description: document.getElementById('cDesc').value.trim(),
            isFree, playlist: tempPlaylist,
            driveLink,
            ...(customThumbnail && { customThumbnail })
        };

        if (editingCourseId) {
            // UPDATE existing course
            await updateDoc(doc(db,"courses",editingCourseId), courseData);
            showToast("✅ Course updated successfully!", 'success');
            editingCourseId = null;
            btn.innerHTML = '<i class="fas fa-rocket"></i> Publish Course — Goes Live Immediately';
            document.getElementById('formModeLabel').textContent = 'Publish New Course via YouTube';
            document.getElementById('cancelEditBtn').style.display = 'none';
        } else {
            // ADD new course
            courseData.createdAt = serverTimestamp();
            courseData.likes = 0;
            await addDoc(collection(db,"courses"), courseData);
            showToast("🎉 Course published successfully!", 'success');
        }

        e.target.reset();
        tempPlaylist = [];
        renderPlaylist();
        document.getElementById('priceFree').checked = true;
        updatePricingUI();
        const preview = document.getElementById('thumbPreview');
        if (preview) preview.style.display = 'none';
    } catch (err) {
        showToast("Failed: " + err.message, 'error');
    } finally {
        btn.disabled = false;
        if (!editingCourseId) btn.innerHTML = '<i class="fas fa-rocket"></i> Publish Course — Goes Live Immediately';
    }
};

// FIX 4: Load course into form for editing
window.editCourse = async (id) => {
    const snap = await getDoc(doc(db,"courses",id));
    if (!snap.exists()) return;
    const c = snap.data();
    editingCourseId = id;
    document.getElementById('cTitle').value = c.title || '';
    document.getElementById('cInst').value = c.instructor || '';
    document.getElementById('cDesc').value = c.description || '';
    document.getElementById('cDriveLink').value = c.driveLink || '';

    // Set category
    const catSel = document.getElementById('cCat');
    for (let i = 0; i < catSel.options.length; i++) {
        if (catSel.options[i].value === c.category) { catSel.selectedIndex = i; break; }
    }

    // Pricing
    if (c.isFree === false) {
        document.getElementById('pricePaid').checked = true;
    } else {
        document.getElementById('priceFree').checked = true;
    }
    updatePricingUI();

    // Playlist
    tempPlaylist = c.playlist ? [...c.playlist] : [];
    renderPlaylist();

    // Thumbnail preview
    if (c.customThumbnail) {
        const preview = document.getElementById('thumbPreview');
        if (preview) { preview.src = c.customThumbnail; preview.style.display = 'block'; }
    }

    // Update UI
    const label = document.getElementById('formModeLabel');
    if (label) label.textContent = `✏️ Editing: ${c.title}`;
    const btn = document.querySelector('#courseForm button[type="submit"]');
    if (btn) btn.innerHTML = '<i class="fas fa-save"></i> Update Course';
    const cancelBtn = document.getElementById('cancelEditBtn');
    if (cancelBtn) cancelBtn.style.display = 'inline-flex';

    // Scroll to form
    document.querySelector('#coursesSection .panel').scrollIntoView({ behavior: 'smooth' });
    window.switchTab('courses', document.querySelector('.nav-item'));
    showToast("Course loaded for editing. Make changes and click Update.", 'info');
};

window.cancelEdit = () => {
    editingCourseId = null;
    document.getElementById('courseForm')?.reset();
    tempPlaylist = [];
    renderPlaylist();
    document.getElementById('priceFree').checked = true;
    updatePricingUI();
    const label = document.getElementById('formModeLabel');
    if (label) label.textContent = 'Publish New Course via YouTube';
    const btn = document.querySelector('#courseForm button[type="submit"]');
    if (btn) btn.innerHTML = '<i class="fas fa-rocket"></i> Publish Course — Goes Live Immediately';
    const cancelBtn = document.getElementById('cancelEditBtn');
    if (cancelBtn) cancelBtn.style.display = 'none';
    const preview = document.getElementById('thumbPreview');
    if (preview) preview.style.display = 'none';
    showToast("Edit cancelled.", 'info');
};

// ─── COURSES TABLE ──────────────────────────────────────
function loadCourses() {
    onSnapshot(query(collection(db,"courses"), orderBy("createdAt","desc")), snap => {
        const tb = document.querySelector('#courseTable tbody');
        tb.innerHTML = "";
        if (snap.empty) { tb.innerHTML = '<tr><td colspan="7" class="no-data"><i class="fas fa-inbox"></i>No courses yet.</td></tr>'; return; }
        snap.forEach(d => {
            const c = d.data();
            const badge = c.isFree !== false ? '<span class="badge badge-free">FREE</span>' : '<span class="badge badge-paid">PAID</span>';
            const vid = c.playlist?.length ? c.playlist[0].videoId : '';
            const thumb = c.customThumbnail || (vid ? `https://img.youtube.com/vi/${vid}/default.jpg` : '');
            const driveIcon = c.driveLink
                ? `<a href="${c.driveLink}" target="_blank" title="Drive Link" style="color:#10b981;font-size:0.85rem;"><i class="fab fa-google-drive"></i></a>`
                : '<span style="color:#ddd;font-size:0.8rem;">—</span>';
            tb.innerHTML += `
            <tr>
                <td><div style="display:flex;align-items:center;gap:10px;">
                    ${thumb ? `<img src="${thumb}" style="width:50px;height:35px;border-radius:6px;object-fit:cover;" onerror="this.style.display='none'">` : ''}
                    <strong>${c.title}</strong></div></td>
                <td>${c.instructor}</td>
                <td>${c.category||'General'}</td>
                <td>${badge}</td>
                <td>${c.playlist?c.playlist.length:1}</td>
                <td style="text-align:center;">${driveIcon}</td>
                <td>
                    <div style="display:flex;gap:5px;flex-wrap:wrap;">
                        <button class="action-btn" style="background:#eef2ff;color:var(--primary);" onclick="window.editCourse('${d.id}')"><i class="fas fa-edit"></i> Edit</button>
                        <button class="action-btn btn-trash" onclick="window.delCourse('${d.id}')"><i class="fas fa-trash"></i></button>
                    </div>
                </td>
            </tr>`;
        });
    });
}
window.delCourse = async (id) => {
    if (confirm("Delete this course?")) {
        await deleteDoc(doc(db,"courses",id));
        if (editingCourseId === id) window.cancelEdit();
        showToast("Course deleted.", 'success');
    }
};

// ─── STUDENTS ───────────────────────────────────────────
function loadStudents() {
    onSnapshot(query(collection(db,"users"), where("role","==","Student")), snap => {
        const tb = document.querySelector('#studentTable tbody');
        tb.innerHTML = "";
        if (snap.empty) { tb.innerHTML = '<tr><td colspan="5" class="no-data"><i class="fas fa-users"></i>No students yet.</td></tr>'; return; }
        snap.forEach(d => {
            const u = d.data();
            const blocked = u.isBlocked === true;
            tb.innerHTML += `
            <tr>
                <td>${u.name||'-'}</td>
                <td style="font-size:0.85rem;">${u.email||'-'}</td>
                <td>${u.city||'-'}, ${u.state||'-'}</td>
                <td><span class="badge ${blocked?'badge-blocked':'badge-active'}">${blocked?'BLOCKED':'ACTIVE'}</span></td>
                <td style="display:flex;gap:6px;flex-wrap:wrap;">
                    ${blocked
                        ? `<button class="action-btn btn-unblock" onclick="window.toggleBlock('${d.id}',false)"><i class="fas fa-check"></i> Unblock</button>`
                        : `<button class="action-btn btn-block" onclick="window.toggleBlock('${d.id}',true)"><i class="fas fa-ban"></i> Block</button>`}
                    <button class="action-btn btn-trash" onclick="window.deleteUser('${d.id}')"><i class="fas fa-trash"></i></button>
                </td>
            </tr>`;
        });
    });
}
window.toggleBlock = async (id, block) => {
    if (confirm(`${block?'Block':'Unblock'} this student?`)) {
        await updateDoc(doc(db,"users",id), { isBlocked: block });
        showToast(`Student ${block?'blocked':'unblocked'}.`, block?'error':'success');
    }
};
window.deleteUser = async (id) => {
    if (confirm("Permanently delete this student?")) {
        await deleteDoc(doc(db,"users",id));
        showToast("Student deleted.", 'success');
    }
};

// ─── FIX: KYC VERIFICATIONS ─────────────────────────────
function loadVerifications() {
    onSnapshot(query(collection(db,"users"), where("verificationPending","==",true)), snap => {
        const tb = document.querySelector('#verificationTable tbody');
        tb.innerHTML = "";
        if (snap.empty) {
            tb.innerHTML = '<tr><td colspan="3" class="no-data"><i class="fas fa-check-double"></i>No pending verifications.</td></tr>';
            return;
        }
        snap.forEach(d => {
            const u = d.data();
            let idHtml = '<span style="color:#aaa;font-size:0.8rem;">No image submitted</span>';
            if (u.idProofUrl && u.idProofUrl.startsWith('data:')) {
                idHtml = `<div style="margin-top:6px;">
                    <img src="${u.idProofUrl}" style="width:120px;height:80px;object-fit:cover;border-radius:8px;border:2px solid #e5e7eb;cursor:pointer;"
                         onclick="window.viewKYC('${d.id}')" title="Click to view full size">
                    <div style="font-size:0.75rem;color:var(--primary);margin-top:3px;cursor:pointer;" onclick="window.viewKYC('${d.id}')">
                        <i class="fas fa-search-plus"></i> View Full Size
                    </div></div>`;
            } else if (u.idProofUrl) {
                idHtml = `<a href="${u.idProofUrl}" target="_blank" style="color:var(--primary);font-size:0.8rem;"><i class="fas fa-eye"></i> View ID</a>`;
            }
            const date = u.submittedAt ? new Date(u.submittedAt.toDate()).toLocaleDateString('en-IN') : 'N/A';
            tb.innerHTML += `
            <tr>
                <td>
                    <strong>${u.name||'Unknown'}</strong>
                    <div style="font-size:0.8rem;color:#888;">${u.email||''}</div>
                    ${idHtml}
                </td>
                <td>${date}</td>
                <td>
                    <div style="display:flex;gap:8px;flex-wrap:wrap;">
                        <button class="action-btn btn-approve" onclick="window.verifyUser('${d.id}',true)"><i class="fas fa-check"></i> Approve</button>
                        <button class="action-btn btn-reject" onclick="window.promptReject('${d.id}')"><i class="fas fa-times"></i> Reject</button>
                    </div>
                </td>
            </tr>`;
        });
    });
}

window.viewKYC = async (uid) => {
    const snap = await getDoc(doc(db,"users",uid));
    if (!snap.exists()) return;
    const url = snap.data().idProofUrl;
    if (!url) return;
    const lb = document.createElement('div');
    lb.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:9999;display:flex;align-items:center;justify-content:center;cursor:pointer;';
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

// FIX 5: Reject with reason
window.promptReject = (uid) => {
    // Create inline rejection modal
    const existing = document.getElementById('rejectModal');
    if (existing) existing.remove();
    const modal = document.createElement('div');
    modal.id = 'rejectModal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:9999;display:flex;align-items:center;justify-content:center;';
    modal.innerHTML = `
    <div style="background:white;border-radius:16px;padding:28px;width:420px;max-width:95vw;box-shadow:0 20px 50px rgba(0,0,0,0.2);">
        <h3 style="margin:0 0 6px;font-weight:800;"><i class="fas fa-times-circle" style="color:#ef4444;"></i> Reject Verification</h3>
        <p style="color:#888;font-size:0.88rem;margin-bottom:16px;">This reason will be shown to the student so they can resubmit.</p>
        <label style="font-size:0.82rem;font-weight:700;color:#666;display:block;margin-bottom:6px;">Rejection Reason *</label>
        <textarea id="rejectReasonInput" rows="3" placeholder="e.g. ID is blurry, please upload a clearer image. Or: ID appears expired. Or: Name on ID doesn't match."
            style="width:100%;padding:10px 14px;border:1.5px solid #e5e7eb;border-radius:10px;outline:none;font-family:inherit;font-size:0.92rem;resize:vertical;margin-bottom:16px;"></textarea>
        <div style="display:flex;gap:10px;">
            <button onclick="window.submitReject('${uid}')" class="action-btn btn-reject" style="flex:1;justify-content:center;padding:10px;">
                <i class="fas fa-paper-plane"></i> Send Rejection
            </button>
            <button onclick="document.getElementById('rejectModal').remove()" style="background:#f3f4f6;color:#888;border:none;border-radius:8px;padding:10px 18px;cursor:pointer;font-weight:700;">Cancel</button>
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
