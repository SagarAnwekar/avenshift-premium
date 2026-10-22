/* ============================================================
   AVENSHIFT — main.js v2 (original code)
   - One fixed WebGL stage; the 3D scene MORPHS per section
     (hero A -> chaos -> service clusters -> team ring -> A reform)
   - UnrealBloom glow on desktop
   - Techniques from public award-site breakdowns, written fresh.
   ============================================================ */

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import gsap from 'https://esm.sh/gsap@3.12.5';
import { ScrollTrigger } from 'https://esm.sh/gsap@3.12.5/ScrollTrigger';
import Lenis from 'https://esm.sh/lenis@1.1.14';

gsap.registerPlugin(ScrollTrigger);

const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isMobile = window.matchMedia('(max-width: 768px)').matches;
const isFinePointer = window.matchMedia('(pointer: fine)').matches;

/* ---------- smooth scroll ---------- */
let lenis = null;
if (!prefersReduced) {
  lenis = new Lenis({ duration: 1.15, smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}

/* ---------- renderer / scene ---------- */
const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
renderer.setSize(window.innerWidth, window.innerHeight);

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x080705, 0.05);

const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 7.5);

scene.add(new THREE.AmbientLight(0x40351a, 1.2));
const keyLight = new THREE.PointLight(0xf0c75e, 60, 40);
keyLight.position.set(4, 5, 6);
scene.add(keyLight);
const rimLight = new THREE.PointLight(0xd4a437, 30, 40);
rimLight.position.set(-5, -3, 4);
scene.add(rimLight);

/* bloom: desktop + motion allowed only */
let composer = null;
if (!isMobile && !prefersReduced) {
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight), 0.85, 0.7, 0.18
  );
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
}

/* ---------- glow texture ---------- */
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
  transparent: true, opacity: 1,
});
let traceTarget = 1;
const padMat = new THREE.MeshStandardMaterial({
  color: 0xf0c75e, metalness: 0.7, roughness: 0.25,
  emissive: 0xd4a437, emissiveIntensity: 0.9,
});

/* ---------- the Circuit A v3 geometry (exact coords from the master SVG) ---------- */
const heroLayoutPts = [
  { p: [0.0, 0.9], r: 0.085 },          // apex
  { p: [-0.716, -0.889], r: 0.085 },    // foot L
  { p: [0.716, -0.889], r: 0.085 },     // foot R
  { p: [-0.411, -0.126], r: 0.06 },     // crossbar L
  { p: [0.411, -0.126], r: 0.06 },      // crossbar R
  { p: [-0.587, 0.313], r: 0.06, pad: true },  // stub pad L1
  { p: [0.587, 0.313], r: 0.06, pad: true },   // stub pad R1
  { p: [-0.808, -0.566], r: 0.06, pad: true }, // stub pad L2
  { p: [0.808, -0.566], r: 0.06, pad: true },  // stub pad R2
];
const edges = [
  [[-0.679, -0.797], [-0.037, 0.808]],   // leg L
  [[0.679, -0.797], [0.037, 0.808]],     // leg R
  [[-0.321, -0.126], [0.321, -0.126]],   // crossbar
  [[-0.284, 0.189], [-0.463, 0.189]],    // stub L1
  [[-0.463, 0.189], [-0.526, 0.253]],
  [[0.284, 0.189], [0.463, 0.189]],      // stub R1
  [[0.463, 0.189], [0.526, 0.253]],
  [[-0.537, -0.442], [-0.684, -0.442]],  // stub L2
  [[-0.684, -0.442], [-0.747, -0.505]],
  [[0.537, -0.442], [0.684, -0.442]],    // stub R2
  [[0.684, -0.442], [0.747, -0.505]],
];
const symbol = new THREE.Group();
scene.add(symbol);

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

