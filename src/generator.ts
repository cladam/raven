import config, { enabledAttributes, missingCellIndex } from "./config";
import { CellData, Matrix, AnswerOption, Puzzle } from "./types";

// ---- Types internal to the generator ----

// A permutation is an ordering of indices, length === grid.cols
type Permutation = number[];

/** All attribute names (enabled and disabled) used for matrix & distractor generation. */
const ALL_ATTR_NAMES = [
  "shape",
  "color",
  "size",
  "innerLine",
  "rotation",
  "shapeCount",
] as const;

// ---- Utility helpers ----

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---- Permutation helpers ----

/**
 * Generate all permutations of [0 .. n-1].
 * For n = 3 this gives 6 permutations; for n = 4 it gives 24, etc.
 */
function allPermutations(n: number): Permutation[] {
  if (n === 0) return [[]];
  const result: Permutation[] = [];

  function recurse(current: number[], remaining: number[]) {
    if (remaining.length === 0) {
      result.push([...current]);
      return;
    }
    for (let i = 0; i < remaining.length; i++) {
      current.push(remaining[i]);
      const next = [...remaining.slice(0, i), ...remaining.slice(i + 1)];
      recurse(current, next);
      current.pop();
    }
  }

  const indices = Array.from({ length: n }, (_, i) => i);
  recurse([], indices);
  return result;
}

/**
 * Check whether a set of row permutations forms a Latin square
 * (each column also contains every value exactly once).
 */
function isLatinSquare(rowPerms: Permutation[], cols: number): boolean {
  for (let col = 0; col < cols; col++) {
    const vals = new Set(rowPerms.map((row) => row[col]));
    if (vals.size !== rowPerms.length) return false;
  }
  return true;
}

/**
 * Generate a Latin square of size `rows × cols` (must be equal for a proper
 * Latin square). Returns an array of `rows` permutations, each of length `cols`,
 * where every row is a permutation of [0..cols-1] and every column contains
 * each value exactly once.
 */
function generateLatinSquare(rows: number, cols: number): Permutation[] {
  const perms = allPermutations(cols);

  // Build row by row, backtracking if no valid continuation exists.
  function build(chosen: Permutation[]): Permutation[] | null {
    if (chosen.length === rows) {
      return isLatinSquare(chosen, cols) ? chosen : null;
    }

    const candidates = shuffle(perms);
    for (const candidate of candidates) {
      // Quick check: does this candidate conflict with any column so far?
      let valid = true;
      for (let col = 0; col < cols; col++) {
        for (const prev of chosen) {
          if (prev[col] === candidate[col]) {
            valid = false;
            break;
          }
        }
        if (!valid) break;
      }
      if (!valid) continue;

      const result = build([...chosen, candidate]);
      if (result) return result;
    }
    return null;
  }

  const result = build([]);
  if (!result) {
    // Fallback: identity square (should never happen for n >= 1)
    return Array.from({ length: rows }, (_, i) =>
      Array.from({ length: cols }, (_, j) => (i + j) % cols),
    );
  }
  return result;
}

// ---- Matrix generation ----

/**
 * Generate the 2D grid of CellData using the config.
 *
 * For each *enabled* attribute we generate an independent Latin square that
 * determines how that attribute's values are distributed across the grid.
 *
 * For *disabled* attributes every cell gets the first value in the list
 * (effectively making that dimension invisible).
 */
export function generateDistributionMatrix(): Matrix {
  const { rows, cols } = config.grid;
  const attrs = config.attributes;
  const active = enabledAttributes(config);

  // Generate one Latin square per enabled attribute
  const squares: Record<string, Permutation[]> = {};
  for (const attr of active) {
    squares[attr] = generateLatinSquare(rows, cols);
  }

  const cells: CellData[] = [];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const cell: Record<string, string> = {};
      for (const attr of ALL_ATTR_NAMES) {
        const idx = squares[attr] ? squares[attr][row][col] : 0;
        cell[attr] = attrs[attr].values[idx];
      }
      cells.push(cell as unknown as CellData);
    }
  }

  return cells as unknown as Matrix;
}

// ---- Distractor generation ----

