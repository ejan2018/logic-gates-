// Karnaugh Map utilities for 2, 3, and 4 variables.
//
// K-map cell ordering follows Gray code so that adjacent cells differ by
// exactly one variable — this is what makes visual grouping work.

export type KMapSize = 2 | 3 | 4;

export interface KMapConfig {
  size: KMapSize;
  /** Variable names, e.g. ['A','B'] for 2-var. */
  variables: string[];
  /** Row labels (Gray code combinations). */
  rowLabels: string[];
  /** Column labels (Gray code combinations). */
  colLabels: string[];
  /** Number of rows. */
  rows: number;
  /** Number of columns. */
  cols: number;
}

/**
 * Build the K-map layout for a given variable count.
 *
 * 2 variables: 2x2 (A on rows, B on cols)
 * 3 variables: 2x4 (A on rows, BC on cols)
 * 4 variables: 4x4 (AB on rows, CD on cols)
 */
export function getKMapConfig(size: KMapSize, variables?: string[]): KMapConfig {
  const gray2 = ['0', '1'];
  const gray4 = ['00', '01', '11', '10'];

  switch (size) {
    case 2:
      return {
        size,
        variables: variables ?? ['A', 'B'],
        rowLabels: gray2,
        colLabels: gray2,
        rows: 2,
        cols: 2,
      };
    case 3:
      return {
        size,
        variables: variables ?? ['A', 'B', 'C'],
        rowLabels: gray2,
        colLabels: gray4,
        rows: 2,
        cols: 4,
      };
    case 4:
      return {
        size,
        variables: variables ?? ['A', 'B', 'C', 'D'],
        rowLabels: gray4,
        colLabels: gray4,
        rows: 4,
        cols: 4,
      };
  }
}

/**
 * Convert (row, col) to a minterm index (0..2^n - 1).
 * Uses Gray-code ordering.
 */
export function cellToMinterm(size: KMapSize, row: number, col: number): number {
  const gray2bits = ['0', '1'];
  const gray4bits = ['00', '01', '11', '10'];
  let rowBits: string;
  let colBits: string;
  if (size === 2) {
    rowBits = gray2bits[row];
    colBits = gray2bits[col];
  } else if (size === 3) {
    rowBits = gray2bits[row];
    colBits = gray4bits[col];
  } else {
    rowBits = gray4bits[row];
    colBits = gray4bits[col];
  }
  return parseInt(rowBits + colBits, 2);
}

/**
 * Convert a minterm index to (row, col).
 */
export function mintermToCell(size: KMapSize, minterm: number): { row: number; col: number } {
  const bits = minterm.toString(2).padStart(size, '0');
  let rowBits: string;
  let colBits: string;
  if (size === 2) {
    rowBits = bits.slice(0, 1);
    colBits = bits.slice(1, 2);
  } else if (size === 3) {
    rowBits = bits.slice(0, 1);
    colBits = bits.slice(1, 3);
  } else {
    rowBits = bits.slice(0, 2);
    colBits = bits.slice(2, 4);
  }
  const gray2bits = ['0', '1'];
  const gray4bits = ['00', '01', '11', '10'];
  return {
    row: gray2bits.indexOf(rowBits) >= 0 ? gray2bits.indexOf(rowBits) : gray4bits.indexOf(rowBits),
    col: gray4bits.indexOf(colBits) >= 0 ? gray4bits.indexOf(colBits) : gray2bits.indexOf(colBits),
  };
}

/**
 * Given a truth table (array of 0/1 values indexed by minterm), return a 2D
 * grid of values matching the K-map layout.
 */
export function truthTableToKMap(size: KMapSize, truthTable: number[]): number[][] {
  const cfg = getKMapConfig(size);
  const grid: number[][] = [];
  for (let r = 0; r < cfg.rows; r++) {
    const row: number[] = [];
    for (let c = 0; c < cfg.cols; c++) {
      const m = cellToMinterm(size, r, c);
      row.push(truthTable[m] ?? 0);
    }
    grid.push(row);
  }
  return grid;
}

/**
 * Convert a boolean expression like "A·B + Ā·C" into a truth table.
 * Very small evaluator: supports variables, AND (· or *), OR (+), NOT (¬ or overbar Ā), parens.
 */