const nodes = [];
heroLayoutPts.forEach(({ p, r, pad }, i) => {
  const holder = new THREE.Group();
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
    phase: (i / heroLayoutPts.length) * Math.PI * 2,
    explodeDir: new THREE.Vector3(p[0], p[1], 0).normalize(),
    core, glow,
  };
  const s = 3.2;
  holder.position.set(p[0] + (Math.random() - 0.5) * s, p[1] + (Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
  symbol.add(holder);
  nodes.push(holder);
});

/* ---------- SECTION SCENES: layouts the nodes morph between ---------- */
const heroLayout = heroLayoutPts.map(({ p }) => new THREE.Vector3(p[0], p[1], 0));
const chaosLayout = heroLayoutPts.map((_, i) => {
  const a = (i / heroLayoutPts.length) * Math.PI * 2 + 0.7;
  const rad = 1.5 + (i % 3) * 0.55;
  return new THREE.Vector3(Math.cos(a) * rad, Math.sin(a) * rad * 0.8, ((i % 5) - 2) * 0.4);
});
const clustersLayout = [];
for (let c = 0; c < 3; c++) {
  const cx = (c - 1) * 1.6, cy = c === 1 ? 0.55 : -0.35;
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2 + c;
    clustersLayout.push(new THREE.Vector3(cx + Math.cos(a) * 0.45, cy + Math.sin(a) * 0.45, 0));
  }
}
const ringLayout = [new THREE.Vector3(0, 0, 0)];
for (let i = 1; i < 9; i++) {
  const a = ((i - 1) / 8) * Math.PI * 2;
  ringLayout.push(new THREE.Vector3(Math.cos(a) * 1.15, Math.sin(a) * 1.15, 0));
}

const SCENES = {
  hero:         { layout: heroLayout, glow: 1.0, traces: 1.0, spin: 1.0, pos: { x: 2.1, y: -0.15, s: 1.3 }, posM: { x: 0, y: 1.5, s: 0.85 } },
  chaos:        { layout: chaosLayout, glow: 0.45, traces: 0.05, spin: 0.4, pos: { x: 2.6, y: 0, s: 1.05 }, posM: { x: 0, y: 1.2, s: 0.7 } },
  clusters:     { layout: clustersLayout, glow: 0.9, traces: 0.05, spin: 0.7, pos: { x: 2.5, y: 0, s: 1.1 }, posM: { x: 0, y: 1.3, s: 0.75 } },
  ring:         { layout: ringLayout, glow: 0.85, traces: 0.05, spin: 0.9, pos: { x: 2.6, y: 0, s: 1.0 }, posM: { x: 0, y: 1.3, s: 0.7 } },
  'hero-reform': { layout: heroLayout, glow: 1.0, traces: 1.0, spin: 1.0, pos: { x: -2.2, y: 0, s: 1.1 }, posM: { x: 0, y: 1.6, s: 0.7 } },
};
let activeScene = SCENES.hero;
let glowFactor = 1, glowTarget = 1;
const groupTarget = { x: 0, y: 0, s: 1 };

document.querySelectorAll('[data-scene]').forEach((sec) => {
  const apply = () => {
    activeScene = SCENES[sec.dataset.scene] || SCENES.hero;
    glowTarget = activeScene.glow;
    traceTarget = activeScene.traces;
    const p = (window.innerWidth <= 768) ? activeScene.posM : activeScene.pos;
    groupTarget.x = p.x; groupTarget.y = p.y; groupTarget.s = p.s;
  };
  ScrollTrigger.create({
    trigger: sec, start: 'top 55%', end: 'bottom 55%',
    onEnter: apply, onEnterBack: apply,
  });
});
/* initial layout values */
(function () {
  const p = isMobile ? SCENES.hero.posM : SCENES.hero.pos;
  groupTarget.x = p.x; groupTarget.y = p.y; groupTarget.s = p.s;
  symbol.position.set(p.x, p.y, 0);
  symbol.scale.setScalar(p.s);
})();

/* ---------- gold dust ---------- */
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

