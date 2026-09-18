import { clock, draw, effect, frame, geometry, init, sampler, surface, target, type Draw, type Effect, type Gpu, type Surface } from "vgpu";
import { icosphere, orbit, perspectiveCamera } from "vgpu/scene";

import { createNameTexture, type NameTexture } from "../../lib/name-in-light/name-texture";
import { createScene, prepareScene, runChain, presentScene, type RadianceScene } from "../../lib/name-in-light/simulation";
import hudWgsl from "./shaders/hud.wgsl";
import signatureObjectWgsl from "./shaders/signature-object.wgsl";
import signaturePresentWgsl from "./shaders/signature-present.wgsl";
import { applyThemeCss, getTheme, loadThemeId, saveThemeId, THEMES, type Theme } from "./themes";

// The landing page's three small GPU subsystems, one `gpu` device shared
// across three canvases:
//   1. Background (ideas 1 + 7) — the name-in-light engine from the /lab/
//      radiance-cascades page, reused unmodified, with its name reveal eased
//      in on load instead of drawn by a pointer: chaos settles into order,
//      then keeps breathing as ambient light behind the page.
//   2. HUD (idea 4) — a small glowing readout that cycles through proof
//      points, always on screen while scrolling.
//   3. Signature (idea 9) — a slowly turning halo-lit solid, following the
//      /desk/ page's two-pass-rendering technique — except a convex
//      icosphere never self-occludes once back faces are culled, so this
//      skips the offscreen depth pass entirely and draws straight to its
//      own small canvas.

const REVEAL_SECONDS = 2.6;
const HUD_LABELS = ["10+ YEARS SHIPPING", "100+ ENGINEERS SERVED", "$1.3M USD IMPACT", "IDEA TO PROD IN 1 WEEK"];
const HUD_LABEL_SECONDS = 3.2;

let disposed = false;
let gpu: Gpu | undefined;

// --- Background --------------------------------------------------------

function startBackground(gpu: Gpu) {
  const canvas = document.querySelector<HTMLCanvasElement>("#bg")!;
  let canvasSurface: Surface | undefined;
  let nameTexture: NameTexture | undefined;
  let scene: RadianceScene | undefined;
  let resizeFrame = 0;
  let pendingSize: { readonly width: number; readonly height: number; readonly dpr: number } | undefined;
  let rebuilding = false;
  let sawInitialResize = false;

  const rebuildScene = () => {
    if (disposed || !canvasSurface || !nameTexture) return;
    rebuilding = true;
    try {
      scene = createScene(gpu, canvasSurface.size, nameTexture);
      void prepareScene(scene, canvasSurface.format);
    } finally {
      rebuilding = false;
    }
  };

  const applyResize = () => {
    resizeFrame = 0;
    const size = pendingSize;
    pendingSize = undefined;
    if (disposed || !size || !canvasSurface) return;
    canvasSurface.resize([Math.max(1, Math.round(size.width * size.dpr)), Math.max(1, Math.round(size.height * size.dpr))]);
  };

  const measure = () => {
    const { width, height } = canvas.getBoundingClientRect();
    if (disposed || width <= 0 || height <= 0) return;
    pendingSize = { width, height, dpr: Math.min(2, Math.max(1, window.devicePixelRatio || 1)) };
    if (!resizeFrame) resizeFrame = requestAnimationFrame(applyResize);
  };

  canvasSurface = surface(gpu, canvas, { autoResize: false, dpr: [1, 2] });
  nameTexture = createNameTexture(gpu.device, "Thibault Friedrich");
  scene = createScene(gpu, canvasSurface.size, nameTexture);
  void prepareScene(scene, canvasSurface.format);

  canvasSurface.onResize(() => {
    if (!sawInitialResize) {
      sawInitialResize = true;
      return;
    }
    if (!rebuilding) rebuildScene();
  });
  const observer = typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(measure);
  observer?.observe(canvas);
  measure();

  const time = clock(gpu);
  return {
    render(theme: Theme) {
      if (!canvasSurface || !scene) return;
      const reveal = Math.min(1, easeOutCubic(time.time / REVEAL_SECONDS));
      runChain(scene, { wordReveal: reveal });
      presentScene(scene, canvasSurface, {
        base: theme.gpu.gridBase,
        line: theme.gpu.gridLine,
        visible: theme.gpu.gridVisible,
      });
    },
    dispose() {
      observer?.disconnect();
    },
  };
}

function easeOutCubic(t: number): number {
  const clamped = Math.max(0, Math.min(1, t));
  return 1 - Math.pow(1 - clamped, 3);
}

// --- HUD -----------------------------------------------------------------

