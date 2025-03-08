import { auth, db } from '../firebase.js';
import { doc, setDoc, serverTimestamp, Timestamp } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-storage.js";

const form = document.getElementById('event-form');
const storage = getStorage();

const processCSV = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const emails = [];
      const rows = e.target.result.split('\n');
      
      const headers = rows[0].split(',').map(h => h.trim().toLowerCase());
      if (!headers.includes('email')) {
        reject('CSV-filen måste ha en "email" kolumn');
        return;
      }
      
      const emailIndex = headers.indexOf('email');
      
      rows.forEach((row, index) => {
        if (index === 0) return;
        const columns = row.split(',');
        const email = columns[emailIndex]?.trim();
        
        if (email && validateEmail(email)) {
          emails.push(email);
        }
      });
      
      if (emails.length === 0) reject('Inga giltiga e-postadresser hittades');
      else resolve(emails);
    };
    reader.onerror = () => reject('Kunde inte läsa filen');
    reader.readAsText(file);
  });
};

const validateEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const generateInvitations = (emails, deadline) => {
  return emails.map(email => ({
    email,
    token: crypto.randomUUID(),
    responded: false,
    expires: deadline
  }));
};

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('Du måste vara inloggad');

    const today = new Date();
    const eventDate = new Date(form.eventDate.value + 'T00:00:00');
    const responseDeadline = new Date(form.responseDeadline.value + 'T23:59:59');

    if (eventDate < today) {
      throw new Error('Evenemangsdatumet har redan passerat');
    }

    if (responseDeadline < today) {
      throw new Error('Sista svarsdatum har redan passerat');
    }

    if (responseDeadline >= eventDate) {
      throw new Error('Sista svarsdatum måste vara före evenemanget');
    }

    const firestoreEventDate = Timestamp.fromDate(eventDate);
    const firestoreDeadline = Timestamp.fromDate(responseDeadline);

    const csvFile = form.csv.files[0];
    if (!csvFile) throw new Error('Välj en CSV-fil');
    const emails = await processCSV(csvFile);
    
    const eventId = crypto.randomUUID();
    const invitations = generateInvitations(emails, firestoreDeadline);

    const eventData = {
      title: form.title.value,
      eventDate: firestoreEventDate,
      responseDeadline: firestoreDeadline,
      description: form.description.value,
      owner: user.uid,
      createdAt: serverTimestamp(),
      invitations
    };

    await Promise.all([
      setDoc(doc(db, 'events', eventId), eventData),
      uploadBytes(ref(storage, `events/${eventId}/participants.csv`), csvFile)
    ]);

    alert(`Evenemang skapat med ${emails.length} inbjudna!\nSista anmälningsdag: ${responseDeadline.toLocaleDateString('sv-SE')}`);
    window.location.href = './dashboard.html';

  } catch (error) {
    console.error('Fel:', error);
    alert(error.message || 'Något gick fel');
  }
});