// js/student.js — FronixLearner Student Dashboard Logic (FIXED)

import {
    auth, db, storage,
    onAuthStateChanged, signOut,
    collection, addDoc, getDoc, getDocs, doc, onSnapshot,
    query, orderBy, serverTimestamp, updateDoc, increment,
    where, limit, setDoc,
    ref, uploadBytesResumable, getDownloadURL
} from './firebase-config.js';

// ─── STATE ───────────────────────────────────────────
let currentUser   = null;
let currentCourseId  = null;
let currentPlaylist  = [];
let selectedAvatar   = "";
const avatarSeeds    = ['Felix','Aneka','Mittens','Bubba','Sorelle','Destiny','Shadow','Max'];
const BBA_DRIVE_LINK = "https://drive.google.com/drive/folders/1DNaT7uUiVoHKQkj8LejyUmKASot2gQz1";

// ─── TOAST ───────────────────────────────────────────
function showToast(msg, type = 'info') {
    const t = document.getElementById('toast');
    t.innerHTML = `<div class="toast-inner ${type}">
        <i class="fas fa-${type==='error'?'exclamation-circle':type==='success'?'check-circle':'info-circle'}"></i>
        <span>${msg}</span></div>`;
    t.style.display = 'block';
    setTimeout(() => t.style.display = 'none', 4500);
}

// ─── SINGLE TAB ENFORCEMENT ───────────────────────────
const channel = new BroadcastChannel('fronix_active_session');
channel.postMessage('new-tab-opened');
channel.onmessage = (e) => {
    if (e.data === 'new-tab-opened') channel.postMessage('tab-already-exists');
    else if (e.data === 'tab-already-exists') {
        alert("FronixLearner is already open in another tab.");
        window.location.href = 'index.html';
    }
};

