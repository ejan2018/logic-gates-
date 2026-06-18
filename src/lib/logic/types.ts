// Core types for the logic circuit simulator

export type GateType =
  | 'AND'
  | 'OR'
  | 'NOT'
  | 'NAND'
  | 'NOR'
  | 'XOR'
  | 'XNOR'
  | 'INPUT'   // user-toggleable input switch
  | 'OUTPUT'  // LED-style output
  | 'HIGH'    // constant 1
  | 'LOW'     // constant 0
  | 'CLOCK';  // auto-toggling clock

export type SignalValue = 0 | 1;

export interface Gate {
  id: string;
  type: GateType;
  x: number;
  y: number;
  /** For INPUT gates: current user-set value. For CLOCK: not used (auto). */
  inputValue?: SignalValue;
  /** Optional label (e.g. "A", "B", "Q"). */
  label?: string;
}

export interface Wire {
  id: string;
  /** Source: output pin of a gate. */
  fromGateId: string;
  /** Target: input pin index of a gate. */
  toGateId: string;
  toPinIndex: number;
}

export interface Circuit {
  gates: Gate[];
  wires: Wire[];
}

export interface GateDefinition {
  type: GateType;
  label: string;
  description: string;
  /** Number of input pins. */
  inputs: number;
  /** Number of output pins (always 1 for our gates). */
  outputs: number;
  /** Whether this gate is a source (no inputs needed). */
  isSource: boolean;
  /** Whether this gate is a sink (no outputs). */
  isSink: boolean;
  /** Evaluate the gate given input signals. Returns output signal. */
  evaluate: (inputs: SignalValue[]) => SignalValue;
  /** Category for palette grouping. */
  category: 'input' | 'gate' | 'output';
}
