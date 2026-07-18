/* ============================================================
   FALCONS DIGITAL — Contact Form Handler
   Uses EmailJS so the form works with no backend server.
   ============================================================ */

/*
  SETUP REQUIRED (one-time, 5 minutes):
  1. Go to https://www.emailjs.com and create a free account
  2. Add an Email Service (Gmail is easiest) — note the SERVICE_ID
  3. Create an Email Template with these variables in the body:
     {{from_name}} {{from_phone}} {{from_email}} {{company}}
     {{service}} {{budget}} {{message}}
     — note the TEMPLATE_ID
  4. Go to Account > General and copy your PUBLIC_KEY
  5. Paste all 3 values below
*/

const EMAILJS_PUBLIC_KEY  = 'YOUR_PUBLIC_KEY';
const EMAILJS_SERVICE_ID  = 'YOUR_SERVICE_ID';
const EMAILJS_TEMPLATE_ID = 'YOUR_TEMPLATE_ID';

(function initEmailJS() {
  if (typeof emailjs !== 'undefined' && EMAILJS_PUBLIC_KEY !== 'YOUR_PUBLIC_KEY') {
    emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
  }
})();

const form    = document.getElementById('contact-form');
const submitBtn = document.getElementById('cf-submit');
const statusEl  = document.getElementById('cf-status');

if (form) {
  form.addEventListener('submit', function (e) {
    e.preventDefault();

    const name    = document.getElementById('cf-name').value.trim();
    const phone   = document.getElementById('cf-phone').value.trim();
    const email   = document.getElementById('cf-email').value.trim();
    const company = document.getElementById('cf-company').value.trim();
    const service = document.getElementById('cf-service').value;
    const budget  = document.getElementById('cf-budget').value;
    const message = document.getElementById('cf-message').value.trim();

    if (!name || !phone || !email || !service || !message) {
      showStatus('Please fill in all required fields.', 'error');
      return;
    }

    // Not configured yet — fall back to opening WhatsApp/email with the details prefilled
    if (EMAILJS_PUBLIC_KEY === 'YOUR_PUBLIC_KEY') {
      fallbackSubmit({ name, phone, email, company, service, budget, message });
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';
    showStatus('Sending your message...', 'loading');

    emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
      from_name: name,
      from_phone: phone,
      from_email: email,
      company: company || 'Not provided',
      service: service,
      budget: budget || 'Not specified',
      message: message
    }).then(() => {
      showStatus('✓ Message sent! We will get back to you within 24 hours.', 'success');
      form.reset();
      submitBtn.disabled = false;
      submitBtn.textContent = 'Send Message →';
    }).catch(() => {
      showStatus('Something went wrong. Please WhatsApp us directly instead.', 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Send Message →';
    });
  });
}

function showStatus(msg, type) {
  statusEl.textContent = msg;
  statusEl.className = 'cf-status ' + type;
}

// Fallback if EmailJS keys haven't been added yet: opens a pre-filled WhatsApp chat
function fallbackSubmit(data) {
  const text = encodeURIComponent(
    `New enquiry from website:\n\n` +
    `Name: ${data.name}\n` +
    `Phone: ${data.phone}\n` +
    `Email: ${data.email}\n` +
    `Company: ${data.company || '-'}\n` +
    `Service: ${data.service}\n` +
    `Budget: ${data.budget || '-'}\n\n` +
    `Message: ${data.message}`
  );
  showStatus('Opening WhatsApp to send your enquiry...', 'loading');
  setTimeout(() => {
    window.open(`https://wa.me/923000000000?text=${text}`, '_blank');
    showStatus('✓ Opened WhatsApp — please hit send there to complete your enquiry.', 'success');
  }, 600);
}
