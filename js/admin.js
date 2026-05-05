// js/admin.js

import {
    auth, db,
    onAuthStateChanged, signOut,
    collection, addDoc, getDoc, doc,
    onSnapshot, query, updateDoc,
    where, orderBy, deleteDoc, serverTimestamp
} from './firebase-config.js';

let tempPlaylist = [];

// ✅ AUTH FIX
onAuthStateChanged(auth, async (user) => {
    if (!user) return location.href = "index.html";

    const snap = await getDoc(doc(db, "users", user.uid));

    if (!snap.exists() || snap.data().role !== "Admin") {
        alert("Admin access only");
        location.href = "index.html";
        return;
    }

    initAdmin();
});

function initAdmin() {
    loadCourses();
    loadStudents();
}

// ✅ COURSE PUBLISH FIX
window.publishCourse = async (e) => {
    e.preventDefault();

    if (tempPlaylist.length === 0) {
        alert("Add lessons first");
        return;
    }

    await addDoc(collection(db, "courses"), {
        title: cTitle.value,
        instructor: cInst.value,
        category: cCat.value,
        description: cDesc.value,
        playlist: tempPlaylist,
        isFree: true,
        likes: 0,
        createdAt: new Date() // ✅ FIX
    });

    alert("Course Published ✅");
    location.reload();
};

// ✅ LOAD COURSES
function loadCourses() {
    onSnapshot(collection(db, "courses"), (snap) => {
        console.log("Courses:", snap.size);
    });
}

// ✅ CHAT FIX (NO INDEX ERROR)
function loadChatbotMessages() {
    onSnapshot(collection(db, "chatbot_messages"), (snap) => {
        snap.forEach(d => {
            const m = d.data();
            if (m.type !== "student_msg") return;

            console.log("Message:", m.text);
        });
    });
}

// ✅ ADMIN REPLY FIX
window.sendAdminReply = async () => {
    const text = adminReplyInput.value.trim();
    if (!text) return;

    await addDoc(collection(db, "chatbot_messages"), {
        studentId: selectedStudentId,
        text,
        type: "admin_reply",
        seen: false,
        createdAt: new Date()
    });

    adminReplyInput.value = "";
};

// LOGOUT
window.logout = () => signOut(auth);

