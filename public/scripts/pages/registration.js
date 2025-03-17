import { auth, db } from '../firebase.js';
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore.js";

const form = document.getElementById('registration-form');
const urlParams = new URLSearchParams(window.location.search);
const eventId = urlParams.get('eventId');
const token = urlParams.get('token');

if (!eventId || !token) {
  window.location.href = './index.html';
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  try {
    const eventRef = doc(db, 'events', eventId);
    const eventSnap = await getDoc(eventRef);

    if (!eventSnap.exists()) throw new Error('Evenemanget finns inte');

    const eventData = eventSnap.data();
    const invitationIndex = eventData.invitations.findIndex(inv => inv.token === token);

    if (invitationIndex === -1) throw new Error('Ogiltig anmälningslänk');
    if (eventData.invitations[invitationIndex].responded) throw new Error('Du har redan anmält dig');
    if (eventData.responseDeadline.toDate() < new Date()) throw new Error('Anmälningsperioden har utgått');

    const attending = form.querySelector('input[name="attending"]:checked').value === 'yes';

    const updatedInvitations = [...eventData.invitations];
    updatedInvitations[invitationIndex] = {
      ...updatedInvitations[invitationIndex],
      responded: true,
      attending: attending,
      name: form.name.value.trim(),
      phone: form.phone.value.trim(),
      respondedAt: new Date()
    };

    await updateDoc(eventRef, {
      invitations: updatedInvitations
    });

    window.location.href = './thanks.html';

  } catch (error) {
    console.error('Detaljerat fel:', error);
    alert(`Fel: ${error.message}`);
  }
});