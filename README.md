<div align="center">

<img src="assets/hero.png" alt="GHOSTFX — Signal Processor MK.I" width="760" />

</div>

**A guitar effects pedal that lives in your browser.** Plug in, stomp to arm, and
shape your tone with drive, echo, tone, flanger and reverb — played through a
real-time 3D pedal whose knobs you actually turn. No install, no plugins, no
native app: the entire signal chain is hand-built on the Web Audio API.

Reach for one of five voiced presets — each a complete rig with its own amp and
cabinet character, colour palette and animated backdrop — and the whole interface
re-themes itself as you switch tones.

<div align="center">

<table>
  <tr>
    <td align="center" width="33%"><img src="assets/spin.webp" alt="Interactive 3D pedal" width="240" /><br/><sub><b>Turn the knobs in 3D</b></sub></td>
    <td align="center" width="33%"><img src="assets/presets.webp" alt="Five voiced presets" width="240" /><br/><sub><b>Five presets re-theme the rig</b></sub></td>
    <td align="center" width="33%"><img src="assets/stomp.webp" alt="Stomp to arm" width="240" /><br/><sub><b>Stomp to arm the LED</b></sub></td>
  </tr>
</table>

</div>

## Features

- **Real-time signal chain** — drive, echo, tone, flanger, reverb and master volume, all live
- **Plays your guitar** — live microphone input with built-in feedback protection
- **Five voiced presets** — each with its own amp and cabinet voicing, colour palette and animated backdrop
- **Hands-on 3D pedal** — drag the knobs and stomp the footswitch
- **Keyboard synth & metronome** — built in, for when there's no guitar around
- **Record & export** — capture a take and download it as MP3

## Stack

- **UI** — React 19 and TypeScript, bundled with Vite, styled with Tailwind CSS
- **3D** — Three.js via React Three Fiber and drei
- **Audio** — the native Web Audio API, no audio framework. The whole effects chain
  and DSP — drive curves, per-preset cabinet voicing, modulation and a zero-latency
  limiter — is built node by node; MP3 export uses lamejs.

## Run it locally

```bash
npm install
npm run dev
```

Open the URL Vite prints, allow microphone access, and stomp to arm.

> **Use headphones.** The pedal processes your live microphone, so open speakers
> can feed back.

Build for production with `npm run build`, then preview it with `npm run preview`.
