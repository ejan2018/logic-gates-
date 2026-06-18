'use client';

import { create } from 'zustand';
import { Circuit, Gate, GateType, SignalValue, Wire } from '@/lib/logic/types';
import { GATE_DEFINITIONS } from '@/lib/logic/gates';
import { simulate } from '@/lib/logic/simulator';

let nextId = 1;
function genId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${(nextId++).toString(36)}`;
}

export interface PendingWire {
  fromGateId: string;
  // Current mouse position (canvas coords) for live preview.
  mouseX: number;
  mouseY: number;
}

interface CircuitState {
  circuit: Circuit;
  signalValues: Map<string, SignalValue>;
  clockTick: SignalValue;
  clockRunning: boolean;

  selectedGateId: string | null;
  pendingWire: PendingWire | null;
  draggingGate: { id: string; offsetX: number; offsetY: number } | null;

  // Actions
  addGate: (type: GateType, x?: number, y?: number, label?: string) => string;
  moveGate: (id: string, x: number, y: number) => void;
  removeGate: (id: string) => void;
  setGateValue: (id: string, value: SignalValue) => void;
  setGateLabel: (id: string, label: string) => void;

  startWire: (fromGateId: string, mouseX: number, mouseY: number) => void;
  updatePendingWireMouse: (mouseX: number, mouseY: number) => void;
  cancelPendingWire: () => void;
  completeWire: (toGateId: string, toPinIndex: number) => void;
  removeWire: (id: string) => void;

  selectGate: (id: string | null) => void;
  startDragGate: (id: string, offsetX: number, offsetY: number) => void;
  stopDragGate: () => void;

  runSimulation: () => void;
  toggleClock: () => void;
  setClockRunning: (running: boolean) => void;

  loadCircuit: (circuit: Circuit) => void;
  clearCircuit: () => void;
}

function initialCircuit(): Circuit {
  // Starter circuit: A AND B -> OUT, plus a NOT chain for demo
  return {
    gates: [
      { id: 'g_a', type: 'INPUT', x: 80, y: 80, label: 'A', inputValue: 1 },
      { id: 'g_b', type: 'INPUT', x: 80, y: 200, label: 'B', inputValue: 0 },
      { id: 'g_and', type: 'AND', x: 280, y: 140 },
      { id: 'g_out', type: 'OUTPUT', x: 460, y: 140, label: 'Q' },
    ],
    wires: [
      { id: 'w1', fromGateId: 'g_a', toGateId: 'g_and', toPinIndex: 0 },
      { id: 'w2', fromGateId: 'g_b', toGateId: 'g_and', toPinIndex: 1 },
      { id: 'w3', fromGateId: 'g_and', toGateId: 'g_out', toPinIndex: 0 },
    ],
  };
}

export const useCircuitStore = create<CircuitState>((set, get) => ({
  circuit: initialCircuit(),
  signalValues: new Map(),
  clockTick: 1,
  clockRunning: false,

  selectedGateId: null,
  pendingWire: null,
  draggingGate: null,

  addGate: (type, x = 200, y = 200, label) => {
    const id = genId('g');
    const newGate: Gate = {
      id,
      type,
      x,
      y,
      ...(type === 'INPUT' ? { inputValue: 0 as SignalValue } : {}),
      ...(label ? { label } : {}),
    };
    set((state) => ({
      circuit: { ...state.circuit, gates: [...state.circuit.gates, newGate] },
    }));
    return id;
  },

  moveGate: (id, x, y) => {
    set((state) => ({
      circuit: {
        ...state.circuit,
        gates: state.circuit.gates.map((g) => (g.id === id ? { ...g, x, y } : g)),
      },
    }));
  },

  removeGate: (id) => {
    set((state) => ({
      circuit: {
        gates: state.circuit.gates.filter((g) => g.id !== id),
        wires: state.circuit.wires.filter((w) => w.fromGateId !== id && w.toGateId !== id),
      },
      selectedGateId: state.selectedGateId === id ? null : state.selectedGateId,
    }));
    get().runSimulation();
  },

  setGateValue: (id, value) => {
    set((state) => ({
      circuit: {
        ...state.circuit,
        gates: state.circuit.gates.map((g) =>
          g.id === id ? { ...g, inputValue: value } : g,
        ),
      },
    }));
    get().runSimulation();
  },

  setGateLabel: (id, label) => {
    set((state) => ({
      circuit: {
        ...state.circuit,
        gates: state.circuit.gates.map((g) => (g.id === id ? { ...g, label } : g)),
      },
    }));
  },

  startWire: (fromGateId, mouseX, mouseY) => {
    set({ pendingWire: { fromGateId, mouseX, mouseY } });
  },

  updatePendingWireMouse: (mouseX, mouseY) => {
    set((state) =>
      state.pendingWire
        ? { pendingWire: { ...state.pendingWire, mouseX, mouseY } }
        : state,
    );
  },

  cancelPendingWire: () => set({ pendingWire: null }),

  completeWire: (toGateId, toPinIndex) => {
    const { pendingWire, circuit } = get();
    if (!pendingWire) return;
    if (pendingWire.fromGateId === toGateId) {
      set({ pendingWire: null });
      return;
    }

    // Verify target gate has that input pin.
    const targetGate = circuit.gates.find((g) => g.id === toGateId);
    if (!targetGate) {
      set({ pendingWire: null });
      return;
    }
    const def = GATE_DEFINITIONS[targetGate.type];
    if (def.isSource || toPinIndex >= def.inputs) {
      set({ pendingWire: null });
      return;
    }

    // Replace any existing wire going to that input pin.
    const filteredWires = circuit.wires.filter(
      (w) => !(w.toGateId === toGateId && w.toPinIndex === toPinIndex),
    );

    const newWire: Wire = {
      id: genId('w'),
      fromGateId: pendingWire.fromGateId,
      toGateId,
      toPinIndex,
    };

    set({
      circuit: { ...circuit, wires: [...filteredWires, newWire] },
      pendingWire: null,
    });
    get().runSimulation();
  },

  removeWire: (id) => {
    set((state) => ({
      circuit: { ...state.circuit, wires: state.circuit.wires.filter((w) => w.id !== id) },
    }));
    get().runSimulation();
  },

  selectGate: (id) => set({ selectedGateId: id }),

  startDragGate: (id, offsetX, offsetY) => {
    set({ draggingGate: { id, offsetX, offsetY }, selectedGateId: id });
  },

  stopDragGate: () => set({ draggingGate: null }),

  runSimulation: () => {
    const { circuit, clockTick } = get();
    const values = simulate(circuit, { clockTick });
    set({ signalValues: values });
  },

  toggleClock: () => {
    set((state) => ({ clockTick: state.clockTick === 1 ? 0 : 1 }));
    get().runSimulation();
  },

  setClockRunning: (running) => set({ clockRunning: running }),

  loadCircuit: (circuit) => {
    set({
      circuit,
      selectedGateId: null,
      pendingWire: null,
      draggingGate: null,
    });
    get().runSimulation();
  },

  clearCircuit: () => {
    set({
      circuit: { gates: [], wires: [] },
      selectedGateId: null,
      pendingWire: null,
      draggingGate: null,
      signalValues: new Map(),
    });
  },
}));
