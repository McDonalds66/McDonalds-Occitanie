const wheel = document.getElementById('wheel');
const pointer = document.getElementById('pointer');
const spinBtn = document.getElementById('spinBtn');
const headlinePrimary = document.getElementById('headline-primary');
const headlineSecondary = document.getElementById('headline-secondary');

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

// Pointer on the right at 90°, first slice starts at 67.5° so its center sits at the pointer when rotation = 0
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
  spinning = true;
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
    console.log('Gain:', winner);

    setTimeout(() => {
      spinning = false;
      spinBtn.disabled = false;
    }, 400);
  };

  requestAnimationFrame(animate);
};

spinBtn.addEventListener('click', spin);
