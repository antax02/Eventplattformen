const sgMail = require('@sendgrid/mail');
const { onDocumentCreated, onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { defineSecret } = require("firebase-functions/params");
const { initializeApp } = require("firebase-admin/app");

initializeApp();
const sendgridApiKey = defineSecret("SENDGRID_API_KEY");

function formatDateTime(timestamp) {
  if (!timestamp || !timestamp.seconds) return "N/A";
  
  const date = new Date(timestamp.seconds * 1000);
  const options = { 
    dateStyle: 'medium',
    timeStyle: 'short'
  };
  
  return date.toLocaleString('sv-SE', options);
}

async function sendInvitations(eventId, eventData, invitations, resending = false) {
  console.log(`📧 Sending ${invitations.length} invitations for event ID: ${eventId}`);

  const eventDateFormatted = formatDateTime(eventData.eventDate);
  const deadlineFormatted = formatDateTime(eventData.responseDeadline);

  const sendEmailPromises = invitations.map(invite => {
    const registrationLink = `https://eventplattform-f9c17.web.app/registration.html?eventId=${eventId}&token=${invite.token}`;
    const msg = {
      to: invite.email,
      from: { email: 'noreply@em3217.eventplattformen.com', name: 'Event Plattformen' },
      subject: `Inbjudan till ${eventData.title}`,
      text: `Hej,\n\nDu är inbjuden till "${eventData.title}".\n\n` +
            `${eventData.description || 'Inga fler detaljer'}\n\n` +
            `Datum: ${eventDateFormatted}\n` +
            `Sista anmälningsdag: ${deadlineFormatted}\n\n` +
            `Anmäl dig här: ${registrationLink}\n\n`,
      html: `<p>Hej,</p>
             <p>Du är inbjuden till <strong>${eventData.title}</strong>.</p>
             ${eventData.description ? `<p>Detaljer: ${eventData.description}</p>` : ''}
             <p>Datum: ${eventDateFormatted}</p>
             <p>Sista anmälningsdag: ${deadlineFormatted}</p>
             <p><a href="${registrationLink}">Tryck här för att registrera</a></p>`
    };
    return sgMail.send(msg);
  });

  try {
    await Promise.all(sendEmailPromises);
    console.log(`✅ Successfully sent ${invitations.length} emails`);
  } catch (error) {
    console.error('❌ Email sending error:', error.response?.body?.errors || error);
  }
}

exports.onEventCreated = onDocumentCreated(
  { document: "events/{eventId}", secrets: [sendgridApiKey] },
  async (event) => {
    sgMail.setApiKey(sendgridApiKey.value());
    
    const eventData = event.data.data();
    const eventId = event.params.eventId;
    const invitations = eventData.invitations || [];

    console.log("🎉 New event created! ID:", eventId);

    if (invitations.length > 0) {
      await sendInvitations(eventId, eventData, invitations);
    } else {
      console.log("⚠️ No invitations to send");
    }

    return null;
  }
);

exports.onEventUpdated = onDocumentUpdated(
  { document: "events/{eventId}", secrets: [sendgridApiKey] },
  async (event) => {
    sgMail.setApiKey(sendgridApiKey.value());
    
    const beforeData = event.data.before.data();
    const afterData = event.data.after.data();
    const eventId = event.params.eventId;

    console.log(`✏️ Event updated: ${eventId}`);

    const oldInvitations = beforeData.invitations || [];
    const newInvitations = afterData.invitations || [];

    const addedInvitations = newInvitations.filter(newInvite =>
      !oldInvitations.some(oldInvite => oldInvite.email === newInvite.email)
    );

    const resendToAll = afterData.resendToAll || false;

    if (addedInvitations.length > 0 || resendToAll) {
      const invitationsToSend = resendToAll ? newInvitations : addedInvitations;
      await sendInvitations(eventId, afterData, invitationsToSend, resendToAll);
    } else {
      console.log("✅ No new invitations to send");
    }

    return null;
  }
);