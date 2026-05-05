// js/student.js

import {
    auth, db, storage,
    onAuthStateChanged, signOut,
    collection, addDoc, getDoc, doc,
    onSnapshot, query, orderBy,
    updateDoc, where, serverTimestamp,
    ref, uploadBytes, getDownloadURL
} from './firebase-config.js';

let currentUser = null;

// ✅ AUTH FIX
onAuthStateChanged(auth, async (user) => {
    if (!user) return location.href = "index.html";

    onSnapshot(doc(db, "users", user.uid), (snap) => {
        if (!snap.exists()) return;

        const data = snap.data();

        if (data.isBlocked) {
            alert("Blocked by admin");
            signOut(auth);
            return;
        }

        currentUser = { ...data, uid: user.uid };
        loadCourses();
    });
});

// ✅ LOAD COURSES FIX
function loadCourses() {
    onSnapshot(collection(db, "courses"), (snap) => {
        console.log("Courses visible:", snap.size);
    });
}

// ✅ KYC FIX (STORAGE)
window.submitVerification = async () => {
    const file = idProofInput.files[0];
    if (!file) return alert("Select file");

    const storageRef = ref(storage, "ids/" + currentUser.uid);

    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);

    await updateDoc(doc(db, "users", currentUser.uid), {
        verificationPending: true,
        idProofUrl: url,
        submittedAt: serverTimestamp()
    });

    alert("ID Submitted ✅");
};

// ✅ CHAT FIX
window.sendChatbotMsg = async () => {
    const text = chatbotInput.value.trim();
    if (!text) return;

    await addDoc(collection(db, "chatbot_messages"), {
        studentId: currentUser.uid,
        studentName: currentUser.name,
        text,
        type: "student_msg",
        seen: false,
        createdAt: serverTimestamp()
    });

    chatbotInput.value = "";
};

// LOGOUT
window.logout = () => signOut(auth);