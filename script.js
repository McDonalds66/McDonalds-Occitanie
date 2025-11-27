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
let privateBlocked = false;
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

const blockForPrivateMode = () => {
  privateBlocked = true;
  spinBtn.disabled = true;
  cooldownMessage.textContent = 'Navigation privee detectee. Desactive-la pour utiliser la roue.';
  headlinePrimary.textContent = 'Navigation privee';
  headlineSecondary.textContent = '1 tour par jour et par appareil.';
};

const detectPrivateMode = async () => {
  if (typeof window === 'undefined') return false;

  let strongHit = false;
  let weakHits = 0;
  const weakThreshold = 2;
  const isSafari = (() => {
    const ua = navigator.userAgent;
    return /Safari/.test(ua) && !/Chrome/.test(ua);
  })();

  // Heuristic 1: localStorage write capability
  try {
    const testKey = '__pvt_test__';
    localStorage.setItem(testKey, '1');
    localStorage.removeItem(testKey);
  } catch (err) {
    strongHit = true;
  }

  const checks = [];

  // Heuristic 2: webkitRequestFileSystem (Chrome/Edge)
  checks.push(
    new Promise((resolve) => {
      if (!('webkitRequestFileSystem' in window)) {
        resolve(false);
        return;
      }
      window.webkitRequestFileSystem(
        window.TEMPORARY,
        1,
        () => resolve(false),
        () => resolve(true)
      );
    }).then((hit) => {
      if (hit) strongHit = true;
    })
  );

  // Heuristic 3: WebSQL (Safari)
  checks.push(
    new Promise((resolve) => {
      if (!isSafari || !window.openDatabase) {
        resolve(false);
        return;
      }
      try {
        window.openDatabase(null, null, null, null);
        resolve(false);
      } catch (err) {
        resolve(true);
      }
    }).then((hit) => {
      if (hit) strongHit = true;
    })
  );

  // Heuristic 4: IndexedDB availability
  checks.push(
    new Promise((resolve) => {
      if (!window.indexedDB) {
        resolve(true);
        return;
      }
      const req = indexedDB.open('__pvt_idb__', 1);
      let hit = false;
      req.onerror = () => {
        hit = true;
        resolve(true);
      };
      req.onsuccess = () => {
        req.result.close();
        indexedDB.deleteDatabase('__pvt_idb__');
        resolve(false);
      };
      req.onblocked = () => resolve(true);
      setTimeout(() => resolve(hit), 500);
    }).then((hit) => {
      if (hit) weakHits += 1;
    })
  );

  // Heuristic 5: Storage quota (Firefox/Chromium)
  checks.push(
    (async () => {
      if (!(navigator.storage && navigator.storage.estimate)) return;
      try {
        const { quota = 0 } = await navigator.storage.estimate();
        if (quota && quota < 120000000) {
          weakHits += 1;
        }
      } catch (err) {
        // ignore
      }
    })()
  );

  // Heuristic 6: Persistent storage support
  checks.push(
    (async () => {
      if (!(navigator.storage && navigator.storage.persisted)) return;
      try {
        const persisted = await navigator.storage.persisted();
        if (!persisted) {
          weakHits += 1;
        }
      } catch (err) {
        // ignore
      }
    })()
  );

  await Promise.all(checks);

  return strongHit || weakHits >= weakThreshold;
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
  if (spinning || privateBlocked) return;
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

const initWheel = async () => {
  try {
    const isPrivate = await detectPrivateMode();
    if (isPrivate) {
      blockForPrivateMode();
      return;
    }
  } catch (err) {
    // If detection fails, default to allowing play with standard cooldown.
  }

  applyCooldownState();
};

initWheel();
