// js/firebase-config.js — FronixLearner Shared Firebase Config

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

const firebaseConfig = {
    apiKey: "AIzaSyCwpiephfzh5lSPjtfpKKtaq8BPsa-qmuQ",
    authDomain: "fronixlearner.firebaseapp.com",
    projectId: "fronixlearner",
    storageBucket: "fronixlearner.firebasestorage.app",
    messagingSenderId: "625622702328",
    appId: "1:625622702328:web:47c1d377f7fa3cc9d0030d",
    measurementId: "G-Y7BBG1CE1J"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);

export {
    auth, db,
    createUserWithEmailAndPassword, signInWithEmailAndPassword,
    signOut, onAuthStateChanged, sendPasswordResetEmail,
    collection, addDoc, getDoc, getDocs, doc, setDoc, deleteDoc,
    onSnapshot, query, where, updateDoc, serverTimestamp,
    orderBy, limit, increment
};
