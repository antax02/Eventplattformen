import { auth, db } from '../firebase.js';
import { doc, getDoc, updateDoc, Timestamp } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore.js";

const urlParams = new URLSearchParams(window.location.search);
const eventId = urlParams.get('eventId');

const form = document.getElementById('edit-event-form');

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

    // Split date and time from Firestore timestamps
    const formatDateInput = (timestamp) => {
      if (!timestamp || !timestamp.seconds) return "";
      
      // Create date in local timezone
      const date = new Date(timestamp.seconds * 1000);
      
      // Format date as YYYY-MM-DD for the date input
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      
      return `${year}-${month}-${day}`;
    };
    
    const formatTimeInput = (timestamp) => {
      if (!timestamp || !timestamp.seconds) return "";
      
      // Create date in local timezone
      const date = new Date(timestamp.seconds * 1000);
      
      // Format time as HH:MM for the time input
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
  }
};

document.addEventListener('DOMContentLoaded', loadEvent);

// Helper function to create date objects from form inputs
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
    const eventRef = doc(db, "events", eventId);
    
    // Create date objects using the combined date+time inputs
    const eventDateTime = createDateTimeFromInputs(
      form.eventDate.value, 
      form.eventTime.value
    );
    
    const responseDateTime = createDateTimeFromInputs(
      form.responseDeadline.value, 
      form.responseTime.value
    );
    
    // Validate dates
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

    // Add resendToAll flag if checkbox is checked
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