// ─── AUTH GUARD ───────────────────────────────────────
onAuthStateChanged(auth, async (user) => {
    if (user) {
        onSnapshot(doc(db, "users", user.uid), (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                if (data.isBlocked) {
                    alert("Your account has been blocked by admin.");
                    signOut(auth).then(() => window.location.href = 'index.html');
                    return;
                }
                currentUser = { ...data, uid: user.uid };
                if (!currentUser.avatar)
                    currentUser.avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`;
                updateUI();
                loadCourses();
            } else {
                signOut(auth).then(() => window.location.href = 'index.html');
            }
        });
    } else {
        window.location.href = 'index.html';
    }
});

// ─── UPDATE UI ────────────────────────────────────────
function updateUI() {
    document.getElementById('welcomeName').innerText = currentUser.name || 'Student';
    document.getElementById('headerAvatar').src      = currentUser.avatar;
    document.getElementById('verifiedBadge').innerText = currentUser.isVerified ? "Yes ✓" : "No";

    const lockBadge = document.getElementById('bbaLockStatus');
    if (currentUser.isVerified) {
        lockBadge.className = 'lock-badge status-unlocked';
        lockBadge.innerHTML = '<i class="fas fa-lock-open"></i> Access';
    } else {
        lockBadge.className = 'lock-badge status-locked';
        lockBadge.innerHTML = '<i class="fas fa-lock"></i> Locked';
    }

    const uploadSection = document.getElementById('uploadSection');
    const pendingMsg    = document.getElementById('pendingMsg');
    const verifiedMsg   = document.getElementById('verifiedMsg');

    if (currentUser.isVerified) {
        uploadSection.style.display = 'none';
        pendingMsg.style.display    = 'none';
        verifiedMsg.style.display   = 'block';
    } else if (currentUser.verificationPending) {
        uploadSection.style.display = 'none';
        pendingMsg.style.display    = 'block';
        verifiedMsg.style.display   = 'none';
    } else {
        uploadSection.style.display = 'block';
        pendingMsg.style.display    = 'none';
        verifiedMsg.style.display   = 'none';
    }

    document.getElementById('verificationStatus').innerText = currentUser.isVerified
        ? "✓ Verified Student"
        : (currentUser.verificationPending ? "⏳ Pending Verification" : "Unverified");
}

// ─── NAVIGATION ───────────────────────────────────────
window.switchView = (view) => {
    document.getElementById('viewCourses').style.display   = view === 'courses'   ? 'block' : 'none';
    document.getElementById('viewResources').style.display = view === 'resources' ? 'block' : 'none';
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    event.currentTarget.classList.add('active');
    if (window.innerWidth <= 900) document.querySelector('aside').classList.remove('open');
};
window.toggleSidebar = () => document.querySelector('aside').classList.toggle('open');
window.logout = () => signOut(auth).then(() => window.location.href = 'index.html');

// ─── COURSES (real-time) ──────────────────────────────
function loadCourses() {
    onSnapshot(query(collection(db, "courses"), orderBy("createdAt", "desc")), (snap) => {
        const g = document.getElementById('courseGrid');
        g.innerHTML = "";
        if (snap.empty) {
            g.innerHTML = `<p style="color:#999;grid-column:1/-1;text-align:center;padding:40px;">No courses yet.</p>`;
            return;
        }
        snap.forEach(d => {
            const c = d.data();
            const v = (c.playlist && c.playlist.length) ? c.playlist[0].videoId : c.videoId || '';
            const priceBadge = c.isFree !== false
                ? `<span class="badge badge-free" style="font-size:0.72rem;"><i class="fas fa-lock-open"></i> Free</span>`
                : `<span class="badge badge-paid" style="font-size:0.72rem;"><i class="fas fa-lock"></i> Paid</span>`;
            g.innerHTML += `
            <div class="course-card" onclick="window.openCourse('${d.id}')">
                <img class="course-thumbnail"
                     src="https://img.youtube.com/vi/${v}/hqdefault.jpg"
                     alt="${c.title}"
                     onerror="this.src='https://placehold.co/400x220/6366f1/white?text=Course'">
                <div class="course-badge">${priceBadge}</div>
                <div class="course-info">
                    <h4>${c.title}</h4>
                    <p>${c.instructor || ''} • ${c.playlist ? c.playlist.length : 1} lessons</p>
                </div>
            </div>`;
        });
    });
}

// ─── COURSE PLAYER ────────────────────────────────────
window.openCourse = async (id) => {
    currentCourseId = id;
    document.getElementById('courseModal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
    const snap = await getDoc(doc(db, "courses", id));
    const c = snap.data();
    currentPlaylist = c.playlist || [{ title: "Lesson 1", videoId: c.videoId || '' }];
    document.getElementById('likeCount').innerText = c.likes || 0;
    window.loadVideo(0);
    switchCourseTab('lessons');
};

window.loadVideo = (idx) => {
    const lesson = currentPlaylist[idx];
    document.getElementById('playerFrame').src =
        `https://www.youtube.com/embed/${lesson.videoId}?autoplay=1`;
    document.getElementById('currentLessonTitle').innerText = lesson.title || `Lesson ${idx + 1}`;
    const container = document.getElementById('playlistContainer');
    container.innerHTML = currentPlaylist.map((l, i) => `
        <div class="lesson-item ${i === idx ? 'active' : ''}" onclick="window.loadVideo(${i})">
            <div class="lesson-num">${i + 1}</div>
            <span>${l.title || 'Lesson ' + (i + 1)}</span>
        </div>`).join('');
};

window.switchTab = (t) => switchCourseTab(t);
function switchCourseTab(t) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab').forEach(el => el.classList.remove('active'));
    const tabEl = document.getElementById(t + 'Tab');
    if (tabEl) tabEl.classList.add('active');
    const map = { lessons: 0, drive: 1, chat: 2 };
    const tabEls = document.querySelectorAll('.tab');
    if (tabEls[map[t]]) tabEls[map[t]].classList.add('active');

    if (t === 'drive') {
        const div = document.getElementById('driveAccessMsg');
        div.innerHTML = currentUser?.isVerified
            ? `<div class="drive-unlocked" onclick="window.open('${BBA_DRIVE_LINK}','_blank')" style="text-align:center;padding:30px;cursor:pointer;">
                   <i class="fab fa-google-drive" style="font-size:3rem;color:#4285f4;"></i><br><br>
                   <strong>Click to Open Resources</strong><br>
                   <small>Verified Access Granted</small>
               </div>`
            : `<div class="drive-locked" style="text-align:center;padding:30px;">
                   <i class="fas fa-lock" style="font-size:2.5rem;color:#ef4444;"></i><br><br>
                   <strong>Verification Required</strong><br>
                   <small>Upload your College ID in Profile → ID Verification tab.</small>
               </div>`;
    } else if (t === 'chat') {
        loadCourseComments();
    }
}

window.toggleLike = async () => {
    if (!currentCourseId) return;
    await updateDoc(doc(db, "courses", currentCourseId), { likes: increment(1) });
    document.getElementById('likeCount').innerText =
        parseInt(document.getElementById('likeCount').innerText) + 1;
};

function loadCourseComments() {
    onSnapshot(
        query(collection(db, "comments"),
              where("courseId", "==", currentCourseId),
              orderBy("createdAt", "asc")),
        (snap) => {
            const l = document.getElementById('chatList');
            l.innerHTML = "";
            snap.forEach(d => {
                const m = d.data();
                const isMe = m.userId === currentUser?.uid;
                l.innerHTML += `
                <div class="chat-msg ${isMe ? 'mine' : 'other'}">
                    ${!isMe ? `<div class="sender">${m.userName}</div>` : ''}
                    <div>${m.text}</div>
                </div>`;
            });
            l.scrollTop = l.scrollHeight;
        }
    );
}

window.handleSend = async () => {
    const txt = document.getElementById('interactionInput').value.trim();
    if (!txt || !currentUser) return;
    await addDoc(collection(db, "comments"), {
        courseId: currentCourseId,
        text: txt,
        userName: currentUser.name,
        userId: currentUser.uid,
        createdAt: serverTimestamp()
    });
    document.getElementById('interactionInput').value = "";
};

document.getElementById('interactionInput')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') window.handleSend();
});

window.closeCourseModal = () => {
    document.getElementById('courseModal').style.display = 'none';
    document.getElementById('playerFrame').src = '';
    document.body.style.overflow = '';
};

// ─── RESOURCES ────────────────────────────────────────
window.accessDrive = () => {
    if (currentUser?.isVerified) window.open(BBA_DRIVE_LINK, '_blank');
    else {
        showToast("🔒 Verify your College ID first!", 'error');
        window.openProfile();
        window.switchProfileTab('id');
    }
};

// ─── LEADERBOARD ─────────────────────────────────────
window.openLeaderboard = () => {
    document.getElementById('leaderboardModal').style.display = 'flex';
    const list = document.getElementById('lbList');
    list.innerHTML = "Loading…";
    const q = query(collection(db, "users"),
                    where("role", "==", "Student"),
                    orderBy("xp", "desc"),
                    limit(10));
    onSnapshot(q, (snap) => {
        list.innerHTML = "";
        let r = 1;
        snap.forEach(d => {
            const u = d.data();
            const rankClass = r === 1 ? 'gold' : r === 2 ? 'silver' : r === 3 ? 'bronze' : '';
            list.innerHTML += `
            <div class="lb-item">
                <div class="lb-rank ${rankClass}">#${r++}</div>
                <div class="lb-user">
                    <img class="lb-avatar"
                         src="${u.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.name}`}"
                         alt="${u.name}">
                    <span>${u.name}</span>
                </div>
                <div style="font-weight:800;color:#f59e0b;">${u.xp || 0} XP</div>
            </div>`;
        });
        if (snap.empty)
            list.innerHTML = '<p style="text-align:center;color:#999;">No rankings yet.</p>';
    }, () => {
        list.innerHTML = '<p style="text-align:center;color:#999;">No rankings yet.</p>';
    });
};

// ─── PROFILE ──────────────────────────────────────────
window.openProfile = () => {
    document.getElementById('profileModal').style.display = 'flex';
    document.getElementById('profileNameDisplay').innerText  = currentUser?.name || '';
    document.getElementById('profileCurrentAvatar').src      = currentUser?.avatar || '';
    document.getElementById('settingsName').value            = currentUser?.name || '';
    document.getElementById('settingsBio').value             = currentUser?.bio  || '';
    document.getElementById('verificationStatus').innerText  = currentUser?.isVerified
        ? "✓ Verified Student"
        : (currentUser?.verificationPending ? "⏳ Pending Verification" : "Unverified Student");

    const grid = document.getElementById('avatarGrid');
    grid.innerHTML = "";
    avatarSeeds.forEach(seed => {
        const url = `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;
        grid.innerHTML += `<img src="${url}" class="avatar-option ${currentUser?.avatar === url ? 'selected' : ''}"
                               onclick="window.selectAvatar(this,'${url}')">`;
    });

    switchProfileTabInternal('edit');
    loadCertWallet();
};

window.switchProfileTab = (tab) => switchProfileTabInternal(tab);
function switchProfileTabInternal(tab) {
    document.querySelectorAll('.p-tab').forEach(t => t.classList.remove('active'));
    ['tab-edit','tab-certs','tab-id'].forEach(id => document.getElementById(id).style.display = 'none');
    const map = { edit: ['tab-edit', 0], certs: ['tab-certs', 1], id: ['tab-id', 2] };
    document.getElementById(map[tab][0]).style.display = 'block';
    document.querySelectorAll('.p-tab')[map[tab][1]]?.classList.add('active');
}

window.selectAvatar = (el, url) => {
    document.querySelectorAll('.avatar-option').forEach(i => i.classList.remove('selected'));
    el.classList.add('selected');
    selectedAvatar = url;
};

window.saveProfile = async () => {
    const newName = document.getElementById('settingsName').value.trim();
    const newBio  = document.getElementById('settingsBio').value.trim();
    if (!newName) return showToast("Name cannot be empty.", 'error');
    await updateDoc(doc(db, "users", currentUser.uid), {
        name: newName,
        bio: newBio,
        avatar: selectedAvatar || currentUser.avatar
    });
    showToast("Profile updated!", 'success');
    document.getElementById('profileModal').style.display = 'none';
};

async function loadCertWallet() {
    const list = document.getElementById('walletList');
    list.innerHTML = "";
    const ids = currentUser.completedCourses || [];
    if (!ids.length) {
        list.innerHTML = "<p style='color:#999;text-align:center;padding:20px;'>No certificates yet.</p>";
        return;
    }
    for (const id of ids) {
        const cSnap = await getDoc(doc(db, "courses", id));
        if (cSnap.exists()) {
            list.innerHTML += `
            <div style="padding:12px;border:1px solid #eee;margin-bottom:8px;
                        border-radius:8px;display:flex;align-items:center;gap:10px;">
                <i class="fas fa-certificate" style="color:#fbbf24;font-size:1.4rem;"></i>
                <strong>${cSnap.data().title}</strong>
            </div>`;
        }
    }
}

// ══════════════════════════════════════════════════════
// ─── ID VERIFICATION — FIXED (Firebase Storage Upload)
//     Supports images up to 10MB
//     Shows real upload progress bar
// ══════════════════════════════════════════════════════
window.submitVerification = async () => {
    const fileInput = document.getElementById('idProofInput');
    const file      = fileInput.files[0];

    // ── Validation ────────────────────────────────────
    if (!file) {
        showToast("Please select an image file.", 'error');
        return;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'image/heic'];
    if (!allowedTypes.includes(file.type)) {
        showToast("Only image files allowed (JPG, PNG, WEBP).", 'error');
        return;
    }

    const MAX_SIZE_MB = 10;
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        showToast(`File too large. Max allowed size is ${MAX_SIZE_MB}MB.`, 'error');
        return;
    }

    // ── UI: Show progress bar, disable button ─────────
    const btn         = document.getElementById('idSubmitBtn');
    const progressBox = document.getElementById('uploadProgressBox');
    const progressBar = document.getElementById('uploadProgressBar');
    const progressTxt = document.getElementById('uploadProgressTxt');

    btn.disabled       = true;
    btn.innerHTML      = '<i class="fas fa-spinner fa-spin"></i> Uploading…';
    progressBox.style.display = 'block';
    progressBar.style.width   = '0%';
    progressTxt.innerText     = 'Starting upload…';

    try {
        // ── Upload to Firebase Storage ─────────────────
        const ext       = file.name.split('.').pop();
        const filePath  = `id_proofs/${currentUser.uid}_${Date.now()}.${ext}`;
        const storageRef = ref(storage, filePath);
        const uploadTask = uploadBytesResumable(storageRef, file);

        const downloadURL = await new Promise((resolve, reject) => {
            uploadTask.on(
                'state_changed',
                // Progress
                (snapshot) => {
                    const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
                    progressBar.style.width = pct + '%';
                    progressTxt.innerText   = `Uploading… ${pct}%`;
                },
                // Error
                (err) => reject(err),
                // Complete
                async () => {
                    const url = await getDownloadURL(uploadTask.snapshot.ref);
                    resolve(url);
                }
            );
        });

        // ── Save URL to Firestore ──────────────────────
        await updateDoc(doc(db, "users", currentUser.uid), {
            verificationPending: true,
            idProofUrl:          downloadURL,      // real Firebase Storage URL
            submittedAt:         serverTimestamp()
        });

        // ── Success UI ────────────────────────────────
        progressBar.style.width = '100%';
        progressTxt.innerText   = 'Upload complete!';
        showToast("✅ ID submitted! Admin will review shortly.", 'success');

        document.getElementById('uploadSection').style.display = 'none';
        document.getElementById('pendingMsg').style.display    = 'block';

    } catch (err) {
        console.error("Upload error:", err);
        let msg = err.message;
        if (err.code === 'storage/unauthorized')
            msg = "Upload not allowed. Check Firebase Storage rules.";
        else if (err.code === 'storage/canceled')
            msg = "Upload was cancelled.";
        showToast("Upload failed: " + msg, 'error');

        btn.disabled  = false;
        btn.innerHTML = '<i class="fas fa-upload"></i> Submit ID';
        progressBox.style.display = 'none';
    }
};

// ─── CHATBOT ──────────────────────────────────────────
let chatbotOpen       = false;
let chatListenerUnsub = null;
let chatInitialized   = false;

window.toggleChatbot = () => {
    chatbotOpen = !chatbotOpen;
    const win = document.getElementById('chatbotWindow');
    const fab = document.getElementById('chatbotFab');
    if (chatbotOpen) {
        win.classList.add('open');
        fab.querySelector('i').className = 'fas fa-times';
        initChatbot();
    } else {
        win.classList.remove('open');
        fab.querySelector('i').className = 'fas fa-comment-dots';
        if (chatListenerUnsub) { chatListenerUnsub(); chatListenerUnsub = null; }
        chatInitialized = false;
    }
};

window.closeChatbot = () => {
    chatbotOpen = false;
    document.getElementById('chatbotWindow').classList.remove('open');
    document.getElementById('chatbotFab').querySelector('i').className = 'fas fa-comment-dots';
    if (chatListenerUnsub) { chatListenerUnsub(); chatListenerUnsub = null; }
    chatInitialized = false;
};

function initChatbot() {
    if (chatInitialized) return;
    chatInitialized = true;
    const msgs = document.getElementById('chatbotMsgs');
    if (!msgs.hasChildNodes())
        appendBotMsg("👋 Hi " + (currentUser?.name?.split(' ')[0] || 'there') + "! How can I help you today?");
    if (!currentUser) return;

    const q = query(
        collection(db, "chatbot_messages"),
        where("studentId", "==", currentUser.uid),
        where("type", "==", "admin_reply"),
        orderBy("createdAt", "asc")
    );
    chatListenerUnsub = onSnapshot(q, (snap) => {
        snap.docChanges().forEach(change => {
            if (change.type === 'added' && !change.doc.data().seen) {
                appendBotMsg("🛡️ <strong>Admin:</strong> " + change.doc.data().text);
                updateDoc(change.doc.ref, { seen: true });
            }
        });
    }, (err) => console.error("Chatbot listener:", err));
}

function appendBotMsg(text) {
    const msgs = document.getElementById('chatbotMsgs');
    const div  = document.createElement('div');
    div.className   = 'bot-msg';
    div.innerHTML   = text;
    msgs.appendChild(div);
    msgs.scrollTop  = msgs.scrollHeight;
}
function appendUserMsg(text) {
    const msgs = document.getElementById('chatbotMsgs');
    const div  = document.createElement('div');
    div.className  = 'user-msg';
    div.textContent = text;
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
}

window.sendChatbotMsg = async () => {
    const input = document.getElementById('chatbotInput');
    const text  = input.value.trim();
    if (!text || !currentUser) return;
    input.value = "";
    appendUserMsg(text);

    const msgs   = document.getElementById('chatbotMsgs');
    const typing = document.createElement('div');
    typing.className = 'bot-msg typing-indicator';
    typing.innerHTML = '<span></span><span></span><span></span>';
    msgs.appendChild(typing);
    msgs.scrollTop = msgs.scrollHeight;

    try {
        await addDoc(collection(db, "chatbot_messages"), {
            studentId:   currentUser.uid,
            studentName: currentUser.name,
            text, type: 'student_msg',
            seen: false, createdAt: serverTimestamp()
        });
    } catch (err) { console.error("Save msg failed:", err); }

    setTimeout(() => {
        typing.remove();
        appendBotMsg(getAutoReply(text.toLowerCase()));
    }, 1200);
};

function getAutoReply(text) {
    if (text.includes('course') || text.includes('video'))
        return "📚 Browse all courses in the <strong>Learning</strong> section!";
    if (text.includes('certificate') || text.includes('cert'))
        return "🏆 Certificates appear in <strong>Profile → Certificates</strong> after completing a course.";
    if (text.includes('verify') || text.includes('id') || text.includes('bba') || text.includes('note'))
        return "📝 Upload your College ID in <strong>Profile → ID Verification</strong> to unlock resources.";
    if (text.includes('password') || text.includes('forgot'))
        return "🔑 Logout and click <strong>Forgot Password</strong> on the login page.";
    if (text.includes('hello') || text.includes('hi') || text.includes('hey'))
        return "👋 Hello! Ask me about courses, certificates, or resources!";
    if (text.includes('thank'))
        return "😊 You're welcome! Feel free to ask anything else.";
    return "📨 Message forwarded to our admin team. They'll reply here shortly!";
}

document.getElementById('chatbotInput')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') window.sendChatbotMsg();
});
