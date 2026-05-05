// js/student.js — FronixLearner Student Dashboard Logic (FINAL FIXED)

import {
    auth, db,
    onAuthStateChanged, signOut,
    collection, addDoc, getDoc, getDocs, doc, onSnapshot,
    query, orderBy, serverTimestamp, updateDoc, increment,
    where, limit, setDoc
} from './firebase-config.js';

// ─── STATE ───────────────────────────────────────────
let currentUser = null;
let currentCourseId = null;
let currentPlaylist = [];
let selectedAvatar = "";
const avatarSeeds = ['Felix', 'Aneka', 'Mittens', 'Bubba', 'Sorelle', 'Destiny', 'Shadow', 'Max'];
const BBA_DRIVE_LINK = "https://drive.google.com/drive/folders/1DNaT7uUiVoHKQkj8LejyUmKASot2gQz1";

// ─── TOAST ───────────────────────────────────────────
function showToast(msg, type = 'info') {
    const t = document.getElementById('toast');
    t.innerHTML = `<div class="toast-inner ${type}"><span>${msg}</span></div>`;
    t.style.display = 'block';
    setTimeout(() => t.style.display = 'none', 4000);
}

// ─── AUTH GUARD ───────────────────────────────────────
onAuthStateChanged(auth, async (user) => {
    if (user) {
        onSnapshot(doc(db, "users", user.uid), (snap) => {
            if (snap.exists()) {
                const data = snap.data();

                if (data.isBlocked) {
                    alert("Blocked by admin");
                    signOut(auth);
                    return;
                }

                currentUser = { ...data, uid: user.uid };
                updateUI();
                loadCourses();
            }
        });
    } else {
        window.location.href = 'index.html';
    }
});

// ─── UPDATE UI ────────────────────────────────────────
function updateUI() {
    document.getElementById('welcomeName').innerText = currentUser.name || 'Student';
}

// ─── COURSES ─────────────────────────────────────────
function loadCourses() {
    onSnapshot(query(collection(db, "courses"), orderBy("createdAt", "desc")), (snap) => {
        const g = document.getElementById('courseGrid');
        g.innerHTML = "";
        snap.forEach(d => {
            const c = d.data();
            const v = c.playlist?.[0]?.videoId || '';
            g.innerHTML += `
            <div onclick="openCourse('${d.id}')">
                <img src="https://img.youtube.com/vi/${v}/hqdefault.jpg">
                <h4>${c.title}</h4>
            </div>`;
        });
    });
}

// ─── KYC FIX (MAIN ISSUE SOLVED HERE) ─────────────────
window.submitVerification = async () => {
    const file = document.getElementById('idProofInput').files[0];

    if (!file) {
        showToast("Select image first", 'error');
        return;
    }

    // 🔥 SIZE FIX (IMPORTANT)
    if (file.size > 500000) {
        showToast("Image too large! Max 500KB", 'error');
        return;
    }

    const btn = document.querySelector('#tab-id button');
    if (btn) {
        btn.disabled = true;
        btn.innerText = "Uploading...";
    }

    try {
        const reader = new FileReader();

        reader.onloadend = async () => {
            const base64 = reader.result;

            // 🔥 FIRESTORE UPDATE
            await updateDoc(doc(db, "users", currentUser.uid), {
                verificationPending: true,
                isVerified: false,
                idProofUrl: base64,
                submittedAt: serverTimestamp()
            });

            showToast("✅ ID Submitted!");

            document.getElementById('uploadSection').style.display = 'none';
            document.getElementById('pendingMsg').style.display = 'block';
        };

        reader.readAsDataURL(file);

    } catch (err) {
        showToast("Error: " + err.message, 'error');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerText = "Submit ID";
        }
    }
};

// ─── CHATBOT ──────────────────────────────────────────
window.sendChatbotMsg = async () => {
    const input = document.getElementById('chatbotInput');
    const text = input.value.trim();
    if (!text) return;

    input.value = "";

    await addDoc(collection(db, "chatbot_messages"), {
        studentId: currentUser.uid,
        studentName: currentUser.name,
        text: text,
        type: 'student_msg',
        seen: false,
        createdAt: serverTimestamp()
    });
};