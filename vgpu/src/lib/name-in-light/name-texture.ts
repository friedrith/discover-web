import type { Device, Texture } from "vgpu";

// Rasterizes the name with a real system font (Arial) into a GPU texture,
// via the raw WebGPU device vgpu exposes on `gpu.device` — vgpu's own API
// has no "texture from image" helper, so this drops one level to
// `Device.createTexture` + `GPUQueue.copyExternalImageToTexture`.

const FONT_PX = 320;
const PADDING = 28;
const FONT_STACK = `700 ${FONT_PX}px Arial, "Helvetica Neue", sans-serif`;

export interface NameTexture {
  readonly texture: Texture;
  /** width / height of the rasterized glyph bounds, for placing it on screen. */
  readonly aspect: number;
}

export function createNameTexture(device: Device, text: string): NameTexture {
  const measurer = document.createElement("canvas").getContext("2d")!;
  measurer.font = FONT_STACK;
  const metrics = measurer.measureText(text);
  const width = Math.ceil(metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight) + PADDING * 2;
  const height = Math.ceil(metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent) + PADDING * 2;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.font = FONT_STACK;
  ctx.fillStyle = "#fff";
  ctx.fillText(text, PADDING + metrics.actualBoundingBoxLeft, PADDING + metrics.actualBoundingBoxAscent);

  const texture = device.createTexture({
    size: [width, height],
    format: "rgba8unorm",
    usage: ["copy_dst", "render_attachment", "texture_binding"],
    label: "name-texture",
  });
  device.queue.gpu.copyExternalImageToTexture({ source: canvas }, { texture: texture.gpu }, [width, height]);

  return { texture, aspect: width / height };
}
