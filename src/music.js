// Equal-temperament chords for the hand instrument.
// Scale spellings, voicings, and the low-octave keys follow Gesture Synth.

export const KEYS = [
  { note: "A", freq: 220.0, label: "A" },
  { note: "Bb", freq: 233.08, label: "A♯ / B♭" },
  { note: "B", freq: 246.94, label: "B" },
  { note: "C", freq: 261.63, label: "C" },
  { note: "Db", freq: 277.18, label: "C♯ / D♭" },
  { note: "D", freq: 293.66, label: "D" },
  { note: "Eb", freq: 311.13, label: "D♯ / E♭" },
  { note: "E", freq: 329.63, label: "E" },
  { note: "F", freq: 349.23, label: "F" },
  { note: "Gb", freq: 369.99, label: "F♯ / G♭" },
  { note: "G", freq: 392.0, label: "G" },
  { note: "Ab", freq: 415.3, label: "G♯ / A♭" },
];

export const KEY_BY_NOTE = Object.fromEntries(KEYS.map((key) => [key.note, key]));

export const MAJOR_SCALE = {
  A: ["A", "B", "C#", "D", "E", "F#", "G#"],
  Bb: ["Bb", "C", "D", "Eb", "F", "G", "A"],
  B: ["B", "C#", "D#", "E", "F#", "G#", "A#"],
  C: ["C", "D", "E", "F", "G", "A", "B"],
  Db: ["Db", "Eb", "F", "Gb", "Ab", "Bb", "C"],
  D: ["D", "E", "F#", "G", "A", "B", "C#"],
  Eb: ["Eb", "F", "G", "Ab", "Bb", "C", "D"],
  E: ["E", "F#", "G#", "A", "B", "C#", "D#"],
  F: ["F", "G", "A", "Bb", "C", "D", "E"],
  Gb: ["Gb", "Ab", "Bb", "Cb", "Db", "Eb", "F"],
  G: ["G", "A", "B", "C", "D", "E", "F#"],
  Ab: ["Ab", "Bb", "C", "Db", "Eb", "F", "G"],
};

// Degree 7 is the leading tone written an octave down, so VII sits with the other chords.
const DEGREE_SEMITONES = { 1: 0, 2: 2, 3: 4, 4: 5, 5: 7, 6: 9, 7: -1 };
const LOW_KEYS = new Set(["Gb", "G", "Ab"]);

const ROMAN = [null, "I", "II", "III", "IV", "V", "VI", "VII"];

const MAJOR_VOICING = {
  1: "major",
  2: "major · 1st inversion",
  3: "major 7th",
  4: "dominant 7th",
};

const MINOR_VOICING = {
  1: "minor",
  2: "minor · 1st inversion",
  3: "minor 7th",
  4: "diminished 7th",
};

export function degreeFrequency(noteName, degree) {
  const key = KEY_BY_NOTE[noteName];
  const semitones = DEGREE_SEMITONES[degree];
  const tonic = LOW_KEYS.has(noteName) ? key.freq / 2 : key.freq;
  return tonic * 2 ** (semitones / 12);
}

export function chordTones(noteName, degree, major) {
  const root = degreeFrequency(noteName, degree);
  const third = root * 2 ** ((major ? 4 : 3) / 12);
  const fifth = root * 2 ** (7 / 12);
  return {
    root,
    third,
    fifth,
    octaveRoot: root * 2,
    octaveThird: third * 2,
    maj7: root * 2 ** (11 / 12),
    dom7: root * 2 ** (10 / 12),
    dim7: root * 2 ** (9 / 12),
    dim5: root * 2 ** (6 / 12),
  };
}

export function voiceChord(tones, fingers, major) {
  const { root, third, fifth, octaveRoot, octaveThird, maj7, dom7, dim7, dim5 } = tones;
  if (major) {
    if (fingers === 2) return [third, fifth, octaveRoot, octaveThird];
    if (fingers === 3) return [root, third, fifth, maj7];
    if (fingers === 4) return [root, third, fifth, dom7];
    return [root, fifth, octaveRoot, octaveThird];
  }
  if (fingers === 2) return [third, fifth, octaveRoot, octaveThird];
  if (fingers === 3) return [root, third, fifth, dom7];
  if (fingers === 4) return [root, third, dim5, dim7];
  return [root, fifth, octaveRoot, octaveThird];
}

export function spellRoot(noteName, degree, major) {
  const root = MAJOR_SCALE[noteName][degree - 1];
  return major ? root : `${root}m`;
}

export function romanNumeral(degree, major) {
  const token = ROMAN[degree];
  if (!token) return "";
  return major ? token : token.toLowerCase();
}

export function voicingLabel(fingers, major, low) {
  const label = (major ? MAJOR_VOICING : MINOR_VOICING)[fingers];
  if (!label) return "";
  return low ? `${label} · lower octave` : label;
}
