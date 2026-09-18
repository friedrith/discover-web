import { clock, draw, effect, frameLoop, geometry, init, sampler, surface, target, type Draw, type Effect, type Gpu, type Surface } from "vgpu";
import { box, orbitControls, perspectiveCamera, plane, type OrbitControls, type PerspectiveCamera } from "vgpu/scene";

import objectWgsl from "./shaders/object.wgsl";
import presentWgsl from "./shaders/present.wgsl";

// A real 3D mesh (not a particle cloud) you can orbit around: a black desk
// on four legs, built with vgpu's own two-pass-rendering recipe (npx vgpu
// docs cat two-pass-rendering.md) — an offscreen target for depth, then a
// full-screen present pass to the canvas — plus vgpu/scene's `box()`/`plane()`
// geometry recipes, `perspectiveCamera()`, and its shared `orbitControls()`.

const DESK = {
  topWidth: 1.4,
  topDepth: 0.7,
  topThickness: 0.035,
  legHeight: 0.72,
  legThickness: 0.045,
  // How far each leg sits in from the top's edges.
  inset: 0.06,
};

const COLORS = {
  desk: [0.035, 0.035, 0.04],
  floor: [0.07, 0.068, 0.075],
} as const;

interface Part {
  readonly position: readonly [number, number, number];
  readonly scale: readonly [number, number, number];
}

function deskParts(): readonly Part[] {
  const { topWidth, topDepth, topThickness, legHeight, legThickness, inset } = DESK;
  const topY = legHeight + topThickness / 2;
  const legX = topWidth / 2 - inset - legThickness / 2;
  const legZ = topDepth / 2 - inset - legThickness / 2;

  const parts: Part[] = [{ position: [0, topY, 0], scale: [topWidth, topThickness, topDepth] }];
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      parts.push({
        position: [sx * legX, legHeight / 2, sz * legZ],
        scale: [legThickness, legHeight, legThickness],
      });
    }
  }
  return parts;
}

/** Column-major scale + translate model matrix — the desk's parts never rotate. */
function modelMatrix(position: readonly [number, number, number], scale: readonly [number, number, number]): Float32Array {
  const m = new Float32Array(16);
  m[0] = scale[0];
  m[5] = scale[1];
  m[10] = scale[2];
  m[15] = 1;
  m[12] = position[0];
  m[13] = position[1];
  m[14] = position[2];
  return m;
}

const canvas = document.querySelector<HTMLCanvasElement>("#scene")!;

let disposed = false;
let gpu: Gpu | undefined;
let canvasSurface: Surface | undefined;
let scene: ReturnType<typeof target> | undefined;
let present: Effect | undefined;
let deskDraws: Draw[] | undefined;
let floorDraw: Draw | undefined;
let camera: PerspectiveCamera | undefined;
let controls: OrbitControls | undefined;
let animationFrame = 0;
let resizeFrame = 0;
let pendingSize: { readonly width: number; readonly height: number; readonly dpr: number } | undefined;

const applyResize = () => {
  resizeFrame = 0;
  const size = pendingSize;
  pendingSize = undefined;
  if (disposed || !size || !canvasSurface || !scene || !camera) return;
  const physical: [number, number] = [Math.max(1, Math.round(size.width * size.dpr)), Math.max(1, Math.round(size.height * size.dpr))];
  canvasSurface.resize(physical);
  scene.resize(physical);
  camera.set({ aspect: physical[0] / physical[1] });
  present?.set({ params: { size: physical } });
};

const measure = () => {
  const { width, height } = canvas.getBoundingClientRect();
  if (disposed || width <= 0 || height <= 0) return;
  pendingSize = { width, height, dpr: Math.min(2, Math.max(1, window.devicePixelRatio || 1)) };
  if (!resizeFrame) resizeFrame = requestAnimationFrame(applyResize);
};

gpu = await init();
canvasSurface = surface(gpu, canvas, { autoResize: false, dpr: [1, 2] });
scene = target(gpu, { size: canvasSurface.size, depth: true, label: "desk-scene" });

camera = perspectiveCamera({
  fov: 42,
  aspect: canvasSurface.size[0] / canvasSurface.size[1],
  position: [1.7, 1.1, 2.1],
  target: [0, 0.4, 0],
});
controls = orbitControls(camera, {
  element: canvas,
  target: [0, 0.4, 0],
  distance: { min: 0.9, max: 6 },
  pitch: { min: -0.15, max: 1.4 },
});

const boxGeometry = geometry(gpu, box({ size: 1 }));
const floorGeometry = geometry(gpu, plane({ width: 6, height: 6 }));

// One `Draw` per part: each owns its own uniform buffer, so its model
// matrix persists across frames. Reusing a single `Draw` with `.set()`
// between several `pass.draw()` calls does not work — every draw in a
// submitted command buffer reads the *same* buffer at execute time, so
// they would all end up with whichever model matrix was written last.
deskDraws = deskParts().map((part, index) =>
  draw(gpu!, { shader: objectWgsl, geometry: boxGeometry, cull: "back", label: `desk-part-${index}` }).set({
    camera: { viewProjection: camera!.viewProjection },
    model: { model: modelMatrix(part.position, part.scale), color: COLORS.desk },
  })
);
floorDraw = draw(gpu, { shader: objectWgsl, geometry: floorGeometry, cull: "back", label: "floor" }).set({
  camera: { viewProjection: camera.viewProjection },
  model: { model: modelMatrix([0, 0, 0], [1, 1, 1]), color: COLORS.floor },
});

present = effect(gpu, presentWgsl);
await Promise.all([
  ...deskDraws.map((d) => d.compile(scene!)),
  floorDraw.compile(scene),
  present.compile({ colors: [canvasSurface.format] }),
]);
present.set({
  scene,
  sceneSampler: sampler(gpu, { minFilter: "linear", magFilter: "linear" }),
  params: { size: canvasSurface.size },
});

const time = clock(gpu);
frameLoop(gpu, (frame) => {
  if (disposed || !canvasSurface || !scene || !present || !deskDraws || !floorDraw || !camera || !controls) return;
  controls.update(time.deltaTime);

  frame.pass({ target: scene, clear: [0.055, 0.058, 0.075, 1], clearDepth: 1 }, (pass) => {
    floorDraw!.set({ camera: { viewProjection: camera!.viewProjection } });
    pass.draw(floorDraw!);
    for (const part of deskDraws!) {
      part.set({ camera: { viewProjection: camera!.viewProjection } });
      pass.draw(part);
    }
  });
  frame.pass(canvasSurface, present);
});

const observer = typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(measure);
observer?.observe(canvas);
measure();

window.addEventListener("beforeunload", () => {
  disposed = true;
  if (animationFrame) cancelAnimationFrame(animationFrame);
  if (resizeFrame) cancelAnimationFrame(resizeFrame);
  observer?.disconnect();
  controls?.dispose();
  gpu?.dispose();
});
