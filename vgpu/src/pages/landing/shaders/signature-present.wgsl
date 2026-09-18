// Pass 2 of the two-pass-rendering recipe, with a centered halo glow —
// same technique as /desk/, tuned for a small inline canvas.

struct Params {
  size: vec2f,
  unused: vec2f,
  haloColor: vec3f,
  unused2: f32,
};

@group(0) @binding(0) var scene: texture_2d<f32>;
@group(0) @binding(1) var sceneSampler: sampler;
@group(0) @binding(2) var<uniform> params: Params;

@fragment fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let color = textureSampleLevel(scene, sceneSampler, uv, 0.0).rgb;

  let aspect = params.size.x / params.size.y;
  let d = (uv - vec2f(0.5, 0.46)) * vec2f(aspect, 1.0);
  let dist = length(d);
  let halo = exp(-dist * dist * 3.2) * 0.4;

  return vec4f(color + params.haloColor * halo, 1.0);
}
