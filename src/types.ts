// ---- Shape types ----

export type ShapeType = "circle" | "square" | "triangle";

// ---- Color types (fill colors for shapes) ----

export type ColorType = "black" | "gray" | "white";

// ---- Size types ----

export type SizeType = "small" | "medium" | "large";

// ---- Cell ----

/** A single cell in the matrix grid. */
export interface CellData {
  shape: ShapeType;
  color: ColorType;
  size: SizeType;
}

// ---- Matrix ----

/**
 * The full grid represented as a flat array of CellData.
 * Length === grid.rows * grid.cols (read from config).
 * Index mapping: row * cols + col.
 */
export type Matrix = CellData[];

// ---- Answer options ----

/** A single answer option presented to the user. */
export interface AnswerOption {
  id: number;
  cell: CellData;
  isCorrect: boolean;
}

// ---- Puzzle ----

/** Everything needed to render and play a single puzzle. */
export interface Puzzle {
  matrix: Matrix;
  options: AnswerOption[];
}

// ---- Attribute helpers ----

/** The attribute dimensions that can be toggled on/off in config. */
export type AttributeName = "shape" | "color" | "size";
