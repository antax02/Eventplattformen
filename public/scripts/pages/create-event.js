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

const processManualEmails = (text) => {
  const emails = [];
  const lines = text.split('\n');
  
  lines.forEach(line => {
    const email = line.trim();
    if (email && validateEmail(email)) {
      emails.push(email);
    }
  });
  
  return emails;
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
  // Combine date and time inputs into a single Date object
  const [year, month, day] = dateInput.split('-').map(num => parseInt(num, 10));
  const [hours, minutes] = timeInput.split(':').map(num => parseInt(num, 10));
  
  // Create date in local timezone
  const date = new Date(year, month - 1, day, hours, minutes);
  return date;
};

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('Du måste vara inloggad');

    const today = new Date();
    
    // Create date objects using the new combined date+time inputs
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

    // Process emails from CSV and manual entry
    let emails = [];
    
    // Process CSV if provided
    const csvFile = form.csv.files[0];
    if (csvFile) {
      const csvEmails = await processCSV(csvFile);
      emails = emails.concat(csvEmails);
    }
    
    // Process manual emails if provided
    const manualEmailsText = form.manualEmails.value.trim();
    if (manualEmailsText) {
      const manualEmails = processManualEmails(manualEmailsText);
      emails = emails.concat(manualEmails);
    }
    
    // Ensure we have at least one email
    if (emails.length === 0) {
      throw new Error('Ange minst en giltig e-postadress via CSV eller manuell inmatning');
    }
    
    // Remove duplicates
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

    // Only upload CSV if it was provided
    if (csvFile) {
      await Promise.all([
        setDoc(doc(db, 'events', eventId), eventData),
        uploadBytes(ref(storage, `events/${eventId}/participants.csv`), csvFile)
      ]);
    } else {
      await setDoc(doc(db, 'events', eventId), eventData);
    }

    // Format the confirmation with both date and time
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