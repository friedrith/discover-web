// Free-look orbit camera: drag to rotate around a fixed target, wheel to
// dolly in/out. Unlike the fixed pitch-only camera in the other pages
// (adapted from vgpu's "FFT Ocean" example), this builds a real lookAt +
// perspective pair every frame from spherical coordinates, so the eye can
// go anywhere around the target.

export interface OrbitState {
  azimuth: number;
  elevation: number;
  radius: number;
}

export interface OrbitTuning {
  readonly target: readonly [number, number, number];
  readonly initial: OrbitState;
  readonly minRadius: number;
  readonly maxRadius: number;
  readonly minElevation: number;
  readonly maxElevation: number;
  readonly fovDegrees: number;
  readonly near: number;
  readonly far: number;
}

function cross(a: readonly [number, number, number], b: readonly [number, number, number]): [number, number, number] {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

function normalize(v: readonly [number, number, number]): [number, number, number] {
  const len = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / len, v[1] / len, v[2] / len];
}

function dot(a: readonly [number, number, number], b: readonly [number, number, number]): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

export function installOrbitControls(canvas: HTMLCanvasElement, tuning: OrbitTuning) {
  const state: OrbitState = { ...tuning.initial };
  let dragPointer = -1;
  let lastX = 0;
  let lastY = 0;
  const previousTouchAction = canvas.style.touchAction;
  canvas.style.touchAction = "none";

  const down = (event: PointerEvent) => {
    if (dragPointer !== -1) return;
    dragPointer = event.pointerId;
    lastX = event.clientX;
    lastY = event.clientY;
    canvas.setPointerCapture?.(event.pointerId);
  };
  const move = (event: PointerEvent) => {
    if (event.pointerId !== dragPointer) return;
    const dx = event.clientX - lastX;
    const dy = event.clientY - lastY;
    lastX = event.clientX;
    lastY = event.clientY;
    state.azimuth -= dx * 0.008;
    state.elevation = Math.max(tuning.minElevation, Math.min(tuning.maxElevation, state.elevation + dy * 0.008));
  };
  const up = (event: PointerEvent) => {
    if (event.pointerId !== dragPointer) return;
    dragPointer = -1;
  };
  const wheel = (event: WheelEvent) => {
    event.preventDefault();
    state.radius = Math.max(tuning.minRadius, Math.min(tuning.maxRadius, state.radius + event.deltaY * 0.05));
  };

  canvas.addEventListener("pointerdown", down);
  canvas.addEventListener("pointermove", move);
  canvas.addEventListener("pointerup", up);
  canvas.addEventListener("pointercancel", up);
  canvas.addEventListener("wheel", wheel, { passive: false });

  return {
    matrices(size: readonly [number, number]) {
      const [tx, ty, tz] = tuning.target;
      const eye: [number, number, number] = [
        tx + state.radius * Math.cos(state.elevation) * Math.sin(state.azimuth),
        ty + state.radius * Math.sin(state.elevation),
        tz + state.radius * Math.cos(state.elevation) * Math.cos(state.azimuth),
      ];

      const zAxis = normalize([eye[0] - tx, eye[1] - ty, eye[2] - tz]);
      const xAxis = normalize(cross([0, 1, 0], zAxis));
      const yAxis = cross(zAxis, xAxis);

      const view = new Float32Array(16);
      view[0] = xAxis[0];
      view[1] = yAxis[0];
      view[2] = zAxis[0];
      view[4] = xAxis[1];
      view[5] = yAxis[1];
      view[6] = zAxis[1];
      view[8] = xAxis[2];
      view[9] = yAxis[2];
      view[10] = zAxis[2];
      view[12] = -dot(xAxis, eye);
      view[13] = -dot(yAxis, eye);
      view[14] = -dot(zAxis, eye);
      view[15] = 1;

      const f = 1 / Math.tan((tuning.fovDegrees * Math.PI) / 360);
      const { near, far } = tuning;
      const projection = new Float32Array(16);
      projection[0] = f / (size[0] / Math.max(1, size[1]));
      projection[5] = f;
      projection[10] = far / (near - far);
      projection[11] = -1;
      projection[14] = (far * near) / (near - far);

      return { view, projection, eye };
    },
    dispose() {
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", up);
      canvas.removeEventListener("wheel", wheel);
      canvas.style.touchAction = previousTouchAction;
    },
  };
}
