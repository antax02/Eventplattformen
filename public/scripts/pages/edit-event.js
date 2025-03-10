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

    // Konvertera Firestore Timestamp till yyyy-MM-dd format med lokal justering
    const formatDate = (timestamp) => {
        if (!timestamp || !timestamp.seconds) return "";
        return new Date(timestamp.seconds * 1000).toISOString().split('T')[0];
    };


    form.eventDate.value = formatDate(eventData.eventDate);
    form.responseDeadline.value = formatDate(eventData.responseDeadline);

  } else {
    alert("Evenemanget hittades inte!");
  }
};

document.addEventListener('DOMContentLoaded', loadEvent);

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  try {
    const eventRef = doc(db, "events", eventId);

    const updatedData = {
      title: form.title.value,
      description: form.description.value,
      eventDate: Timestamp.fromDate(new Date(form.eventDate.value)),
      responseDeadline: Timestamp.fromDate(new Date(form.responseDeadline.value))
    };

    await updateDoc(eventRef, updatedData);
    alert("Evenemang uppdaterat!");
    window.location.href = './dashboard.html';

  } catch (error) {
    console.error("Fel vid uppdatering:", error);
    alert("Kunde inte uppdatera evenemanget.");
  }
});
