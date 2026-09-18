// Lambert-shaded solid geometry for the closing signature mark — the same
// technique as the /desk/ page (vgpu's two-pass-rendering guide), reused
// here for a single slowly auto-rotating shape instead of a desk.

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
  out.normal = (model.model * vec4f(normal, 0.0)).xyz;
  return out;
}

@fragment fn fs_main(@location(0) normal: vec3f) -> @location(0) vec4f {
  let n = normalize(normal);
  let key = max(dot(n, normalize(vec3f(0.5, 1.0, 0.4))), 0.0);
  let fill = max(dot(n, normalize(vec3f(-0.5, 0.2, -0.5))), 0.0) * 0.25;
  let rim = pow(1.0 - max(dot(n, vec3f(0.0, 0.0, 1.0)), 0.0), 3.0) * 0.5;
  let light = 0.22 + key * 0.85 + fill + rim;
  return vec4f(model.color * light, 1.0);
}
