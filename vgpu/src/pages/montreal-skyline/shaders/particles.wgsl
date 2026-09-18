// Instanced billboard particle cloud shaped like the Montreal skyline.
// Adapted from vgpu's own "FFT Ocean" example (npx vgpu examples pull
// fft-ocean, particles.wgsl): the same instance-index -> grid -> billboard
// quad technique, but the height field is a static skyline profile read
// from a storage buffer instead of an FFT-simulated displacement texture,
// and the grid fills solid up to that height instead of tracing a surface.

struct Uniforms {
  view: mat4x4f,
  projection: mat4x4f,
  viewport: vec4f,
  /** resX, resLevels, resZ, pointSizePx */
  grid: vec4f,
  /** worldWidth, worldHeight, worldDepth, unused */
  world: vec4f,
  /** fadeNear, fadeFar, fadePower, unused */
  fade: vec4f,
  /** time, unused * 3 */
  clock: vec4f,
  buildingColor: vec4f,
  windowColor: vec4f,
  mountainColor: vec4f,
  landmarkColor: vec4f,
};

@group(0) @binding(0) var<uniform> u: Uniforms;
@group(0) @binding(1) var<storage, read> columns: array<vec2f>;

struct VertexOut {
  @builtin(position) position: vec4f,
  @location(0) pointCoord: vec2f,
  @location(1) color: vec3f,
  @location(2) glow: f32,
  @location(3) fade: f32,
  @location(4) opacity: f32,
};

fn quadCorner(vertexIndex: u32) -> vec2f {
  let cornerIndex = array<u32, 6>(0u, 1u, 2u, 2u, 1u, 3u)[vertexIndex % 6u];
  switch (cornerIndex) {
    case 0u: { return vec2f(-1.0, -1.0); }
    case 1u: { return vec2f( 1.0, -1.0); }
    case 2u: { return vec2f(-1.0,  1.0); }
    default: { return vec2f( 1.0,  1.0); }
  }
}

fn hash3(p: vec3f) -> vec3f {
  var q = vec3f(
    dot(p, vec3f(127.1, 311.7, 74.7)),
    dot(p, vec3f(269.5, 183.3, 246.1)),
    dot(p, vec3f(113.5, 271.9, 124.6)),
  );
  return fract(sin(q) * 43758.5453123);
}

const OFFSCREEN: vec4f = vec4f(2.0, 2.0, 2.0, 1.0);

@vertex fn vs_main(
  @builtin(vertex_index) vertexIndex: u32,
  @builtin(instance_index) instanceIndex: u32,
) -> VertexOut {
  let resX = max(1u, u32(u.grid.x));
  let resLevels = max(1u, u32(u.grid.y));
  let resZ = max(1u, u32(u.grid.z));

  let i = instanceIndex % resX;
  let rem = instanceIndex / resX;
  let j = rem % resLevels;
  let k = rem / resLevels;

  let column = columns[i];
  let height = column.x;
  let kind = column.y;

  var out: VertexOut;
  let levelFrac = (f32(j) + 0.5) / f32(resLevels);
  if (levelFrac > height) {
    out.position = OFFSCREEN;
    out.pointCoord = vec2f(0.0);
    out.color = vec3f(0.0);
    out.glow = 0.0;
    out.fade = 0.0;
    out.opacity = 0.0;
    return out;
  }

  let seed = vec3f(f32(i), f32(j) + 71.0, f32(k) + 133.0);
  let jitter = hash3(seed) - vec3f(0.5);

  let columnWidth = u.world.x / f32(resX);
  let levelHeight = u.world.y / f32(resLevels);
  let depthStep = u.world.z / f32(resZ);

  let halfWidth = u.world.x * 0.5;
  let halfDepth = u.world.z * 0.5;
  let x = (f32(i) + 0.5) / f32(resX) * u.world.x - halfWidth + jitter.x * columnWidth * 0.6;
  let y = (f32(j) + 0.5) * levelHeight + jitter.y * levelHeight * 0.4;
  let z = (f32(k) + 0.5) / f32(resZ) * u.world.z - halfDepth + jitter.z * depthStep * 0.6;

  let mv = u.view * vec4f(x, y, z, 1.0);
  let dist = length(mv.xyz);
  let f = 1.0 - smoothstep(u.fade.x, u.fade.y, dist);
  let fade = pow(clamp(f, 0.0, 1.0), u.fade.z);

  let projected = u.projection * mv;
  let ndc = projected.xy / projected.w;
  let corner = quadCorner(vertexIndex);
  let clipOffset = corner * (u.grid.w / u.viewport.xy) * projected.w;
  let clip = vec4f(ndc * projected.w + clipOffset, projected.z, projected.w);

  let isBuilding = kind < 0.5;
  // Only the top slice of a landmark column is the lit spike; the rest of
  // its height is the mountain slope leading up to it.
  let isLandmark = kind > 1.5 && levelFrac > height * 0.82;
  // Window flicker only tints color/brightness; it never lightens the silhouette's
  // alpha, or a "dark" building would let the sky punch through it like a window.
  let flicker = select(0.0, 0.35 + 0.65 * smoothstep(0.55, 1.0, sin(u.clock.x * 1.6 + hash3(seed).x * 6.2831)), isBuilding);
  let pulse = select(1.0, 0.75 + 0.25 * sin(u.clock.x * 2.1), isLandmark);

  var color = u.mountainColor.rgb;
  var opacity = 0.92;
  if (isBuilding) {
    color = mix(u.buildingColor.rgb, u.windowColor.rgb, flicker);
    opacity = 0.82;
  } else if (isLandmark) {
    color = u.landmarkColor.rgb;
    opacity = 1.0;
  }

  out.position = clip;
  out.pointCoord = corner * 0.5 + vec2f(0.5);
  out.color = color;
  out.glow = mix(1.0, 2.2, flicker) * pulse;
  out.fade = fade;
  out.opacity = opacity;
  return out;
}

@fragment fn fs_main(in: VertexOut) -> @location(0) vec4f {
  let cc = in.pointCoord - vec2f(0.5);
  let d = length(cc);
  if (d > 0.5) {
    discard;
  }
  let soft = 1.0 - smoothstep(0.0, 0.5, d);
  let alpha = soft * in.fade * in.opacity;
  return vec4f(in.color * in.glow, clamp(alpha, 0.0, 1.0));
}
