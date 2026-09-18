import { clock, draw, effect, frame, geometry, init, sampler, surface, target, type Draw, type Effect, type Gpu } from "vgpu";
import { box, capsule, cone, cylinder, icosphere, octahedron, orbit, perspectiveCamera, torus, type PerspectiveCamera } from "vgpu/scene";

import characterWgsl from "./shaders/character.wgsl";
import presentWgsl from "./shaders/present.wgsl";

// Every 3D piece on this page — the hero medallion and the center sentry —
// is the same cel-shaded ("Borderlands") technique from vgpu's own
// two-pass-rendering guide: hard-banded toon lighting plus an ink outline
// via the inverted-hull trick (the same geometry redrawn front-culled with
// vertices pushed outward along their normals, flat black). Each canvas gets
// its own offscreen depth target, all sharing one `gpu` device.

interface IconSpec {
  readonly canvasId: string;
  readonly geometry: ReturnType<typeof geometry>;
  readonly color: readonly [number, number, number];
  readonly distance: number;
  readonly fov: number;
  readonly spinSpeed: number;
}

let disposed = false;

function startToonIcon(gpu: Gpu, spec: IconSpec) {
  const canvas = document.querySelector<HTMLCanvasElement>(`#${spec.canvasId}`);
  if (!canvas) return undefined;

  // Premultiplied alpha: these canvases sit transparently over the CSS
  // comic backdrop, not on an opaque black square.
  const canvasSurface = surface(gpu, canvas, { autoResize: false, dpr: [1, 2], alphaMode: "premultiplied" });
  let scene = target(gpu, { size: canvasSurface.size, depth: true, label: `${spec.canvasId}-scene` });

  const camera: PerspectiveCamera = perspectiveCamera({
    fov: spec.fov,
    aspect: canvasSurface.size[0] / Math.max(1, canvasSurface.size[1]),
    position: [0, 0, spec.distance],
    target: [0, 0, 0],
  });

  const glowSampler = sampler(gpu, { minFilter: "linear", magFilter: "linear" });
  const main: Draw = draw(gpu, { shader: characterWgsl, geometry: spec.geometry, cull: "back", label: `${spec.canvasId}-main` });
  const outline: Draw = draw(gpu, { shader: characterWgsl, geometry: spec.geometry, cull: "front", label: `${spec.canvasId}-outline` });
  const present: Effect = effect(gpu, presentWgsl, { label: `${spec.canvasId}-present` });

  let resizeFrame = 0;
  let pendingSize: { readonly width: number; readonly height: number; readonly dpr: number } | undefined;
  const applyResize = () => {
    resizeFrame = 0;
    const size = pendingSize;
    pendingSize = undefined;
    if (disposed || !size) return;
    const physical: [number, number] = [Math.max(1, Math.round(size.width * size.dpr)), Math.max(1, Math.round(size.height * size.dpr))];
    canvasSurface.resize(physical);
    scene.resize(physical);
    camera.set({ aspect: physical[0] / physical[1] });
  };
  const measure = () => {
    const { width, height } = canvas.getBoundingClientRect();
    if (disposed || width <= 0 || height <= 0) return;
    pendingSize = { width, height, dpr: Math.min(2, Math.max(1, window.devicePixelRatio || 1)) };
    if (!resizeFrame) resizeFrame = requestAnimationFrame(applyResize);
  };
  const observer = typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(measure);
  observer?.observe(canvas);
  measure();

  void Promise.all([main.compile(scene), outline.compile(scene), present.compile({ colors: [canvasSurface.format] })]);
  present.set({ scene, sceneSampler: glowSampler });

  const time = clock(gpu);
  return {
    render() {
      const model = orbit(time.time * spec.spinSpeed, { radius: 0 });
      const cameraUniform = { viewProjection: camera.viewProjection, cameraPos: camera.worldPosition, unused: 0 };
      main.set({ camera: cameraUniform, model: { model, color: spec.color, outline: 0 } });
      outline.set({ camera: cameraUniform, model: { model, color: [0, 0, 0], outline: 1 } });

      frame(gpu, (currentFrame) => {
        currentFrame.pass({ target: scene, clear: [0, 0, 0, 0], clearDepth: 1 }, (pass) => {
          pass.draw(outline);
          pass.draw(main);
        });
        currentFrame.pass(canvasSurface, present);
      });
    },
    dispose() {
      observer?.disconnect();
    },
  };
}

// --- Center figure ---------------------------------------------------
//
// The stats split into two flanking cards (see style.css .hud-panel)
// so this low-poly sentry can stand in the gap between them, same
// cel-shade + ink-outline technique as every other model on the page,
// just built from several primitives with static local offsets instead
// of one shape.

