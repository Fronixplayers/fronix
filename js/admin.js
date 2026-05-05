// js/admin.js — FronixLearner Admin Dashboard Logic (FIXED)

import {
    auth, db,
    onAuthStateChanged, signOut,
    collection, addDoc, getDoc, getDocs, doc, onSnapshot,
    query, updateDoc, where, orderBy, deleteDoc, serverTimestamp, setDoc
} from './firebase-config.js';

let tempPlaylist = [];
let chatListenerUnsub = null;
let selectedStudentId = null;

// ─── TOAST ───────────────────────────────────────────
function showToast(msg, type = 'info') {
    const t = document.getElementById('toast');
    t.innerHTML = `<div class="toast-inner ${type}"><i class="fas fa-${type === 'error' ? 'exclamation-circle' : type === 'success' ? 'check-circle' : 'info-circle'}"></i><span>${msg}</span></div>`;
    t.style.display = 'block';
    setTimeout(() => t.style.display = 'none', 4000);
}

// ─── AUTH GUARD ───────────────────────────────────────
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

// ─── INIT ─────────────────────────────────────────────
function initAdmin() {
    loadStats();
    loadCategories();
    loadCourses();
    loadStudents();
    loadVerifications();
    loadChatbotMessages();
    renderPlaylist();       // called once here safely
    updatePricingUI();      // called once here safely

    // Pricing radio listeners
    document.querySelectorAll('input[name="pricing"]').forEach(r => {
        r.addEventListener('change', updatePricingUI);
    });

    document.getElementById('adminReplyInput')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') window.sendAdminReply();
    });
}

// ─── NAVIGATION ───────────────────────────────────────
window.switchTab = (tab, el) => {
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    el.classList.add('active');
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.getElementById(tab + 'Section').classList.add('active');
    if (window.innerWidth <= 900) document.querySelector('aside').classList.remove('active');
};
window.toggleSidebar = () => document.querySelector('aside').classList.toggle('active');
window.logout = () => signOut(auth).then(() => window.location.href = 'index.html');

// ─── STATS (real-time) ────────────────────────────────
function loadStats() {
    // Total students
    onSnapshot(query(collection(db, "users"), where("role", "==", "Student")), (snap) => {
        document.getElementById('statStudents').innerText = snap.size;
    });

    // Active courses
    onSnapshot(collection(db, "courses"), (snap) => {
        document.getElementById('statCourses').innerText = snap.size;
    });

    // Unread chats — badge in sidebar + stat card
    onSnapshot(collection(db, "chatbot_messages"), (snap) => {
        const unread = snap.docs.filter(d => d.data().type === 'student_msg' && !d.data().seen).length;
        document.getElementById('statChats').innerText = unread;

        const badge = document.getElementById('chatUnreadBadge');
        if (badge) {
            if (unread > 0) {
                badge.style.display = 'inline';
                badge.innerText = unread;
            } else {
                badge.style.display = 'none';
            }
        }
    });
}

