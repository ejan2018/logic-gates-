// Random question generator for LogicSim.
// Generates questions similar to the textbook style: design circuits, draw
// truth tables, simplify with K-maps.

export interface Question {
  id: string;
  type: 'design-circuit' | 'truth-table' | 'simplify-kmap' | 'identify-gate' | 'write-expression';
  section: string;
  prompt: string;
  expression?: string;
  variables?: string[];
  minterms?: number[];
  truthTable?: number[];
  expectedAnswer?: string;
  hint?: string;
}

const ALL_VARS = ['A', 'B', 'C', 'D', 'E'];

// Helper: random integer 0..n-1
function ri(n: number): number {
  return Math.floor(Math.random() * n);
}

// Helper: pick k random distinct items from array
function pick<T>(arr: T[], k: number): T[] {
  const copy = [...arr];
  const out: T[] = [];
  for (let i = 0; i < k && copy.length > 0; i++) {
    const idx = ri(copy.length);
    out.push(copy.splice(idx, 1)[0]);
  }
  return out;
}

// Helper: random boolean expression generator
function generateExpression(numVars: number, numTerms: number): { expr: string; variables: string[] } {
  const vars = ALL_VARS.slice(0, numVars);
  const terms: string[] = [];
  for (let t = 0; t < numTerms; t++) {
    const termVars = pick(vars, 1 + ri(numVars));
    const termParts: string[] = [];
    for (const v of vars) {
      if (termVars.includes(v)) {
        // 50/50 complemented or not
        termParts.push(Math.random() > 0.5 ? v : v + '\u0304');
      }
    }
    if (termParts.length > 0) terms.push(termParts.join('·'));
  }
  return { expr: terms.join(' + '), variables: vars };
}

