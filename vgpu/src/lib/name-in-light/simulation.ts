import { effect, frame, sampler, target, type Effect, type Gpu, type Surface, type Target } from "vgpu";

import type { NameTexture } from "./name-texture";
import type { PaintSegment } from "./pointer-input";
import jfaInitWgsl from "./shaders/jfa-init.wgsl";
import jfaPassWgsl from "./shaders/jfa-pass.wgsl";
import paintEmitterWgsl from "./shaders/paint-emitter.wgsl";
import presentWgsl from "./shaders/present.wgsl";
import radianceCascadeWgsl from "./shaders/radiance-cascade.wgsl";
import sdfFinalizeWgsl from "./shaders/sdf-finalize.wgsl";

// Adapted from vgpu's own "Radiance Cascades" example (npx vgpu examples pull
// radiance-cascades): a jump-flooded distance field feeds a top-down chain of
// radiance cascades — base 4, geometric intervals, linear RGBA16F — merged
// into 2D global illumination. This trims the original's debug-view switcher
// and lil-gui panel; the pointer-driven light painting is unchanged.

type Output = Surface | Target;
type Vec2 = readonly [number, number];

const HDR_FORMAT: GPUTextureFormat = "rgba16float";
// Seeds store absolute pixel coordinates, which need f32 precision past 2048.
const SEED_FORMAT: GPUTextureFormat = "rgba32float";
const RC_INTERVAL0 = 2;
/** Name height as a fraction of the canvas's shorter side. */
const TEXT_HEIGHT_FRACTION = 0.16;
/** Never let the name exceed this fraction of the canvas's width. */
const TEXT_MAX_WIDTH_FRACTION = 0.86;

function nameSizeOnScreen(size: Vec2, aspect: number): Vec2 {
  const byHeight = Math.min(size[0], size[1]) * TEXT_HEIGHT_FRACTION;
  const byWidth = (size[0] * TEXT_MAX_WIDTH_FRACTION) / aspect;
  const height = Math.min(byHeight, byWidth);
  return [height * aspect, height];
}

function strokeRadiance(index: number): readonly [number, number, number] {
  const hue = (index * 0.381966) % 1;
  const channel = (offset: number) => {
    const value = Math.abs(((hue + offset) % 1) * 6 - 3) - 1;
    return (0.25 + 0.75 * Math.min(1, Math.max(0, value))) * 2.7;
  };
  return [channel(0), channel(2 / 3), channel(1 / 3)];
}

export function createScene(gpu: Gpu, requestedSize: Vec2, nameTexture: NameTexture) {
  const width = Math.max(1, Math.floor(requestedSize[0]));
  const height = Math.max(1, Math.floor(requestedSize[1]));
  const size: Vec2 = [width, height];
  const cascadeCount = Math.min(
    6,
    Math.max(5, Math.ceil(Math.log(1 + (3 * Math.hypot(width, height)) / RC_INTERVAL0) / Math.log(4)))
  );
  const spacing = 2 ** (cascadeCount - 1);
  const atlas: Vec2 = [Math.ceil(width / spacing) * spacing * 2, Math.ceil(height / spacing) * spacing * 2];
  const jumpCount = Math.ceil(Math.log2(Math.max(width, height, 2)));
  const jumps = [...Array.from({ length: jumpCount }, (_, index) => Math.max(1, 2 ** (jumpCount - index - 1))), 1, 1];
  const created: Target[] = [];
  const own = (resource: Target) => {
    created.push(resource);
    return resource;
  };

  try {
    const emitter: [Target, Target] = [
      own(target(gpu, { size, format: HDR_FORMAT })),
      own(target(gpu, { size, format: HDR_FORMAT })),
    ];
    const jfa: [Target, Target] = [
      own(target(gpu, { size, format: SEED_FORMAT })),
      own(target(gpu, { size, format: SEED_FORMAT })),
    ];
    const sdf = own(target(gpu, { size, format: HDR_FORMAT }));
    // Two atlases are recycled from the top of the hierarchy down.
    const cascades: [Target, Target] = [
      own(target(gpu, { size: atlas, format: HDR_FORMAT })),
      own(target(gpu, { size: atlas, format: HDR_FORMAT })),
    ];
    return {
      gpu,
      size,
      atlas,
      cascadeCount,
      jumps,
      emitter,
      jfa,
      sdf,
      cascades,
      nameTexture,
      effects: {
        paint: effect(gpu, paintEmitterWgsl),
        jfaInit: effect(gpu, jfaInitWgsl),
        // Uniforms are uploaded immediately, so every encoded pass needs its own effect.
        jfaSteps: jumps.map(() => effect(gpu, jfaPassWgsl)),
        sdfFinalize: effect(gpu, sdfFinalizeWgsl),
        cascade: Array.from({ length: cascadeCount }, () => effect(gpu, radianceCascadeWgsl)),
        present: effect(gpu, presentWgsl),
      },
      sampler: sampler(gpu, {
        minFilter: "linear",
        magFilter: "linear",
        addressModeU: "clamp-to-edge",
        addressModeV: "clamp-to-edge",
      }),
    };
  } catch (error) {
    destroyTargets(created);
    throw error;
  }
}

