// Ten design-system directions for the same landing page content — pick one
// with the selector top-right. A design system is more than a palette, so
// each theme carries its own real typeface pairing (loaded in
// landing/index.html), heading scale, card treatment, and spacing rhythm,
// on top of color — plus the GPU layer (the name-in-light grid tone, and
// the HUD/halo/signature accent color), so switching themes reskins the
// WebGPU rendering too, not just the DOM.

export interface Theme {
  readonly id: string;
  readonly label: string;
  readonly css: {
    readonly bg: string;
    readonly fg: string;
    readonly muted: string;
    readonly accent: string;
    readonly panelBg: string;
    readonly panelBorder: string;
    readonly radius: string;
    readonly borderWidth: string;
    readonly headingFont: string;
    readonly bodyFont: string;
    readonly letterSpacing: string;
    readonly blur: string;
    readonly headingWeight: string;
    readonly headingTransform: "none" | "uppercase";
    /** Multiplies the proposition heading's font size — restrained editorial vs. poster-scale. */
    readonly headingScale: number;
    /** Card/panel elevation: a real box-shadow for the soft systems, "none" for the flat/hard ones. */
    readonly cardShadow: string;
  };
  readonly gpu: {
    /** Grid tone in the name-in-light background, linear-ish 0..1 RGB. */
    readonly gridBase: readonly [number, number, number];
    readonly gridLine: readonly [number, number, number];
    /** 0 hides the grid entirely (a void); 1 is fully visible. */
    readonly gridVisible: number;
    /** HDR-ish accent used by the HUD glow, the signature halo, and the signature object's own color. */
    readonly accent: readonly [number, number, number];
  };
}

const FALLBACK_SANS = 'ui-sans-serif, system-ui, "Helvetica Neue", Arial, sans-serif';
const FALLBACK_MONO = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace';
const FALLBACK_SERIF = 'Georgia, "Times New Roman", serif';