// ─── CATEGORIES ───────────────────────────────────────
async function loadCategories() {
    const catRef = collection(db, "categories");
    onSnapshot(query(catRef, orderBy("name")), async (snap) => {
        const sel = document.getElementById('cCat');
        sel.innerHTML = "";
        if (snap.empty) {
            const defaults = ["Web Development", "Python & Data", "Design", "Marketing", "Business"];
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
    await addDoc(collection(db, "categories"), { name });
    document.getElementById('newCatInput').value = "";
    showToast("Category added!", 'success');
};

window.deleteCategory = async () => {
    const sel = document.getElementById('cCat');
    const opt = sel.options[sel.selectedIndex];
    if (!opt) return;
    if (confirm(`Delete category "${opt.value}"?`)) {
        await deleteDoc(doc(db, "categories", opt.getAttribute('data-id')));
        showToast("Category deleted.", 'success');
    }
};

// ─── YOUTUBE LINK PARSER ──────────────────────────────
function extractVideoId(url) {
    const patterns = [
        /youtu\.be\/([a-zA-Z0-9_-]{11})/,
        /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
        /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
        /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
        /^([a-zA-Z0-9_-]{11})$/
    ];
    for (const p of patterns) {
        const m = url.match(p);
        if (m) return m[1];
    }
    return null;
}

window.previewLesson = () => {
    const url = document.getElementById('lVid').value.trim();
    const vid = extractVideoId(url);
    const preview = document.getElementById('ytPreview');
    if (vid) {
        preview.src = `https://img.youtube.com/vi/${vid}/mqdefault.jpg`;
        preview.classList.remove('hidden');
    } else {
        preview.classList.add('hidden');
    }
};

// ─── COURSE PLAYLIST ──────────────────────────────────
window.addLesson = () => {
    const title = document.getElementById('lTitle').value.trim();
    const rawUrl = document.getElementById('lVid').value.trim();
    const videoId = extractVideoId(rawUrl);
    if (!title || !rawUrl) return showToast("Fill lesson title and YouTube link.", 'error');
    if (!videoId) return showToast("Invalid YouTube link. Please enter a valid YouTube URL or video ID.", 'error');
    tempPlaylist.push({ title, videoId });
    renderPlaylist();
    document.getElementById('lTitle').value = "";
    document.getElementById('lVid').value = "";
    document.getElementById('ytPreview').classList.add('hidden');
    showToast(`Lesson "${title}" added!`, 'success');
};

// ─── FIX: Single definition of renderPlaylist ─────────
function renderPlaylist() {
    const l = document.getElementById('lessonList');
    if (!l) return;
    l.innerHTML = tempPlaylist.length === 0
        ? `<p style="color:#aaa; font-size:0.85rem; text-align:center; padding:10px;">No lessons added yet</p>`
        : tempPlaylist.map((item, i) => `
        <div class="lesson-list-item">
            <div style="display:flex; align-items:center; gap:8px;">
                <img src="https://img.youtube.com/vi/${item.videoId}/default.jpg"
                     style="width:40px; height:28px; border-radius:4px; object-fit:cover;"
                     onerror="this.style.display='none'">
                <span>${i + 1}. ${item.title}</span>
            </div>
            <button class="del-btn" onclick="window.remLesson(${i})"><i class="fas fa-times"></i></button>
        </div>`).join('');
}
window.remLesson = (i) => { tempPlaylist.splice(i, 1); renderPlaylist(); };

// ─── PRICING TOGGLE ───────────────────────────────────
// FIX: Single definition of updatePricingUI
function updatePricingUI() {
    const opts = document.querySelectorAll('.pricing-option');
    const checked = document.querySelector('input[name="pricing"]:checked');
    opts.forEach(o => o.classList.remove('selected'));
    if (checked) checked.closest('.pricing-option')?.classList.add('selected');
}
window.updatePricingUI = updatePricingUI;

// ─── PUBLISH COURSE ───────────────────────────────────
window.publishCourse = async (e) => {
    e.preventDefault();
    if (tempPlaylist.length === 0) return showToast("Add at least one lesson with a YouTube link.", 'error');

    const pricingEl = document.querySelector('input[name="pricing"]:checked');
    const isFree = pricingEl ? pricingEl.value === 'free' : true;

    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Publishing…';

    try {
        await addDoc(collection(db, "courses"), {
            title: document.getElementById('cTitle').value.trim(),
            instructor: document.getElementById('cInst').value.trim(),
            category: document.getElementById('cCat').value,
            description: document.getElementById('cDesc').value.trim(),
            isFree: isFree,
            playlist: tempPlaylist,
            createdAt: serverTimestamp(),
            likes: 0
        });
        showToast("🎉 Course published successfully!", 'success');
        e.target.reset();
        tempPlaylist = [];
        renderPlaylist();
        document.getElementById('priceFree').checked = true;
        updatePricingUI();
    } catch (err) {
        showToast("Failed to publish: " + err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-rocket"></i> Publish Course — Goes Live Immediately';
    }
};

// ─── LOAD COURSES (real-time) ─────────────────────────
function loadCourses() {
    onSnapshot(query(collection(db, "courses"), orderBy("createdAt", "desc")), (snap) => {
        const tb = document.querySelector('#courseTable tbody');
        tb.innerHTML = "";
        if (snap.empty) {
            tb.innerHTML = '<tr><td colspan="6" class="no-data"><i class="fas fa-inbox"></i>No courses yet.</td></tr>';
            return;
        }
        snap.forEach(d => {
            const c = d.data();
            const badge = c.isFree !== false
                ? '<span class="badge badge-free">FREE</span>'
                : '<span class="badge badge-paid">PAID</span>';
            const vidId = c.playlist && c.playlist.length ? c.playlist[0].videoId : '';
            tb.innerHTML += `
            <tr>
                <td>
                    <div style="display:flex; align-items:center; gap:10px;">
                        ${vidId ? `<img src="https://img.youtube.com/vi/${vidId}/default.jpg" style="width:50px; height:35px; border-radius:6px; object-fit:cover;" onerror="this.style.display='none'">` : ''}
                        <strong>${c.title}</strong>
                    </div>
                </td>
                <td>${c.instructor}</td>
                <td>${c.category || 'General'}</td>
                <td>${badge}</td>
                <td>${c.playlist ? c.playlist.length : 1}</td>
                <td>
                    <button class="action-btn btn-trash" onclick="window.delCourse('${d.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>`;
        });
    });
}

window.delCourse = async (id) => {
    if (confirm("Delete this course? This cannot be undone.")) {
        await deleteDoc(doc(db, "courses", id));
        showToast("Course deleted.", 'success');
    }
};

// ─── STUDENTS (real-time) ─────────────────────────────
function loadStudents() {
    onSnapshot(query(collection(db, "users"), where("role", "==", "Student")), (snap) => {
        const tb = document.querySelector('#studentTable tbody');
        tb.innerHTML = "";
        if (snap.empty) {
            tb.innerHTML = '<tr><td colspan="5" class="no-data"><i class="fas fa-users"></i>No students yet.</td></tr>';
            return;
        }
        snap.forEach(d => {
            const u = d.data();
            const blocked = u.isBlocked === true;
            tb.innerHTML += `
            <tr>
                <td>${u.name || '-'}</td>
                <td>${u.email || '-'}</td>
                <td>${u.city || '-'}, ${u.state || '-'}</td>
                <td>
                    <span class="badge ${blocked ? 'badge-blocked' : 'badge-active'}">
                        ${blocked ? 'BLOCKED' : 'ACTIVE'}
                    </span>
                </td>
                <td style="display:flex; gap:6px; flex-wrap:wrap;">
                    ${blocked
                        ? `<button class="action-btn btn-unblock" onclick="window.toggleBlock('${d.id}',false)"><i class="fas fa-check"></i> Unblock</button>`
                        : `<button class="action-btn btn-block" onclick="window.toggleBlock('${d.id}',true)"><i class="fas fa-ban"></i> Block</button>`
                    }
                    <button class="action-btn btn-trash" onclick="window.deleteUser('${d.id}')"><i class="fas fa-trash"></i></button>
                </td>
            </tr>`;
        });
    });
}

window.toggleBlock = async (id, block) => {
    if (confirm(`${block ? 'Block' : 'Unblock'} this student?`)) {
        await updateDoc(doc(db, "users", id), { isBlocked: block });
        showToast(`Student ${block ? 'blocked' : 'unblocked'}.`, block ? 'error' : 'success');
    }
};
window.deleteUser = async (id) => {
    if (confirm("Permanently delete this student? This cannot be undone.")) {
        await deleteDoc(doc(db, "users", id));
        showToast("Student deleted.", 'success');
    }
};

// ─── VERIFICATIONS (real-time) ────────────────────────
function loadVerifications() {
    onSnapshot(query(collection(db, "users"), where("verificationPending", "==", true)), (snap) => {
        const tb = document.querySelector('#verificationTable tbody');
        tb.innerHTML = "";
        if (snap.empty) {
            tb.innerHTML = '<tr><td colspan="3" class="no-data"><i class="fas fa-check-double"></i>No pending verifications.</td></tr>';
            return;
        }
        snap.forEach(d => {
            const u = d.data();
            const idLink = u.idProofUrl && u.idProofUrl !== "https://via.placeholder.com/150"
                ? `<a href="${u.idProofUrl}" target="_blank" style="color:var(--primary); font-size:0.8rem;"><i class="fas fa-eye"></i> View ID Image</a>`
                : `<span style="color:#aaa; font-size:0.8rem;"><i class="fas fa-image"></i> No image (Base64 stored)</span>`;
            tb.innerHTML += `
            <tr>
                <td>
                    <strong>${u.name || 'Unknown'}</strong><br>
                    ${idLink}
                </td>
                <td>${u.submittedAt ? new Date(u.submittedAt.toDate()).toLocaleDateString('en-IN') : 'N/A'}</td>
                <td style="display:flex; gap:8px;">
                    <button class="action-btn btn-approve" onclick="window.verifyUser('${d.id}',true)"><i class="fas fa-check"></i> Approve</button>
                    <button class="action-btn btn-reject" onclick="window.verifyUser('${d.id}',false)"><i class="fas fa-times"></i> Reject</button>
                </td>
            </tr>`;
        });
    });
}

window.verifyUser = async (uid, approved) => {
    await updateDoc(doc(db, "users", uid), {
        isVerified: approved,
        verificationPending: false
    });
    showToast(approved ? "✅ Student verified!" : "❌ Verification rejected.", approved ? 'success' : 'error');
};

// ─── CHATBOT ADMIN PANEL (real-time) ──────────────────
function loadChatbotMessages() {
    const container = document.getElementById('chatStudentList');

    // FIX: Use a simpler query that doesn't require a composite index
    // Just filter by type in JS after fetching
    const q = query(
        collection(db, "chatbot_messages"),
        where("type", "==", "student_msg"),
        orderBy("createdAt", "desc")
    );

    onSnapshot(q, (snap) => {
        const students = new Map();
        snap.forEach(d => {
            const m = d.data();
            if (!m.studentId) return;
            if (!students.has(m.studentId)) {
                students.set(m.studentId, {
                    name: m.studentName || 'Unknown',
                    id: m.studentId,
                    unread: 0,
                    lastMsg: m.text || ''
                });
            }
            if (!m.seen) students.get(m.studentId).unread++;
        });

        container.innerHTML = "";
        if (students.size === 0) {
            container.innerHTML = '<p class="no-data"><i class="fas fa-inbox"></i>No messages yet.</p>';
            return;
        }

        students.forEach((s) => {
            const isActive = selectedStudentId === s.id;
            const div = document.createElement('div');
            div.innerHTML = `
            <div onclick="window.openStudentChat('${s.id}', '${s.name.replace(/'/g, "\\'")}')"
                 style="display:flex; align-items:center; gap:10px; padding:12px; border:1px solid #e5e7eb;
                        border-radius:10px; cursor:pointer; margin-bottom:8px;
                        background:${isActive ? '#eef2ff' : 'white'}; transition:0.2s;">
                <div style="width:40px; height:40px; border-radius:50%; background:#eef2ff; color:var(--primary);
                            display:flex; align-items:center; justify-content:center; font-weight:700; flex-shrink:0;">
                    ${(s.name[0] || '?').toUpperCase()}
                </div>
                <div style="flex:1; min-width:0;">
                    <strong>${s.name}</strong>
                    ${s.unread > 0 ? `<span style="background:var(--danger); color:white; border-radius:10px; padding:2px 8px; font-size:0.75rem; margin-left:6px;">${s.unread} new</span>` : ''}
                    <div style="font-size:0.78rem; color:#888; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${s.lastMsg}</div>
                </div>
                <i class="fas fa-chevron-right" style="color:#aaa; font-size:0.8rem; flex-shrink:0;"></i>
            </div>`;
            container.appendChild(div);
        });
    }, (err) => {
        console.error("Chatbot listener error:", err);
        // If index error, show helpful message
        if (err.code === 'failed-precondition') {
            container.innerHTML = `<p class="no-data" style="color:orange;">
                <i class="fas fa-exclamation-triangle"></i>
                Firestore index required.<br>
                <small>Go to Firebase Console → Firestore → Indexes and create a composite index for <strong>chatbot_messages</strong>: type (ASC) + createdAt (DESC)</small>
            </p>`;
        }
    });
}

window.openStudentChat = (studentId, studentName) => {
    selectedStudentId = studentId;
    document.getElementById('chatStudentName').innerText = studentName;

    // Show conversation area, hide placeholder
    const placeholder = document.getElementById('chatPlaceholder');
    const convoArea = document.getElementById('chatConvoArea');
    if (placeholder) placeholder.style.display = 'none';
    if (convoArea) convoArea.style.display = 'flex';

    if (chatListenerUnsub) chatListenerUnsub();

    const q = query(
        collection(db, "chatbot_messages"),
        where("studentId", "==", studentId),
        orderBy("createdAt", "asc")
    );

    chatListenerUnsub = onSnapshot(q, (snap) => {
        const area = document.getElementById('adminChatMessages');
        area.innerHTML = "";
        snap.forEach(d => {
            const m = d.data();
            const isAdmin = m.type === 'admin_reply';
            const div = document.createElement('div');
            div.className = `admin-chat-msg ${isAdmin ? 'admin-reply' : 'student'}`;
            div.innerHTML = `
                <div class="msg-sender">${isAdmin ? '🛡️ Admin' : '👤 ' + (m.studentName || 'Student')}</div>
                <div class="msg-text">${m.text}</div>`;
            area.appendChild(div);
            // Mark student messages as seen
            if (!isAdmin && !m.seen) updateDoc(d.ref, { seen: true });
        });
        area.scrollTop = area.scrollHeight;

        // Refresh the student list so unread counts update
        loadChatbotMessages();
    }, (err) => {
        console.error("Chat conversation error:", err);
    });
};

window.sendAdminReply = async () => {
    const input = document.getElementById('adminReplyInput');
    const text = input.value.trim();
    if (!text) return showToast("Type a message first.", 'error');
    if (!selectedStudentId) return showToast("Select a student first.", 'error');

    input.value = "";
    input.disabled = true;

    try {
        await addDoc(collection(db, "chatbot_messages"), {
            studentId: selectedStudentId,
            studentName: "Admin",
            text: text,
            type: 'admin_reply',
            seen: false,
            createdAt: serverTimestamp()
        });
    } catch (err) {
        showToast("Failed to send: " + err.message, 'error');
    } finally {
        input.disabled = false;
        input.focus();
    }
};
