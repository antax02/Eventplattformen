import { auth, db } from '../firebase.js';
import { doc, getDoc, updateDoc, Timestamp } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-storage.js";

const urlParams = new URLSearchParams(window.location.search);
const eventId = urlParams.get('eventId');
const form = document.getElementById('edit-event-form');
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

let currentEventData = null;

const loadEvent = async () => {
  if (!eventId) {
    alert("Ingen händelse-ID angiven!");
    window.location.href = './dashboard.html';
    return;
  }

  try {
    const eventRef = doc(db, "events", eventId);
    const eventSnap = await getDoc(eventRef);

    if (eventSnap.exists()) {
      const eventData = eventSnap.data();
      currentEventData = eventData;

      const user = auth.currentUser;
      if (user.uid !== eventData.owner) {
        alert("Du har inte behörighet att redigera detta evenemang!");
        window.location.href = './dashboard.html';
        return;
      }

      form.title.value = eventData.title;
      form.description.value = eventData.description || '';

      const formatDateInput = (timestamp) => {
        if (!timestamp || !timestamp.seconds) return "";
        
        const date = new Date(timestamp.seconds * 1000);
        
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        
        return `${year}-${month}-${day}`;
      };
      
      const formatTimeInput = (timestamp) => {
        if (!timestamp || !timestamp.seconds) return "";
        
        const date = new Date(timestamp.seconds * 1000);
        
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        
        return `${hours}:${minutes}`;
      };

      form.eventDate.value = formatDateInput(eventData.eventDate);
      form.eventTime.value = formatTimeInput(eventData.eventDate);
      form.responseDeadline.value = formatDateInput(eventData.responseDeadline);
      form.responseTime.value = formatTimeInput(eventData.responseDeadline);

    } else {
      alert("Evenemanget hittades inte!");
      window.location.href = './dashboard.html';
    }
  } catch (error) {
    console.error("Fel vid laddning av evenemang:", error);
    alert("Kunde inte ladda evenemanget: " + error.message);
    window.location.href = './dashboard.html';
  }
};

auth.onAuthStateChanged(async (user) => {
  if (user) {
    await loadEvent();
  } else {
    window.location.href = './login.html';
  }
});

const createDateTimeFromInputs = (dateInput, timeInput) => {
  const [year, month, day] = dateInput.split('-').map(num => parseInt(num, 10));
  const [hours, minutes] = timeInput.split(':').map(num => parseInt(num, 10));
  
  const date = new Date(year, month - 1, day, hours, minutes);
  return date;
};

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  try {
    const eventRef = doc(db, "events", eventId);
    
    const eventDateTime = createDateTimeFromInputs(
      form.eventDate.value, 
      form.eventTime.value
    );
    
    const responseDateTime = createDateTimeFromInputs(
      form.responseDeadline.value, 
      form.responseTime.value
    );
    
    const today = new Date();
    
    if (eventDateTime < today) {
      throw new Error('Evenemangsdatumet har redan passerat');
    }

    if (responseDateTime < today) {
      throw new Error('Sista svarsdatum har redan passerat');
    }

    if (responseDateTime >= eventDateTime) {
      throw new Error('Sista svarsdatum måste vara före evenemanget');
    }

    const firestoreDeadline = Timestamp.fromDate(responseDateTime);
    
    const updatedData = {
      title: form.title.value,
      description: form.description.value,
      eventDate: Timestamp.fromDate(eventDateTime),
      responseDeadline: firestoreDeadline
    };

    if (form.csv.files.length > 0) {
      const csvFile = form.csv.files[0];
      const newEmails = await processCSV(csvFile);
      
      const currentInvitations = currentEventData.invitations || [];
      
      const existingEmails = currentInvitations.map(inv => inv.email);
      const newUniqueEmails = newEmails.filter(email => !existingEmails.includes(email));
      
      if (newUniqueEmails.length === 0) {
        throw new Error('Alla e-postadresser i CSV-filen finns redan i inbjudningslistan');
      }
      
      const newInvitations = generateInvitations(newUniqueEmails, firestoreDeadline);
      
      updatedData.invitations = [...currentInvitations, ...newInvitations];
      
      if (form.resend && form.resend.checked) {
        updatedData.resendToAll = true;
      }
      
      await uploadBytes(ref(storage, `events/${eventId}/participants.csv`), csvFile);
      
      console.log(`Added ${newUniqueEmails.length} new invitations`);
    }

    await updateDoc(eventRef, updatedData);
    alert("Evenemang uppdaterat!");
    window.location.href = './dashboard.html';

  } catch (error) {
    console.error("Fel vid uppdatering:", error);
    alert("Kunde inte uppdatera evenemanget: " + error.message);
  }
});