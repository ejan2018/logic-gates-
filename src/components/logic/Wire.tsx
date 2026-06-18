'use client';

import { Wire as WireType } from '@/lib/logic/types';
import { getGatePinPosition } from './GateSymbol';
import { useCircuitStore } from '@/store/circuitStore';

interface WireProps {
  wire: WireType;
  fromGateType: import('@/lib/logic/types').GateType;
  toGateType: import('@/lib/logic/types').GateType;
  fromX: number;
  fromY: number;
  fromGateId: string;
  fromGateX: number;
  fromGateY: number;
  toGateX: number;
  toGateY: number;
  signalValue: 0 | 1 | undefined;
}

export function Wire({
  wire,
  fromGateType,
  toGateType,
  fromGateX,
  fromGateY,
  toGateX,
  toGateY,
  signalValue,
}: WireProps) {
  const removeWire = useCircuitStore((s) => s.removeWire);

  const fromPos = getGatePinPosition(fromGateType, fromGateX, fromGateY, -1);
  const toPos = getGatePinPosition(toGateType, toGateX, toGateY, wire.toPinIndex);

  // Bezier control points — horizontal cable-like curve.
  const dx = Math.abs(toPos.x - fromPos.x);
  const cx1 = fromPos.x + dx * 0.5;
  const cy1 = fromPos.y;
  const cx2 = toPos.x - dx * 0.5;
  const cy2 = toPos.y;

  const path = `M ${fromPos.x} ${fromPos.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${toPos.x} ${toPos.y}`;
  const color = signalValue === 1 ? '#10b981' : '#9ca3af';
  const strokeWidth = signalValue === 1 ? 2.5 : 2;

  return (
    <g>
      {/* Wider invisible hit area for easier click-to-delete */}
      <path
        d={path}
        fill="none"
        stroke="transparent"
        strokeWidth={14}
        style={{ cursor: 'pointer' }}
        onClick={(e) => {
          e.stopPropagation();
          removeWire(wire.id);
        }}
      >
        <title>Click to delete wire</title>
      </path>
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        pointerEvents="none"
      />
      {/* Tiny dot at each end for visual clarity */}
      <circle cx={fromPos.x} cy={fromPos.y} r={3} fill={color} pointerEvents="none" />
      <circle cx={toPos.x} cy={toPos.y} r={3} fill={color} pointerEvents="none" />
    </g>
  );
}
