import assert from "node:assert/strict";
import { ChordLock, readDegree, readTilt, readVolume } from "../src/gestures.js";
import {
  chordTones,
  degreeFrequency,
  romanNumeral,
  spellRoot,
  voiceChord,
} from "../src/music.js";

const semitone = (ratio) => 12 * Math.log2(ratio);

const cRoot = degreeFrequency("C", 1);
assert.equal(cRoot, 261.63);

const cTones = chordTones("C", 1, true);
assert.ok(Math.abs(semitone(cTones.third / cTones.root) - 4) < 1e-9);
assert.ok(Math.abs(semitone(cTones.fifth / cTones.root) - 7) < 1e-9);
assert.equal(degreeFrequency("G", 1), 196);
assert.equal(degreeFrequency("Gb", 1), 369.99 / 2);
assert.ok(Math.abs(degreeFrequency("C", 7) - 261.63 * 2 ** (-1 / 12)) < 1e-9);

const majorRoot = voiceChord(cTones, 1, true);
assert.deepEqual(majorRoot, [cTones.root, cTones.fifth, cTones.octaveRoot, cTones.octaveThird]);
assert.equal(voiceChord(cTones, 3, true)[3], cTones.maj7);
assert.equal(voiceChord(cTones, 4, true)[3], cTones.dom7);

const minor = chordTones("C", 2, false);
const dim = voiceChord(minor, 4, false);
assert.equal(dim[0], minor.root);
assert.equal(dim[2], minor.dim5);
assert.equal(dim[3], minor.dim7);
assert.ok(Math.abs(semitone(minor.third / minor.root) - 3) < 1e-9);

assert.equal(spellRoot("C", 1, true), "C");
assert.equal(spellRoot("C", 1, false), "Cm");
assert.equal(spellRoot("C", 2, false), "Dm");
assert.equal(spellRoot("Bb", 3, true), "D");
assert.equal(romanNumeral(6, false), "vi");
assert.equal(romanNumeral(1, true), "I");

function hand() {
  return Array.from({ length: 21 }, () => ({ x: 0.5, y: 0.6 }));
}
function extend(landmarks, name) {
  const joints = { index: [6, 8], middle: [10, 12], ring: [14, 16], pinky: [18, 20] };
  const [pip, tip] = joints[name];
  landmarks[pip].y = 0.5;
  landmarks[tip].y = 0.3;
}

const fist = hand();
assert.equal(readDegree(fist, "Left"), null);

const one = hand();
extend(one, "index");
assert.equal(readDegree(one, "Left"), 1);

const six = hand();
extend(six, "index");
extend(six, "pinky");
assert.equal(readDegree(six, "Left"), 6);

const seven = hand();
extend(seven, "index");
extend(seven, "pinky");
seven[3].x = 0.55;
seven[4].x = 0.4;
assert.equal(readDegree(seven, "Left"), 7);

const five = hand();
extend(five, "index");
extend(five, "middle");
extend(five, "ring");
extend(five, "pinky");
five[3].x = 0.55;
five[4].x = 0.4;
assert.equal(readDegree(five, "Left"), 5);

const tilted = hand();
tilted[0].x = 0.2;
tilted[9].x = 0.5;
tilted[13].x = 0.55;
assert.equal(readTilt(tilted, "Left"), -1);
assert.equal(readTilt(tilted, "Right"), 1);

const high = hand();
high[0].y = 0.05;
assert.equal(readVolume(high), 1);
const mid = hand();
mid[0].y = 0.5;
assert.ok(Math.abs(readVolume(mid) - 0.5) < 1e-9);

const lock = new ChordLock();
const pose = { degree: 1, major: true, fingers: 1, low: false };
assert.equal(lock.update(pose, 0), null);
assert.deepEqual(lock.update(pose, 100), pose);
assert.deepEqual(lock.update(null, 130), pose);
assert.equal(lock.update(null, 400)?.degree, 1);
assert.equal(lock.update(null, 500), null);

console.log("music and gesture checks passed");