export type RadianceScene = ReturnType<typeof createScene>;

export async function prepareScene(scene: RadianceScene, outputFormat: GPUTextureFormat): Promise<void> {
  await Promise.all([
    scene.effects.paint.compile({ colors: [HDR_FORMAT] }),
    scene.effects.jfaInit.compile({ colors: [SEED_FORMAT] }),
    ...scene.effects.jfaSteps.map((shader) => shader.compile({ colors: [SEED_FORMAT] })),
    scene.effects.sdfFinalize.compile({ colors: [HDR_FORMAT] }),
    ...scene.effects.cascade.map((shader) => shader.compile({ colors: [HDR_FORMAT] })),
    scene.effects.present.compile({ colors: [outputFormat] }),
  ]);
}

export function destroyScene(scene: RadianceScene): void {
  destroyTargets([...scene.emitter, ...scene.jfa, scene.sdf, ...scene.cascades]);
}

function destroyTargets(targets: readonly Target[]): void {
  for (let index = targets.length - 1; index >= 0; index--) {
    (targets[index] as Target & { destroy?: () => void }).destroy?.();
  }
}

export interface ChainOptions {
  readonly segment?: PaintSegment;
  readonly keepPrevious?: boolean;
  /** How much of the name is revealed, 0..1. Defaults to fully revealed. */
  readonly wordReveal?: number;
}

function buildChain(scene: RadianceScene, options: ChainOptions) {
  const { size, effects } = scene;
  const segment = options.segment;
  const passes: { readonly target: Target; readonly effect: Effect }[] = [];

  const [emitterRead, emitterWrite] = scene.emitter;
  const color = strokeRadiance(segment?.stroke ?? 0);
  const [wordWidth, wordHeight] = nameSizeOnScreen(size, scene.nameTexture.aspect);
  effects.paint.set({
    paint: {
      stroke_from: segment ? [segment.from[0] * size[0], segment.from[1] * size[1]] : [0, 0],
      stroke_to: segment ? [segment.to[0] * size[0], segment.to[1] * size[1]] : [0, 0],
      color: [color[0], color[1], color[2], segment ? 1 : 0],
      flags: [options.keepPrevious ?? true ? 1 : 0, wordWidth, wordHeight, options.wordReveal ?? 1],
    },
    previous: emitterRead,
    name_tex: scene.nameTexture.texture,
    name_samp: scene.sampler,
  });
  passes.push({ target: emitterWrite, effect: effects.paint });
  scene.emitter = [emitterWrite, emitterRead];

  effects.jfaInit.set({ emitter: emitterWrite });
  passes.push({ target: scene.jfa[0], effect: effects.jfaInit });

  let seedRead = scene.jfa[0];
  let seedWrite = scene.jfa[1];
  scene.jumps.forEach((jump, index) => {
    const shader = effects.jfaSteps[index]!;
    shader.set({ jfa: { jump: [jump, 0, 0, 0] }, seeds: seedRead });
    passes.push({ target: seedWrite, effect: shader });
    [seedRead, seedWrite] = [seedWrite, seedRead];
  });
  scene.jfa = [seedRead, seedWrite];

  effects.sdfFinalize.set({ seeds: seedRead });
  passes.push({ target: scene.sdf, effect: effects.sdfFinalize });

  let atlasWrite = scene.cascades[0];
  let atlasRead = scene.cascades[1];
  for (let cascade = scene.cascadeCount - 1; cascade >= 0; cascade--) {
    const shader = effects.cascade[cascade]!;
    shader.set({
      rc: { state: [cascade, cascade < scene.cascadeCount - 1 ? 1 : 0, 0, 0] },
      sdf_tex: scene.sdf,
      sdf_samp: scene.sampler,
      emitter_tex: emitterWrite,
      emitter_samp: scene.sampler,
      upper_tex: atlasRead,
    });
    passes.push({ target: atlasWrite, effect: shader });
    [atlasRead, atlasWrite] = [atlasWrite, atlasRead];
  }
  scene.cascades = [atlasRead, atlasWrite];
  return passes;
}

export function runChain(scene: RadianceScene, options: ChainOptions = {}): void {
  const passes = buildChain(scene, options);
  frame(scene.gpu, (currentFrame) => {
    for (const pass of passes) {
      currentFrame.pass({ target: pass.target, clear: [0, 0, 0, 0] }, (encoder) => encoder.draw(pass.effect));
    }
  });
}

export interface GridStyle {
  readonly base: readonly [number, number, number];
  readonly line: readonly [number, number, number];
  readonly visible: number;
}

const DEFAULT_GRID: GridStyle = { base: [0.38, 0.38, 0.38], line: [0.21, 0.21, 0.21], visible: 1 };

export function presentScene(scene: RadianceScene, output: Output, grid: GridStyle = DEFAULT_GRID): void {
  scene.effects.present.set({
    cascade_tex: scene.cascades[0],
    emitter_tex: scene.emitter[0],
    grid: { base: grid.base, visible: grid.visible, line: grid.line, unused: 0 },
  });
  frame(scene.gpu, (currentFrame) => {
    currentFrame.pass({ target: output, clear: [0, 0, 0, 1] }, (encoder) => encoder.draw(scene.effects.present));
  });
}