/* ---------- interaction state ---------- */
const st = { mouseX: 0, mouseY: 0, rotY: 0, rotX: 0, explodeAmt: 0, hovered: null, pageVisible: true };
if (isFinePointer) {
  window.addEventListener('pointermove', (e) => {
    st.mouseX = (e.clientX / window.innerWidth) * 2 - 1;
    st.mouseY = (e.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });
}
const raycaster = new THREE.Raycaster();
const mouseV2 = new THREE.Vector2(-10, -10);
if (isFinePointer) {
  window.addEventListener('pointermove', (e) => {
    mouseV2.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
  }, { passive: true });
}

let heroProgress = 0;
ScrollTrigger.create({
  trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true,
  onUpdate: (self) => { heroProgress = self.progress; },
});

document.addEventListener('visibilitychange', () => { st.pageVisible = !document.hidden; });

/* intro assemble */
let introDone = false;
const introTl = gsap.timeline({
  delay: 0.25,
  onComplete: () => { introDone = true; },
});
nodes.forEach((h, i) => {
  introTl.to(h.position, {
    x: heroLayout[i].x, y: heroLayout[i].y, z: 0,
    duration: prefersReduced ? 0.01 : 1.6, ease: 'power3.out',
  }, prefersReduced ? 0 : i * 0.06);
});

/* ---------- render loop ---------- */
const clock = new THREE.Clock();
const desired = new THREE.Vector3();
function tick() {
  const t = clock.getElapsedTime();
  if (st.pageVisible) {
    glowFactor += (glowTarget - glowFactor) * 0.05;
    goldMat.opacity += (traceTarget - goldMat.opacity) * 0.06;

    const speed = (prefersReduced ? 0.0012 : 0.0035) * activeScene.spin;
    st.rotY += speed;
    symbol.rotation.y += (st.rotY + st.mouseX * 0.35 - symbol.rotation.y) * 0.06;
    symbol.rotation.x += (st.rotX + st.mouseY * 0.2 - symbol.rotation.x) * 0.06;
    symbol.position.x += (groupTarget.x - symbol.position.x) * 0.05;
    symbol.position.y += (groupTarget.y - symbol.position.y) * 0.05;
    const cs = symbol.scale.x + (groupTarget.s - symbol.scale.x) * 0.05;
    symbol.scale.setScalar(cs);

    st.explodeAmt += (heroProgress - st.explodeAmt) * 0.08;
    camera.position.z = 7.5 + st.explodeAmt * 2.5;
    camera.position.y = -st.explodeAmt * 0.8;

    const isChaos = activeScene === SCENES.chaos;
    nodes.forEach((h, i) => {
      if (!introDone) return;
      const L = activeScene.layout[i];
      const ph = h.userData.phase;
      const k = 1 - st.explodeAmt * 0.7;
      const jitter = isChaos && !prefersReduced ? Math.sin(t * 6 + ph * 5) * 0.012 : 0;
      desired.set(
        L.x + Math.sin(t * 0.5 + ph) * 0.02 * k + h.userData.explodeDir.x * st.explodeAmt * 0.9 + jitter,
        L.y + Math.cos(t * 0.42 + ph * 1.3) * 0.016 * k + h.userData.explodeDir.y * st.explodeAmt * 0.9,
        L.z + Math.sin(t * 0.36 + ph * 1.7) * 0.05 * k
      );
      h.position.lerp(desired, 0.055);
      h.userData.glow.material.opacity = 0.85 * glowFactor;
    });

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

    const arr = pGeo.attributes.position.array;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      arr[i * 3 + 1] += Math.sin(t * 0.3 + pSeed[i]) * 0.0012;
      arr[i * 3] += Math.cos(t * 0.22 + pSeed[i]) * 0.0009;
    }
    pGeo.attributes.position.needsUpdate = true;
    particles.rotation.y = t * 0.015;

    if (composer) composer.render(); else renderer.render(scene, camera);
  }
  requestAnimationFrame(tick);
}
tick();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  if (composer) composer.setSize(window.innerWidth, window.innerHeight);
});

/* ---------- text splitting + reveals ---------- */
function splitChars(el) {
  const text = el.textContent;
  el.textContent = '';
  const frag = document.createDocumentFragment();
  for (const ch of text) {
    const s = document.createElement('span');
    s.className = 'char';
    s.textContent = ch === ' ' ? '\u00A0' : ch;
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
gsap.to('.reveal-line', {
  autoAlpha: 1, y: 0, duration: 1, ease: 'power3.out', stagger: 0.15, delay: 0.5,
  startAt: { y: 24 },
});
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
document.querySelectorAll('.reveal').forEach((el) => {
  gsap.fromTo(el, { autoAlpha: 0, y: 32 }, {
    autoAlpha: 1, y: 0, duration: 0.9, ease: 'power3.out',
    scrollTrigger: { trigger: el, start: 'top 88%' },
  });
});

/* marquee */
const track = document.getElementById('marqueeTrack');
if (track && !prefersReduced) {
  gsap.to(track, { xPercent: -50, ease: 'none', duration: 22, repeat: -1 });
}

/* nav */
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

/* step card glow follows cursor */
document.querySelectorAll('.step').forEach((card) => {
  card.addEventListener('pointermove', (e) => {
    const r = card.getBoundingClientRect();
    card.style.setProperty('--mx', `${e.clientX - r.left}px`);
    card.style.setProperty('--my', `${e.clientY - r.top}px`);
  }, { passive: true });
});

/* contact form: compose an email locally, nothing stored */
const form = document.getElementById('contactForm');
if (form) {
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const d = new FormData(form);
    const subject = `Agent team brief - ${d.get('name')}`;
    const body = `Name: ${d.get('name')}\nReach me at: ${d.get('reach')}\n\nBrief:\n${d.get('brief')}\n\n- sent from avenshift site`;
    window.location.href = `mailto:avenshift@proton.me?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    const note = document.getElementById('formNote');
    if (note) note.textContent = 'OPENING YOUR MAIL APP…';
  });
}

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
