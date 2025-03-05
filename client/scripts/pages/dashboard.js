import { auth } from '../firebase.js';

document.getElementById('logoutBtn').addEventListener('click', async () => {
    try {
        await auth.signOut();
        window.location.href = './login.html';
    } catch (error) {
        console.error('Utloggning misslyckades:', error);
        alert('Kunde inte logga ut: ' + error.message);
    }
});

auth.onAuthStateChanged(user => {
    if (!user) {
        window.location.href = './login.html';
    } else {
        //console.log('Inloggad som:', user.email);
    }
});