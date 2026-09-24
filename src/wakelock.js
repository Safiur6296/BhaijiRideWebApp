/**
 * Screen WakeLock and Keep-Alive Manager for Motorbike Cockpit
 * Crucial for iPhone/iPad and Android handlebars mounts so screen stays on.
 */

let wakeLock = null;
let isAudioActive = false;
let audioContext = null;
let silenceNode = null;

export async function requestScreenWakeLock(onStatusChange = null) {
  if ('wakeLock' in navigator) {
    try {
      wakeLock = await navigator.wakeLock.request('screen');
      if (onStatusChange) onStatusChange(true);

      wakeLock.addEventListener('release', () => {
        if (onStatusChange) onStatusChange(false);
      });

      // Re-request if visibility changes (e.g. user briefly looked at home screen)
      const handleVisibilityChange = async () => {
        if (wakeLock !== null && document.visibilityState === 'visible') {
          try {
            wakeLock = await navigator.wakeLock.request('screen');
            if (onStatusChange) onStatusChange(true);
          } catch (e) {
            console.warn('Re-acquiring wake lock failed:', e);
          }
        }
      };

      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.addEventListener('visibilitychange', handleVisibilityChange);

      return true;
    } catch (err) {
      console.warn('Screen WakeLock error:', err);
      if (onStatusChange) onStatusChange(false);
      return false;
    }
  }
  return false;
}

export async function releaseScreenWakeLock(onStatusChange = null) {
  if (wakeLock !== null) {
    try {
      await wakeLock.release();
      wakeLock = null;
    } catch (e) {
      console.warn('Wake lock release error:', e);
    }
  }
  if (onStatusChange) onStatusChange(false);
}

/**
 * Optional Audio Keep-Alive for iOS Safari:
 * iOS WebKit pauses JS timers if no media or interaction is running.
 * Playing an inaudible, silent audio oscillator prevents deep throttling while active.
 */
export function startAudioKeepAlive() {
  if (isAudioActive) return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    audioContext = new AudioCtx();
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();

    // Inaudible frequency and zero gain
    osc.frequency.setValueAtTime(40, audioContext.currentTime);
    gain.gain.setValueAtTime(0.001, audioContext.currentTime);

    osc.connect(gain);
    gain.connect(audioContext.destination);
    osc.start();

    silenceNode = osc;
    isAudioActive = true;
  } catch (err) {
    console.warn('Audio keep-alive failed (non-critical):', err);
  }
}

export function stopAudioKeepAlive() {
  if (!isAudioActive) return;
  try {
    if (silenceNode) {
      silenceNode.stop();
      silenceNode.disconnect();
      silenceNode = null;
    }
    if (audioContext && audioContext.state !== 'closed') {
      audioContext.close();
      audioContext = null;
    }
    isAudioActive = false;
  } catch (err) {
    console.warn('Error stopping audio keep-alive:', err);
  }
}
