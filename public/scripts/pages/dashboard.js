import { auth, db } from '../firebase.js';
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore.js";

const eventsList = document.getElementById('events-list');
const logoutBtn = document.getElementById('logoutBtn');

const formatDateTime = (timestamp) => {
  if (!timestamp || !timestamp.seconds) return "N/A";

  const date = new Date(timestamp.seconds * 1000);
  const options = {
    dateStyle: 'medium',
    timeStyle: 'short'
  };

  return date.toLocaleString('sv-SE', options);
};

const createEventCard = (event) => {
  const totalInvitations = event.invitations.length;
  const responded = event.invitations.filter(inv => inv.responded).length;
  const attending = event.invitations.filter(inv => inv.responded && inv.attending === true).length;
  const notAttending = event.invitations.filter(inv => inv.responded && inv.attending === false).length;
  const responseRate = totalInvitations > 0 ? Math.round((responded / totalInvitations) * 100) : 0;

  return `
    <div class="event-card">
      <h3 class="card-title">${event.title}</h3>
      <p class="card-date">Datum: ${formatDateTime(event.eventDate)}</p>
      <p class="card-deadline">Anmälningsslut: ${formatDateTime(event.responseDeadline)}</p>
      
      <div class="card-stats">
        <p>Inbjudna: ${totalInvitations} personer</p>
        <p>Svar: ${responded} av ${totalInvitations} (${responseRate}%)</p>
        <p>Deltar: ${attending}, Deltar inte: ${notAttending}</p>
      </div>
      
      <div class="card-actions">
        <a href="./edit-event.html?eventId=${event.id}" class="btn">
          Redigera
        </a>
      </div>
    </div>
  `;
};

logoutBtn.addEventListener('click', () => {
  auth.signOut().then(() => {
    window.location.href = './login.html';
  }).catch(error => {
    console.error("Utloggningsfel:", error);
  });
});

auth.onAuthStateChanged(async (user) => {
  if (user) {
    try {
      const q = query(collection(db, "events"), where("owner", "==", user.uid));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        eventsList.innerHTML = `<div class="events-empty">Inga evenemang hittades.</div>`;
      } else {
        eventsList.innerHTML = querySnapshot.docs
          .map(doc => createEventCard({ id: doc.id, ...doc.data() }))
          .join('');
      }

    } catch (error) {
      console.error("Error fetching events:", error);
      eventsList.innerHTML = `<div class="events-empty">Kunde inte ladda evenemang</div>`;
    }
  } else {
    window.location.href = './login.html';
  }
});