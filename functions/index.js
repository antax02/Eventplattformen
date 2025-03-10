const sgMail = require('@sendgrid/mail');
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { defineSecret } = require("firebase-functions/params");
const { initializeApp } = require("firebase-admin/app");

initializeApp();
const sendgridApiKey = defineSecret("SENDGRID_API_KEY");

exports.onEventCreated = onDocumentCreated(
  {
    document: "events/{eventId}",
    secrets: [sendgridApiKey],
  },
  async (event) => {
    sgMail.setApiKey(sendgridApiKey.value());

    const eventData = event.data.data();
    const eventId = event.params.eventId;
    const invitations = eventData.invitations || [];

    console.log("🎉 New event created! ID:", eventId);
    
    if (invitations.length > 0) {
      const sendEmailPromises = invitations.map(invite => {
        const registrationLink = `https://eventplattform-f9c17.web.app/registration.html?eventId=${eventId}&token=${invite.token}`;
        const msg = {
          to: invite.email,
          from: {
            email: 'noreply@em3217.eventplattformen.com',
            name: 'Event Plattformen'
          },
          subject: `Inbjudan till ${eventData.title}`,
          text: `Hej,\n\nDu är inbjuden till "${eventData.title}".\n\n` +
                `${eventData.description || 'Inge fler detaljer'}\n\n` +
                `Anmäl dig här: ${registrationLink}\n\n`,
          html: `<p>Hej,</p>
                 <p>Du är inbjuden till <strong>${eventData.title}</strong>.</p>
                 ${eventData.description ? `<p>Detaljer: ${eventData.description}</p>` : ''}
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
    } else {
      console.log("⚠️ No invitations to send");
    }

    return null;
  }
);