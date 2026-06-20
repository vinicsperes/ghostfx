# GHOST FX — Logo & brand asset brief

Hand this to the designer together with the **reference files** listed below.

## 1. What to attach as visual reference
- `public/ghost-led-solo.svg` — the current cyclops ghost outline (single eye / LED).
- `public/ghost-solid.svg` and `public/ghost-led.svg` — solid + LED variants.
- A screenshot of the running app (the 3D pedal silkscreen) and the browser
  tab favicon, so they see how small it must read.

## 2. The concept (one paragraph)
GHOST FX is a browser-based 3D guitar-pedal / effects web app with a dark,
haunted / doom aesthetic. The mascot is a **minimalist cyclops ghost**: a
rounded-dome "sheet ghost" body with a flat, scalloped bottom (3–4 small waves
as feet) and **exactly one eye — a glowing round LED**. No second eye, no mouth,
no arms. The single LED eye is the brand signature: in the app its colour is
swapped in code per mode, so it must be delivered as a **separate, isolatable
shape** (its own path / id / fill).

## 3. Prompt (copy–paste to the designer / Claude Design)
> Design a logo system for **GHOST FX**, a browser-based 3D guitar-pedal effects
> web app with a dark, haunted/doom mood. The mascot is a **minimalist cyclops
> ghost**: a single rounded-dome body with a flat, scalloped "sheet ghost"
> bottom (3–4 small waves) and **exactly one eye, which is a glowing round LED**
> — no second eye, no mouth, no arms.
>
> The single LED eye is the brand signature and must be an **isolated shape**,
> because the app recolours it per mode: idle/default green `#41ff77`; engaged
> red `#f53e3e`; and per preset — purple `#8a2be2`, silver `#cdd2da`, red
> `#e02828`, red-orange `#ff4a28`, green `#20f040`. The ghost **body** is a
> single flat colour, off-white `#e7e4dc`, on a near-black background `#060a08`.
>
> Deliver: (1) the **ghost mark** alone as a clean vector that still reads at
> 16 px; (2) a **simplified "GHOST FX" wordmark** — modern, slightly condensed,
> confident; drop the current chunky 3D type and the "— haunted tones" tagline
> from the mark itself; (3) **horizontal and stacked lockups** of mark +
> wordmark. Style: flat vector, no gradients on the body, the LED eye as the
> only colour accent. It must work both as a one-colour silkscreen print and as
> a tiny favicon.

## 4. Deliverables (production assets)
Provide everything as layered **SVG** masters first, then the raster exports:

| Asset | Format / size | Notes |
|---|---|---|
| Ghost mark (mono) | SVG | body only, single colour, LED eye as separate path |
| Ghost mark (LED) | SVG | same, LED filled — eye must keep its own `id`/fill |
| Wordmark "GHOST FX" | SVG | simplified, see §3 |
| Lockup — horizontal | SVG | mark + wordmark side by side |
| Lockup — stacked | SVG | mark above wordmark |
| Favicon | `favicon-16.png`, `favicon-32.png` (+ `.ico`) | must read at 16 px |
| Apple touch icon | `icon-180.png` (180×180) | solid bg, no transparency |
| PWA icons | `icon-192.png`, `icon-512.png` | |
| Maskable icon | `maskable-512.png` (512×512) | art inside the **safe zone** (~80% centre); bg fills to edges |
| Social / OG image | `og-ghostfx.png` (**1200×630**) | mark + wordmark on dark bg |

(These replace the current files in `public/` and `public/icons/`.)

## 5. Brand constraints / palette
- **Background:** near-black `#060a08` (also used as `theme-color`).
- **Body:** off-white `#e7e4dc`.
- **LED accent (default):** green `#41ff77` (theme green `#20f040`).
- **Engaged:** red `#f53e3e`.
- **Preset accents:** `#8a2be2`, `#cdd2da`, `#e02828`, `#ff4a28`, `#20f040`.
- **Must:** keep the LED eye as an isolated shape (the app recolours it).
- **Must:** stay legible at 16 px and as a single-colour silkscreen.
- **Don't:** add a second eye, a mouth, arms, or gradients on the body.
