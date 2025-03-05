import { initializeApp } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js";
        
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyALwncLcp3JP_NUJfKyJ1I1rrjmKTkg0jU",
    authDomain: "eventplattform-f9c17.firebaseapp.com",
    projectId: "eventplattform-f9c17",
    storageBucket: "eventplattform-f9c17.firebasestorage.app",
    messagingSenderId: "165603487219",
    appId: "1:165603487219:web:ed7511b675fb31add73686"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

async function googleLogin() {
    try {
        const loginBtn = document.getElementById('loginBtn');
        loginBtn.disabled = true;
        loginBtn.textContent = 'Loggar in...';

        await signInWithPopup(auth, provider);
        
        window.location.href = './dashboard.html';
    } catch (error) {
        console.error('Inloggningsfel:', error);
        alert(`Inloggning misslyckades: ${error.message}`);
        
        const loginBtn = document.getElementById('loginBtn');
        loginBtn.disabled = false;
        loginBtn.textContent = 'Fortsätt med Google';
    }
}

window.addEventListener('load', () => {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            window.location.href = './dashboard.html';
        }
    });

    document.getElementById('loginBtn').addEventListener('click', googleLogin);
});