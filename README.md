# Avenshift — Premium 3D Website

One human. A full company of AI agents.

Original codebase. Dark + gold, Circuit A brand.

## Stack (all free / open source)

- **Three.js** — WebGL hero: a parametric 3D Circuit-A mark with glowing gold nodes, gold-dust particles, mouse parallax, raycast hover flashes and a scroll-driven explode.
- **GSAP + ScrollTrigger** — headline blur-to-sharp char reveal, word-by-word section titles, scroll reveals, counters, marquee.
- **Lenis** — smooth scrolling wired into ScrollTrigger.
- No build step. Plain HTML/CSS/ES modules. Deploys as-is to GitHub Pages.

## Techniques (learned from public breakdowns, implemented originally)

- One shared scroll value drives the whole hero scene (camera pull-back + symbol explode).
- Lerp-eased mouse parallax; per-node sine drift with phase offsets.
- Raycast-based hover on real 3D geometry with exponential-decay flash.
- Rendering pauses when the hero leaves the viewport; particle counts and pixel ratio drop on mobile; `prefers-reduced-motion` respected throughout.

## Run locally

Any static server: `python3 -m http.server` then open `http://localhost:8000`.

## Deploy

Push to `main`; GitHub Pages serves from root.