export const THEMES: readonly Theme[] = [
  {
    id: "blueprint",
    label: "Blueprint",
    css: {
      bg: "#0c0e14",
      fg: "#ffffff",
      muted: "rgba(255,255,255,0.62)",
      accent: "#e8b878",
      panelBg: "rgba(255,255,255,0.04)",
      panelBorder: "rgba(255,255,255,0.1)",
      radius: "0.75rem",
      borderWidth: "1px",
      headingFont: `"Space Grotesk", ${FALLBACK_SANS}`,
      bodyFont: `"Space Grotesk", ${FALLBACK_SANS}`,
      letterSpacing: "0.02em",
      blur: "6px",
      headingWeight: "600",
      headingTransform: "none",
      headingScale: 1,
      cardShadow: "none",
    },
    gpu: {
      gridBase: [0.38, 0.38, 0.38],
      gridLine: [0.21, 0.21, 0.21],
      gridVisible: 1,
      accent: [2.6, 2.1, 1.4],
    },
  },
  {
    id: "terminal",
    label: "Terminal",
    css: {
      bg: "#030402",
      fg: "#b6ffcb",
      muted: "rgba(160,255,190,0.55)",
      accent: "#39ff88",
      panelBg: "rgba(20,40,25,0.35)",
      panelBorder: "rgba(80,255,140,0.35)",
      radius: "0px",
      borderWidth: "1px",
      headingFont: `"JetBrains Mono", ${FALLBACK_MONO}`,
      bodyFont: `"JetBrains Mono", ${FALLBACK_MONO}`,
      letterSpacing: "0.04em",
      blur: "0px",
      headingWeight: "700",
      headingTransform: "uppercase",
      headingScale: 0.88,
      cardShadow: "none",
    },
    gpu: {
      gridBase: [0.01, 0.02, 0.015],
      gridLine: [0.01, 0.02, 0.015],
      gridVisible: 0,
      accent: [0.6, 3.2, 1.2],
    },
  },
  {
    id: "swiss",
    label: "Swiss / Editorial",
    css: {
      bg: "#111214",
      fg: "#f4f4f2",
      muted: "rgba(244,244,242,0.55)",
      accent: "#e8382f",
      panelBg: "rgba(255,255,255,0.02)",
      panelBorder: "rgba(255,255,255,0.14)",
      radius: "0px",
      borderWidth: "1px",
      headingFont: `"Archivo", ${FALLBACK_SANS}`,
      bodyFont: `"Archivo", ${FALLBACK_SANS}`,
      letterSpacing: "-0.01em",
      blur: "0px",
      headingWeight: "800",
      headingTransform: "none",
      headingScale: 1.05,
      cardShadow: "none",
    },
    gpu: {
      gridBase: [0.05, 0.05, 0.05],
      gridLine: [0.08, 0.08, 0.08],
      gridVisible: 0.35,
      accent: [2.6, 0.6, 0.5],
    },
  },
  {
    id: "cyberpunk",
    label: "Cyberpunk Neon",
    css: {
      bg: "#05010a",
      fg: "#f2e9ff",
      muted: "rgba(242,233,255,0.6)",
      accent: "#ff2bd6",
      panelBg: "rgba(255,255,255,0.05)",
      panelBorder: "rgba(255,80,220,0.35)",
      radius: "1rem",
      borderWidth: "1px",
      headingFont: `"Orbitron", ${FALLBACK_SANS}`,
      bodyFont: `"Rajdhani", ${FALLBACK_SANS}`,
      letterSpacing: "0.03em",
      blur: "10px",
      headingWeight: "700",
      headingTransform: "none",
      headingScale: 0.95,
      cardShadow: "0 0 32px rgba(255,43,214,0.12)",
    },
    gpu: {
      gridBase: [0.05, 0.02, 0.08],
      gridLine: [0.15, 0.05, 0.35],
      gridVisible: 1,
      accent: [3.2, 0.3, 2.6],
    },
  },
  {
    id: "paper-ink",
    label: "Paper & Ink",
    css: {
      bg: "#f4efe4",
      fg: "#1a1712",
      muted: "rgba(26,23,18,0.62)",
      accent: "#a4501f",
      panelBg: "rgba(20,15,5,0.04)",
      panelBorder: "rgba(20,15,5,0.14)",
      radius: "0.4rem",
      borderWidth: "1px",
      headingFont: `"Playfair Display", ${FALLBACK_SERIF}`,
      bodyFont: `"Lora", ${FALLBACK_SERIF}`,
      letterSpacing: "0.01em",
      blur: "0px",
      headingWeight: "700",
      headingTransform: "none",
      headingScale: 0.98,
      cardShadow: "0 8px 24px rgba(26,23,18,0.08)",
    },
    gpu: {
      gridBase: [0.94, 0.91, 0.84],
      gridLine: [0.82, 0.77, 0.66],
      gridVisible: 1,
      accent: [2.4, 1.1, 0.5],
    },
  },
  {
    id: "brutalist",
    label: "Brutalist",
    css: {
      bg: "#1b1b1a",
      fg: "#efeee9",
      muted: "rgba(239,238,233,0.55)",
      accent: "#ff5a1f",
      panelBg: "rgba(255,255,255,0.03)",
      panelBorder: "rgba(239,238,233,0.85)",
      radius: "0px",
      borderWidth: "3px",
      headingFont: `"Anton", ${FALLBACK_SANS}`,
      bodyFont: FALLBACK_SANS,
      letterSpacing: "0.01em",
      blur: "0px",
      headingWeight: "400",
      headingTransform: "uppercase",
      headingScale: 1.2,
      cardShadow: "none",
    },
    gpu: {
      gridBase: [0.11, 0.11, 0.1],
      gridLine: [0.06, 0.06, 0.06],
      gridVisible: 1,
      accent: [3.0, 0.9, 0.2],
    },
  },
  {
    id: "glass",
    label: "Glassmorphism",
    css: {
      bg: "#0e0f18",
      fg: "#ffffff",
      muted: "rgba(255,255,255,0.62)",
      accent: "#9fc1ff",
      panelBg: "rgba(255,255,255,0.08)",
      panelBorder: "rgba(255,255,255,0.22)",
      radius: "1.25rem",
      borderWidth: "1px",
      headingFont: `"Quicksand", ${FALLBACK_SANS}`,
      bodyFont: `"Quicksand", ${FALLBACK_SANS}`,
      letterSpacing: "0.01em",
      blur: "18px",
      headingWeight: "700",
      headingTransform: "none",
      headingScale: 1,
      cardShadow: "0 8px 32px rgba(0,0,0,0.35)",
    },
    gpu: {
      gridBase: [0.08, 0.09, 0.13],
      gridLine: [0.14, 0.16, 0.22],
      gridVisible: 0.5,
      accent: [1.4, 1.8, 3.0],
    },
  },
  {
    id: "constructivist",
    label: "Constructivist Poster",
    css: {
      bg: "#16130f",
      fg: "#f2ece2",
      muted: "rgba(242,236,226,0.6)",
      accent: "#d92b1f",
      panelBg: "rgba(255,255,255,0.03)",
      panelBorder: "rgba(217,43,31,0.4)",
      radius: "0px",
      borderWidth: "2px",
      headingFont: `"Bebas Neue", ${FALLBACK_SANS}`,
      bodyFont: `"Oswald", ${FALLBACK_SANS}`,
      letterSpacing: "0.02em",
      blur: "0px",
      headingWeight: "400",
      headingTransform: "uppercase",
      headingScale: 1.3,
      cardShadow: "none",
    },
    gpu: {
      gridBase: [0.09, 0.08, 0.06],
      gridLine: [0.05, 0.045, 0.035],
      gridVisible: 1,
      accent: [3.2, 0.5, 0.35],
    },
  },
  {
    id: "signal",
    label: "Signal / Radar",
    css: {
      bg: "#04070c",
      fg: "#d7f3ff",
      muted: "rgba(215,243,255,0.55)",
      accent: "#39d6ff",
      panelBg: "rgba(10,30,45,0.35)",
      panelBorder: "rgba(57,214,255,0.3)",
      radius: "0.25rem",
      borderWidth: "1px",
      headingFont: `"Share Tech Mono", ${FALLBACK_MONO}`,
      bodyFont: `"Share Tech Mono", ${FALLBACK_MONO}`,
      letterSpacing: "0.06em",
      blur: "4px",
      headingWeight: "400",
      headingTransform: "uppercase",
      headingScale: 0.9,
      cardShadow: "0 0 20px rgba(57,214,255,0.08)",
    },
    gpu: {
      gridBase: [0.02, 0.05, 0.08],
      gridLine: [0.05, 0.14, 0.19],
      gridVisible: 1,
      accent: [0.3, 2.6, 3.4],
    },
  },
  {
    id: "warm-minimal",
    label: "Warm Minimal",
    css: {
      bg: "#211d1a",
      fg: "#f6ede2",
      muted: "rgba(246,237,226,0.6)",
      accent: "#e0a23a",
      panelBg: "rgba(255,255,255,0.035)",
      panelBorder: "rgba(255,255,255,0.09)",
      radius: "1rem",
      borderWidth: "1px",
      headingFont: `"Nunito", ${FALLBACK_SANS}`,
      bodyFont: `"Nunito", ${FALLBACK_SANS}`,
      letterSpacing: "0.015em",
      blur: "8px",
      headingWeight: "800",
      headingTransform: "none",
      headingScale: 1,
      cardShadow: "0 6px 20px rgba(0,0,0,0.25)",
    },
    gpu: {
      gridBase: [0.13, 0.115, 0.1],
      gridLine: [0.09, 0.08, 0.07],
      gridVisible: 0.6,
      accent: [2.8, 2.0, 1.0],
    },
  },
];

