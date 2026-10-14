/**
 * Universal Torch / Flashlight Helper
 * Controls hardware flash / torch on devices running Chrome, Android, Edge, and iOS WebKit (where supported).
 * Also supports Html5Qrcode video track access.
 */

export async function toggleCameraTorch(streamOrTrackOrElementId, enable) {
  let track = null;

  if (!streamOrTrackOrElementId) return false;

  // 1. Direct MediaStreamTrack
  if (typeof streamOrTrackOrElementId.applyConstraints === 'function') {
    track = streamOrTrackOrElementId;
  }
  // 2. MediaStream
  else if (typeof streamOrTrackOrElementId.getVideoTracks === 'function') {
    track = streamOrTrackOrElementId.getVideoTracks()[0];
  }
  // 3. String element ID or HTMLElement
  else {
    const el = typeof streamOrTrackOrElementId === 'string'
      ? document.getElementById(streamOrTrackOrElementId)
      : streamOrTrackOrElementId;
    
    if (el) {
      const video = el.tagName === 'VIDEO' ? el : el.querySelector('video');
      if (video && video.srcObject && typeof video.srcObject.getVideoTracks === 'function') {
        track = video.srcObject.getVideoTracks()[0];
      }
    }
  }

  if (!track) {
    return false;
  }

  try {
    // Attempt standard constraints
    await track.applyConstraints({
      advanced: [{ torch: Boolean(enable) }]
    });
    return true;
  } catch (err) {
    console.debug('Hardware torch constraint notice:', err?.message || err);
    return false;
  }
}
