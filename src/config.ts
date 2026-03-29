import rawConfig from "./puzzle-config.json";

// ---- Attribute types ----

export interface AttributeConfig {
  enabled: boolean;
  values: string[];
}

export interface AttributesConfig {
  shape: AttributeConfig;
  color: AttributeConfig;
  size: AttributeConfig;
}

// ---- Grid types ----

export type MissingCellStrategy = "last" | "random";

export interface GridConfig {
  rows: number;
  cols: number;
  missingCell: MissingCellStrategy;
}

// ---- Options types ----

export type DistractorStrategy =
  | "single-swap-then-multi-swap"
  | "single-swap-only"
  | "random-combination";

export interface OptionsConfig {
  count: number;
  distractorStrategy: DistractorStrategy;
}

// ---- Game mode types ----

export interface GameModeEntry {
  label: string;
  description: string;
  timeLimitMs: number; // 0 = no limit (infinite)
  maxPuzzles: number; // 0 = unlimited
}

export type GameModeId = "infinite" | "comfortable" | "standard" | "challenge";

export interface GameModeConfig {
  default: GameModeId;
  modes: Record<GameModeId, GameModeEntry>;
}

// ---- Timing types ----

export interface TimingConfig {
  correctDelayMs: number;
  wrongDelayMs: number;
  timeoutDelayMs: number;
}

// ---- Scoring types ----

export interface ScoringConfig {
  skipResetsStreak: boolean;
  wrongResetsStreak: boolean;
  timeoutResetsStreak: boolean;
  countWrongAsAttempt: boolean;
  countTimeoutAsAttempt: boolean;
}

// ---- Rendering types ----

export interface ColorEntry {
  fill: string;
  stroke: string;
}

export interface RenderingConfig {
  matrixCellSize: number;
  optionCellSize: number;
  sizeScales: Record<string, number>;
  colorMap: Record<string, ColorEntry>;
  strokeWidth: number;
}

// ---- Top-level config ----

export interface PuzzleConfig {
  attributes: AttributesConfig;
  grid: GridConfig;
  options: OptionsConfig;
  gameMode: GameModeConfig;
  timing: TimingConfig;
  scoring: ScoringConfig;
  rendering: RenderingConfig;
}

// ---- Defaults ----

const defaults: PuzzleConfig = {
  attributes: {
    shape: { enabled: true, values: ["circle", "square", "triangle"] },
    color: { enabled: true, values: ["black", "grey", "white"] },
    size: { enabled: true, values: ["small", "medium", "large"] },
  },
  grid: {
    rows: 3,
    cols: 3,
    missingCell: "last",
  },
  options: {
    count: 6,
    distractorStrategy: "single-swap-then-multi-swap",
  },
  gameMode: {
    default: "infinite",
    modes: {
      infinite: {
        label: "∞ Infinite",
        description: "No time limit — solve at your own pace",
        timeLimitMs: 0,
        maxPuzzles: 0,
      },
      comfortable: {
        label: "🟢 Comfortable",
        description: "30 s × 12 puzzles — enough to reason carefully",
        timeLimitMs: 30000,
        maxPuzzles: 12,
      },
      standard: {
        label: "🟡 Standard",
        description: "20 s × 12 puzzles — speeded research protocol",
        timeLimitMs: 20000,
        maxPuzzles: 12,
      },
      challenge: {
        label: "🔴 Challenge",
        description: "10 s × 12 puzzles — forces pattern recognition",
        timeLimitMs: 10000,
        maxPuzzles: 12,
      },
    },
  },
  timing: {
    correctDelayMs: 800,
    wrongDelayMs: 1000,
    timeoutDelayMs: 1200,
  },
  scoring: {
    skipResetsStreak: true,
    wrongResetsStreak: true,
    timeoutResetsStreak: true,
    countWrongAsAttempt: true,
    countTimeoutAsAttempt: true,
  },
  rendering: {
    matrixCellSize: 80,
    optionCellSize: 64,
    sizeScales: { small: 0.28, medium: 0.55, large: 0.88 },
    colorMap: {
      black: { fill: "#222222", stroke: "#000000" },
      grey: { fill: "#999999", stroke: "#666666" },
      white: { fill: "#ffffff", stroke: "#333333" },
    },
    strokeWidth: 2,
  },
};

// ---- Deep merge helper ----

function isPlainObject(val: unknown): val is Record<string, unknown> {
  return typeof val === "object" && val !== null && !Array.isArray(val);
}

function deepMerge<T extends Record<string, unknown>>(
  base: T,
  override: Record<string, unknown>,
): T {
  const result = { ...base } as Record<string, unknown>;

  for (const key of Object.keys(override)) {
    const baseVal = result[key];
    const overVal = override[key];

    if (isPlainObject(baseVal) && isPlainObject(overVal)) {
      result[key] = deepMerge(
        baseVal as Record<string, unknown>,
        overVal as Record<string, unknown>,
      );
    } else if (overVal !== undefined) {
      result[key] = overVal;
    }
  }

  return result as T;
}

// ---- Derived helpers ----

/**
 * Returns the list of attribute names that are currently enabled.
 * The generator should only create Latin squares for these.
 */
export function enabledAttributes(
  cfg: PuzzleConfig,
): Array<keyof AttributesConfig> {
  const keys: Array<keyof AttributesConfig> = ["shape", "color", "size"];
  return keys.filter((k) => cfg.attributes[k].enabled);
}

/**
 * Returns the index of the missing cell (the one the user must guess).
 * "last" → bottom-right cell.  "random" → a random cell index.
 */
export function missingCellIndex(cfg: PuzzleConfig): number {
  const total = cfg.grid.rows * cfg.grid.cols;
  if (cfg.grid.missingCell === "random") {
    return Math.floor(Math.random() * total);
  }
  return total - 1; // "last"
}

/**
 * Returns the time limit in ms for a given game mode id, or 0 for infinite.
 */
export function timeLimitForMode(
  cfg: PuzzleConfig,
  modeId: GameModeId,
): number {
  return cfg.gameMode.modes[modeId]?.timeLimitMs ?? 0;
}

// ---- Build & export the merged config ----

const config: PuzzleConfig = deepMerge(
  defaults as unknown as Record<string, unknown>,
  rawConfig as unknown as Record<string, unknown>,
) as unknown as PuzzleConfig;

export default config;