const STORAGE_KEY = "landing-theme";

export function loadThemeId(): string {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && THEMES.some((theme) => theme.id === stored)) return stored;
  } catch {
    // Private-browsing or storage-disabled: fall through to the default.
  }
  return THEMES[0]!.id;
}

export function saveThemeId(id: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // Nothing to persist to; the selector still works for this session.
  }
}

export function getTheme(id: string): Theme {
  return THEMES.find((theme) => theme.id === id) ?? THEMES[0]!;
}

export function applyThemeCss(theme: Theme): void {
  const root = document.documentElement.style;
  root.setProperty("--bg", theme.css.bg);
  root.setProperty("--fg", theme.css.fg);
  root.setProperty("--muted", theme.css.muted);
  root.setProperty("--accent", theme.css.accent);
  root.setProperty("--panel-bg", theme.css.panelBg);
  root.setProperty("--panel-border", theme.css.panelBorder);
  root.setProperty("--radius", theme.css.radius);
  root.setProperty("--border-width", theme.css.borderWidth);
  root.setProperty("--heading-font", theme.css.headingFont);
  root.setProperty("--body-font", theme.css.bodyFont);
  root.setProperty("--letter-spacing", theme.css.letterSpacing);
  root.setProperty("--blur", theme.css.blur);
  root.setProperty("--heading-weight", theme.css.headingWeight);
  root.setProperty("--heading-transform", theme.css.headingTransform);
  root.setProperty("--heading-scale", String(theme.css.headingScale));
  root.setProperty("--card-shadow", theme.css.cardShadow);
}
