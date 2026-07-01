<div align="center">

<img src="assets/hero.png" alt="GHOSTFX — Signal Processor MK.I" width="100%" />

**A guitar effects pedal that lives in your browser.**

Plug in, stomp to arm, and shape your tone with drive, echo, tone, flanger and
reverb — on a real-time 3D pedal whose knobs you actually turn.
No install, no plugins, no native app: the entire signal chain is hand-built
on the Web Audio API.

</div>

<p align="center">
  <img src="assets/spin.webp" alt="Turn the knobs in 3D" width="32%" />
  <img src="assets/presets.webp" alt="Five presets re-theme the rig" width="32%" />
  <img src="assets/stomp.webp" alt="Stomp to arm" width="32%" />
</p>

<p align="center">
  <sub><b>TURN THE KNOBS IN 3D&nbsp;&nbsp;·&nbsp;&nbsp;FIVE PRESETS RE-THEME THE RIG&nbsp;&nbsp;·&nbsp;&nbsp;STOMP TO ARM</b></sub>
</p>

Reach for one of five voiced presets — each a complete rig with its own amp and
cabinet character, colour palette and animated backdrop — and the whole
interface re-themes itself as you switch tones.

## Features

- **Real-time signal chain** — drive, echo, tone, flanger, reverb and master volume, all live
- **Plays your guitar** — live microphone input with built-in feedback protection
- **Five voiced presets** — each with its own amp and cabinet voicing, colour palette and animated backdrop
- **Hands-on 3D pedal** — drag the knobs and stomp the footswitch
- **Keyboard synth & metronome** — built in, for when there's no guitar around
- **Record & export** — capture a take and download it as MP3

## Controls

| Do this                 | To get                                              |
| ----------------------- | --------------------------------------------------- |
| Click the footswitch    | Arm / bypass the pedal                              |
| Drag a knob up or down  | Turn it — double-click resets, scroll fine-tunes    |
| Drag around the pedal   | Orbit the camera — scroll zooms                     |
| Pick a preset           | Swap the whole rig: voicing, palette and backdrop   |
| <kbd>Space</kbd>        | Start / stop recording                              |
| Keyboard synth          | Play notes from your computer keyboard              |

## Stack

- **UI** — React 19 and TypeScript, bundled with Vite, styled with Tailwind CSS
- **3D** — Three.js via React Three Fiber and drei
- **Audio** — the native Web Audio API, no audio framework. The whole effects chain
  and DSP — drive curves, per-preset cabinet voicing, modulation, convolution
  reverb and a zero-latency limiter — is built node by node; MP3 export uses lamejs.

## Run it locally

```bash
npm install
npm run dev
```

Open the URL Vite prints, allow microphone access, and stomp to arm.

> **Use headphones.** The pedal processes your live microphone, so open speakers
> can feed back.

Build for production with `npm run build`, then preview it with `npm run preview`.