function mat4TranslateScale(tx: number, ty: number, tz: number, s: number): Float32Array {
  // Column-major TS matrix: uniform scale then translate — enough for
  // a rigid part that never rotates on its own.
  return new Float32Array([s, 0, 0, 0, 0, s, 0, 0, 0, 0, s, 0, tx, ty, tz, 1]);
}

interface FigurePartSpec {
  readonly geometry: ReturnType<typeof geometry>;
  readonly color: readonly [number, number, number];
  readonly position: readonly [number, number, number];
  readonly scale: number;
}

function startCenterFigure(gpu: Gpu, canvasId: string) {
  const canvas = document.querySelector<HTMLCanvasElement>(`#${canvasId}`);
  if (!canvas) return undefined;

  const canvasSurface = surface(gpu, canvas, { autoResize: false, dpr: [1, 2], alphaMode: "premultiplied" });
  let scene = target(gpu, { size: canvasSurface.size, depth: true, label: `${canvasId}-scene` });

  const camera: PerspectiveCamera = perspectiveCamera({
    fov: 26,
    aspect: canvasSurface.size[0] / Math.max(1, canvasSurface.size[1]),
    position: [0, 0.25, 3.9],
    target: [0, 0.3, 0],
  });

  const glowSampler = sampler(gpu, { minFilter: "linear", magFilter: "linear" });
  const present: Effect = effect(gpu, presentWgsl, { label: `${canvasId}-present` });

  const parts: readonly FigurePartSpec[] = [
    { geometry: geometry(gpu, icosphere({ radius: 0.27 })), color: COLORS.gold, position: [0, 1.05, 0], scale: 1 },
    { geometry: geometry(gpu, cylinder({ radius: 0.34, height: 0.85 })), color: COLORS.magenta, position: [0, 0.5, 0], scale: 1 },
    { geometry: geometry(gpu, capsule({ radius: 0.15, height: 0.55 })), color: COLORS.violet, position: [-0.17, -0.15, 0], scale: 1 },
    { geometry: geometry(gpu, capsule({ radius: 0.15, height: 0.55 })), color: COLORS.violet, position: [0.17, -0.15, 0], scale: 1 },
    { geometry: geometry(gpu, capsule({ radius: 0.11, height: 0.5 })), color: COLORS.cyan, position: [-0.48, 0.5, 0], scale: 1 },
    { geometry: geometry(gpu, capsule({ radius: 0.11, height: 0.5 })), color: COLORS.cyan, position: [0.48, 0.5, 0], scale: 1 },
  ];

  const draws = parts.map((part, index) => ({
    part,
    main: draw(gpu, { shader: characterWgsl, geometry: part.geometry, cull: "back", label: `${canvasId}-main-${index}` }),
    outline: draw(gpu, { shader: characterWgsl, geometry: part.geometry, cull: "front", label: `${canvasId}-outline-${index}` }),
  }));

  let resizeFrame = 0;
  let pendingSize: { readonly width: number; readonly height: number; readonly dpr: number } | undefined;
  const applyResize = () => {
    resizeFrame = 0;
    const size = pendingSize;
    pendingSize = undefined;
    if (disposed || !size) return;
    const physical: [number, number] = [Math.max(1, Math.round(size.width * size.dpr)), Math.max(1, Math.round(size.height * size.dpr))];
    canvasSurface.resize(physical);
    scene.resize(physical);
    camera.set({ aspect: physical[0] / physical[1] });
  };
  const measure = () => {
    const { width, height } = canvas.getBoundingClientRect();
    if (disposed || width <= 0 || height <= 0) return;
    pendingSize = { width, height, dpr: Math.min(2, Math.max(1, window.devicePixelRatio || 1)) };
    if (!resizeFrame) resizeFrame = requestAnimationFrame(applyResize);
  };
  const observer = typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(measure);
  observer?.observe(canvas);
  measure();

  void Promise.all([...draws.flatMap((d) => [d.main.compile(scene), d.outline.compile(scene)]), present.compile({ colors: [canvasSurface.format] })]);
  present.set({ scene, sceneSampler: glowSampler });

  const time = clock(gpu);
  return {
    render() {
      const cameraUniform = { viewProjection: camera.viewProjection, cameraPos: camera.worldPosition, unused: 0 };
      const bob = Math.sin(time.time * 1.3) * 0.035;
      for (const d of draws) {
        const [px, py, pz] = d.part.position;
        const model = mat4TranslateScale(px, py + bob, pz, d.part.scale);
        d.main.set({ camera: cameraUniform, model: { model, color: d.part.color, outline: 0 } });
        d.outline.set({ camera: cameraUniform, model: { model, color: [0, 0, 0], outline: 1 } });
      }

      frame(gpu, (currentFrame) => {
        currentFrame.pass({ target: scene, clear: [0, 0, 0, 0], clearDepth: 1 }, (pass) => {
          for (const d of draws) {
            pass.draw(d.outline);
            pass.draw(d.main);
          }
        });
        currentFrame.pass(canvasSurface, present);
      });
    },
    dispose() {
      observer?.disconnect();
    },
  };
}

