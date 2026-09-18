// Small persistent readout (idea 4): a rasterized label (see name-texture.ts,
// reused from the name-in-light lib) rendered with a cheap multi-tap glow so
// it reads as a light source, not flat text. No cascades here — the canvas
// is a few hundred pixels, a ring of blurred samples is enough bloom.

struct Params {
  texel: vec2f,
  time: f32,
  unused: f32,
  accent: vec3f,
  unused2: f32,
};

@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var label_tex: texture_2d<f32>;
@group(0) @binding(2) var label_samp: sampler;

const TAU: f32 = 6.28318530718;
const RING_TAPS: u32 = 12u;

@fragment fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let core = textureSampleLevel(label_tex, label_samp, uv, 0.0).a;

  var glow = 0.0;
  for (var ring = 1u; ring <= 2u; ring++) {
    let radius = f32(ring) * 2.4;
    for (var i = 0u; i < RING_TAPS; i++) {
      let angle = (f32(i) / f32(RING_TAPS)) * TAU;
      let offset = vec2f(cos(angle), sin(angle)) * radius * params.texel;
      glow += textureSampleLevel(label_tex, label_samp, uv + offset, 0.0).a;
    }
  }
  glow /= f32(RING_TAPS * 2u);

  let flicker = 0.85 + 0.15 * sin(params.time * 1.6);
  let color = params.accent * glow * flicker + vec3f(1.0) * core;
  let alpha = clamp(glow * 0.9 + core, 0.0, 1.0);
  return vec4f(color, alpha);
}
