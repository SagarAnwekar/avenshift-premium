/* ============================================================
   AVENSHIFT — main.js (original code)
   Techniques learned from public breakdowns of award-level
   sites (Trionn / Codrops, GSAP + Three.js + Lenis patterns):
   - one shared scroll value driving the scene
   - lerp-eased mouse parallax
   - raycast hover on real 3D geometry
   - per-node sine drift with phase offsets
   - prefers-reduced-motion + matchMedia mobile fallbacks
   ============================================================ */

import * as THREE from 'three';
import gsap from 'https://esm.sh/gsap@3.12.5';
import { ScrollTrigger } from 'https://esm.sh/gsap@3.12.5/ScrollTrigger';
import Lenis from 'https://esm.sh/lenis@1.1.14';

gsap.registerPlugin(ScrollTrigger);

const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isMobile = window.matchMedia('(max-width: 768px)').matches;
const isFinePointer = window.matchMedia('(pointer: fine)').matches;

/* ---------------------------------------------------------
   1. SMOOTH SCROLL (Lenis) + ScrollTrigger wiring
--------------------------------------------------------- */
let lenis = null;
if (!prefersReduced) {
  lenis = new Lenis({ duration: 1.15, smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}

/* ---------------------------------------------------------
   2. THE 3D CIRCUIT-A SCENE
--------------------------------------------------------- */
const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
renderer.setSize(window.innerWidth, window.innerHeight);

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x080705, 0.055);

const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 7.5);

scene.add(new THREE.AmbientLight(0x40351a, 1.2));
const keyLight = new THREE.PointLight(0xf0c75e, 60, 40);
keyLight.position.set(4, 5, 6);
scene.add(keyLight);
const rimLight = new THREE.PointLight(0xd4a437, 30, 40);
rimLight.position.set(-5, -3, 4);
scene.add(rimLight);

const symbol = new THREE.Group();
function layoutSymbol() {
  const mobile = window.innerWidth <= 768;
  symbol.scale.setScalar(mobile ? 0.85 : 1.3);
  symbol.position.x = mobile ? 0 : 2.1;
  symbol.position.y = mobile ? 1.5 : -0.15;
}
layoutSymbol();
scene.add(symbol);

