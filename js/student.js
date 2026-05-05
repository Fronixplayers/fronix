// js/student.js — FronixLearner Student Dashboard Logic (FINAL FIXED)

import {
    auth, db,
    onAuthStateChanged, signOut,
    collection, addDoc, getDoc, doc, onSnapshot,
    query, orderBy, serverTimestamp, updateDoc, increment,
    where, limit
} from './firebase-config.js';

// ─── STATE ───────────────────────────────────────────
let currentUser = null;
let currentCourseId = null;
let currentPlaylist = [];
let selectedAvatar = "";
let courseListenerUnsub = null; // ✅ FIX: prevent multiple listeners

const avatarSeeds = ['Felix', 'Aneka', 'Mittens', 'Bubba', 'Sorelle', 'Destiny', 'Shadow', 'Max'];
const BBA_DRIVE_LINK = "https://drive.google.com/drive/folders/1DNaT7uUiVoHKQkj8LejyUmKASot2gQz1";

// ─── TOAST ───────────────────────────────────────────
function showToast(msg, type = 'info') {
    const t = document.getElementById('toast');
    t.innerHTML = `<div class="toast-inner ${type}">
        <i class="fas fa-${type === 'error' ? 'exclamation-circle' : type === 'success' ? 'check-circle' : 'info-circle'}"></i>
        <span>${msg}</span>
    </div>`;
    t.style.display = 'block';
    setTimeout(() => t.style.display = 'none', 4000);
}

// ─── SINGLE TAB ───────────────────────────────────────
const channel = new BroadcastChannel('fronix_active_session');
channel.postMessage('new-tab-opened');

channel.onmessage = (e) => {
    if (e.data === 'new-tab-opened') {
        channel.postMessage('tab-already-exists');
    } else if (e.data === 'tab-already-exists') {
        alert("Already opened in another tab.");
        window.location.href = 'index.html';
    }
};

// ─── AUTH ─────────────────────────────────────────────
onAuthStateChanged(auth, async (user) => {
    if (!user) return window.location.href = 'index.html';

    onSnapshot(doc(db, "users", user.uid), (snap) => {
        if (!snap.exists()) {
            signOut(auth);
            return window.location.href = 'index.html';
        }

        const data = snap.data();

        if (data.isBlocked) {
            alert("Blocked by admin.");
            signOut(auth);
            return window.location.href = 'index.html';
        }

        currentUser = { ...data, uid: user.uid };

        if (!currentUser.avatar) {
            currentUser.avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`;
        }

        updateUI();
        loadCourses(); // safe now
    });
});

// ─── UI ───────────────────────────────────────────────
function updateUI() {
    document.getElementById('welcomeName').innerText = currentUser.name || 'Student';
    document.getElementById('headerAvatar').src = currentUser.avatar;
}

// ─── NAVIGATION FIX ───────────────────────────────────
window.switchView = (view, el) => {
    document.getElementById('viewCourses').style.display = view === 'courses' ? 'block' : 'none';
    document.getElementById('viewResources').style.display = view === 'resources' ? 'block' : 'none';

    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    if (el) el.classList.add('active'); // ✅ FIX

    if (window.innerWidth <= 900) {
        document.querySelector('aside').classList.remove('open');
    }
};

window.logout = () => signOut(auth).then(() => window.location.href = 'index.html');

// ─── COURSES FIX ──────────────────────────────────────
function loadCourses() {

    if (courseListenerUnsub) return; // ✅ FIX: prevent duplicate listener

    const q = query(collection(db, "courses"), orderBy("createdAt", "desc"));

    courseListenerUnsub = onSnapshot(q, (snap) => {
        const g = document.getElementById('courseGrid');
        g.innerHTML = "";

        if (snap.empty) {
            g.innerHTML = `<p style="text-align:center;">No courses</p>`;
            return;
        }

        snap.forEach(d => {
            const c = d.data();
            const v = c.videoId || (c.playlist?.[0]?.videoId || '');

            g.innerHTML += `
            <div class="course-card" onclick="window.openCourse('${d.id}')">
                <img src="https://img.youtube.com/vi/${v}/hqdefault.jpg">
                <h4>${c.title}</h4>
            </div>`;
        });
    });
}

// ─── COURSE PLAYER ────────────────────────────────────
window.openCourse = async (id) => {
    currentCourseId = id;

    const snap = await getDoc(doc(db, "courses", id));
    const c = snap.data();

    currentPlaylist = c.playlist || [{ videoId: c.videoId }];
    loadVideo(0);
};

window.loadVideo = (idx) => {
    const lesson = currentPlaylist[idx];

    document.getElementById('playerFrame').src =
        `https://www.youtube.com/embed/${lesson.videoId}?autoplay=1`;
};

// ─── LIKE FIX ─────────────────────────────────────────
window.toggleLike = async () => {
    if (!currentCourseId) return;

    try {
        await updateDoc(doc(db, "courses", currentCourseId), {
            likes: increment(1)
        });
    } catch (e) {
        console.error(e);
    }
};

// ─── CHATBOT FIX ──────────────────────────────────────
let chatListenerUnsub = null;

function initChatbot() {

    if (chatListenerUnsub) return; // ✅ FIX

    const q = query(
        collection(db, "chatbot_messages"),
        where("studentId", "==", currentUser.uid),
        where("type", "==", "admin_reply")
    );

    chatListenerUnsub = onSnapshot(q, (snap) => {
        snap.docChanges().forEach(change => {
            if (change.type === 'added') {
                const m = change.doc.data();

                if (!m.seen) {
                    appendBotMsg("Admin: " + m.text);
                    updateDoc(change.doc.ref, { seen: true });
                }
            }
        });
    });
}

function appendBotMsg(text) {
    const msgs = document.getElementById('chatbotMsgs');
    const div = document.createElement('div');
    div.className = 'bot-msg';
    div.innerHTML = text;
    msgs.appendChild(div);
}

// ─── PROFILE FIX ──────────────────────────────────────
window.switchProfileTab = (tab) => {
    document.querySelectorAll('.p-tab').forEach(t => t.classList.remove('active'));

    document.getElementById('tab-edit').style.display = tab === 'edit' ? 'block' : 'none';
    document.getElementById('tab-certs').style.display = tab === 'certs' ? 'block' : 'none';
    document.getElementById('tab-id').style.display = tab === 'id' ? 'block' : 'none';
};

// ─── VERIFICATION (SAFE) ──────────────────────────────
window.submitVerification = async () => {
    const file = document.getElementById('idProofInput').files[0];
    if (!file) return showToast("Select file", 'error');

    if (file.size > 1000000) { // ✅ FIX size limit
        return showToast("Image too large (max 1MB)", 'error');
    }

    const reader = new FileReader();

    reader.onload = async () => {
        await updateDoc(doc(db, "users", currentUser.uid), {
            verificationPending: true,
            idProofUrl: reader.result,
            submittedAt: serverTimestamp()
        });

        showToast("Submitted!", 'success');
    };

    reader.readAsDataURL(file);
};