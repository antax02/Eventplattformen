import { auth, db } from '../firebase.js';
import { doc, setDoc, serverTimestamp, Timestamp } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-storage.js";
import EmailTagInput from '../components/email-input.js';

const form = document.getElementById('event-form');
const storage = getStorage();
let emailInput;

document.addEventListener('DOMContentLoaded', () => {
  const emailInputContainer = document.getElementById('email-input-container');
  const emailsJsonInput = form.emailsJson;
  
  emailInput = new EmailTagInput(emailInputContainer, {
    onChange: (emails) => {
      emailsJsonInput.value = JSON.stringify(emails);
    }
  });
});

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

const createDateTimeFromInputs = (dateInput, timeInput) => {
  const [year, month, day] = dateInput.split('-').map(num => parseInt(num, 10));
  const [hours, minutes] = timeInput.split(':').map(num => parseInt(num, 10));
  
  const date = new Date(year, month - 1, day, hours, minutes);
  return date;
};

form.csv.addEventListener('change', async (e) => {
  try {
    const file = e.target.files[0];
    if (file) {
      const emails = await processCSV(file);
      emailInput.addEmails(emails);
    }
  } catch (error) {
    alert(error.message || 'Det uppstod ett fel vid bearbetning av CSV-filen');
  }
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('Du måste vara inloggad');

    const today = new Date();
    
    const eventDateTime = createDateTimeFromInputs(
      form.eventDate.value, 
      form.eventTime.value
    );
    
    const responseDateTime = createDateTimeFromInputs(
      form.responseDeadline.value, 
      form.responseTime.value
    );

    if (eventDateTime < today) {
      throw new Error('Evenemangsdatumet har redan passerat');
    }

    if (responseDateTime < today) {
      throw new Error('Sista svarsdatum har redan passerat');
    }

    if (responseDateTime >= eventDateTime) {
      throw new Error('Sista svarsdatum måste vara före evenemanget');
    }

    const firestoreEventDate = Timestamp.fromDate(eventDateTime);
    const firestoreDeadline = Timestamp.fromDate(responseDateTime);

    let emails = emailInput.getEmails();
    
    const csvFile = form.csv.files[0];
    if (csvFile) {
      try {
        const csvEmails = await processCSV(csvFile);
        emails = [...emails, ...csvEmails];
      } catch (error) {
        console.warn('CSV processing error:', error);
      }
    }
    
    if (emails.length === 0) {
      throw new Error('Ange minst en giltig e-postadress');
    }
    
    emails = [...new Set(emails)];
    
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

    if (csvFile) {
      await Promise.all([
        setDoc(doc(db, 'events', eventId), eventData),
        uploadBytes(ref(storage, `events/${eventId}/participants.csv`), csvFile)
      ]);
    } else {
      await setDoc(doc(db, 'events', eventId), eventData);
    }

    const options = { 
      dateStyle: 'medium', 
      timeStyle: 'short'
    };
    
    alert(`Evenemang skapat med ${emails.length} inbjudna!\nSista anmälningsdag: ${responseDateTime.toLocaleString('sv-SE', options)}`);
    window.location.href = './dashboard.html';

  } catch (error) {
    console.error('Fel:', error);
    alert(error.message || 'Något gick fel');
  }
});