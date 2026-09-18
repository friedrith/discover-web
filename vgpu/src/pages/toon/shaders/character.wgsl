// Cel-shaded (Borderlands-style) solid geometry: hard-banded toon lighting
// instead of a smooth Lambert gradient, a hard specular dot, and a rim-light
// band for that inked-highlight pop. The ink outline is the same shader in
// disguise — the inverted-hull technique: draw the same geometry again with
// front faces culled and vertices pushed outward along their normals, in
// flat near-black, so only a sliver peeks out around the silhouette and at
// internal creases. `model.outline` switches between the two.

struct Camera {
  viewProjection: mat4x4f,
  cameraPos: vec3f,
  unused: f32,
};

struct Model {
  model: mat4x4f,
  color: vec3f,
  outline: f32,
};

@group(0) @binding(0) var<uniform> camera: Camera;
@group(0) @binding(1) var<uniform> model: Model;

struct VertexOut {
  @builtin(position) position: vec4f,
  @location(0) normal: vec3f,
  @location(1) worldPos: vec3f,
};

const OUTLINE_WIDTH: f32 = 0.028;

@vertex fn vs_main(
  @location(0) position: vec3f,
  @location(1) normal: vec3f,
) -> VertexOut {
  var localPos = position;
  if (model.outline > 0.5) {
    localPos = position + normal * OUTLINE_WIDTH;
  }
  let world = model.model * vec4f(localPos, 1.0);

  var out: VertexOut;
  out.position = camera.viewProjection * world;
  out.normal = (model.model * vec4f(normal, 0.0)).xyz;
  out.worldPos = world.xyz;
  return out;
}

@fragment fn fs_main(in: VertexOut) -> @location(0) vec4f {
  if (model.outline > 0.5) {
    return vec4f(0.02, 0.015, 0.02, 1.0);
  }

  let n = normalize(in.normal);
  let lightDir = normalize(vec3f(0.5, 0.85, 0.6));
  let viewDir = normalize(camera.cameraPos - in.worldPos);
  let ndotl = dot(n, lightDir);

  // Hard bands, not a gradient — the whole point of cel shading.
  var shade = 0.32;
  if (ndotl > 0.05) { shade = 0.55; }
  if (ndotl > 0.4) { shade = 0.82; }
  if (ndotl > 0.75) { shade = 1.05; }

  let halfVec = normalize(lightDir + viewDir);
  let spec = select(0.0, 1.0, pow(max(dot(n, halfVec), 0.0), 40.0) > 0.55);

  let rim = pow(1.0 - max(dot(n, viewDir), 0.0), 4.0);
  let rimBand = select(0.0, 1.0, rim > 0.55);

  var color = model.color * shade;
  color += vec3f(1.0) * spec * 0.7;
  color = mix(color, color + vec3f(0.15, 0.12, 0.05), rimBand * 0.6);

  return vec4f(color, 1.0);
}
