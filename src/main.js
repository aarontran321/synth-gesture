import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";
import { renderScene } from "./draw.js";
import { ChordLock, readDegree, readRightFingers, readTilt, readVolume, isThumbExtended } from "./gestures.js";
import {
  KEY_BY_NOTE,
  MAJOR_SCALE,
  chordTones,
  romanNumeral,
  spellRoot,
  voiceChord,
  voicingLabel,
} from "./music.js";
import { SynthEngine } from "./synth.js";

const video = document.querySelector("#webcam");
const canvas = document.querySelector("#overlay");
const screen = document.querySelector("#screen");
const ctx = canvas.getContext("2d");

const startButton = document.querySelector("#startButton");
const startTitle = document.querySelector("#startTitle");
const startSub = document.querySelector("#startSub");
const chordPill = document.querySelector("#chordPill");
const chordName = document.querySelector("#chordName");
const chordRoman = document.querySelector("#chordRoman");
const hint = document.querySelector("#hint");
const qualityDisplay = document.querySelector("#qualityDisplay");
const filterDisplay = document.querySelector("#filterDisplay");
const volumeWrap = document.querySelector("#volumeMeterWrap");
const volumeBars = Array.from(document.querySelectorAll(".vol-bar"));
const keySelect = document.querySelector("#keySelect");
const toneSelect = document.querySelector("#toneSelect");
const guideToggle = document.querySelector("#guideToggle");
const guide = document.querySelector("#gestureGuide");
const helpButton = document.querySelector("#helpButton");
const helpModal = document.querySelector("#helpModal");
const closeHelp = document.querySelector("#closeHelp");
const cursor = document.querySelector("#miffyCursor");

const GUIDE = [
  { degree: 1, how: "1 finger" },
  { degree: 2, how: "2 fingers" },
  { degree: 3, how: "3 fingers" },
  { degree: 4, how: "4 fingers" },
  { degree: 5, how: "5 fingers" },
  { degree: 6, how: "index + pinky" },
  { degree: 7, how: "index + pinky + thumb" },
];

const synth = new SynthEngine();
const chordLock = new ChordLock();

let landmarker = null;
let landmarkerPromise = null;
let started = false;
let looping = false;
let lastVideoTime = -1;
let lastHands = [];
let lastChordText = "";
let view = { width: 1, height: 1 };

const wasmUrl = new URL("mediapipe", document.baseURI).toString().replace(/\/$/, "");
const modelUrl = new URL("models/hand_landmarker.task", document.baseURI).toString();

function loadLandmarker() {
  landmarkerPromise = createLandmarker().catch((error) => {
    landmarkerPromise = null;
    throw error;
  });
  return landmarkerPromise;
}

async function createLandmarker() {
  const vision = await FilesetResolver.forVisionTasks(wasmUrl);
  const options = (delegate) => ({
    baseOptions: {
      modelAssetPath: modelUrl,
      delegate,
    },
    runningMode: "VIDEO",
    numHands: 2,
  });
  try {
    return await HandLandmarker.createFromOptions(vision, options("GPU"));
  } catch (error) {
    console.warn("GPU hand model failed, using CPU", error);
    return HandLandmarker.createFromOptions(vision, options("CPU"));
  }
}

function renderGuide() {
  const scale = MAJOR_SCALE[keySelect.value] ?? MAJOR_SCALE.A;
  guide.innerHTML = GUIDE.map(({ degree, how }) => `
    <div class="guide-row">
      <span class="guide-note">${scale[degree - 1]}</span>
      <span class="guide-how">${how}</span>
    </div>
  `).join("");
}

function resize() {
  const rect = screen.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  view = {
    width: Math.max(1, rect.width),
    height: Math.max(1, rect.height),
  };
  canvas.width = Math.round(view.width * dpr);
  canvas.height = Math.round(view.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function setStartCopy(title, sub) {
  startTitle.textContent = title;
  startSub.textContent = sub;
}

function explainStartError(error) {
  const name = error?.name || "";
  if (name === "NotAllowedError" || name === "PermissionDeniedError") {
    return "allow the camera so the bunny can see your hands";
  }
  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return "no camera was found";
  }
  if (name === "NotReadableError") {
    return "the camera is busy in another app";
  }
  if (String(error?.message || "").toLowerCase().includes("fetch")) {
    return "the hand model didn't load. check your connection";
  }
  return "that didn't start. tap to try again";
}

async function startCamera() {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      facingMode: "user",
      width: { ideal: 1280 },
      height: { ideal: 720 },
    },
  });
  video.srcObject = stream;
  await video.play();
}

async function begin() {
  if (started) return;
  startButton.disabled = true;
  setStartCopy("one moment", "waking up the piano");
  const audioReady = synth.start();
  const eyes = landmarkerPromise ?? loadLandmarker();
  const cameraReady = startCamera();
  try {
    await audioReady;
    landmarker = await eyes;
    await cameraReady;
    started = true;
    document.body.classList.add("is-live");
    startButton.hidden = true;
    chordPill.hidden = false;
    resize();
    if (!looping) {
      looping = true;
      requestAnimationFrame(loop);
    }
  } catch (error) {
    console.error(error);
    const stream = video.srcObject;
    if (stream) {
      for (const track of stream.getTracks()) track.stop();
      video.srcObject = null;
    }
    setStartCopy("tap to try again", explainStartError(error));
    startButton.disabled = false;
  }
}

function handByName(name) {
  return lastHands.find((hand) => hand.handedness === name) ?? null;
}

