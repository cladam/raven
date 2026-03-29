import { ShapeType, ColorType, SizeType, CellData, Matrix, AnswerOption, Puzzle, Permutation } from './types';

// All possible values for each attribute
const SHAPES: ShapeType[] = ['circle', 'square', 'triangle'];
const COLORS: ColorType[] = ['black', 'gray', 'white'];
const SIZES: SizeType[] = ['small', 'medium', 'large'];

// All 6 permutations of [0, 1, 2]
const ALL_PERMUTATIONS: Permutation[] = [
  [0, 1, 2],
  [0, 2, 1],
  [1, 0, 2],
  [1, 2, 0],
  [2, 0, 1],
  [2, 1, 0],
];

/**
 * Pick a random element from an array.
 */
function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Shuffle an array in place using Fisher-Yates and return it.
 */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Checks whether a set of 3 row permutations forms a valid "Distribution of Three"
 * for a given attribute. In a valid distribution, each column also contains all 3
 * distinct values (i.e., the 3x3 grid is a Latin square for that attribute).
 *
 * Each row permutation maps column index -> attribute index.
 * For each column c, the set { rowPerms[0][c], rowPerms[1][c], rowPerms[2][c] }
 * must equal {0, 1, 2}.
 */
function isLatinSquare(rowPerms: Permutation[]): boolean {
  for (let col = 0; col < 3; col++) {
    const vals = new Set([rowPerms[0][col], rowPerms[1][col], rowPerms[2][col]]);
    if (vals.size !== 3) return false;
  }
  return true;
}

/**
 * Generate a valid 3x3 Latin square arrangement by picking 3 row permutations
 * that also satisfy the column constraint.
 *
 * Returns an array of 3 Permutations (one per row), where each permutation
 * maps column index -> attribute value index.
 */
function generateLatinSquare(): Permutation[] {
  // Pick a random first row
  const row0 = pickRandom(ALL_PERMUTATIONS);

  // Find all valid (row1, row2) combinations
  const validCombos: [Permutation, Permutation][] = [];
  for (const row1 of ALL_PERMUTATIONS) {
    if (row1 === row0) continue; // rows must differ for Latin square
    for (const row2 of ALL_PERMUTATIONS) {
      if (row2 === row0 || row2 === row1) continue;
      if (isLatinSquare([row0, row1, row2])) {
        validCombos.push([row1, row2]);
      }
    }
  }

  const [row1, row2] = pickRandom(validCombos);
  return [row0, row1, row2];
}

/**
 * Generate a Distribution of Three puzzle.
 *
 * "Distribution of Three" means that for each visual attribute (shape, color, size),
 * each of the 3 possible values appears exactly once in every row and every column.
 * This is essentially a Latin square constraint applied independently to each attribute.
 *
 * We generate three independent Latin squares — one for shape, one for color, one for size —
 * and combine them to produce the 3x3 matrix of cells.
 */
export function generateDistributionMatrix(): Matrix {
  const shapeSquare = generateLatinSquare();
  const colorSquare = generateLatinSquare();
  const sizeSquare = generateLatinSquare();

  const cells: CellData[] = [];

  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      cells.push({
        shape: SHAPES[shapeSquare[row][col]],
        color: COLORS[colorSquare[row][col]],
        size: SIZES[sizeSquare[row][col]],
      });
    }
  }

  return cells as unknown as Matrix;
}

/**
 * Generate distractor options for the answer bank.
 *
 * We always include the correct answer (matrix[8]) plus 5 distractors,
 * for a total of 6 options. Distractors are created by varying one or more
 * attributes of the correct answer so they look plausible but are wrong.
 */
export function generateOptions(matrix: Matrix): AnswerOption[] {
  const correct = matrix[8];

  const distractors: CellData[] = [];
  const seen = new Set<string>();
  const key = (c: CellData) => `${c.shape}-${c.color}-${c.size}`;
  seen.add(key(correct));

  // Strategy 1: swap one attribute at a time
  for (const shape of SHAPES) {
    const cell: CellData = { ...correct, shape };
    const k = key(cell);
    if (!seen.has(k)) {
      distractors.push(cell);
      seen.add(k);
    }
  }
  for (const color of COLORS) {
    const cell: CellData = { ...correct, color };
    const k = key(cell);
    if (!seen.has(k)) {
      distractors.push(cell);
      seen.add(k);
    }
  }
  for (const size of SIZES) {
    const cell: CellData = { ...correct, size };
    const k = key(cell);
    if (!seen.has(k)) {
      distractors.push(cell);
      seen.add(k);
    }
  }

  // Strategy 2: swap two attributes for extra difficulty
  for (const shape of SHAPES) {
    for (const color of COLORS) {
      const cell: CellData = { shape, color, size: correct.size };
      const k = key(cell);
      if (!seen.has(k)) {
        distractors.push(cell);
        seen.add(k);
      }
    }
  }

  // Pick 5 distractors from the pool (shuffled)
  const shuffledDistractors = shuffle(distractors).slice(0, 5);

  // Build final options array
  const options: AnswerOption[] = [
    { id: 0, cell: correct, isCorrect: true },
    ...shuffledDistractors.map((cell, i) => ({
      id: i + 1,
      cell,
      isCorrect: false,
    })),
  ];

  // Shuffle so the correct answer isn't always first
  return shuffle(options).map((opt, i) => ({ ...opt, id: i }));
}

/**
 * Generate a complete puzzle: matrix + answer options.
 */
export function generatePuzzle(): Puzzle {
  const matrix = generateDistributionMatrix();
  const options = generateOptions(matrix);
  return { matrix, options };
}
