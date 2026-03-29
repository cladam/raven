// Shape types
export type ShapeType = 'circle' | 'square' | 'triangle';

// Color types (fill colors for shapes)
export type ColorType = 'black' | 'gray' | 'white';

// Size types
export type SizeType = 'small' | 'medium' | 'large';

// A single cell in the 3x3 matrix
export interface CellData {
  shape: ShapeType;
  color: ColorType;
  size: SizeType;
}

// The full 3x3 matrix is an array of 9 cells
// Index 0-2 = row 1, 3-5 = row 2, 6-8 = row 3
// Index 8 (row 3, col 3) is the missing cell the user must identify
export type Matrix = [
  CellData, CellData, CellData,
  CellData, CellData, CellData,
  CellData, CellData, CellData
];

// An answer option presented to the user
export interface AnswerOption {
  id: number;
  cell: CellData;
  isCorrect: boolean;
}

// Puzzle state
export interface Puzzle {
  matrix: Matrix;
  options: AnswerOption[];
}

// Attributes that can be distributed across rows/columns
export type AttributeName = 'shape' | 'color' | 'size';

// A permutation is an ordering of indices [0, 1, 2]
export type Permutation = [number, number, number];