/* --- gold glow sprite texture (procedural, no external asset) --- */
function makeGlowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(240,199,94,0.9)');
  g.addColorStop(0.25, 'rgba(212,164,55,0.35)');
  g.addColorStop(1, 'rgba(212,164,55,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
const glowTex = makeGlowTexture();

const goldMat = new THREE.MeshStandardMaterial({
  color: 0xd4a437, metalness: 0.85, roughness: 0.3,
  emissive: 0x8a6d1f, emissiveIntensity: 0.55,
});
const padMat = new THREE.MeshStandardMaterial({
  color: 0xf0c75e, metalness: 0.7, roughness: 0.25,
  emissive: 0xd4a437, emissiveIntensity: 0.9,
});

/* --- the Circuit A, parametric (matches the logo's geometry) --- */
const A = {
  apex: [0, 1.05],
  footL: [-0.92, -0.95],
  footR: [0.92, -0.95],
};
function legPoint(from, to, t) {
  return [from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t];
}
const crossL = legPoint(A.apex, A.footL, 0.62);
const crossR = legPoint(A.apex, A.footR, 0.62);
const stubL1 = legPoint(A.apex, A.footL, 0.32), stubR1 = legPoint(A.apex, A.footR, 0.32);
const stubL2 = legPoint(A.apex, A.footL, 0.85), stubR2 = legPoint(A.apex, A.footR, 0.85);
const STUB = 0.34;

const edges = [
  [A.apex, A.footL], [A.apex, A.footR], [crossL, crossR],
  [stubL1, [stubL1[0] - STUB, stubL1[1]]],
  [stubR1, [stubR1[0] + STUB, stubR1[1]]],
  [stubL2, [stubL2[0] - STUB, stubL2[1]]],
  [stubR2, [stubR2[0] + STUB, stubR2[1]]],
];
const nodePoints = [
  { p: A.apex, r: 0.09 }, { p: A.footL, r: 0.09 }, { p: A.footR, r: 0.09 },
  { p: crossL, r: 0.055 }, { p: crossR, r: 0.055 },
  { p: [stubL1[0] - STUB, stubL1[1]], r: 0.055, pad: true },
  { p: [stubR1[0] + STUB, stubR1[1]], r: 0.055, pad: true },
  { p: [stubL2[0] - STUB, stubL2[1]], r: 0.055, pad: true },
  { p: [stubR2[0] + STUB, stubR2[1]], r: 0.055, pad: true },
];

/* traces as tubes */
edges.forEach(([a, b]) => {
  const start = new THREE.Vector3(a[0], a[1], 0);
  const end = new THREE.Vector3(b[0], b[1], 0);
  const dir = new THREE.Vector3().subVectors(end, start);
  const len = dir.length();
  const geo = new THREE.CylinderGeometry(0.016, 0.016, len, 8, 1, true);
  const mesh = new THREE.Mesh(geo, goldMat);
  mesh.position.copy(start).addScaledVector(dir, 0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  symbol.add(mesh);
});

/* nodes with glow sprites; each carries intro + drift state */
const nodes = [];
nodePoints.forEach(({ p, r, pad }, i) => {
  const holder = new THREE.Group();
  holder.position.set(p[0], p[1], 0);

  const core = new THREE.Mesh(
    pad ? new THREE.BoxGeometry(r * 1.5, r * 1.5, r * 1.5) : new THREE.SphereGeometry(r, 24, 24),
    padMat.clone()
  );
  core.userData.baseEmissive = padMat.emissiveIntensity;
  holder.add(core);

  const glow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTex, blending: THREE.AdditiveBlending,
    depthWrite: false, transparent: true, opacity: 0.85,
  }));
  glow.scale.setScalar(r * 9);
  holder.add(glow);

  holder.userData = {
    target: new THREE.Vector3(p[0], p[1], 0),
    phase: (i / nodePoints.length) * Math.PI * 2,
    explodeDir: new THREE.Vector3(p[0], p[1], 0).normalize(),
    core,
  };
  /* intro start: scattered */
  const s = 3.2;
  holder.position.set(
    p[0] + (Math.random() - 0.5) * s,
    p[1] + (Math.random() - 0.5) * s,
    (Math.random() - 0.5) * s
  );
  symbol.add(holder);
  nodes.push(holder);
});

/* gold dust particles */
const PARTICLE_COUNT = isMobile ? 220 : 520;
const pGeo = new THREE.BufferGeometry();
const pPos = new Float32Array(PARTICLE_COUNT * 3);
const pSeed = new Float32Array(PARTICLE_COUNT);
for (let i = 0; i < PARTICLE_COUNT; i++) {
  pPos[i * 3] = (Math.random() - 0.5) * 16;
  pPos[i * 3 + 1] = (Math.random() - 0.5) * 10;
  pPos[i * 3 + 2] = (Math.random() - 0.5) * 8;
  pSeed[i] = Math.random() * Math.PI * 2;
}
pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
const particles = new THREE.Points(pGeo, new THREE.PointsMaterial({
  color: 0xd4a437, size: 0.035, transparent: true, opacity: 0.7,
  blending: THREE.AdditiveBlending, depthWrite: false,
}));
scene.add(particles);

