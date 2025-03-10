import { auth, db } from '../firebase.js';
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore.js";

const eventsList = document.getElementById('events-list');

const formatDateTime = (timestamp) => {
  if (!timestamp || !timestamp.seconds) return "N/A";
  
  const date = new Date(timestamp.seconds * 1000);
  const options = { 
    dateStyle: 'medium',
    timeStyle: 'short'
  };
  
  return date.toLocaleString('sv-SE', options);
};

const createEventCard = (event) => `
  <div class="event-card">
    <h3>${event.title}</h3>
    <p>Datum: ${formatDateTime(event.eventDate)}</p>
    <p>Anmälningsslut: ${formatDateTime(event.responseDeadline)}</p>
    <p>Antal inbjudna: ${event.invitations.length}</p>
    <a href="./edit-event.html?eventId=${event.id}">
      <button>Redigera</button>
    </a>
  </div>
`;

auth.onAuthStateChanged(async (user) => {
  if (user) {
    try {
      const q = query(collection(db, "events"), where("owner", "==", user.uid));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        eventsList.innerHTML = "<div>Inga evenemang hittades.</div>";
      } else {
        eventsList.innerHTML = querySnapshot.docs
          .map(doc => createEventCard({ id: doc.id, ...doc.data() }))
          .join('');
      }

    } catch (error) {
      console.error("Error fetching events:", error);
      eventsList.innerHTML = "<div>Kunde inte ladda evenemang</div>";
    }
  } else {
    window.location.href = './login.html';
  }
});