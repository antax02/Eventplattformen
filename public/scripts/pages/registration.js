import { auth, db } from '../firebase.js';
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore.js";

const form = document.getElementById('registration-form');
const customFieldsContainer = document.getElementById('custom-fields-container');
const defaultFields = document.getElementById('default-fields');
const eventTitleSpan = document.getElementById('event-title');
const urlParams = new URLSearchParams(window.location.search);
const eventId = urlParams.get('eventId');
const token = urlParams.get('token');
let eventData = null;
let invitationIndex = -1;

if (!eventId || !token) {
  window.location.href = './index.html';
}

if (form.hasAttribute('onsubmit')) {
  form.removeAttribute('onsubmit');
}

function fixHiddenRequiredFields() {
  document.querySelectorAll('[required]').forEach(el => {
    let currentNode = el;
    while (currentNode && currentNode !== document.body) {
      if (window.getComputedStyle(currentNode).display === 'none') {
        el.required = false;
        el.disabled = true;
        break;
      }
      currentNode = currentNode.parentElement;
    }
  });
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

    if (eventData.title) {
      eventTitleSpan.textContent = eventData.title;
      document.title = `Anmälan: ${eventData.title}`;
    }

    generateCustomFields(eventData.customFields || []);
    fixHiddenRequiredFields();
  } catch (error) {
    console.error('Error:', error);
    alert(`Fel: ${error.message}`);
  }
}

function generateCustomFields(fields) {
  customFieldsContainer.innerHTML = '';
  
  const hasNameField = fields.some(field => 
    field.id === 'field_name' || 
    field.label.toLowerCase() === 'namn' || 
    field.label.toLowerCase() === 'name'
  );
  
  defaultFields.style.display = hasNameField ? 'none' : 'block';
  
  const defaultNameInput = document.querySelector('#default-fields input[name="name"]');
  if (defaultNameInput && hasNameField) {
    defaultNameInput.required = false;
    defaultNameInput.disabled = true;
  }
  
  fields.forEach(field => {
    const fieldContainer = document.createElement('div');
    fieldContainer.className = 'registration-group custom-field';
    
    const uniqueId = `custom-${field.id}`;
    
    const label = document.createElement('label');
    label.textContent = `${field.label}${field.required ? ' *' : ''}`;
    label.className = 'registration-label';
    label.htmlFor = uniqueId;
    
    const input = document.createElement('input');
    input.type = field.type || 'text';
    input.className = 'registration-input';
    input.id = uniqueId;
    input.name = field.id;
    input.required = field.required || false;
    
    fieldContainer.appendChild(label);
    fieldContainer.appendChild(input);
    customFieldsContainer.appendChild(fieldContainer);
  });
  
  setTimeout(fixHiddenRequiredFields, 100);
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  fixHiddenRequiredFields();
  
  try {
    if (!eventData || invitationIndex === -1) {
      throw new Error('Kunde inte ladda eventdata');
    }
    
    const attendingRadio = form.querySelector('input[name="attending"]:checked');
    if (!attendingRadio) {
      throw new Error('Du måste ange om du deltar eller inte');
    }
    
    const attending = attendingRadio.value === 'yes';
    
    const customFieldValues = {};
    if (eventData.customFields) {
      eventData.customFields.forEach(field => {
        const input = document.querySelector(`[name="${field.id}"]:not([disabled])`);
        if (input) {
          customFieldValues[field.id] = input.type === 'checkbox' ? input.checked : input.value;
        }
      });
    }
    
    let nameValue = null;
    const customNameField = eventData.customFields && eventData.customFields.find(field => 
      field.id === 'field_name' || 
      field.label.toLowerCase() === 'namn' || 
      field.label.toLowerCase() === 'name'
    );
    
    if (customNameField) {
      const customNameInput = document.querySelector(`[name="${customNameField.id}"]:not([disabled])`);
      if (customNameInput) nameValue = customNameInput.value.trim();
    } else {
      const defaultNameInput = document.querySelector('input[name="name"]:not([disabled])');
      if (defaultNameInput) nameValue = defaultNameInput.value.trim();
    }
    
    const updatedInvitations = [...eventData.invitations];
    updatedInvitations[invitationIndex] = {
      ...updatedInvitations[invitationIndex],
      responded: true,
      attending: attending,
      respondedAt: new Date(),
      customFieldValues: customFieldValues
    };
    
    if (nameValue) {
      updatedInvitations[invitationIndex].name = nameValue;
    }
    
    await updateDoc(doc(db, 'events', eventId), {
      invitations: updatedInvitations
    });
    
    window.location.href = './thanks.html';
    
  } catch (error) {
    console.error('Error:', error);
    alert(`Fel: ${error.message}`);
  }
});

document.addEventListener('DOMContentLoaded', () => {
  loadEventData();
  setTimeout(fixHiddenRequiredFields, 500);
});