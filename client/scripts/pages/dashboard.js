import { auth, db } from '../firebase.js';
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore.js";

const eventsList = document.getElementById('events-list');

const createEventCard = (event) => `
  <div class="event-card">
    <h3>${event.title}</h3>
    <p>Datum: ${new Date(event.eventDate.seconds * 1000).toLocaleDateString('sv-SE')}</p>
    <p>Anmälningsslut: ${new Date(event.responseDeadline.seconds * 1000).toLocaleDateString('sv-SE')}</p>
    <p>Antal inbjudna: ${event.invitations.length}</p>
  </div>
`;

auth.onAuthStateChanged(async (user) => {
  if (user) {
    try {
      const q = query(collection(db, "events"), where("owner", "==", user.uid));
      const querySnapshot = await getDocs(q);
      
      eventsList.innerHTML = querySnapshot.docs
        .map(doc => createEventCard({ id: doc.id, ...doc.data() }))
        .join('');
        
    } catch (error) {
      console.error("Error fetching events:", error);
      eventsList.innerHTML = "<div>Kunde inte ladda evenemang</div>";
    }
  }
});