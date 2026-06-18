import { Circuit, Gate, GateType, SignalValue } from './types';
import { GATE_DEFINITIONS } from './gates';

/**
 * Returns the value a source gate produces (independent of wires).
 * - INPUT: user-set value
 * - HIGH: 1, LOW: 0
 * - CLOCK: passed in via clockTick value
 */
function getSourceValue(gate: Gate, clockTick: SignalValue): SignalValue {
  switch (gate.type) {
    case 'INPUT':
      return gate.inputValue ?? 0;
    case 'HIGH':
      return 1;
    case 'LOW':
      return 0;
    case 'CLOCK':
      return clockTick;
    default:
      return 0;
  }
}

/**
 * Simulate the circuit and return a map of gateId -> output signal value.
 *
 * Uses iterative propagation. Stable circuits converge in 1–2 passes.
 * For feedback loops, we cap iterations to avoid infinite loops; the last
 * computed value is returned.
 */
export function simulate(
  circuit: Circuit,
  options: { clockTick?: SignalValue; maxIterations?: number } = {},
): Map<string, SignalValue> {
  const { clockTick = 1, maxIterations = 1000 } = options;
  const values = new Map<string, SignalValue>();

  // Map: target gate id + pin index -> source gate id (for fast lookup).
  const inputSources = new Map<string, string>();
  for (const wire of circuit.wires) {
    inputSources.set(`${wire.toGateId}:${wire.toPinIndex}`, wire.fromGateId);
  }

  // Initialize all source gates.
  for (const gate of circuit.gates) {
    const def = GATE_DEFINITIONS[gate.type];
    if (def.isSource) {
      values.set(gate.id, getSourceValue(gate, clockTick));
    }
  }

  // Iterate until no changes (or max iterations).
  let changed = true;
  let iterations = 0;
  while (changed && iterations < maxIterations) {
    changed = false;
    iterations++;

    for (const gate of circuit.gates) {
      const def = GATE_DEFINITIONS[gate.type];
      if (def.isSource) continue;

      // Gather input signals.
      const inputValues: SignalValue[] = [];
      for (let pin = 0; pin < def.inputs; pin++) {
        const srcId = inputSources.get(`${gate.id}:${pin}`);
        if (srcId === undefined) {
          inputValues.push(0); // unconnected inputs default to 0
        } else {
          inputValues.push(values.get(srcId) ?? 0);
        }
      }

      const newOutput = def.evaluate(inputValues);
      const current = values.get(gate.id);
      if (current !== newOutput) {
        values.set(gate.id, newOutput);
        changed = true;
      }
    }
  }

  return values;
}

/**
 * Generate a truth table for the circuit.
 * Finds all INPUT gates (treats them as input variables), enumerates every
 * combination, and records the resulting OUTPUT gate values.
 *
 * Returns { inputs: string[] (input gate labels), rows: SignalValue[][] }
 * where each row is [...inputValues, ...outputValues].
 */
