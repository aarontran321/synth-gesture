// Hand readings for the instrument.
// Left hand picks the scale degree. Its tilt picks major or minor.
// Right hand picks the voicing, octave, filter, and volume.

const FINGERS = {
  index: { pip: 6, tip: 8 },
  middle: { pip: 10, tip: 12 },
  ring: { pip: 14, tip: 16 },
  pinky: { pip: 18, tip: 20 },
};

export function isFingerExtended(landmarks, name) {
  const { pip, tip } = FINGERS[name];
  return landmarks[tip].y < landmarks[pip].y;
}

export function isThumbExtended(landmarks, handedness) {
  const tip = landmarks[4];
  const ip = landmarks[3];
  if (handedness === "Right") return tip.x > ip.x;
  return tip.x < ip.x;
}

export function readDegree(landmarks, handedness) {
  const thumb = isThumbExtended(landmarks, handedness);
  const index = isFingerExtended(landmarks, "index");
  const middle = isFingerExtended(landmarks, "middle");
  const ring = isFingerExtended(landmarks, "ring");
  const pinky = isFingerExtended(landmarks, "pinky");

  if (index && pinky && !middle && !ring && !thumb) return 6;
  if (index && pinky && !middle && !ring && thumb) return 7;

  const count = [thumb, index, middle, ring, pinky].filter(Boolean).length;
  return count >= 1 && count <= 5 ? count : null;
}

export function readTilt(landmarks, handedness) {
  if (!landmarks || landmarks.length < 18) return 0;
  const wrist = landmarks[0];
  const middleMcp = landmarks[9];
  const ringMcp = landmarks[13];
  if (!wrist || !middleMcp || !ringMcp) return 0;

  const minX = Math.min(middleMcp.x, ringMcp.x);
  const maxX = Math.max(middleMcp.x, ringMcp.x);
  const maxTravel = 0.12;
  let tilt = 0;
  if (wrist.x < minX) tilt = (wrist.x - minX) / maxTravel;
  else if (wrist.x > maxX) tilt = (wrist.x - maxX) / maxTravel;
  tilt = Math.max(-1, Math.min(1, tilt));
  if (handedness === "Right") tilt = -tilt;
  return tilt;
}

export function readVolume(landmarks) {
  const y = landmarks[0]?.y ?? 1;
  const top = 0.05;
  const bottom = 0.95;
  const clamped = Math.max(top, Math.min(bottom, y));
  return 1 - (clamped - top) / (bottom - top);
}

export function readRightFingers(landmarks) {
  return ["index", "middle", "ring", "pinky"].filter((name) => isFingerExtended(landmarks, name)).length;
}

const HOLD_MS = 100;
const FLICKER_MS = 50;

function sameChord(a, b) {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.degree === b.degree && a.major === b.major && a.fingers === b.fingers && a.low === b.low;
}

export class ChordLock {
  constructor() {
    this.stable = null;
    this.candidate = null;
    this.since = 0;
    this.lastSeen = Number.NEGATIVE_INFINITY;
  }

  update(raw, now) {
    if (raw) this.lastSeen = now;

    let next = raw;
    if (!raw && now - this.lastSeen < FLICKER_MS) next = this.candidate;

    if (!sameChord(next, this.candidate)) {
      this.candidate = next;
      this.since = now;
    }

    if (now - this.since >= HOLD_MS) this.stable = this.candidate;
    return this.stable;
  }
}