/* --- interaction state --- */
const st = {
  mouseX: 0, mouseY: 0,
  rotY: 0, rotX: 0,
  explodeAmt: 0,
  hovered: null,
  heroVisible: true,
};
if (isFinePointer) {
  window.addEventListener('pointermove', (e) => {
    st.mouseX = (e.clientX / window.innerWidth) * 2 - 1;
    st.mouseY = (e.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });
}

/* raycast hover on node cores */
const raycaster = new THREE.Raycaster();
const mouseV2 = new THREE.Vector2(-10, -10);
if (isFinePointer) {
  window.addEventListener('pointermove', (e) => {
    mouseV2.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
  }, { passive: true });
}

/* hero scroll progress (single shared driver) */
let heroProgress = 0;
ScrollTrigger.create({
  trigger: '#hero',
  start: 'top top',
  end: 'bottom top',
  scrub: true,
  onUpdate: (self) => { heroProgress = self.progress; },
});

/* pause rendering off-screen */
new IntersectionObserver(([entry]) => { st.heroVisible = entry.isIntersecting; }, { threshold: 0 })
  .observe(document.getElementById('hero'));

/* intro assemble */
const introTl = gsap.timeline({ delay: 0.25 });
nodes.forEach((h, i) => {
  introTl.to(h.position, {
    x: h.userData.target.x, y: h.userData.target.y, z: 0,
    duration: prefersReduced ? 0.01 : 1.6,
    ease: 'power3.out',
  }, prefersReduced ? 0 : i * 0.06);
});

/* render loop */
const clock = new THREE.Clock();
function tick() {
  const t = clock.getElapsedTime();
  if (st.heroVisible) {
    /* eased rotation + mouse parallax (lerp) */
    const speed = prefersReduced ? 0.0012 : 0.0035;
    st.rotY += speed;
    symbol.rotation.y += (st.rotY + st.mouseX * 0.35 - symbol.rotation.y) * 0.06;
    symbol.rotation.x += (st.rotX + st.mouseY * 0.2 - symbol.rotation.x) * 0.06;

    /* scroll drives explode + camera pull-back */
    st.explodeAmt += (heroProgress - st.explodeAmt) * 0.08;
    camera.position.z = 7.5 + st.explodeAmt * 2.5;
    camera.position.y = -st.explodeAmt * 0.8;

    /* node drift with phase offsets; fades as explode rises */
    nodes.forEach((h) => {
      const ph = h.userData.phase;
      const k = 1 - st.explodeAmt * 0.7;
      h.position.x = h.userData.target.x + Math.sin(t * 0.5 + ph) * 0.02 * k + h.userData.explodeDir.x * st.explodeAmt * 0.9;
      h.position.y = h.userData.target.y + Math.cos(t * 0.42 + ph * 1.3) * 0.016 * k + h.userData.explodeDir.y * st.explodeAmt * 0.9;
      h.position.z = Math.sin(t * 0.36 + ph * 1.7) * 0.05 * k;
    });

    /* hover raycast -> flash */
    if (isFinePointer) {
      raycaster.setFromCamera(mouseV2, camera);
      const hits = raycaster.intersectObjects(nodes.map((n) => n.userData.core), false);
      const hit = hits.length ? hits[0].object : null;
      if (hit && hit !== st.hovered) { hit.userData.flash = 1; }
      st.hovered = hit;
      nodes.forEach((h) => {
        const c = h.userData.core;
        c.userData.flash = (c.userData.flash || 0) * 0.92;
        c.material.emissiveIntensity = c.userData.baseEmissive + c.userData.flash * 1.6;
      });
    }

    /* particle drift */
    const arr = pGeo.attributes.position.array;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      arr[i * 3 + 1] += Math.sin(t * 0.3 + pSeed[i]) * 0.0012;
      arr[i * 3] += Math.cos(t * 0.22 + pSeed[i]) * 0.0009;
    }
    pGeo.attributes.position.needsUpdate = true;
    particles.rotation.y = t * 0.015;

    renderer.render(scene, camera);
  }
  requestAnimationFrame(tick);
}
tick();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  layoutSymbol();
});

/* ---------------------------------------------------------
   3. TEXT SPLITTING + REVEALS (own splitter, no paid plugin)
--------------------------------------------------------- */
function splitChars(el) {
  const text = el.textContent;
  el.textContent = '';
  const frag = document.createDocumentFragment();
  for (const ch of text) {
    const s = document.createElement('span');
    s.className = 'char';
    s.textContent = ch === ' ' ? ' ' : ch;
    frag.appendChild(s);
  }
  el.appendChild(frag);
  return el.querySelectorAll('.char');
}
function splitWords(el) {
  const words = el.textContent.trim().split(/\s+/);
  el.textContent = '';
  words.forEach((w, i) => {
    const s = document.createElement('span');
    s.className = 'word';
    s.textContent = w;
    el.appendChild(s);
    if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
  });
  return el.querySelectorAll('.word');
}