export function generateTruthTable(circuit: Circuit): {
  inputLabels: string[];
  outputLabels: string[];
  rows: SignalValue[][];
  inputGateIds: string[];
  outputGateIds: string[];
} {
  const inputGates = circuit.gates.filter((g) => g.type === 'INPUT');
  const outputGates = circuit.gates.filter((g) => g.type === 'OUTPUT');

  const inputLabels = inputGates.map((g, i) => g.label || `IN${i + 1}`);
  const outputLabels = outputGates.map((g, i) => g.label || `OUT${i + 1}`);

  const rows: SignalValue[][] = [];
  const n = inputGates.length;

  if (n === 0) {
    // No inputs — just simulate once with clockTick=0.
    const values = simulate({ ...circuit, gates: circuit.gates.map((g) => g.type === 'INPUT' ? { ...g, inputValue: 0 as SignalValue } : g) }, { clockTick: 0 });
    const outValues = outputGates.map((g) => values.get(g.id) ?? 0);
    rows.push([...outValues]);
    return { inputLabels, outputLabels, rows, inputGateIds: inputGates.map((g) => g.id), outputGateIds: outputGates.map((g) => g.id) };
  }

  const total = 1 << n; // 2^n combinations
  for (let combo = 0; combo < total; combo++) {
    // Override input gate values for this combination.
    const newGates: Gate[] = circuit.gates.map((g) => {
      if (g.type === 'INPUT') {
        const idx = inputGates.findIndex((ig) => ig.id === g.id);
        if (idx === -1) return g;
        // MSB first (so the first input gate is the most significant bit).
        const bit = (combo >> (n - 1 - idx)) & 1;
        return { ...g, inputValue: (bit === 1 ? 1 : 0) as SignalValue };
      }
      return g;
    });

    const values = simulate({ ...circuit, gates: newGates }, { clockTick: 0 });
    const inValues = inputGates.map((g, idx) => {
      const bit = (combo >> (n - 1 - idx)) & 1;
      return (bit === 1 ? 1 : 0) as SignalValue;
    });
    const outValues = outputGates.map((g) => values.get(g.id) ?? 0);
    rows.push([...inValues, ...outValues]);
  }

  return {
    inputLabels,
    outputLabels,
    rows,
    inputGateIds: inputGates.map((g) => g.id),
    outputGateIds: outputGates.map((g) => g.id),
  };
}

/** Derive a boolean expression for each output gate by tracing back to inputs. */
export function deriveBooleanExpression(
  circuit: Circuit,
  outputGateId: string,
): string {
  // Map input pin to source gate.
  const inputSources = new Map<string, string>();
  for (const wire of circuit.wires) {
    inputSources.set(`${wire.toGateId}:${wire.toPinIndex}`, wire.fromGateId);
  }

  const gateById = new Map<string, Gate>();
  for (const g of circuit.gates) gateById.set(g.id, g);

  // Detect cycles (feedback) to avoid infinite recursion.
  const visiting = new Set<string>();

  const exprFor = (gateId: string, depth: number): string => {
    if (depth > 20) return '?';
    const gate = gateById.get(gateId);
    if (!gate) return '?';

    if (gate.type === 'INPUT') return gate.label || 'IN';
    if (gate.type === 'HIGH') return '1';
    if (gate.type === 'LOW') return '0';
    if (gate.type === 'CLOCK') return 'CLK';
    if (gate.type === 'OUTPUT') {
      const src = inputSources.get(`${gate.id}:0`);
      return src ? exprFor(src, depth + 1) : '?';
    }

    if (visiting.has(gateId)) return `(loop)`;
    visiting.add(gateId);

    const inputIds: string[] = [];
    const def = GATE_DEFINITIONS[gate.type];
    for (let pin = 0; pin < def.inputs; pin++) {
      const src = inputSources.get(`${gate.id}:${pin}`);
      if (!src) {
        inputIds.push('0');
      } else {
        inputIds.push(exprFor(src, depth + 1));
      }
    }

    visiting.delete(gateId);

    switch (gate.type) {
      case 'NOT':
        return `NOT ${inputIds[0]}`;
      case 'AND':
        return `(${inputIds[0]} AND ${inputIds[1]})`;
      case 'OR':
        return `(${inputIds[0]} OR ${inputIds[1]})`;
      case 'NAND':
        return `(${inputIds[0]} NAND ${inputIds[1]})`;
      case 'NOR':
        return `(${inputIds[0]} NOR ${inputIds[1]})`;
      case 'XOR':
        return `(${inputIds[0]} XOR ${inputIds[1]})`;
      case 'XNOR':
        return `(${inputIds[0]} XNOR ${inputIds[1]})`;
      default:
        return '?';
    }
  };

  return exprFor(outputGateId, 0);
}

export { GATE_DEFINITIONS };
export type { GateType };
