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
    apiKey: "AIzaSyC6w88P1Nrgp4djwrjJf0K2i2l6xQG8FEI",
    authDomain: "fronix-afde1.firebaseapp.com",
    projectId: "fronix-afde1",
    storageBucket: "fronix-afde1.appspot.com",
    messagingSenderId: "942976075894",
    appId: "1:942976075894:web:dfab62b417f89cc66c3757",
    measurementId: "G-DR773T6QF1"
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
