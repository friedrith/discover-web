// Fullscreen night sky behind the skyline: a dusk gradient, a soft moon
// glow, and a scatter of hashed stars. Drawn first; particles composite
// over it additively.

struct Sky {
  size: vec2f,
  time: f32,
  unused: f32,
};

@group(0) @binding(0) var<uniform> sky: Sky;

fn hash21(p: vec2f) -> f32 {
  var p3 = fract(vec3f(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

@fragment fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let top = vec3f(0.03, 0.045, 0.10);
  let bottom = vec3f(0.09, 0.06, 0.12);
  var color = mix(bottom, top, pow(uv.y, 0.7));

  let moonCenter = vec2f(0.78, 0.18);
  let aspect = sky.size.x / sky.size.y;
  let toMoon = (uv - moonCenter) * vec2f(aspect, 1.0);
  let moonDist = length(toMoon);
  color += vec3f(0.55, 0.58, 0.5) * exp(-moonDist * moonDist * 220.0) * 0.5;
  color += vec3f(0.9, 0.85, 0.7) * smoothstep(0.028, 0.02, moonDist);

  let starCell = floor(uv * sky.size / 3.0);
  let starHash = hash21(starCell);
  let twinkle = 0.6 + 0.4 * sin(sky.time * (1.5 + starHash * 2.0) + starHash * 30.0);
  let star = step(0.9935, starHash) * twinkle * step(uv.y, 0.82);
  color += vec3f(0.85, 0.9, 1.0) * star;

  return vec4f(color, 1.0);
}
