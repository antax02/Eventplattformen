import { auth, db } from '../firebase.js';
import { doc, getDoc, updateDoc, Timestamp, arrayUnion } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore.js";
import EmailTagInput from '../components/email-input.js';

const urlParams = new URLSearchParams(window.location.search);
const eventId = urlParams.get('eventId');

const form = document.getElementById('edit-event-form');
const invitationsTableBody = document.getElementById('invitations-table-body');
let emailInput;

document.addEventListener('DOMContentLoaded', () => {
  const emailInputContainer = document.getElementById('email-input-container');
  const emailsJsonInput = form.emailsJson;
  
  emailInput = new EmailTagInput(emailInputContainer, {
    onChange: (emails) => {
      emailsJsonInput.value = JSON.stringify(emails);
    }
  });
  
  loadEvent();
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

const formatDateTime = (timestamp) => {
  if (!timestamp || !timestamp.seconds) return "N/A";
  
  const date = new Date(timestamp.seconds * 1000);
  const options = { 
    dateStyle: 'medium',
    timeStyle: 'short'
  };
  
  return date.toLocaleString('sv-SE', options);
};

const displayInvitations = (invitations) => {
  if (!invitations || invitations.length === 0) {
    invitationsTableBody.innerHTML = '<tr><td colspan="4">Inga inbjudningar hittades</td></tr>';
    return;
  }

  const rows = invitations.map(inv => {
    const respondedText = inv.responded ? 'Svarat' : 'Inte svarat';
    const respondedStyle = inv.responded ? 'color: green;' : 'color: orange;';
    const respondedDate = inv.respondedAt ? ` (${formatDateTime(inv.respondedAt)})` : '';
    
    return `
      <tr>
        <td>${inv.email}</td>
        <td style="${respondedStyle}">${respondedText}${respondedDate}</td>
        <td>${inv.name || '-'}</td>
        <td>${inv.phone || '-'}</td>
      </tr>
    `;
  }).join('');

  invitationsTableBody.innerHTML = rows;
};

form.csv?.addEventListener('change', async (e) => {
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

const loadEvent = async () => {
  if (!eventId) {
    alert("Ingen händelse-ID angiven!");
    return;
  }

  const eventRef = doc(db, "events", eventId);
  const eventSnap = await getDoc(eventRef);

  if (eventSnap.exists()) {
    const eventData = eventSnap.data();

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

    displayInvitations(eventData.invitations);

  } else {
    alert("Evenemanget hittades inte!");
  }
};

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
    const eventSnap = await getDoc(eventRef);
    
    if (!eventSnap.exists()) {
      throw new Error("Evenemanget hittades inte!");
    }
    
    const eventData = eventSnap.data();
    
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

    const updatedData = {
      title: form.title.value,
      description: form.description.value,
      eventDate: Timestamp.fromDate(eventDateTime),
      responseDeadline: Timestamp.fromDate(responseDateTime)
    };

    let newEmails = emailInput.getEmails();
    
    const csvFile = form.csv.files[0];
    if (csvFile) {
      try {
        const csvEmails = await processCSV(csvFile);
        newEmails = [...newEmails, ...csvEmails];
      } catch (error) {
        console.warn('CSV processing error:', error);
      }
    }
    
    if (newEmails.length > 0) {
      const currentEmails = eventData.invitations.map(inv => inv.email);
      
      const uniqueNewEmails = newEmails.filter(email => !currentEmails.includes(email));
      
      if (uniqueNewEmails.length > 0) {
        const newInvitations = generateInvitations(uniqueNewEmails, updatedData.responseDeadline);
        updatedData.invitations = [...eventData.invitations, ...newInvitations];
      } else {
        updatedData.invitations = eventData.invitations;
      }
    } else {
      updatedData.invitations = eventData.invitations;
    }

    if (form.resend && form.resend.checked) {
      updatedData.resendToAll = true;
    }

    await updateDoc(eventRef, updatedData);
    alert("Evenemang uppdaterat!");
    window.location.href = './dashboard.html';

  } catch (error) {
    console.error("Fel vid uppdatering:", error);
    alert("Kunde inte uppdatera evenemanget: " + error.message);
  }
});