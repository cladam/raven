// ---- Shape types ----

export type ShapeType =
  | "circle"
  | "square"
  | "triangle"
  | "diamond"
  | "pentagon"
  | "hexagon"
  | "star"
  | "cross"
  | "arrow";

// ---- Colour types (fill colours for shapes) ----

export type ColorType = "black" | "grey" | "white";

// ---- Size types ----

export type SizeType = "small" | "medium" | "large";

// ---- Inner-line types (line pattern drawn inside the shape) ----

export type InnerLineType =
  | "none"
  | "horizontal"
  | "vertical"
  | "diagonal"
  | "cross";

// ---- Rotation types (rotation in degrees) ----

export type RotationType = "0" | "120" | "240";

// ---- Shape-count types (number of shape copies in the cell) ----

export type ShapeCountType = "1" | "2" | "3";

// ---- Fill-pattern types (texture pattern drawn inside the shape) ----

export type FillPatternType = "solid" | "hatched" | "dotted" | "crossHatch";

// ---- Cell ----

/** A single cell in the matrix grid. */
export interface CellData {
  shape: ShapeType;
  color: ColorType;
  size: SizeType;
  innerLine: InnerLineType;
  rotation: RotationType;
  shapeCount: ShapeCountType;
  fillPattern: FillPatternType;
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
export type AttributeName =
  | "shape"
  | "color"
  | "size"
  | "innerLine"
  | "rotation"
  | "shapeCount"
  | "fillPattern";
