import { initializeApp } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyALwncLcp3JP_NUJfKyJ1I1rrjmKTkg0jU",
  authDomain: "eventplattform-f9c17.firebaseapp.com",
  projectId: "eventplattform-f9c17",
  storageBucket: "eventplattform-f9c17.firebasestorage.app",
  messagingSenderId: "165603487219",
  appId: "1:165603487219:web:ed7511b675fb31add73686"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);