function loop() {
  const now = performance.now();

  if (video.readyState >= 2 && video.currentTime !== lastVideoTime) {
    lastVideoTime = video.currentTime;
    try {
      const results = landmarker.detectForVideo(video, now);
      const groups = results.handedness ?? [];
      lastHands = results.landmarks.map((landmarks, index) => ({
        landmarks,
        handedness: groups[index]?.[0]?.categoryName ?? "",
      }));
    } catch (error) {
      console.error(error);
    }
  }

  const left = handByName("Left");
  const right = handByName("Right");
  const degree = left ? readDegree(left.landmarks, "Left") : null;
  const major = left ? readTilt(left.landmarks, "Left") >= 0 : true;
  const fingers = right ? readRightFingers(right.landmarks) : 0;
  const low = right ? isThumbExtended(right.landmarks, "Right") : false;
  const volume = right ? readVolume(right.landmarks) : 0;
  const tilt = right ? readTilt(right.landmarks, "Right") : 0;

  const rawChord = degree
    ? { degree, major, fingers, low }
    : null;
  const chord = chordLock.update(rawChord, now);

  paintHud({ left, right, chord, volume, tilt });

  if (right) synth.setFilter(tilt);

  if (right && chord && chord.fingers >= 1) {
    const tones = chordTones(keySelect.value, chord.degree, chord.major);
    let notes = voiceChord(tones, chord.fingers, chord.major);
    if (chord.low) notes = notes.map((freq) => freq / 2);
    synth.playNotes(notes);
    synth.setVolume(volume);
  } else if (started) {
    synth.setVolume(0);
  }

  renderScene(ctx, view, video, lastHands, {
    volume,
    tilt,
    fingers: chord?.fingers ?? 0,
    degree: chord?.degree ?? 0,
    major: chord?.major ?? true,
  });

  requestAnimationFrame(loop);
}

function paintHud({ left, right, chord, volume, tilt }) {
  const lit = Math.round(volume * volumeBars.length);
  volumeBars.forEach((bar) => {
    const index = Number(bar.dataset.index);
    bar.classList.toggle("lit", index >= volumeBars.length - lit);
  });
  volumeWrap.setAttribute("aria-valuenow", String(Math.round(volume * 100)));

  const percent = Math.round(tilt * 100);
  const sign = percent > 0 ? "+" : "";
  filterDisplay.textContent = `filter ${sign}${percent}%`;

  if (chord) {
    const name = spellRoot(keySelect.value, chord.degree, chord.major);
    const roman = romanNumeral(chord.degree, chord.major);
    if (name !== lastChordText) {
      chordName.textContent = name;
      chordName.classList.remove("pop");
      void chordName.offsetWidth;
      chordName.classList.add("pop");
      lastChordText = name;
    }
    chordRoman.textContent = roman;
    const label = voicingLabel(chord.fingers, chord.major, chord.low);
    qualityDisplay.textContent = label || "lift the right fingers to sound it";
  } else {
    if (lastChordText !== "···") {
      chordName.textContent = "···";
      chordName.classList.remove("pop");
      lastChordText = "···";
    }
    chordRoman.textContent = "";
    qualityDisplay.textContent = "waiting for a chord";
  }

  hint.hidden = false;
  if (!left && !right) hint.textContent = "wave both hands hello";
  else if (!left) hint.textContent = "left hand chooses the chord";
  else if (!right) hint.textContent = "right hand plays it";
  else if (!chord) hint.textContent = "hold up some fingers";
  else hint.hidden = true;
}

function openHelp() {
  helpModal.hidden = false;
  closeHelp.focus();
}

function closeHelpModal() {
  if (helpModal.hidden) return;
  helpModal.hidden = true;
  helpButton.focus();
}

keySelect.addEventListener("change", () => {
  if (!KEY_BY_NOTE[keySelect.value]) keySelect.value = "A";
  renderGuide();
});

toneSelect.addEventListener("change", () => {
  synth.setWaveform(toneSelect.value);
});

guideToggle.addEventListener("click", () => {
  guide.hidden = !guide.hidden;
  const open = !guide.hidden;
  guideToggle.textContent = open ? "close chart" : "finger chart";
  guideToggle.setAttribute("aria-expanded", String(open));
});

helpButton.addEventListener("click", openHelp);
closeHelp.addEventListener("click", closeHelpModal);
helpModal.addEventListener("click", (event) => {
  if (event.target === helpModal) closeHelpModal();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeHelpModal();
});

startButton.addEventListener("click", () => {
  begin();
});

document.addEventListener("visibilitychange", () => {
  if (!started || !synth.context) return;
  if (document.hidden) synth.context.suspend();
  else synth.context.resume();
});

const HOT_X = 12;
const HOT_Y = 95;

function placeCursor(x, y) {
  cursor.classList.add("is-on");
  cursor.style.transform = `translate3d(${x - HOT_X}px, ${y - HOT_Y}px, 0)`;
}

window.addEventListener("pointermove", (event) => {
  if (event.pointerType === "touch") return;
  document.documentElement.classList.add("has-miffy-cursor");
  placeCursor(event.clientX, event.clientY);
}, { passive: true });

window.addEventListener("pointerdown", (event) => {
  if (event.pointerType === "touch") return;
  cursor.classList.add("is-down");
});
window.addEventListener("pointerup", () => cursor.classList.remove("is-down"));
document.documentElement.addEventListener("pointerout", (event) => {
  if (!event.relatedTarget && event.pointerType !== "touch") cursor.classList.remove("is-on");
});

new ResizeObserver(resize).observe(screen);
window.addEventListener("resize", resize);
renderGuide();
loadLandmarker().catch(() => {
  // The tap-to-play button tries again and explains the failure.
});
resize();
