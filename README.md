# miffy synth

A little hand piano on light-blue graph paper. Hold your hands up to the camera and play chords, the way a mirror would, with a bunny for a cursor.

This is a scrapbook remake of [Gesture Synth](https://github.com/ericwei97-cloud/gesture-synth) by Eric Wei. The tones, chord voicings, and hand model are the same instrument. The page, drawings, and cursor are new.

## Play

```bash
npm install
npm run dev
```

Open the local page, tap the picture, and allow the camera.

- **Left hand** chooses the chord. Tilt in for major, tilt out for minor. One to five fingers are scale degrees I–V. Index and pinky is VI. Add the thumb for VII.
- **Right hand** colors it. One finger is root position, two is first inversion, three is a seventh, four is dominant or diminished. Thumb out drops an octave. Tilt opens the filter. Lift your hand to get louder.
- **Tones** are warm (triangle), bright (saw), and retro (square).

`npm run build` writes a static site to `dist/`.

## What's included

- `public/models/hand_landmarker.task` is the MediaPipe hand landmarker (float16), the same model Gesture Synth loads.
- The matching MediaPipe wasm runtime is copied from `@mediapipe/tasks-vision` into `public/mediapipe` when you start or build. It is not committed.

## Credits

Gesture Synth is by Eric Wei. That project welcomes adaptations with credit, and asks that commercial use of the original work get permission from the author. This page credits it in the footer and in How to play.

The hand model is MediaPipe by Google, Apache-2.0.

The bunny, cat, fish, and paper are an original fan theme inspired by a simple outlined bunny and a light-blue grid. They are not affiliated with Mercis, Dick Bruna, or the Miffy brand.
