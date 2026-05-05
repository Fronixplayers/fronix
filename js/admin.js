// js/admin.js — FronixLearner Admin Dashboard Logic (FINAL FIXED)

import {
    auth, db,
    onAuthStateChanged, signOut,
    collection, addDoc, getDoc, getDocs, doc, onSnapshot,
    query, updateDoc, where, orderBy, deleteDoc, serverTimestamp, setDoc
} from './firebase-config.js';

let tempPlaylist = [];
let chatListenerUnsub = null;
let selectedStudentId = null;

// ─── AUTH GUARD ───────────────────────────────────────
onAuthStateChanged(auth, async (user) => {
    if (user) {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists() && snap.data().role === 'Admin') {
            initAdmin();
        } else {
            alert("Admin only");
            window.location.href = 'index.html';
        }
    } else {
        window.location.href = 'index.html';
    }
});

// ─── INIT ─────────────────────────────────────────────
function initAdmin() {
    loadChatbotMessages();
}

// ================= CHAT FIX START =================

// ✅ FIXED: NO INDEX REQUIRED
function loadChatbotMessages() {
    const container = document.getElementById('chatStudentList');

    onSnapshot(collection(db, "chatbot_messages"), (snap) => {

        const students = {};

        snap.forEach(d => {
            const m = d.data();

            if (m.type !== "student_msg") return;

            if (!students[m.studentId]) {
                students[m.studentId] = {
                    name: m.studentName || "Unknown",
                    unread: 0,
                    last: m.text
                };
            }

            if (!m.seen) students[m.studentId].unread++;
        });

        container.innerHTML = "";

        Object.keys(students).forEach(id => {
            const s = students[id];

            container.innerHTML += `
            <div onclick="openStudentChat('${id}', '${s.name}')"
                 style="padding:10px; border-bottom:1px solid #eee; cursor:pointer;">
                 
                <strong>${s.name}</strong>
                ${s.unread > 0 ? `<span style="color:red;">(${s.unread})</span>` : ""}
                <div style="font-size:12px;">${s.last}</div>
            </div>`;
        });

    });
}

// ✅ OPEN CHAT (REAL-TIME)
window.openStudentChat = (studentId, studentName) => {
    selectedStudentId = studentId;

    document.getElementById('chatStudentName').innerText = studentName;

    if (chatListenerUnsub) chatListenerUnsub();

    chatListenerUnsub = onSnapshot(collection(db, "chatbot_messages"), (snap) => {

        const area = document.getElementById('adminChatMessages');
        area.innerHTML = "";

        snap.forEach(d => {
            const m = d.data();

            if (m.studentId !== studentId) return;

            const isAdmin = m.type === "admin_reply";

            area.innerHTML += `
            <div style="margin:6px 0; text-align:${isAdmin ? 'right' : 'left'};">
                <div style="display:inline-block; padding:8px; border-radius:8px;
                     background:${isAdmin ? '#6366f1' : '#eee'};
                     color:${isAdmin ? 'white' : 'black'};">
                    ${m.text}
                </div>
            </div>
            `;

            // mark seen
            if (!isAdmin && !m.seen) {
                updateDoc(d.ref, { seen: true });
            }
        });

        area.scrollTop = area.scrollHeight;
    });
};

// ✅ SEND ADMIN REPLY (FIXED)
window.sendAdminReply = async () => {
    const input = document.getElementById('adminReplyInput');
    const text = input.value.trim();

    if (!text) return;
    if (!selectedStudentId) return alert("Select student first");

    await addDoc(collection(db, "chatbot_messages"), {
        studentId: selectedStudentId,
        text,
        type: "admin_reply",
        seen: false,
        createdAt: new Date() // 🔥 important fix
    });

    input.value = "";
};

// ================= CHAT FIX END =================

// LOGOUT
window.logout = () => signOut(auth);