const wheel = document.getElementById('wheel');
const pointer = document.getElementById('pointer');
const spinBtn = document.getElementById('spinBtn');
const headlinePrimary = document.getElementById('headline-primary');
const headlineSecondary = document.getElementById('headline-secondary');
const cooldownMessage = document.getElementById('cooldownMessage');

const segments = [
  '1 Surprise McDo',
  '1 Petite boisson',
  'perdu',
  '1 Surprise McDo',
  '4 Chicken McNuggets™',
  '1 Donuts',
  '1 Menu Best Of™',
  '1 Sundae',
];

let currentRotation = 0;
let spinning = false;
const defaultHeadlinePrimary = headlinePrimary.textContent;
const defaultHeadlineSecondary = headlineSecondary.textContent;

const DAY_MS = 24 * 60 * 60 * 1000;
const STORAGE_KEY = 'wheelLastSpinAt';

const getLastSpin = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const parsed = stored ? parseInt(stored, 10) : 0;
    return Number.isFinite(parsed) ? parsed : 0;
  } catch (err) {
    return 0;
  }
};

const setLastSpin = (timestamp) => {
  try {
    localStorage.setItem(STORAGE_KEY, String(timestamp));
  } catch (err) {
    // Storage may be unavailable (e.g., private mode); ignore and allow play.
  }
};

const getCooldownState = () => {
  const last = getLastSpin();
  if (!last) {
    return { allowed: true, remainingMs: 0 };
  }

  const elapsed = Date.now() - last;
  if (elapsed >= DAY_MS) {
    return { allowed: true, remainingMs: 0 };
  }

  return { allowed: false, remainingMs: DAY_MS - elapsed };
};

const formatRemaining = (ms) => {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h${minutes.toString().padStart(2, '0')}`;
  }

  return `${minutes}min`;
};

const applyCooldownState = (state = getCooldownState()) => {
  if (state.allowed) {
    if (!spinning) {
      spinBtn.disabled = false;
    }
    cooldownMessage.textContent = '';
    headlinePrimary.textContent = defaultHeadlinePrimary;
    headlineSecondary.textContent = defaultHeadlineSecondary;
    return;
  }

  spinBtn.disabled = true;
  const remainingText = formatRemaining(state.remainingMs || DAY_MS);
  cooldownMessage.textContent = `Vous avez deja lance la roue. Reviens dans ${remainingText}.`;
  headlinePrimary.textContent = 'A demain !';
  headlineSecondary.textContent = '1 tour par jour et par appareil.';
};

// Pointer on the right at 90 deg, first slice starts at 67.5 deg so its center sits at the pointer when rotation = 0
const baseStartDeg = 67.5;
const pointerDeg = 90;

const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

const tickPointer = () => {
  pointer.classList.add('tick');
  setTimeout(() => pointer.classList.remove('tick'), 80);
};

const computeWinner = () => {
  const normalized = ((currentRotation % 360) + 360) % 360;
  const pointerOnWheel = (pointerDeg - normalized + 360) % 360;
  const idx = Math.floor(((pointerOnWheel - baseStartDeg + 360) % 360) / 45) % segments.length;
  return segments[idx];
};

const spin = () => {
  if (spinning) return;
  const cooldown = getCooldownState();
  if (!cooldown.allowed) {
    applyCooldownState(cooldown);
    return;
  }

  spinning = true;
  setLastSpin(Date.now());
  spinBtn.disabled = true;

  headlinePrimary.textContent = "C'est tout bon,";
  headlineSecondary.textContent = 'bonne chance !';

  const fullRotations = 4 + Math.floor(Math.random() * 3); // 4 to 6 full turns
  const randomOffset = Math.random() * 360;
  const targetRotation = currentRotation + fullRotations * 360 + randomOffset;
  const duration = 4400 + Math.random() * 800;

  const startRotation = currentRotation;
  const startTime = performance.now();
  let lastTickStep = Math.floor(startRotation / 45);

  const animate = (now) => {
    const elapsed = now - startTime;
    const t = Math.min(elapsed / duration, 1);
    const eased = easeOutCubic(t);
    const angle = startRotation + (targetRotation - startRotation) * eased;

    wheel.style.transform = `rotate(${angle}deg)`;
    currentRotation = angle;

    const tickStep = Math.floor(angle / 45);
    if (tickStep !== lastTickStep) {
      tickPointer();
      lastTickStep = tickStep;
    }

    if (t < 1) {
      requestAnimationFrame(animate);
      return;
    }

    currentRotation = targetRotation;
    wheel.style.transform = `rotate(${targetRotation}deg)`;

    const winner = computeWinner();

    setTimeout(() => {
      spinning = false;
      applyCooldownState();
      if (winner.toLowerCase() !== 'perdu') {
        const urlPrize = encodeURIComponent(winner);
        window.location.href = `win.html?lot=${urlPrize}`;
      }
    }, 500);
  };

  requestAnimationFrame(animate);
};

spinBtn.addEventListener('click', spin);
applyCooldownState();
