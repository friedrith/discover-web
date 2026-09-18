// Lambert-shaded solid geometry, following vgpu's own two-pass-rendering
// guide (npx vgpu docs cat two-pass-rendering.md) almost verbatim: one
// directional key light plus a flat ambient floor, tinted per draw by
// `model.color`. The desk's top and four legs, and the ground plane, all
// share this one shader — only the model matrix and color differ per draw.

struct Camera {
  viewProjection: mat4x4f,
};

struct Model {
  model: mat4x4f,
  color: vec3f,
};

@group(0) @binding(0) var<uniform> camera: Camera;
@group(0) @binding(1) var<uniform> model: Model;

struct VertexOut {
  @builtin(position) position: vec4f,
  @location(0) normal: vec3f,
};

@vertex fn vs_main(
  @location(0) position: vec3f,
  @location(1) normal: vec3f,
) -> VertexOut {
  var out: VertexOut;
  out.position = camera.viewProjection * model.model * vec4f(position, 1.0);
  // Axis-aligned box/plane normals stay correct through a scale-only model
  // matrix once normalized, even for the desk's non-uniform leg/top scale.
  out.normal = (model.model * vec4f(normal, 0.0)).xyz;
  return out;
}

@fragment fn fs_main(@location(0) normal: vec3f) -> @location(0) vec4f {
  let n = normalize(normal);
  let key = max(dot(n, normalize(vec3f(0.55, 1.0, 0.35))), 0.0);
  let fill = max(dot(n, normalize(vec3f(-0.4, 0.3, -0.6))), 0.0) * 0.15;
  let light = 0.22 + key * 0.85 + fill;
  return vec4f(model.color * light, 1.0);
}
