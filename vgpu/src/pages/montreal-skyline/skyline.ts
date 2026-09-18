// Procedural Montreal skyline profile: one (height, kind) pair per column
// across the width of the scene. `height` is normalized 0..1; `kind` picks
// the particle shader's color/behavior — 0 downtown buildings, 1 Mont
// Royal, 2 the lit landmark spike near its summit.

export const COLUMN_COUNT = 200;

export const ColumnKind = {
  Building: 0,
  Mountain: 1,
  Landmark: 2,
} as const;
type ColumnKind = (typeof ColumnKind)[keyof typeof ColumnKind];

export interface SkylineProfile {
  /** [height0, kind0, height1, kind1, ...], length COLUMN_COUNT * 2. */
  readonly columns: Float32Array;
}

function mulberry32(seed: number): () => number {
  let state = seed | 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gaussian(x: number, center: number, width: number): number {
  const d = (x - center) / width;
  return Math.exp(-d * d);
}

/** Mont Royal's rounded summit plus its lower western shoulder. */
function mountainHeight(x: number): number {
  return 0.6 * gaussian(x, 0.32, 0.095) + 0.32 * gaussian(x, 0.22, 0.06);
}

export function createSkylineProfile(): SkylineProfile {
  const random = mulberry32(0x4d54_4c31);
  const columns = new Float32Array(new ArrayBuffer(COLUMN_COUNT * 2 * 4));

  // A handful of named downtown towers (fraction across, height, width in columns).
  const landmarks = [
    { at: 0.62, height: 0.55, width: 5 },
    { at: 0.68, height: 0.72, width: 4 },
    { at: 0.735, height: 0.92, width: 3 }, // the skyline's tallest spike
    { at: 0.78, height: 0.6, width: 4 },
  ];

  let buildingHeight = 0.12;
  for (let i = 0; i < COLUMN_COUNT; i++) {
    const x = i / (COLUMN_COUNT - 1);

    // Random-walk low-rise base, taller and denser toward downtown (right half).
    const districtLift = Math.max(0, (x - 0.42) * 0.9);
    const target = 0.08 + districtLift + random() * (0.1 + districtLift);
    buildingHeight += (target - buildingHeight) * 0.35;
    let building = Math.max(0.05, buildingHeight);

    for (const tower of landmarks) {
      const towerColumns = tower.width / COLUMN_COUNT;
      const t = gaussian(x, tower.at, towerColumns * 0.6);
      building = Math.max(building, tower.height * Math.min(1, t * 1.15));
    }

    const mountain = mountainHeight(x);
    const mountainDominant = mountain > building + 0.03;

    let height = Math.max(building, mountain);
    let kind: ColumnKind = mountainDominant ? ColumnKind.Mountain : ColumnKind.Building;

    // The lit cross near Mont Royal's summit: a narrow spike a bit above the ridge.
    if (x > 0.338 && x < 0.348 && mountainDominant) {
      height = mountain + 0.05;
      kind = ColumnKind.Landmark;
    }

    columns[i * 2] = Math.min(1, height);
    columns[i * 2 + 1] = kind;
  }

  return { columns };
}
