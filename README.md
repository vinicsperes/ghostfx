# GHOST FX

Browser-based guitar effects pedal. Plug in, stomp, and shape your tone with
drive, echo, tone and reverb — no install, no plugins. Runs entirely on the Web
Audio API with a real-time 3D pedal you can actually turn the knobs on.

## Features

- Real-time signal chain: drive, echo, tone, reverb and master volume
- Live input from the microphone with feedback protection
- Interactive 3D pedal (drag the knobs, stomp the footswitch)
- Five voiced presets, each with its own palette and animated backdrop
- Built-in chromatic tuner and an on-screen keyboard synth
- Shareable tone via URL parameters

## Stack

React 19, TypeScript, Vite, Three.js / React Three Fiber, Tailwind CSS and the
Web Audio API.

## Development

```bash
npm install
npm run dev
```

Open the local URL Vite prints, allow microphone access and stomp to arm.

> Use headphones. The pedal processes your live microphone, so open speakers
> can feed back.

## Build

```bash
npm run build
npm run preview
```
