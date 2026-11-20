// Web Audio API Sound Generator for JH Luxury Showroom
// Zero external assets, instant loading, procedural synthesis

let audioCtx: AudioContext | null = null;
let ambientGain: GainNode | null = null;
let ambientOsc1: OscillatorNode | null = null;
let ambientOsc2: OscillatorNode | null = null;
let isMuted = false;

// Check localStorage
try {
  const saved = localStorage.getItem('jh_sound_muted');
  if (saved !== null) {
    isMuted = saved === 'true';
  }
} catch {
  // Ignore localStorage error
}

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function isAudioMuted(): boolean {
  return isMuted;
}

export function setAudioMuted(muted: boolean): void {
  isMuted = muted;
  try {
    localStorage.setItem('jh_sound_muted', String(muted));
  } catch {
    // Ignore
  }
  if (ambientGain) {
    ambientGain.gain.setValueAtTime(muted ? 0 : 0.035, audioCtx?.currentTime || 0);
  }
}

/** Subtle tactile click when selecting sizes, categories, or toggles */
export function playClickSound(): void {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const now = ctx.currentTime;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.04);

    gain.gain.setValueAtTime(0.04, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.045);
  } catch {
    // Ignore audio errors
  }
}

/** Rotary tick when rotating 3D showroom model or dragging turntable */
export function playTurntableTick(angleDelta = 1): void {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const now = ctx.currentTime;

    const baseFreq = 850 + Math.min(Math.abs(angleDelta) * 20, 400);
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.02);

    gain.gain.setValueAtTime(0.02, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.02);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.025);
  } catch {
    // Ignore audio errors
  }
}

/** Soft atmospheric swoosh when switching garments */
export function playGarmentSwitchSound(): void {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const bufferSize = ctx.sampleRate * 0.12;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.03;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 3.0;
    const now = ctx.currentTime;
    filter.frequency.setValueAtTime(400, now);
    filter.frequency.exponentialRampToValueAtTime(1400, now + 0.06);
    filter.frequency.exponentialRampToValueAtTime(300, now + 0.12);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.05, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start(now);
  } catch {
    // Ignore audio errors
  }
}

/** Toggleable atmospheric luxury studio drone */
export function toggleAmbientSoundtrack(): boolean {
  const ctx = getAudioContext();
  if (!ctx) return false;

  if (ambientOsc1) {
    try {
      ambientOsc1.stop();
      ambientOsc2?.stop();
    } catch {}
    ambientOsc1 = null;
    ambientOsc2 = null;
    ambientGain = null;
    return false;
  }

  try {
    const now = ctx.currentTime;
    ambientGain = ctx.createGain();
    ambientGain.gain.setValueAtTime(isMuted ? 0 : 0.03, now);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(220, now);

    ambientOsc1 = ctx.createOscillator();
    ambientOsc1.type = 'sine';
    ambientOsc1.frequency.setValueAtTime(110, now); // A2 note

    ambientOsc2 = ctx.createOscillator();
    ambientOsc2.type = 'triangle';
    ambientOsc2.frequency.setValueAtTime(165, now); // E3 perfect fifth

    ambientOsc1.connect(filter);
    ambientOsc2.connect(filter);
    filter.connect(ambientGain);
    ambientGain.connect(ctx.destination);

    ambientOsc1.start();
    ambientOsc2.start();
    return true;
  } catch {
    return false;
  }
}
