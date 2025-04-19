import { auth, db } from '../firebase.js';
import { doc, getDoc, updateDoc, deleteDoc, Timestamp, arrayUnion } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore.js";
import EmailTagInput from '../components/email-input.js';
import CustomFieldsInput from '../components/custom-fields-input.js';

const urlParams = new URLSearchParams(window.location.search);
const eventId = urlParams.get('eventId');

const form = document.getElementById('edit-event-form');
const invitationsTableBody = document.getElementById('invitations-table-body');
let emailInput;
let customFieldsInput;
let currentInvitations = [];
let showingAllInvitations = false;
const maxDisplayedInvitations = 10;
let currentCustomFields = [];

document.addEventListener('DOMContentLoaded', () => {
  const cancelButton = document.getElementById('cancel-btn');
  if (cancelButton) {
    cancelButton.addEventListener('click', () => {
      window.location.href = './dashboard.html';
    });
  }

  const emailInputContainer = document.getElementById('email-input-container');
  const emailsJsonInput = form.emailsJson;

  emailInput = new EmailTagInput(emailInputContainer, {
    onChange: (emails) => {
      emailsJsonInput.value = JSON.stringify(emails);
    }
  });

  const customFieldsContainer = document.getElementById('custom-fields-container');
  customFieldsInput = new CustomFieldsInput(customFieldsContainer, {
    onChange: (fields) => {
      currentCustomFields = fields;
    }
  });
  
  const deleteButton = document.getElementById('delete-event-btn');
  if (deleteButton) {
    deleteButton.addEventListener('click', handleDeleteEvent);
  }

  loadEvent();
  
  const textInputs = document.querySelectorAll('input[type="text"]');
  textInputs.forEach(input => input.classList.add('input-field', 'text-input'));

  const emailInputs = document.querySelectorAll('input[type="email"]');
  emailInputs.forEach(input => input.classList.add('input-field', 'email-input'));

  const dateInputs = document.querySelectorAll('input[type="date"]');
  dateInputs.forEach(input => input.classList.add('input-field', 'date-input'));

  const timeInputs = document.querySelectorAll('input[type="time"]');
  timeInputs.forEach(input => input.classList.add('input-field', 'time-input'));

  const fileInputs = document.querySelectorAll('input[type="file"]');
  fileInputs.forEach(input => input.classList.add('input-field', 'file-input'));

  const textareas = document.querySelectorAll('textarea');
  textareas.forEach(textarea => textarea.classList.add('input-field', 'textarea-input'));

  const checkboxes = document.querySelectorAll('input[type="checkbox"]');
  checkboxes.forEach(checkbox => checkbox.classList.add('checkbox-input'));

  const toggleBtn = document.getElementById('toggle-invitations-btn');
  if (toggleBtn) {
    toggleBtn.classList.add('btn', 'toggle-btn');
  }
});

const processCSV = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const emails = [];
      const rows = e.target.result.split('\n');

      const headers = rows[0].split(',').map(h => h.trim().toLowerCase());
      if (!headers.includes('email')) {
        reject('CSV-filen måste ha en kolumn "email"');
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

      // No longer require emails, just resolve with what we have
      resolve(emails);
    };
    reader.onerror = () => reject('Kunde inte läsa filen');
    reader.readAsText(file);
  });
};

const validateEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const generateInvitations = (emails, responseDeadline) => {
  return emails.map(email => ({
    email,
    token: crypto.randomUUID(),
    responded: false,
    expires: responseDeadline
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
    invitationsTableBody.innerHTML = '<tr><td colspan="5">Inga inbjudningar hittades</td></tr>';
    document.getElementById('show-more-invitations').style.display = 'none';
    return;
  }

  const invitationsToShow = showingAllInvitations
    ? invitations
    : invitations.slice(0, maxDisplayedInvitations);

  const tableHeader = document.querySelector('.invitations-table thead tr');
  if (tableHeader) {
    updateTableHeader(tableHeader, currentCustomFields);
  }

  const rows = invitationsToShow.map(inv => {
    const respondedText = inv.responded ? 'Svarat' : 'Inte svarat';
    const respondedStyle = inv.responded ? 'color: green;' : 'color: orange;';
    const respondedDate = inv.respondedAt ? ` (${formatDateTime(inv.respondedAt)})` : '';

    let attendingText = '-';
    let attendingStyle = '';

    if (inv.responded) {
      if (inv.attending === true) {
        attendingText = 'Ja';
        attendingStyle = 'color: green;';
      } else if (inv.attending === false) {
        attendingText = 'Nej';
        attendingStyle = 'color: red;';
      } else {
        attendingText = 'Ospecificerat';
      }
    }

    let rowHtml = `
      <tr class="invitation-row">
        <td class="email-cell">${inv.email}</td>
        <td class="status-cell" style="${respondedStyle}">${respondedText}${respondedDate}</td>
        <td class="attending-cell" style="${attendingStyle}">${attendingText}</td>
    `;

    currentCustomFields.forEach(field => {
      const fieldValue = inv.customFieldValues && inv.customFieldValues[field.id] 
        ? inv.customFieldValues[field.id] 
        : '-';
      
      rowHtml += `<td class="custom-field-cell">${fieldValue}</td>`;
    });

    rowHtml += `</tr>`;

    return rowHtml;
  }).join('');

  invitationsTableBody.innerHTML = rows;

  const showMoreContainer = document.getElementById('show-more-invitations');
  const toggleBtn = document.getElementById('toggle-invitations-btn');

  if (invitations.length > maxDisplayedInvitations) {
    showMoreContainer.style.display = 'block';
    toggleBtn.textContent = showingAllInvitations
      ? 'Visa färre'
      : `Visa alla (${invitations.length})`;

    toggleBtn.onclick = () => {
      showingAllInvitations = !showingAllInvitations;
      displayInvitations(invitations);
    };
  } else {
    showMoreContainer.style.display = 'none';
  }
};

function updateTableHeader(headerRow, customFields) {
  headerRow.innerHTML = '';
  
  headerRow.innerHTML += `
    <th>E-post</th>
    <th>Status</th>
    <th>Deltar</th>
  `;
  
  customFields.forEach(field => {
    headerRow.innerHTML += `<th>${field.label}</th>`;
  });
}

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
    currentInvitations = eventData.invitations || [];
    currentCustomFields = eventData.customFields || [
      { id: 'field_name', label: 'Namn', type: 'text', required: true }
    ];

    customFieldsInput.setFields(currentCustomFields);

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

    displayInvitations(currentInvitations);

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

async function handleDeleteEvent() {
  const isConfirmed = window.confirm("Är du säker på att du vill radera detta evenemang?");
  
  if (isConfirmed) {
    const secondConfirmation = window.confirm("Detta kommer att radera evenemanget permanent och alla inbjudningar. Vill du fortsätta?");
    
    if (secondConfirmation) {
      try {
        const eventRef = doc(db, "events", eventId);
        await deleteDoc(eventRef);
        alert("Evenemanget har raderats");
        window.location.href = './dashboard.html';
      } catch (error) {
        console.error("Fel vid radering:", error);
        alert("Kunde inte radera evenemanget: " + error.message);
      }
    }
  }
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  try {
    if (!eventId) {
      throw new Error("Ingen händelse-ID angiven!");
    }
    
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
      responseDeadline: Timestamp.fromDate(responseDateTime),
      customFields: currentCustomFields
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

    // No requirement for invitations now
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
      // Keep existing invitations even if no new ones are added
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