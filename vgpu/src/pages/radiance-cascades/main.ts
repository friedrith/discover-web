import { surface, type Gpu, type Surface } from "vgpu";

import { createNameTexture, type NameTexture } from "../../lib/name-in-light/name-texture";
import { installLightPaintInput } from "../../lib/name-in-light/pointer-input";
import { createScene, destroyScene, prepareScene, presentScene, runChain, type RadianceScene } from "../../lib/name-in-light/simulation";

// Drives the radiance-cascades canvas behind the page: sizing, the pointer
// light-painting input, and the render loop. Adapted from vgpu's own
// "Radiance Cascades" example, trimmed to a single fixed view (no lil-gui
// debug panel) since this page only ever shows the final composite.

const canvas = document.querySelector<HTMLCanvasElement>("#scene")!;

let disposed = false;
let gpu: Gpu | undefined;
let canvasSurface: Surface | undefined;
let nameTexture: NameTexture | undefined;
let scene: RadianceScene | undefined;
let input: ReturnType<typeof installLightPaintInput> | undefined;
let animationFrame = 0;
let resizeFrame = 0;
let pendingSize: { readonly width: number; readonly height: number; readonly dpr: number } | undefined;
let sawInitialResize = false;
let rebuilding = false;
let dirty = true;
let clearRequested = false;

const rebuildScene = () => {
  if (disposed || !gpu || !canvasSurface || !nameTexture) return;
  rebuilding = true;
  try {
    const next = createScene(gpu, canvasSurface.size, nameTexture);
    const previous = scene;
    scene = next;
    if (previous) destroyScene(previous);
    clearRequested = true;
    dirty = true;
    void prepareScene(next, canvasSurface.format);
  } finally {
    rebuilding = false;
  }
};

const onSurfaceResize = () => {
  if (!sawInitialResize) {
    sawInitialResize = true;
    return;
  }
  if (!rebuilding) rebuildScene();
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

const tick = () => {
  animationFrame = 0;
  if (disposed) return;
  if (!document.hidden && gpu && canvasSurface && scene && input) {
    const segment = input.take();
    if (segment) dirty = true;
    if (dirty) {
      runChain(scene, { segment, keepPrevious: !clearRequested });
      clearRequested = false;
      dirty = false;
    }
    presentScene(scene, canvasSurface);
  }
  animationFrame = requestAnimationFrame(tick);
};

const { init } = await import("vgpu");
gpu = await init();
canvasSurface = surface(gpu, canvas, { autoResize: false, dpr: [1, 2] });
nameTexture = createNameTexture(gpu.device, "Thibault");
scene = createScene(gpu, canvasSurface.size, nameTexture);
await prepareScene(scene, canvasSurface.format);

input = installLightPaintInput(canvas);

canvasSurface.onResize(onSurfaceResize);
const observer = typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(measure);
observer?.observe(canvas);
measure();
animationFrame = requestAnimationFrame(tick);

window.addEventListener("beforeunload", () => {
  disposed = true;
  if (animationFrame) cancelAnimationFrame(animationFrame);
  if (resizeFrame) cancelAnimationFrame(resizeFrame);
  observer?.disconnect();
  input?.dispose();
  gpu?.dispose();
});