function startHud(gpu: Gpu) {
  const canvas = document.querySelector<HTMLCanvasElement>("#hud")!;
  const canvasSurface = surface(gpu, canvas, { autoResize: false, dpr: [1, 2] });
  const labels = HUD_LABELS.map((text) => createNameTexture(gpu.device, text));
  const hud: Effect = effect(gpu, hudWgsl, { label: "hud" });
  const glowSampler = sampler(gpu, { minFilter: "linear", magFilter: "linear", addressModeU: "clamp-to-edge", addressModeV: "clamp-to-edge" });

  let resizeFrame = 0;
  let pendingSize: { readonly width: number; readonly height: number; readonly dpr: number } | undefined;
  const applyResize = () => {
    resizeFrame = 0;
    const size = pendingSize;
    pendingSize = undefined;
    if (disposed || !size) return;
    canvasSurface.resize([Math.max(1, Math.round(size.width * size.dpr)), Math.max(1, Math.round(size.height * size.dpr))]);
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

  void hud.compile({ colors: [canvasSurface.format] });

  const time = clock(gpu);
  return {
    render(theme: Theme) {
      const index = Math.floor(time.time / HUD_LABEL_SECONDS) % labels.length;
      const active = labels[index]!;
      hud.set({
        params: { texel: canvasSurface.texelSize, time: time.time, unused: 0, accent: theme.gpu.accent, unused2: 0 },
        label_tex: active.texture,
        label_samp: glowSampler,
      });
      frame(gpu, (currentFrame) => currentFrame.pass(canvasSurface, hud));
    },
    dispose() {
      observer?.disconnect();
    },
  };
}

// --- Signature -------------------------------------------------------------

function startSignature(gpu: Gpu) {
  const canvas = document.querySelector<HTMLCanvasElement>("#signature")!;
  const canvasSurface = surface(gpu, canvas, { autoResize: false, dpr: [1, 2] });
  // A convex icosphere never self-occludes once back faces are culled, so
  // this skips depth entirely — but the present pass still needs to *sample*
  // the object pass's output, and a canvas surface's texture isn't
  // guaranteed sampleable, so that pass renders to a small offscreen target.
  let scene = target(gpu, { size: canvasSurface.size, label: "signature-scene" });

  const sphereGeometry = geometry(gpu, icosphere({ radius: 1, subdivisions: 3 }));
  const object: Draw = draw(gpu, { shader: signatureObjectWgsl, geometry: sphereGeometry, cull: "back", label: "signature" });
  const present: Effect = effect(gpu, signaturePresentWgsl, { label: "signature-present" });
  const glowSampler = sampler(gpu, { minFilter: "linear", magFilter: "linear" });

  const camera = perspectiveCamera({ fov: 32, aspect: canvasSurface.size[0] / canvasSurface.size[1], position: [0, 0, 3.4], target: [0, 0, 0] });

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

  void Promise.all([object.compile(scene), present.compile({ colors: [canvasSurface.format] })]);

  const time = clock(gpu);
  return {
    render(theme: Theme) {
      // The object shader multiplies this by diffuse lighting (up to ~1.3x), so
      // the HDR-boosted glow accent (used for the HUD/halo light sources) needs
      // toning down here or the solid clips to flat white instead of shading.
      const [r, g, b] = theme.gpu.accent;
      const albedo: readonly [number, number, number] = [Math.min(1, r / 2.6), Math.min(1, g / 2.6), Math.min(1, b / 2.6)];
      object.set({
        camera: { viewProjection: camera.viewProjection },
        model: { model: orbit(time.time * 0.35, { radius: 0 }), color: albedo },
      });
      present.set({
        scene,
        sceneSampler: glowSampler,
        params: { size: canvasSurface.size, unused: [0, 0], haloColor: theme.gpu.accent, unused2: 0 },
      });

      frame(gpu, (currentFrame) => {
        currentFrame.pass({ target: scene, clear: [0.05, 0.045, 0.06, 1] }, (pass) => pass.draw(object));
        currentFrame.pass(canvasSurface, present);
      });
    },
    dispose() {
      observer?.disconnect();
    },
  };
}

// --- Theme selector ----------------------------------------------------

let activeTheme: Theme = getTheme(loadThemeId());

const select = document.querySelector<HTMLSelectElement>("#theme-select")!;
for (const theme of THEMES) {
  const option = document.createElement("option");
  option.value = theme.id;
  option.textContent = theme.label;
  select.appendChild(option);
}
select.value = activeTheme.id;
applyThemeCss(activeTheme);

select.addEventListener("change", () => {
  activeTheme = getTheme(select.value);
  applyThemeCss(activeTheme);
  saveThemeId(activeTheme.id);
});

// --- Boot ------------------------------------------------------------------

gpu = await init();
const background = startBackground(gpu);
const hud = startHud(gpu);
const signature = startSignature(gpu);

// Three independent subsystems, each managing its own `frame()` calls — not
// vgpu's `frameLoop()`, whose callback already runs inside one open frame
// and would make each subsystem's own `frame()` call reentrant.
let animationFrame = 0;
const tick = () => {
  if (disposed) return;
  background.render(activeTheme);
  hud.render(activeTheme);
  signature.render(activeTheme);
  animationFrame = requestAnimationFrame(tick);
};
animationFrame = requestAnimationFrame(tick);

window.addEventListener("beforeunload", () => {
  disposed = true;
  if (animationFrame) cancelAnimationFrame(animationFrame);
  background.dispose();
  hud.dispose();
  signature.dispose();
  gpu?.dispose();
});
