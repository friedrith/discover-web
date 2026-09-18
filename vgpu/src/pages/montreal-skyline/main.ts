import { clock, draw, effect, frameLoop, init, storage, surface, type Draw, type Effect, type Gpu, type Surface } from "vgpu";

import { installOrbitControls } from "./orbit-camera";
import particlesWgsl from "./shaders/particles.wgsl";
import skyWgsl from "./shaders/sky.wgsl";
import { COLUMN_COUNT, createSkylineProfile } from "./skyline";

// A navigable particle mesh of the Montreal skyline: the height-field solid
// from vgpu's own "FFT Ocean" example (npx vgpu examples pull fft-ocean,
// particles.wgsl technique) merged with a free orbit camera (drag to
// rotate, scroll to zoom) instead of a fixed cinematic shot.

const RES_LEVELS = 44;
const RES_Z = 12;
const INSTANCE_COUNT = COLUMN_COUNT * RES_LEVELS * RES_Z;

const ORBIT_TUNING = {
  target: [0, 14, 0] as const,
  initial: { azimuth: 0, elevation: 0.16, radius: 82 },
  minRadius: 20,
  maxRadius: 190,
  minElevation: -0.15,
  maxElevation: 1.35,
  fovDegrees: 44,
  near: 1,
  far: 400,
};

const WORLD = { width: 48, height: 32, depth: 16, pointSizePx: 6.5 };
const FADE = { near: 140, far: 260, power: 1.4 };

const COLORS = {
  building: [0.05, 0.06, 0.09, 1],
  window: [1.0, 0.72, 0.35, 1],
  mountain: [0.08, 0.16, 0.14, 1],
  landmark: [1.0, 0.35, 0.32, 1],
} as const;

const canvas = document.querySelector<HTMLCanvasElement>("#scene")!;

let disposed = false;
let gpu: Gpu | undefined;
let canvasSurface: Surface | undefined;
let sky: Effect | undefined;
let particles: Draw | undefined;
let orbit: ReturnType<typeof installOrbitControls> | undefined;
let animationFrame = 0;
let resizeFrame = 0;
let pendingSize: { readonly width: number; readonly height: number; readonly dpr: number } | undefined;

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

gpu = await init();
canvasSurface = surface(gpu, canvas, { autoResize: false, dpr: [1, 2] });

sky = effect(gpu, skyWgsl, { label: "sky" });

const profile = createSkylineProfile();
const columns = storage(gpu, profile.columns.byteLength, "read");
// `Float32Array`'s type doesn't statically guarantee an `ArrayBuffer` (vs.
// `SharedArrayBuffer`) backing; `createSkylineProfile` always allocates one.
columns.write(profile.columns as Float32Array<ArrayBuffer>);

particles = draw(gpu, {
  shader: particlesWgsl,
  vertices: 6,
  instances: INSTANCE_COUNT,
  blend: "alpha",
  label: "skyline-particles",
}).set({ columns });

const signature = { colors: [canvasSurface.format] };
await Promise.all([sky.compile(signature), particles.compile(signature)]);

orbit = installOrbitControls(canvas, ORBIT_TUNING);

const time = clock(gpu);
frameLoop(gpu, (frame) => {
  if (disposed || !canvasSurface || !sky || !particles || !orbit) return;
  const { view, projection } = orbit.matrices(canvasSurface.size);

  particles.set({
    u: {
      view,
      projection,
      viewport: [canvasSurface.size[0], canvasSurface.size[1], 1, 0],
      grid: [COLUMN_COUNT, RES_LEVELS, RES_Z, WORLD.pointSizePx],
      world: [WORLD.width, WORLD.height, WORLD.depth, 0],
      fade: [FADE.near, FADE.far, FADE.power, 0],
      clock: [time.time, 0, 0, 0],
      buildingColor: COLORS.building,
      windowColor: COLORS.window,
      mountainColor: COLORS.mountain,
      landmarkColor: COLORS.landmark,
    },
  });
  sky.set({ sky: { size: canvasSurface.size, time: time.time } });
  frame.pass(canvasSurface, sky);
  frame.pass({ target: canvasSurface, clear: false }, (pass) => pass.draw(particles!));
});

const observer = typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(measure);
observer?.observe(canvas);
measure();

window.addEventListener("beforeunload", () => {
  disposed = true;
  if (animationFrame) cancelAnimationFrame(animationFrame);
  if (resizeFrame) cancelAnimationFrame(resizeFrame);
  observer?.disconnect();
  orbit?.dispose();
  gpu?.dispose();
});
