import { auth, db } from '../firebase.js';
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore.js";

const form = document.getElementById('registration-form');
const customFieldsContainer = document.getElementById('custom-fields-container');
const urlParams = new URLSearchParams(window.location.search);
const eventId = urlParams.get('eventId');
const token = urlParams.get('token');
let eventData = null;
let invitationIndex = -1;

if (!eventId || !token) {
  window.location.href = './index.html';
}

async function loadEventData() {
  try {
    const eventRef = doc(db, 'events', eventId);
    const eventSnap = await getDoc(eventRef);

    if (!eventSnap.exists()) {
      throw new Error('Evenemanget finns inte');
    }

    eventData = eventSnap.data();
    invitationIndex = eventData.invitations.findIndex(inv => inv.token === token);

    if (invitationIndex === -1) {
      throw new Error('Ogiltig anmälningslänk');
    }

    if (eventData.invitations[invitationIndex].responded) {
      throw new Error('Du har redan anmält dig');
    }

    if (eventData.responseDeadline.toDate() < new Date()) {
      throw new Error('Anmälningsperioden har utgått');
    }

    generateCustomFields(eventData.customFields || []);
  } catch (error) {
    console.error('Detaljerat fel:', error);
    alert(`Fel: ${error.message}`);
  }
}

function generateCustomFields(fields) {
  if (!fields || fields.length === 0) {
    return;
  }

  document.getElementById('default-fields').style.display = 'none';

  customFieldsContainer.innerHTML = '';

  fields.forEach(field => {
    const fieldContainer = document.createElement('div');

    const label = document.createElement('label');
    label.textContent = `${field.label}${field.required ? ' *' : ''}`;
    fieldContainer.appendChild(label);

    let inputElement;

    inputElement = document.createElement('input');
    inputElement.type = field.type || 'text';

    inputElement.name = field.id;
    inputElement.id = field.id;

    if (field.required) {
      inputElement.required = true;
    }

    fieldContainer.appendChild(inputElement);
    customFieldsContainer.appendChild(fieldContainer);
  });
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  try {
    if (!eventData || invitationIndex === -1) {
      throw new Error('Kunde inte ladda eventdata');
    }

    const attending = form.querySelector('input[name="attending"]:checked').value === 'yes';

    const customFieldValues = {};
    if (eventData.customFields && eventData.customFields.length > 0) {
      eventData.customFields.forEach(field => {
        const input = document.getElementById(field.id);
        if (input && (input.value || input.type === 'checkbox')) {
          if (input.type === 'checkbox') {
            customFieldValues[field.id] = input.checked;
          } else {
            customFieldValues[field.id] = input.value;
          }
        }
      });
    }

    const updatedInvitations = [...eventData.invitations];
    updatedInvitations[invitationIndex] = {
      ...updatedInvitations[invitationIndex],
      responded: true,
      attending: attending,
      respondedAt: new Date(),
      customFieldValues: customFieldValues
    };

    const nameField = document.querySelector('input[name="name"]');

    if (nameField) {
      updatedInvitations[invitationIndex].name = nameField.value.trim();
    }

    await updateDoc(doc(db, 'events', eventId), {
      invitations: updatedInvitations
    });

    window.location.href = './thanks.html';

  } catch (error) {
    console.error('Detaljerat fel:', error);
    alert(`Fel: ${error.message}`);
  }
});

document.addEventListener('DOMContentLoaded', loadEventData);