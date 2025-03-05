import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, serverTimestamp, query, orderBy, onSnapshot } from "firebase/firestore";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyDDe5v5boCFT35wpwPoMZiKnDn-AWJn4Xg",
    authDomain: "chatapp-23d05.firebaseapp.com",
    projectId: "chatapp-23d05",
    storageBucket: "chatapp-23d05.firebasestorage.app",
    messagingSenderId: "274755805381",
    appId: "1:274755805381:web:2476cbbcb7e0aab20f90ac"
  };

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// Function to send a message
const sendMessage = async (text, user) => {
  if (text.trim() === "") return;
  await addDoc(collection(db, "messages"), {
    text,
    uid: user.uid,
    name: user.displayName,
    photoURL: user.photoURL,
    createdAt: serverTimestamp(),
  });
};

export { db, auth, provider, signInWithPopup, sendMessage };
