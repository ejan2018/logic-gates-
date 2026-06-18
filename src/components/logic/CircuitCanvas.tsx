'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useCircuitStore } from '@/store/circuitStore';
import { GateNode } from './GateNode';
import { Wire } from './Wire';
import { GATE_DEFINITIONS, GATE_WIDTH, GATE_HEIGHT } from '@/lib/logic/gates';
import { getGatePinPosition } from './GateSymbol';

interface CircuitCanvasProps {
  /** Width of the canvas in pixels (the SVG drawing area). */
  width?: number;
  /** Height of the canvas in pixels. */
  height?: number;
}

const GRID_SIZE = 20;

export function CircuitCanvas({ width = 1200, height = 800 }: CircuitCanvasProps) {
  const circuit = useCircuitStore((s) => s.circuit);
  const signalValues = useCircuitStore((s) => s.signalValues);
  const pendingWire = useCircuitStore((s) => s.pendingWire);
  const draggingGate = useCircuitStore((s) => s.draggingGate);
  const moveGate = useCircuitStore((s) => s.moveGate);
  const stopDragGate = useCircuitStore((s) => s.stopDragGate);
  const cancelPendingWire = useCircuitStore((s) => s.cancelPendingWire);
  const updatePendingWireMouse = useCircuitStore((s) => s.updatePendingWireMouse);
  const selectGate = useCircuitStore((s) => s.selectGate);
  const selectedGateId = useCircuitStore((s) => s.selectedGateId);
  const runSimulation = useCircuitStore((s) => s.runSimulation);
  const clockRunning = useCircuitStore((s) => s.clockRunning);
  const setClockRunning = useCircuitStore((s) => s.setClockRunning);
  const toggleClock = useCircuitStore((s) => s.toggleClock);
  const clockTick = useCircuitStore((s) => s.clockTick);

  const containerRef = useRef<HTMLDivElement>(null);

  // Run simulation on mount and whenever circuit changes (wires added/removed).
  useEffect(() => {
    runSimulation();
  }, [circuit, runSimulation]);

  // Clock auto-tick when running.
  useEffect(() => {
    if (!clockRunning) return;
    const interval = setInterval(() => {
      toggleClock();
    }, 800);
    return () => clearInterval(interval);
  }, [clockRunning, toggleClock]);

  // Convert a mouse event to canvas coordinates (relative to container's top-left).
  const toCanvasCoords = (e: { clientX: number; clientY: number }) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  // Global mouse handlers (drag a gate or update pending wire preview).
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const coords = toCanvasCoords(e);
      if (draggingGate) {
        // Constrain within canvas bounds.
        const newX = Math.max(0, Math.min(width - GATE_WIDTH, coords.x - draggingGate.offsetX));
        const newY = Math.max(0, Math.min(height - GATE_HEIGHT, coords.y - draggingGate.offsetY));
        moveGate(draggingGate.id, newX, newY);
        runSimulation();
      } else if (pendingWire) {
        updatePendingWireMouse(coords.x, coords.y);
      }
    };
    const handleMouseUp = (e: MouseEvent) => {
      if (draggingGate) {
        stopDragGate();
      }
      // If user released on empty canvas while drawing a wire, cancel.
      if (pendingWire) {
        // Check if the target is a pin (handled in GateNode via onMouseUp).
        // If not, cancel after a tick — the pin's onMouseUp will fire first.
        const target = e.target as HTMLElement;
        if (!target.closest('[data-gate-id]')) {
          cancelPendingWire();
        }
      }
    };
    if (draggingGate || pendingWire) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
    return;
  }, [draggingGate, pendingWire, moveGate, stopDragGate, runSimulation, updatePendingWireMouse, cancelPendingWire, width, height]);

  // Click on empty canvas deselects and cancels pending wire.
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    // Only fire when clicking the canvas background itself.
    if (e.target === e.currentTarget) {
      if (pendingWire) {
        cancelPendingWire();
      } else {
        selectGate(null);
      }
    }
  };

  // Build wire list — precompute from gate positions.
  const gateById = useMemo(() => {
    const m = new Map<string, (typeof circuit.gates)[number]>();
    for (const g of circuit.gates) m.set(g.id, g);
    return m;
  }, [circuit.gates]);

  // Pending wire preview — compute start position.
  const pendingWireStart = pendingWire
    ? (() => {
        const fromGate = gateById.get(pendingWire.fromGateId);
        if (!fromGate) return null;
        const pos = getGatePinPosition(fromGate.type, fromGate.x, fromGate.y, -1);
        return pos;
      })()
    : null;

  return (
    <div
      ref={containerRef}
      onMouseDown={handleCanvasMouseDown}
      style={{
        position: 'relative',
        width,
        height,
        background: '#fafafa',
        backgroundImage:
          'radial-gradient(circle, #cbd5e1 1px, transparent 1px)',
        backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`,
        border: '1px solid #e5e7eb',
        borderRadius: 8,
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      {/* SVG layer for wires */}
      <svg
        width={width}
        height={height}
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      >
        {/* Wires (their <g> children set pointerEvents themselves) */}
        <g style={{ pointerEvents: 'all' }}>
          {circuit.wires.map((wire) => {
            const fromGate = gateById.get(wire.fromGateId);
            const toGate = gateById.get(wire.toGateId);
            if (!fromGate || !toGate) return null;
            return (
              <Wire
                key={wire.id}
                wire={wire}
                fromGateType={fromGate.type}
                toGateType={toGate.type}
                fromGateId={fromGate.id}
                fromGateX={fromGate.x}
                fromGateY={fromGate.y}
                toGateX={toGate.x}
                toGateY={toGate.y}
                signalValue={signalValues.get(wire.fromGateId)}
              />
            );
          })}

          {/* Pending wire preview */}
          {pendingWire && pendingWireStart && (
            <path
              d={`M ${pendingWireStart.x} ${pendingWireStart.y} L ${pendingWire.mouseX} ${pendingWire.mouseY}`}
              stroke="#f59e0b"
              strokeWidth={2}
              strokeDasharray="6 4"
              fill="none"
              pointerEvents="none"
            />
          )}
        </g>
      </svg>

      {/* Gate layer */}
      {circuit.gates.map((gate) => (
        <GateNode
          key={gate.id}
          gate={gate}
          value={signalValues.get(gate.id)}
          selected={selectedGateId === gate.id}
        />
      ))}

      {/* Empty-state hint */}
      {circuit.gates.length === 0 && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          <div style={{ color: '#94a3b8', fontSize: 16, textAlign: 'center' }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Empty canvas</div>
            <div style={{ fontSize: 13 }}>
              Click a gate in the left palette to add it, then drag from an output pin
              to an input pin to wire them together.
            </div>
          </div>
        </div>
      )}

      {/* Clock control badge */}
      {circuit.gates.some((g) => g.type === 'CLOCK') && (
        <div
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            display: 'flex',
            gap: 8,
            alignItems: 'center',
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: 6,
            padding: '6px 10px',
            fontSize: 12,
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            zIndex: 50,
          }}
        >
          <span style={{ fontWeight: 600 }}>Clock</span>
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: clockTick === 1 ? '#10b981' : '#9ca3af',
            }}
          />
          <button
            type="button"
            onClick={() => setClockRunning(!clockRunning)}
            style={{
              padding: '2px 8px',
              borderRadius: 4,
              border: '1px solid #cbd5e1',
              background: clockRunning ? '#fee2e2' : '#dcfce7',
              cursor: 'pointer',
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            {clockRunning ? 'Stop' : 'Run'}
          </button>
          <button
            type="button"
            onClick={toggleClock}
            style={{
              padding: '2px 8px',
              borderRadius: 4,
              border: '1px solid #cbd5e1',
              background: 'white',
              cursor: 'pointer',
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            Step
          </button>
        </div>
      )}
    </div>
  );
}
