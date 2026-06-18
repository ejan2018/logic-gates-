'use client';

import { GateSymbol, getGatePinPosition } from './GateSymbol';
import { Gate, GateType, SignalValue } from '@/lib/logic/types';
import { GATE_DEFINITIONS, GATE_WIDTH, GATE_HEIGHT } from '@/lib/logic/gates';
import { useCircuitStore } from '@/store/circuitStore';
import { useRef } from 'react';

interface GateNodeProps {
  gate: Gate;
  value: SignalValue | undefined;
  selected: boolean;
}

export function GateNode({ gate, value, selected }: GateNodeProps) {
  const moveGate = useCircuitStore((s) => s.moveGate);
  const selectGate = useCircuitStore((s) => s.selectGate);
  const removeGate = useCircuitStore((s) => s.removeGate);
  const startDragGate = useCircuitStore((s) => s.startDragGate);
  const stopDragGate = useCircuitStore((s) => s.stopDragGate);
  const draggingGate = useCircuitStore((s) => s.draggingGate);
  const startWire = useCircuitStore((s) => s.startWire);
  const pendingWire = useCircuitStore((s) => s.pendingWire);
  const completeWire = useCircuitStore((s) => s.completeWire);
  const setGateValue = useCircuitStore((s) => s.setGateValue);
  const cancelPendingWire = useCircuitStore((s) => s.cancelPendingWire);
  const canvasRef = useRef<HTMLDivElement>(null);

  const def = GATE_DEFINITIONS[gate.type];

  // Mouse down on gate body: start dragging (unless we're in wire-drawing mode).
  const handleBodyMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if (pendingWire) return; // don't start drag while drawing a wire
    e.stopPropagation();
    selectGate(gate.id);
    // Calculate offset between mouse and gate's top-left corner.
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    startDragGate(gate.id, offsetX, offsetY);
  };

  // Click on gate body for INPUT/CLOCK gates: toggle value (only if not dragged).
  const handleBodyClick = (e: React.MouseEvent) => {
    if (gate.type === 'INPUT') {
      e.stopPropagation();
      setGateValue(gate.id, (gate.inputValue ?? 0) === 1 ? 0 : 1);
    }
  };

  // Mouse down on output pin: start drawing a wire.
  const handleOutputPinMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if (def.isSink) return; // output gate has no output pin
    e.stopPropagation();
    const pos = getGatePinPosition(gate.type, gate.x, gate.y, -1);
    startWire(gate.id, pos.x, pos.y);
  };

  // Mouse up on input pin: complete wire if pending.
  const handleInputPinMouseUp = (e: React.MouseEvent, pinIndex: number) => {
    if (!pendingWire) return;
    e.stopPropagation();
    completeWire(gate.id, pinIndex);
  };

  // Pin positions for this gate (for hit testing / rendering pin dots).
  const outputPinPos = def.isSink ? null : getGatePinPosition(gate.type, gate.x, gate.y, -1);
  const inputPinPositions: { x: number; y: number; index: number }[] = [];
  for (let i = 0; i < def.inputs; i++) {
    const pos = getGatePinPosition(gate.type, gate.x, gate.y, i);
    inputPinPositions.push({ x: pos.x, y: pos.y, index: i });
  }

  // Note: gate rendering uses an absolutely-positioned container so we can overlay
  // pin hit-areas on top of the SVG.
  return (
    <div
      data-gate-id={gate.id}
      style={{
        position: 'absolute',
        left: gate.x,
        top: gate.y,
        width: GATE_WIDTH,
        height: GATE_HEIGHT,
        cursor: draggingGate?.id === gate.id ? 'grabbing' : 'grab',
        userSelect: 'none',
      }}
      onMouseDown={handleBodyMouseDown}
      onClick={handleBodyClick}
    >
      <GateSymbol
        type={gate.type}
        value={value}
        label={gate.label}
        selected={selected}
        highlighted={gate.type === 'CLOCK' && value === 1}
      />

      {/* Output pin hit area */}
      {outputPinPos && (
        <div
          style={{
            position: 'absolute',
            left: outputPinPos.x - gate.x - 8,
            top: outputPinPos.y - gate.y - 8,
            width: 16,
            height: 16,
            cursor: 'crosshair',
            background: value === 1 ? '#10b981' : '#9ca3af',
            border: '1.5px solid #1f2937',
            borderRadius: '50%',
            zIndex: 5,
          }}
          onMouseDown={handleOutputPinMouseDown}
          title="Drag from here to draw a wire"
        />
      )}

      {/* Input pin hit areas */}
      {inputPinPositions.map((pin) => (
        <div
          key={pin.index}
          style={{
            position: 'absolute',
            left: pin.x - gate.x - 7,
            top: pin.y - gate.y - 7,
            width: 14,
            height: 14,
            cursor: pendingWire ? 'cell' : 'crosshair',
            background: pendingWire ? '#fbbf24' : '#ffffff',
            border: '1.5px solid #1f2937',
            borderRadius: '50%',
            zIndex: 5,
          }}
          onMouseUp={(e) => handleInputPinMouseUp(e, pin.index)}
          title={pendingWire ? 'Click to connect' : 'Connect a wire here'}
        />
      ))}

      {/* Delete button when selected */}
      {selected && (
        <button
          type="button"
          style={{
            position: 'absolute',
            top: -10,
            right: -10,
            width: 18,
            height: 18,
            borderRadius: '50%',
            background: '#ef4444',
            color: 'white',
            border: '1px solid white',
            cursor: 'pointer',
            fontSize: 11,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
          }}
          onClick={(e) => {
            e.stopPropagation();
            removeGate(gate.id);
          }}
          title="Delete gate"
        >
          ×
        </button>
      )}

      {/* Toggle hint for INPUT gates */}
      {gate.type === 'INPUT' && (
        <div
          style={{
            position: 'absolute',
            bottom: -18,
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: 9,
            color: '#6b7280',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
          }}
        >
          click to toggle
        </div>
      )}
    </div>
  );
}

export { GATE_WIDTH, GATE_HEIGHT };
export type { GateType };