// --- Scroll reveal -----------------------------------------------------

function installScrollReveal(): () => void {
  const targets = document.querySelectorAll<HTMLElement>("[data-reveal]");
  if (typeof IntersectionObserver === "undefined") {
    targets.forEach((el) => el.classList.add("is-visible"));
    return () => {};
  }
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      }
    },
    { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
  );
  targets.forEach((el) => observer.observe(el));
  return () => observer.disconnect();
}

// --- Skill tree ----------------------------------------------------------

function installSkillTree(): () => void {
  const nodes = Array.from(document.querySelectorAll<HTMLButtonElement>(".tree-node"));
  const title = document.querySelector<HTMLElement>("#tree-title");
  const rank = document.querySelector<HTMLElement>("#tree-rank");
  const desc = document.querySelector<HTMLElement>("#tree-desc");
  const stats = document.querySelector<HTMLElement>("#tree-stats");
  if (!nodes.length || !title || !rank || !desc || !stats) return () => {};

  const select = (node: HTMLButtonElement) => {
    for (const other of nodes) other.classList.toggle("is-active", other === node);
    title.textContent = node.dataset.title ?? "";
    rank.textContent = node.dataset.rank ?? "";
    desc.textContent = node.dataset.desc ?? "";
    // "Label:value|Label:value" — kept in the markup so the copy lives with
    // the node it belongs to rather than in a table over here.
    stats.replaceChildren(
      ...(node.dataset.stats ?? "")
        .split("|")
        .filter(Boolean)
        .map((entry) => {
          const [label, value] = entry.split(":");
          const row = document.createElement("div");
          const dt = document.createElement("dt");
          dt.textContent = label ?? "";
          const dd = document.createElement("dd");
          dd.textContent = value ?? "";
          row.append(dt, dd);
          return row;
        })
    );
  };

  const onEnter = (event: Event) => select(event.currentTarget as HTMLButtonElement);
  for (const node of nodes) {
    node.addEventListener("pointerenter", onEnter);
    node.addEventListener("focus", onEnter);
    node.addEventListener("click", onEnter);
  }

  return () => {
    for (const node of nodes) {
      node.removeEventListener("pointerenter", onEnter);
      node.removeEventListener("focus", onEnter);
      node.removeEventListener("click", onEnter);
    }
  };
}

// --- Class select --------------------------------------------------------

function installClassSelect(): () => void {
  const cards = Array.from(document.querySelectorAll<HTMLElement>(".class-card"));
  if (!cards.length) return () => {};
  const onEnter = (event: Event) => {
    const card = event.currentTarget as HTMLElement;
    for (const other of cards) other.classList.toggle("is-selected", other === card);
  };
  for (const card of cards) card.addEventListener("pointerenter", onEnter);
  return () => {
    for (const card of cards) card.removeEventListener("pointerenter", onEnter);
  };
}

// --- 3D panel tilt -------------------------------------------------------

const TILT_MAX_DEGREES = 7;
const TILT_EASE = 0.09;
// How much extra tilt the card the cursor sits over gets, on top of the
// shared base tilt: 0 = both cards move identically, 1 = the near card
// swings twice as far as it would on its own.
const TILT_PROXIMITY_GAIN = 0.85;