export function evalBooleanExpression(expr: string, variables: string[]): number[] {
  const n = variables.length;
  const size = 1 << n;
  const result: number[] = [];

  // Normalize expression: replace overbar X̄ with ¬X, · with *, etc.
  const normalize = (s: string) => {
    let out = s
      .replace(/·/g, '*')
      .replace(/\*/g, '&&')
      .replace(/\+/g, '||')
      .replace(/¬/g, '!')
      .replace(/\s/g, '');
    // Replace overbar letters Ā B̄ C̄ D̄ etc.
    const overbarMap: Record<string, string> = {
      Ā: '!A', B̄: '!B', C̄: '!C', D̄: '!D',
      ā: '!A', b̄: '!B', c̄: '!C', d̄: '!D',
    };
    for (const [k, v] of Object.entries(overbarMap)) {
      out = out.split(k).join(v);
    }
    return out;
  };

  const normalized = normalize(expr);

  for (let combo = 0; combo < size; combo++) {
    // Build a scope: MSB first variable = highest bit
    const scope: Record<string, boolean> = {};
    for (let i = 0; i < n; i++) {
      const bit = (combo >> (n - 1 - i)) & 1;
      scope[variables[i]] = bit === 1;
    }
    try {
      // Replace variable names with scope references
      let jsExpr = normalized;
      for (const v of variables) {
        jsExpr = jsExpr.replace(new RegExp(`\\b${v}\\b`, 'g'), `scope.${v}`);
      }
       
      const val = new Function('scope', `return (${jsExpr}) ? 1 : 0;`)(scope);
      result.push(val);
    } catch {
      result.push(0);
    }
  }
  return result;
}

/**
 * Pretty-print a minterm as a product term, e.g. minterm 5 with vars ABCD = "AB̄CD".
 */
export function mintermToTerm(size: KMapSize, minterm: number, variables?: string[]): string {
  const cfg = getKMapConfig(size, variables);
  const bits = minterm.toString(2).padStart(size, '0');
  let term = '';
  for (let i = 0; i < size; i++) {
    const v = cfg.variables[i];
    if (bits[i] === '1') term += v;
    else term += v + '\u0304'; // combining overbar
  }
  return term;
}

/**
 * Find all prime implicants via a brute-force search over power-of-two groups.
 * Returns array of { cells: number[], term: string } — each group is a rectangular block
 * with size 1, 2, 4, 8, 16 that covers only 1s.
 *
 * For simplicity, this is a teaching tool, not a Quine-McCluskey implementation.
 * It enumerates all valid rectangles whose size is a power of 2 and that consist
 * entirely of 1s, then returns the largest such groups.
 */
export interface KMapGroup {
  cells: { row: number; col: number }[];
  size: number;
  term: string;
}

