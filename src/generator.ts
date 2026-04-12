import config, { enabledAttributesForMode, optionCountForMode, missingCellIndex, GameModeId, AttributesConfig } from "./config";
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
  "fillPattern",
] as const;

/**
 * For each attribute, the subset of values chosen for the current puzzle.
 * The Latin square indices (0..cols-1) map into this subset.
 * When an attribute has more values than grid cols, we randomly pick
 * cols values so every puzzle can feature different combinations
 * (e.g. diamond/star/arrow one round, circle/hexagon/cross the next).
 */
type ValueSubsets = Record<string, string[]>;

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

/**
 * Pick n random items from arr (without replacement).
 * If arr.length <= n, returns a shuffled copy of the whole array.
 */
function pickN<T>(arr: T[], n: number): T[] {
  const shuffled = shuffle(arr);
  return shuffled.slice(0, n);
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
 * Generate a Latin square of size rows x cols (must be equal for a proper
 * Latin square). Returns an array of rows permutations, each of length cols,
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
    return Array.from({ length: rows }, (_, i) =>
      Array.from({ length: cols }, (_, j) => (i + j) % cols),
    );
  }
  return result;
}

// ---- Value subset selection ----

/**
 * For each attribute, pick gridSize random values from the full values list.
 * This is what makes e.g. 9 shapes work on a 3x3 grid: each puzzle gets a
 * random triplet like [diamond, star, arrow] or [circle, hexagon, cross].
 *
 * For disabled attributes, we just take the first value (they collapse to a
 * single constant anyway).
 */
function selectValueSubsets(gridSize: number, activeAttrs: Array<keyof AttributesConfig>): ValueSubsets {
  const attrs = config.attributes;
  const active = new Set<string>(activeAttrs);
  const subsets: ValueSubsets = {};

  for (const attr of ALL_ATTR_NAMES) {
    const allValues = attrs[attr].values;
    if (!active.has(attr as keyof typeof attrs)) {
      // Disabled: just use first value
      subsets[attr] = [allValues[0]];
    } else if (allValues.length <= gridSize) {
      // Exactly enough or fewer values than grid size: use them all
      subsets[attr] = shuffle([...allValues]);
    } else {
      // More values than grid cols: pick a random subset
      subsets[attr] = pickN(allValues, gridSize);
    }
  }

  return subsets;
}

// ---- Matrix generation ----

/**
 * Generate the 2D grid of CellData using the config.
 *
 * For each *enabled* attribute we generate an independent Latin square that
 * determines how that attribute's values are distributed across the grid.
 * The Latin square indices (0..cols-1) are mapped through a randomly-selected
 * subset of values, so all values get a chance to appear across puzzles.
 *
 * For *disabled* attributes every cell gets the first value in the list
 * (effectively making that dimension invisible).
 */
export function generateDistributionMatrix(activeAttrs: Array<keyof AttributesConfig>): {
  matrix: Matrix;
  subsets: ValueSubsets;
} {
  const { rows, cols } = config.grid;
  const active = activeAttrs;

  // Pick a random subset of values for each attribute
  const subsets = selectValueSubsets(cols, activeAttrs);

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
        cell[attr] = subsets[attr][idx] ?? subsets[attr][0];
      }
      cells.push(cell as unknown as CellData);
    }
  }

  return { matrix: cells as unknown as Matrix, subsets };
}

// ---- Distractor generation ----

function cellKey(c: CellData): string {
  return [c.shape, c.color, c.size, c.innerLine, c.rotation, c.shapeCount, c.fillPattern].join("|");
}

/**
 * Build distractors by swapping a single enabled attribute at a time.
 * First swaps within the puzzle's value subset (always visually meaningful),
 * then adds from the full config list for variety -- but only for enabled
 * attributes so disabled dimensions never produce invisible differences.
 */
function singleSwapDistractors(
  correct: CellData,
  seen: Set<string>,
  subsets: ValueSubsets,
  activeAttrs: Array<keyof AttributesConfig>,
): CellData[] {
  const result: CellData[] = [];
  const active = activeAttrs;
  const attrs = config.attributes;

  for (const attr of active) {
    // Primary: swap within the puzzle's subset (always visually meaningful)
    for (const val of subsets[attr]) {
      const cell: CellData = { ...correct, [attr]: val };
      const k = cellKey(cell);
      if (!seen.has(k)) {
        result.push(cell);
        seen.add(k);
      }
    }
    // Secondary: also try the full value list for out-of-subset variety
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
 * Draws from the puzzle's value subsets so distractors feel like they
 * "almost" belong in the matrix.
 */
function multiSwapDistractors(
  correct: CellData,
  seen: Set<string>,
  subsets: ValueSubsets,
  activeAttrs: Array<keyof AttributesConfig>,
): CellData[] {
  const result: CellData[] = [];
  const active = activeAttrs;

  for (let i = 0; i < active.length; i++) {
    for (let j = i + 1; j < active.length; j++) {
      const attrA = active[i];
      const attrB = active[j];
      for (const valA of subsets[attrA]) {
        for (const valB of subsets[attrB]) {
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
 * Uses the puzzle's value subsets so random distractors look plausible.
 */
function randomCombinationDistractors(
  seen: Set<string>,
  count: number,
  subsets: ValueSubsets,
): CellData[] {
  const result: CellData[] = [];
  let attempts = 0;
  const maxAttempts = count * 20;

  while (result.length < count && attempts < maxAttempts) {
    attempts++;
    const cell: Record<string, string> = {};
    for (const attr of ALL_ATTR_NAMES) {
      cell[attr] = pickRandom(subsets[attr]);
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
  subsets: ValueSubsets,
  activeAttrs: Array<keyof AttributesConfig>,
  optionCount: number,
): AnswerOption[] {
  const correct = matrix[missing];
  const needed = optionCount - 1;
  const strategy = config.options.distractorStrategy;

  const seen = new Set<string>();
  seen.add(cellKey(correct));

  let pool: CellData[] = [];

  switch (strategy) {
    case "single-swap-only":
      pool = singleSwapDistractors(correct, seen, subsets, activeAttrs);
      break;

    case "random-combination":
      pool = randomCombinationDistractors(seen, needed, subsets);
      break;

    case "single-swap-then-multi-swap":
    default:
      pool = [
        ...singleSwapDistractors(correct, seen, subsets, activeAttrs),
        ...multiSwapDistractors(correct, seen, subsets, activeAttrs),
      ];
      break;
  }

  const distractors = shuffle(pool).slice(0, needed);

  if (distractors.length < needed) {
    const extra = randomCombinationDistractors(
      seen,
      needed - distractors.length,
      subsets,
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

  return shuffle(options).map((opt, i) => ({ ...opt, id: i }));
}

// ---- Public API ----

/**
 * Generate a complete puzzle: matrix + missing cell index + answer options.
 */
export function generatePuzzle(modeId: GameModeId): Puzzle & { missingIndex: number } {
  const activeAttrs = enabledAttributesForMode(config, modeId);
  const optCount = optionCountForMode(config, modeId);
  const { matrix, subsets } = generateDistributionMatrix(activeAttrs);
  const missing = missingCellIndex(config);
  const options = generateOptions(matrix, missing, subsets, activeAttrs, optCount);
  return { matrix, options, missingIndex: missing };
}
