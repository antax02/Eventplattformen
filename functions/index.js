const sgMail = require('@sendgrid/mail');
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { defineSecret } = require("firebase-functions/params"); // Missing import
const { initializeApp } = require("firebase-admin/app");

// Initialize Firebase Admin and define secret OUTSIDE the handler
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
  console.log("📋 Event details:", {
    title: eventData.title,
    owner: eventData.owner,
    invitation_count: invitations.length
  });
  
  if (invitations.length > 0) {
    const previewEmails = invitations.slice(0, 3).map(invite => invite.email).join(", ");
    const more = invitations.length > 3 ? ` (+ ${invitations.length - 3} more)` : "";
    console.log(`📨 Invited emails (${invitations.length}): ${previewEmails}${more}`);

    const sendEmailPromises = invitations.map(invite => {
      const registrationLink = `https://eventplattform-f9c17.web.app/registration.html?eventId=${eventId}&token=${invite.token}`;
      const msg = {
        to: invite.email,
        from: 'anton.axelsson@edu.huddinge.se',
        subject: `You're invited to ${eventData.title}`,
        text: `Hello,\n\nYou are invited to the event "${eventData.title}" organized by ${eventData.owner}.\n${
          eventData.description ? "Details: " + eventData.description : ""
        }\n\nPlease register here: ${registrationLink}\n\nThank you!`
      };
      return sgMail.send(msg);
    });

    try {
      await Promise.all(sendEmailPromises);
      console.log('Emails sent successfully!');
    } catch (error) {
      console.error('Error sending emails:', error.response?.body?.errors || error);
    }
  } else {
    console.log("⚠️ No emails invited for this event");
  }

  return null;
});