export function findKMapGroups(
  size: KMapSize,
  grid: number[][],
  variables?: string[],
): KMapGroup[] {
  const cfg = getKMapConfig(size, variables);
  const isOne = (r: number, c: number) => {
    // Wrap around (K-maps are toroidal)
    const rr = ((r % cfg.rows) + cfg.rows) % cfg.rows;
    const cc = ((c % cfg.cols) + cfg.cols) % cfg.cols;
    return grid[rr]?.[cc] === 1;
  };

  const groups: KMapGroup[] = [];

  // Enumerate all rectangles of size 1, 2, 4, 8, 16 with rows/cols being powers of 2
  // and rows*cols being a power of 2.
  const powersOf2 = [1, 2, 4];
  const validDims: { h: number; w: number }[] = [];
  for (const h of powersOf2) {
    for (const w of powersOf2) {
      if (h > cfg.rows || w > cfg.cols) continue;
      const sz = h * w;
      if ([1, 2, 4, 8, 16].includes(sz)) {
        validDims.push({ h, w });
      }
    }
  }

  // For each starting position and each dimension, check if all cells are 1s.
  // We dedupe by canonical form (sorted cell list).
  const seen = new Set<string>();

  for (let r0 = 0; r0 < cfg.rows; r0++) {
    for (let c0 = 0; c0 < cfg.cols; c0++) {
      for (const { h, w } of validDims) {
        const cells: { row: number; col: number }[] = [];
        let allOnes = true;
        for (let dr = 0; dr < h && allOnes; dr++) {
          for (let dc = 0; dc < w && allOnes; dc++) {
            const r = r0 + dr;
            const c = c0 + dc;
            if (!isOne(r, c)) {
              allOnes = false;
              break;
            }
            const rr = ((r % cfg.rows) + cfg.rows) % cfg.rows;
            const cc = ((c % cfg.cols) + cfg.cols) % cfg.cols;
            cells.push({ row: rr, col: cc });
          }
        }
        if (!allOnes) continue;
        const key = cells.map((c) => `${c.row},${c.col}`).sort().join('|');
        if (seen.has(key)) continue;
        seen.add(key);

        // Compute the simplified term for this group
        const minterms = cells.map((c) => cellToMinterm(size, c.row, c.col));
        const term = simplifyGroup(minterms, size, cfg.variables);

        groups.push({ cells, size: cells.length, term });
      }
    }
  }

  // Keep only maximal groups (don't keep a group if it's a subset of a bigger group)
  const maximal = groups.filter((g) => {
    return !groups.some((other) => {
      if (other === g) return false;
      if (other.size <= g.size) return false;
      // Check if g's cells are all in other's cells
      const otherSet = new Set(other.cells.map((c) => `${c.row},${c.col}`));
      return g.cells.every((c) => otherSet.has(`${c.row},${c.col}`));
    });
  });

  return maximal;
}

/**
 * Simplify a group of minterms into a product term.
 * For each variable, check if it's the same (0 or 1) across all minterms.
 * If yes, include it (positive or negative). If no, omit it (it varies).
 */
function simplifyGroup(minterms: number[], size: KMapSize, variables: string[]): string {
  const bits = minterms.map((m) => m.toString(2).padStart(size, '0'));
  let term = '';
  for (let i = 0; i < size; i++) {
    const allSame = bits.every((b) => b[i] === bits[0][i]);
    if (allSame) {
      const v = variables[i];
      if (bits[0][i] === '1') term += v;
      else term += v + '\u0304';
    }
  }
  return term || '1';
}

/**
 * Return the simplified sum-of-products expression from a K-map grid.
 * Greedily picks maximal groups until all 1s are covered.
 */
export function simplifyKMap(
  size: KMapSize,
  grid: number[][],
  variables?: string[],
): { expression: string; groups: KMapGroup[] } {
  const cfg = getKMapConfig(size, variables);
  const allGroups = findKMapGroups(size, grid, cfg.variables);

  // Greedy set cover
  const oneCells: { row: number; col: number }[] = [];
  for (let r = 0; r < cfg.rows; r++) {
    for (let c = 0; c < cfg.cols; c++) {
      if (grid[r][c] === 1) oneCells.push({ row: r, col: c });
    }
  }
  const remaining = new Set(oneCells.map((c) => `${c.row},${c.col}`));
  const chosen: KMapGroup[] = [];

  while (remaining.size > 0) {
    // Pick the group that covers the most remaining cells (max size, then most uncovered)
    let best: KMapGroup | null = null;
    let bestUncovered = -1;
    for (const g of allGroups) {
      const covered = g.cells.filter((c) => remaining.has(`${c.row},${c.col}`));
      if (covered.length > bestUncovered || (covered.length === bestUncovered && best && g.size > best.size)) {
        bestUncovered = covered.length;
        best = g;
      }
    }
    if (!best || bestUncovered <= 0) break;
    chosen.push(best);
    for (const c of best.cells) {
      remaining.delete(`${c.row},${c.col}`);
    }
  }

  // All-zero or all-one special cases
  if (chosen.length === 0) {
    if (oneCells.length === 0) return { expression: '0', groups: [] };
    return { expression: '1', groups: [] };
  }

  // Dedupe terms
  const seen = new Set<string>();
  const terms: string[] = [];
  for (const g of chosen) {
    if (!seen.has(g.term)) {
      seen.add(g.term);
      terms.push(g.term);
    }
  }

  return {
    expression: terms.join(' + '),
    groups: chosen,
  };
}