// Helper: evaluate boolean expression into truth table
function evalExpr(expr: string, variables: string[]): number[] {
  const n = variables.length;
  const size = 1 << n;
  const result: number[] = [];
  const normalize = (s: string) => {
    let out = s
      .replace(/·/g, '&&')
      .replace(/\+/g, '||')
      .replace(/¬/g, '!')
      .replace(/\s/g, '');
    const overbarMap: Record<string, string> = {
      Ā: '!A', B̄: '!B', C̄: '!C', D̄: '!D', Ē: '!E',
    };
    for (const [k, v] of Object.entries(overbarMap)) {
      out = out.split(k).join(v);
    }
    return out;
  };
  const normalized = normalize(expr);
  for (let combo = 0; combo < size; combo++) {
    const scope: Record<string, boolean> = {};
    for (let i = 0; i < n; i++) {
      const bit = (combo >> (n - 1 - i)) & 1;
      scope[variables[i]] = bit === 1;
    }
    try {
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

// Helper: extract minterms (positions where truth table = 1)
function getMinterms(truthTable: number[]): number[] {
  const out: number[] = [];
  for (let i = 0; i < truthTable.length; i++) {
    if (truthTable[i] === 1) out.push(i);
  }
  return out;
}

let qId = 0;
function nextId(): string {
  return `q_${Date.now().toString(36)}_${(qId++).toString(36)}`;
}

export function generateQuestion(): Question {
  const typeIdx = ri(5);
  switch (typeIdx) {
    case 0:
      return genDesignCircuit();
    case 1:
      return genTruthTable();
    case 2:
      return genSimplifyKMap();
    case 3:
      return genIdentifyGate();
    case 4:
      return genWriteExpression();
    default:
      return genDesignCircuit();
  }
}

export function generateQuestionSet(count: number = 6): Question[] {
  const types: Question['type'][] = ['design-circuit', 'truth-table', 'simplify-kmap', 'identify-gate', 'write-expression'];
  const out: Question[] = [];
  // Ensure at least one of each type for variety
  for (let i = 0; i < count; i++) {
    const type = types[i % types.length];
    let q: Question;
    switch (type) {
      case 'design-circuit': q = genDesignCircuit(); break;
      case 'truth-table': q = genTruthTable(); break;
      case 'simplify-kmap': q = genSimplifyKMap(); break;
      case 'identify-gate': q = genIdentifyGate(); break;
      case 'write-expression': q = genWriteExpression(); break;
      default: q = genDesignCircuit();
    }
    out.push(q);
  }
  // Shuffle
  return out.sort(() => Math.random() - 0.5);
}

function genDesignCircuit(): Question {
  const numVars = 2 + ri(3); // 2, 3, or 4
  const numTerms = 2 + ri(3); // 2, 3, or 4
  const { expr, variables } = generateExpression(numVars, numTerms);
  return {
    id: nextId(),
    type: 'design-circuit',
    section: 'Design logic circuits for the following Boolean functions',
    prompt: `Design a logic circuit using basic gates (AND, OR, NOT) for the following boolean function:`,
    expression: `F(${variables.join(', ')}) = ${expr}`,
    variables,
    hint: 'Use AND gates for products, OR gates to combine terms, NOT gates for complemented variables (e.g. Ā).',
  };
}

function genTruthTable(): Question {
  const numVars = 2 + ri(2); // 2 or 3
  const numTerms = 2 + ri(2);
  const { expr, variables } = generateExpression(numVars, numTerms);
  const truthTable = evalExpr(expr, variables);
  return {
    id: nextId(),
    type: 'truth-table',
    section: 'Draw the truth table for the following Boolean function',
    prompt: `Construct a complete truth table with all ${1 << numVars} input combinations for:`,
    expression: `F(${variables.join(', ')}) = ${expr}`,
    variables,
    truthTable,
    hint: `List all ${1 << numVars} combinations of ${variables.join(', ')} from all-0s to all-1s. Evaluate F for each.`,
  };
}

function genSimplifyKMap(): Question {
  const numVars = 2 + ri(3); // 2, 3, or 4
  const variables = ALL_VARS.slice(0, numVars);
  // Pick random minterms (3-7 ones)
  const totalMinterms = 1 << numVars;
  const numOnes = 3 + ri(Math.min(5, totalMinterms - 1));
  const allMinterms = Array.from({ length: totalMinterms }, (_, i) => i);
  const ones = pick(allMinterms, numOnes).sort((a, b) => a - b);
  // Build the expression as sum of minterms
  const termStr = ones
    .map((m) => {
      const bits = m.toString(2).padStart(numVars, '0');
      let term = '';
      for (let i = 0; i < numVars; i++) {
        term += bits[i] === '1' ? variables[i] : variables[i] + '\u0304';
      }
      return term;
    })
    .join(' + ');
  return {
    id: nextId(),
    type: 'simplify-kmap',
    section: 'Simplify the following Boolean functions using the K-Map method',
    prompt: `Using a ${numVars}-variable Karnaugh map, simplify the following function to its minimal sum-of-products form:`,
    expression: `F(${variables.join(', ')}) = Σm(${ones.join(', ')})\n     = ${termStr}`,
    variables,
    minterms: ones,
    hint: `Place 1s in cells ${ones.map((m) => 'm' + m).join(', ')}. Group them into the largest possible power-of-2 rectangles (1, 2, 4, 8). Each group → one product term.`,
  };
}

function genIdentifyGate(): Question {
  const gates = [
    { name: 'AND', desc: 'Output is 1 only when ALL inputs are 1' },
    { name: 'OR', desc: 'Output is 1 when AT LEAST ONE input is 1' },
    { name: 'NOT', desc: 'Output is the inverse of the input' },
    { name: 'NAND', desc: 'Output is 0 only when ALL inputs are 1' },
    { name: 'NOR', desc: 'Output is 1 only when ALL inputs are 0' },
    { name: 'XOR', desc: 'Output is 1 when inputs DIFFER' },
    { name: 'XNOR', desc: 'Output is 1 when inputs are EQUAL' },
  ];
  const g = gates[ri(gates.length)];
  return {
    id: nextId(),
    type: 'identify-gate',
    section: 'Identify the logic gate',
    prompt: `Which logic gate matches this description?`,
    expression: `"${g.desc}"`,
    expectedAnswer: g.name,
    hint: 'Think about AND, OR, NOT, NAND, NOR, XOR, XNOR.',
  };
}

function genWriteExpression(): Question {
  const numVars = 2 + ri(2); // 2 or 3
  const variables = ALL_VARS.slice(0, numVars);
  const totalMinterms = 1 << numVars;
  // Random truth table — keep number of 1s between 2 and 5
  const numOnes = 2 + ri(4);
  const allMinterms = Array.from({ length: totalMinterms }, (_, i) => i);
  const ones = pick(allMinterms, Math.min(numOnes, totalMinterms)).sort((a, b) => a - b);
  const truthTable: number[] = Array(totalMinterms).fill(0);
  for (const m of ones) truthTable[m] = 1;
  const termStr = ones
    .map((m) => {
      const bits = m.toString(2).padStart(numVars, '0');
      let term = '';
      for (let i = 0; i < numVars; i++) {
        term += bits[i] === '1' ? variables[i] : variables[i] + '\u0304';
      }
      return term;
    })
    .join(' + ');
  return {
    id: nextId(),
    type: 'write-expression',
    section: 'Write the Boolean expression from the given truth table',
    prompt: `Given the truth table below (F=1 at minterms ${ones.join(', ')}), write the canonical sum-of-products boolean expression:`,
    expression: `Variables: ${variables.join(', ')}\nMinterms where F=1: m${ones.join(', m')}`,
    variables,
    truthTable,
    expectedAnswer: `F = ${termStr}`,
    hint: 'For each minterm where F=1, write a product term containing each variable (complemented if its bit is 0, normal if 1). Then OR all the terms together.',
  };
}