function cellKey(c: CellData): string {
  return `${c.shape}|${c.color}|${c.size}|${c.innerLine}|${c.rotation}|${c.shapeCount}`;
}

/**
 * Build distractors by swapping a single enabled attribute at a time.
 */
function singleSwapDistractors(
  correct: CellData,
  seen: Set<string>,
): CellData[] {
  const result: CellData[] = [];
  const active = enabledAttributes(config);
  const attrs = config.attributes;

  for (const attr of active) {
    for (const val of attrs[attr].values) {
      const cell: CellData = { ...correct, [attr]: val };
      const k = cellKey(cell);
      if (!seen.has(k)) {
        result.push(cell);
        seen.add(k);
      }
    }
  }
  return result;
}

/**
 * Build distractors by swapping two enabled attributes simultaneously.
 */
function multiSwapDistractors(
  correct: CellData,
  seen: Set<string>,
): CellData[] {
  const result: CellData[] = [];
  const active = enabledAttributes(config);
  const attrs = config.attributes;

  // All pairs of enabled attributes
  for (let i = 0; i < active.length; i++) {
    for (let j = i + 1; j < active.length; j++) {
      const attrA = active[i];
      const attrB = active[j];
      for (const valA of attrs[attrA].values) {
        for (const valB of attrs[attrB].values) {
          const cell: CellData = { ...correct, [attrA]: valA, [attrB]: valB };
          const k = cellKey(cell);
          if (!seen.has(k)) {
            result.push(cell);
            seen.add(k);
          }
        }
      }
    }
  }
  return result;
}

/**
 * Build distractors by generating fully random attribute combinations.
 */
function randomCombinationDistractors(
  seen: Set<string>,
  count: number,
): CellData[] {
  const result: CellData[] = [];
  const attrs = config.attributes;
  let attempts = 0;
  const maxAttempts = count * 20;

  while (result.length < count && attempts < maxAttempts) {
    attempts++;
    const cell: Record<string, string> = {};
    for (const attr of ALL_ATTR_NAMES) {
      cell[attr] = pickRandom(attrs[attr].values);
    }
    const k = cellKey(cell as unknown as CellData);
    if (!seen.has(k)) {
      result.push(cell as unknown as CellData);
      seen.add(k);
    }
  }
  return result;
}

/**
 * Generate the answer options (1 correct + N-1 distractors).
 */
export function generateOptions(
  matrix: Matrix,
  missing: number,
): AnswerOption[] {
  const correct = matrix[missing];
  const needed = config.options.count - 1; // number of distractors
  const strategy = config.options.distractorStrategy;

  const seen = new Set<string>();
  seen.add(cellKey(correct));

  let pool: CellData[] = [];

  switch (strategy) {
    case "single-swap-only":
      pool = singleSwapDistractors(correct, seen);
      break;

    case "random-combination":
      pool = randomCombinationDistractors(seen, needed);
      break;

    case "single-swap-then-multi-swap":
    default:
      pool = [
        ...singleSwapDistractors(correct, seen),
        ...multiSwapDistractors(correct, seen),
      ];
      break;
  }

  // Pick `needed` distractors from the pool
  const distractors = shuffle(pool).slice(0, needed);

  // If we still don't have enough (edge case), fill with random combos
  if (distractors.length < needed) {
    const extra = randomCombinationDistractors(
      seen,
      needed - distractors.length,
    );
    distractors.push(...extra);
  }

  const options: AnswerOption[] = [
    { id: 0, cell: correct, isCorrect: true },
    ...distractors.map((cell, i) => ({
      id: i + 1,
      cell,
      isCorrect: false,
    })),
  ];

  // Shuffle and re-assign sequential ids
  return shuffle(options).map((opt, i) => ({ ...opt, id: i }));
}

// ---- Public API ----

/**
 * Generate a complete puzzle: matrix + missing cell index + answer options.
 */
export function generatePuzzle(): Puzzle & { missingIndex: number } {
  const matrix = generateDistributionMatrix();
  const missing = missingCellIndex(config);
  const options = generateOptions(matrix, missing);
  return { matrix, options, missingIndex: missing };
}
