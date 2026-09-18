import { sdf_segment } from "./sdf-sample.wgsl";

// Accumulates the emitter texture: the name (rasterized once from a real
// system font into `name_tex`, see name-texture.ts) plus everything the
// pointer has painted so far. RGB is linear radiance, A is the occluder
// mask the jump flood seeds from.
//
// Strokes combine with a component-wise max instead of a sum: a slow drag deposits dozens
// of overlapping capsules, and adding them would turn the overlap into a runaway HDR blob
// while max keeps every emitter at exactly the radiance it was painted with.

struct Paint {
  stroke_from: vec2f,
  stroke_to: vec2f,
  /** RGB radiance and an active flag. */
  color: vec4f,
  /** Keep-previous flag, the name's on-screen width and height in pixels, then how much of it is revealed (0..1). */
  flags: vec4f,
};

@group(0) @binding(0) var<uniform> paint: Paint;
@group(0) @binding(1) var previous: texture_2d<f32>;
@group(0) @binding(2) var name_tex: texture_2d<f32>;
@group(0) @binding(3) var name_samp: sampler;

/** Warm white: the name reads as a light source, not as coloured text. */
const WORD_RADIANCE: vec3f = vec3f(3.8, 3.2, 2.4);

@fragment
fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let size = vec2f(textureDimensions(previous));
  let pixel = uv * size;
  let texel = vec2i(clamp(floor(pixel), vec2f(0.0), size - 1.0));

  var accumulated = vec4f(0.0);
  if (paint.flags.x > 0.5) {
    accumulated = textureLoad(previous, texel, 0);
  }

  let centre = size * 0.5;
  let word_size = paint.flags.yz;
  let name_uv = (pixel - (centre - word_size * 0.5)) / word_size;
  var word = 0.0;
  if (
    name_uv.x >= 0.0 && name_uv.x <= 1.0 &&
    name_uv.y >= 0.0 && name_uv.y <= 1.0
  ) {
    word = textureSampleLevel(name_tex, name_samp, name_uv, 0.0).a * paint.flags.w;
  }
  accumulated = max(accumulated, vec4f(WORD_RADIANCE * word, word));

  if (paint.color.a > 0.5) {
    let stroke = 1.0 - smoothstep(
      -1.0,
      1.0,
      sdf_segment(pixel, paint.stroke_from, paint.stroke_to) - 5.0,
    );
    accumulated = max(accumulated, vec4f(paint.color.rgb * stroke, stroke));
  }

  return accumulated;
}