/* hero headline: blur-to-sharp char reveal */
document.querySelectorAll('#heroTitle [data-split]').forEach((line, li) => {
  const chars = splitChars(line);
  gsap.set(chars, { autoAlpha: 0, filter: 'blur(12px)', yPercent: 60 });
  gsap.to(chars, {
    autoAlpha: 1, filter: 'blur(0px)', yPercent: 0,
    duration: 0.9, ease: 'power2.out',
    stagger: { each: 0.035, from: 'random' },
    delay: 0.9 + li * 0.18,
    onComplete: () => gsap.set(chars, { clearProps: 'filter,will-change' }),
  });
});

/* hero eyebrow / sub / ctas */
gsap.to('.reveal-line', {
  autoAlpha: 1, y: 0, duration: 1, ease: 'power3.out', stagger: 0.15, delay: 0.5,
  startAt: { y: 24 },
});

/* section titles: word-by-word on scroll */
document.querySelectorAll('[data-split-words]').forEach((title) => {
  const words = splitWords(title);
  gsap.set(words, { autoAlpha: 0, y: 26, rotateX: -40 });
  gsap.to(words, {
    autoAlpha: 1, y: 0, rotateX: 0,
    duration: 0.7, ease: 'power3.out', stagger: 0.05,
    scrollTrigger: { trigger: title, start: 'top 82%' },
    onComplete: () => gsap.set(words, { clearProps: 'all' }),
  });
});

/* generic reveals */
document.querySelectorAll('.reveal').forEach((el) => {
  gsap.fromTo(el, { autoAlpha: 0, y: 32 }, {
    autoAlpha: 1, y: 0, duration: 0.9, ease: 'power3.out',
    scrollTrigger: { trigger: el, start: 'top 88%' },
  });
});

/* stat counters */
document.querySelectorAll('[data-count]').forEach((el) => {
  const target = Number(el.dataset.count);
  const obj = { v: 0 };
  gsap.to(obj, {
    v: target, duration: 1.6, ease: 'power2.out',
    scrollTrigger: { trigger: el, start: 'top 88%' },
    onUpdate: () => { el.textContent = Math.round(obj.v); },
  });
});

/* marquee (GSAP-driven so Lenis and it stay in sync) */
const track = document.getElementById('marqueeTrack');
if (track && !prefersReduced) {
  gsap.to(track, { xPercent: -50, ease: 'none', duration: 22, repeat: -1 });
}

/* nav state + burger */
const nav = document.getElementById('nav');
ScrollTrigger.create({
  start: 60, end: 'max',
  onUpdate: (self) => nav.classList.toggle('is-scrolled', self.scroll() > 60),
});
const burger = document.getElementById('burger');
const mobileMenu = document.getElementById('mobileMenu');
burger.addEventListener('click', () => {
  const open = mobileMenu.classList.toggle('is-open');
  burger.setAttribute('aria-expanded', String(open));
});
mobileMenu.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => {
  mobileMenu.classList.remove('is-open');
  burger.setAttribute('aria-expanded', 'false');
}));

/* step cards: cursor-tracked glow */
document.querySelectorAll('.step').forEach((card) => {
  card.addEventListener('pointermove', (e) => {
    const r = card.getBoundingClientRect();
    card.style.setProperty('--mx', `${e.clientX - r.left}px`);
    card.style.setProperty('--my', `${e.clientY - r.top}px`);
  }, { passive: true });
});

/* custom cursor */
if (isFinePointer) {
  const dot = document.querySelector('.cursor-dot');
  const ring = document.querySelector('.cursor-ring');
  const rx = gsap.quickTo(ring, 'x', { duration: 0.35, ease: 'power3.out' });
  const ry = gsap.quickTo(ring, 'y', { duration: 0.35, ease: 'power3.out' });
  window.addEventListener('pointermove', (e) => {
    gsap.set(dot, { x: e.clientX, y: e.clientY });
    rx(e.clientX); ry(e.clientY);
  }, { passive: true });
  document.querySelectorAll('[data-cursor="link"]').forEach((el) => {
    el.addEventListener('pointerenter', () => ring.classList.add('is-hover'));
    el.addEventListener('pointerleave', () => ring.classList.remove('is-hover'));
  });
}
