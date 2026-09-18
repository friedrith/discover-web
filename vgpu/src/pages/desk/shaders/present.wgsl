// Pass 2 of the two-pass-rendering recipe: blit pass 1's offscreen color
// texture (the only one with a depth buffer) onto the canvas, adding a
// soft halo glow behind the desk so the scene reads brighter than the
// near-black material and background would on their own.

struct Params {
  size: vec2f,
};

@group(0) @binding(0) var scene: texture_2d<f32>;
@group(0) @binding(1) var sceneSampler: sampler;
@group(0) @binding(2) var<uniform> params: Params;

@fragment fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let color = textureSampleLevel(scene, sceneSampler, uv, 0.0).rgb;

  let aspect = params.size.x / params.size.y;
  let haloCenter = vec2f(0.5, 0.3);
  let d = (uv - haloCenter) * vec2f(aspect, 1.0);
  let dist = length(d);
  let halo = exp(-dist * dist * 3.8) * 0.32;

  let haloColor = vec3f(1.0, 0.93, 0.8);
  let lifted = color + haloColor * halo;

  return vec4f(lifted, 1.0);
}
