// js/firebase-config.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js";

import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import {
    getFirestore,
    collection,
    addDoc,
    getDoc,
    getDocs,
    doc,
    setDoc,
    deleteDoc,
    onSnapshot,
    query,
    where,
    updateDoc,
    serverTimestamp,
    orderBy,
    limit,
    increment
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import {
    getStorage,
    ref,
    uploadBytes,
    getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

const firebaseConfig = {
    apiKey: "YOUR_KEY",
    authDomain: "YOUR_DOMAIN",
    projectId: "YOUR_ID",
    storageBucket: "YOUR_BUCKET",
    messagingSenderId: "YOUR_MSG",
    appId: "YOUR_APP"
};

const app = initializeApp(firebaseConfig);

const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export {
    auth, db, storage,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    sendPasswordResetEmail,

    collection, addDoc, getDoc, getDocs, doc,
    setDoc, deleteDoc, onSnapshot, query, where,
    updateDoc, serverTimestamp, orderBy, limit, increment,

    ref, uploadBytes, getDownloadURL
};