function installPanelTilt(): () => void {
  const zone = document.querySelector<HTMLElement>(".hud-wrap");
  const panel = document.querySelector<HTMLElement>("#hud-panel");
  const leftCard = document.querySelector<HTMLElement>(".hud-spotlight");
  const rightCard = document.querySelector<HTMLElement>(".hud-rewards");
  if (!zone || !panel || !leftCard || !rightCard) return () => {};
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return () => {};

  let targetX = 0;
  let targetY = 0;
  let currentX = 0;
  let currentY = 0;
  let raf = 0;
  let tiltDisposed = false;

  const onMove = (event: PointerEvent) => {
    const rect = zone.getBoundingClientRect();
    targetX = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    targetY = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
  };
  const onLeave = () => {
    targetX = 0;
    targetY = 0;
  };

  zone.addEventListener("pointermove", onMove);
  zone.addEventListener("pointerleave", onLeave);

  // Writing custom properties rather than `transform` keeps each card's
  // static cant in CSS (and lets the mobile `transform: none` rule still
  // win, which an inline transform would override).
  const applyCard = (card: HTMLElement, gain: number, cursor: { readonly x: number; readonly y: number }) => {
    card.style.setProperty("--tilt-x", `${(-currentY * TILT_MAX_DEGREES * gain).toFixed(2)}deg`);
    card.style.setProperty("--tilt-y", `${(currentX * TILT_MAX_DEGREES * gain).toFixed(2)}deg`);
    // Cursor position expressed in this card's own box, so the glare sits
    // where the pointer actually is and slides off the card it leaves.
    // offsetLeft/offsetTop are layout values, unaffected by the card's own
    // transform, so this can't feed back into itself.
    card.style.setProperty("--glare-x", `${(((cursor.x - card.offsetLeft) / card.offsetWidth) * 100).toFixed(1)}%`);
    card.style.setProperty("--glare-y", `${(((cursor.y - card.offsetTop) / card.offsetHeight) * 100).toFixed(1)}%`);
  };

  const loop = () => {
    if (tiltDisposed) return;
    currentX += (targetX - currentX) * TILT_EASE;
    currentY += (targetY - currentY) * TILT_EASE;

    // The eased cursor, mapped from zone space into the panel's own box —
    // the cards measure their glare against that.
    const zoneRect = zone.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();
    const cursor = {
      x: zoneRect.left + (currentX * 0.5 + 0.5) * zoneRect.width - panelRect.left,
      y: zoneRect.top + (currentY * 0.5 + 0.5) * zoneRect.height - panelRect.top,
    };

    // currentX runs -1 (far left) .. +1 (far right) across the section, so
    // each card's share of the extra tilt is just how far the cursor has
    // travelled onto its side.
    applyCard(leftCard, 1 + TILT_PROXIMITY_GAIN * Math.max(0, -currentX), cursor);
    applyCard(rightCard, 1 + TILT_PROXIMITY_GAIN * Math.max(0, currentX), cursor);

    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);

  return () => {
    tiltDisposed = true;
    zone.removeEventListener("pointermove", onMove);
    zone.removeEventListener("pointerleave", onLeave);
    if (raf) cancelAnimationFrame(raf);
  };
}

// --- Boot ----------------------------------------------------------------

const gpu = await init();

const COLORS = {
  magenta: [0.85, 0.1, 0.45],
  gold: [0.95, 0.72, 0.1],
  violet: [0.42, 0.18, 0.68],
  cyan: [0.08, 0.62, 0.78],
} as const;

const icons = [
  startToonIcon(gpu, { canvasId: "icon-hero", geometry: geometry(gpu, torus({ radius: 0.72, tube: 0.24 })), color: COLORS.magenta, distance: 2.6, fov: 34, spinSpeed: 0.32 }),
  startToonIcon(gpu, { canvasId: "icon-class-sprint", geometry: geometry(gpu, cone({ radius: 0.62, height: 1.05 })), color: COLORS.gold, distance: 2.8, fov: 30, spinSpeed: 0.38 }),
  startToonIcon(gpu, { canvasId: "icon-class-rebuild", geometry: geometry(gpu, octahedron({ radius: 0.85 })), color: COLORS.cyan, distance: 2.7, fov: 30, spinSpeed: 0.42 }),
  startToonIcon(gpu, { canvasId: "icon-class-platform", geometry: geometry(gpu, box({ size: 1 })), color: COLORS.magenta, distance: 2.6, fov: 30, spinSpeed: 0.34 }),
  startToonIcon(gpu, { canvasId: "icon-class-embed", geometry: geometry(gpu, torus({ radius: 0.6, tube: 0.22 })), color: COLORS.violet, distance: 2.5, fov: 30, spinSpeed: 0.46 }),
].filter((icon): icon is NonNullable<typeof icon> => icon !== undefined);

const centerFigure = startCenterFigure(gpu, "icon-character");

let animationFrame = 0;
const tick = () => {
  if (disposed) return;
  for (const icon of icons) icon.render();
  centerFigure?.render();
  animationFrame = requestAnimationFrame(tick);
};
animationFrame = requestAnimationFrame(tick);

const disposeReveal = installScrollReveal();
const disposeTilt = installPanelTilt();
const disposeTree = installSkillTree();
const disposeClasses = installClassSelect();

window.addEventListener("beforeunload", () => {
  disposed = true;
  if (animationFrame) cancelAnimationFrame(animationFrame);
  disposeReveal();
  disposeTilt();
  disposeTree();
  disposeClasses();
  for (const icon of icons) icon.dispose();
  centerFigure?.dispose();
  gpu.dispose();
});
