'use client';

import { GateType, SignalValue } from '@/lib/logic/types';
import { GATE_DEFINITIONS, GATE_WIDTH, GATE_HEIGHT } from '@/lib/logic/gates';

export interface GatePinPosition {
  x: number;
  y: number;
}

/**
 * Returns the canvas-space position of a pin for a gate at (gateX, gateY).
 * pinIndex < 0 means output pin, otherwise it's an input pin index.
 */
export function getGatePinPosition(
  type: GateType,
  gateX: number,
  gateY: number,
  pinIndex: number,
): GatePinPosition {
  const def = GATE_DEFINITIONS[type];
  if (pinIndex < 0) {
    // Output pin (right side).
    return { x: gateX + GATE_WIDTH, y: gateY + GATE_HEIGHT / 2 };
  }
  if (def.inputs === 1) {
    return { x: gateX, y: gateY + GATE_HEIGHT / 2 };
  }
  // 2 inputs: top and bottom
  if (pinIndex === 0) return { x: gateX, y: gateY + GATE_HEIGHT * 0.25 };
  return { x: gateX, y: gateY + GATE_HEIGHT * 0.75 };
}

interface GateSymbolProps {
  type: GateType;
  value?: SignalValue;
  label?: string;
  /** Width of the rendered SVG. */
  width?: number;
  /** Height of the rendered SVG. */
  height?: number;
  /** Whether the gate is currently selected. */
  selected?: boolean;
  /** Whether to show a clock-tick highlight (for CLOCK gates). */
  highlighted?: boolean;
}

/**
 * SVG rendering of an individual gate, sized to GATE_WIDTH x GATE_HEIGHT.
 * The SVG viewBox is GATE_WIDTH x GATE_HEIGHT so coordinates match the canvas.
 */
export function GateSymbol({
  type,
  value,
  label,
  width = GATE_WIDTH,
  height = GATE_HEIGHT,
  selected = false,
  highlighted = false,
}: GateSymbolProps) {
  // Colors
  const stroke = selected ? '#0ea5e9' : '#1f2937';
  const strokeWidth = selected ? 2.5 : 1.8;
  const fill = '#ffffff';
  const onColor = '#10b981'; // green-500
  const offColor = '#9ca3af'; // gray-400

  const commonProps = {
    stroke,
    strokeWidth,
    fill,
    strokeLinejoin: 'round' as const,
    strokeLinecap: 'round' as const,
  };

  const isOn = value === 1;

  const renderLabel = (text: string, x: number, y: number, color = '#111827', size = 11) => (
    <text
      x={x}
      y={y}
      fontSize={size}
      fontWeight={600}
      textAnchor="middle"
      dominantBaseline="middle"
      fill={color}
      style={{ pointerEvents: 'none', fontFamily: 'ui-monospace, monospace' }}
    >
      {text}
    </text>
  );

  if (type === 'INPUT') {
    // Switch: rounded rectangle with on/off state.
    const bgColor = isOn ? '#10b981' : '#e5e7eb';
    const fgColor = isOn ? '#ffffff' : '#6b7280';
    return (
      <svg width={width} height={height} viewBox={`0 0 ${GATE_WIDTH} ${GATE_HEIGHT}`}>
        {/* Output pin stub */}
        <line x1={GATE_WIDTH - 12} y1={GATE_HEIGHT / 2} x2={GATE_WIDTH} y2={GATE_HEIGHT / 2} stroke="#1f2937" strokeWidth={1.8} />
        <rect
          x={4}
          y={8}
          width={GATE_WIDTH - 16}
          height={GATE_HEIGHT - 16}
          rx={10}
          ry={10}
          fill={bgColor}
          stroke={stroke}
          strokeWidth={strokeWidth}
        />
        {renderLabel(isOn ? '1' : '0', GATE_WIDTH / 2 - 4, GATE_HEIGHT / 2, fgColor, 16)}
        {label && renderLabel(label, GATE_WIDTH / 2, GATE_HEIGHT + 14, '#374151', 11)}
      </svg>
    );
  }

  if (type === 'OUTPUT') {
    // LED circle.
    const ledColor = isOn ? '#22c55e' : '#cbd5e1';
    const ledGlow = isOn ? 'url(#ledGlow)' : 'none';
    return (
      <svg width={width} height={height} viewBox={`0 0 ${GATE_WIDTH} ${GATE_HEIGHT}`}>
        <defs>
          <radialGradient id="ledGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#86efac" stopOpacity="1" />
            <stop offset="60%" stopColor="#22c55e" stopOpacity="1" />
            <stop offset="100%" stopColor="#15803d" stopOpacity="1" />
          </radialGradient>
        </defs>
        {/* Input pin stub */}
        <line x1={0} y1={GATE_HEIGHT / 2} x2={12} y2={GATE_HEIGHT / 2} stroke="#1f2937" strokeWidth={1.8} />
        <circle
          cx={GATE_WIDTH / 2 + 6}
          cy={GATE_HEIGHT / 2}
          r={Math.min(GATE_WIDTH, GATE_HEIGHT) / 2 - 10}
          fill={ledGlow !== 'none' ? ledGlow : ledColor}
          stroke={stroke}
          strokeWidth={strokeWidth}
        />
        {isOn && (
          <circle cx={GATE_WIDTH / 2 + 6} cy={GATE_HEIGHT / 2} r={6} fill="#ffffff" opacity={0.7} />
        )}
        {label && renderLabel(label, GATE_WIDTH / 2 + 6, GATE_HEIGHT + 14, '#374151', 11)}
      </svg>
    );
  }

  if (type === 'HIGH' || type === 'LOW') {
    const v = type === 'HIGH' ? 1 : 0;
    const bg = v ? '#10b981' : '#9ca3af';
    return (
      <svg width={width} height={height} viewBox={`0 0 ${GATE_WIDTH} ${GATE_HEIGHT}`}>
        <line x1={GATE_WIDTH - 12} y1={GATE_HEIGHT / 2} x2={GATE_WIDTH} y2={GATE_HEIGHT / 2} stroke="#1f2937" strokeWidth={1.8} />
        <rect x={8} y={10} width={GATE_WIDTH - 20} height={GATE_HEIGHT - 20} rx={6} ry={6} fill={bg} stroke={stroke} strokeWidth={strokeWidth} />
        {renderLabel(String(v), GATE_WIDTH / 2 - 2, GATE_HEIGHT / 2, '#ffffff', 18)}
      </svg>
    );
  }

  if (type === 'CLOCK') {
    const bg = isOn ? '#10b981' : '#e5e7eb';
    const fg = isOn ? '#ffffff' : '#6b7280';
    return (
      <svg width={width} height={height} viewBox={`0 0 ${GATE_WIDTH} ${GATE_HEIGHT}`}>
        <line x1={GATE_WIDTH - 12} y1={GATE_HEIGHT / 2} x2={GATE_WIDTH} y2={GATE_HEIGHT / 2} stroke="#1f2937" strokeWidth={1.8} />
        <rect x={4} y={8} width={GATE_WIDTH - 16} height={GATE_HEIGHT - 16} rx={10} ry={10} fill={bg} stroke={stroke} strokeWidth={strokeWidth} />
        {/* Square wave icon */}
        <polyline
          points={`14,${GATE_HEIGHT / 2 + 8} 22,${GATE_HEIGHT / 2 + 8} 22,${GATE_HEIGHT / 2 - 8} 36,${GATE_HEIGHT / 2 - 8} 36,${GATE_HEIGHT / 2 + 8} 50,${GATE_HEIGHT / 2 + 8} 50,${GATE_HEIGHT / 2 - 8} 60,${GATE_HEIGHT / 2 - 8}`}
          fill="none"
          stroke={fg}
          strokeWidth={2}
        />
        {label && renderLabel(label, GATE_WIDTH / 2, GATE_HEIGHT + 14, '#374151', 11)}
      </svg>
    );
  }

  // Standard logic gates: AND, OR, NOT, NAND, NOR, XOR, XNOR
  // Body is drawn within a 50x50 area starting at x=10. Output pin extends to GATE_WIDTH.
  // Input pins extend from x=0 to x=10.
  const bodyX = 12;
  const bodyY = 5;
  const bodyW = 48;
  const bodyH = GATE_HEIGHT - 10;

  // Pin stub lines (input)
  const inputLines = [];
  const def = GATE_DEFINITIONS[type];
  if (def.inputs >= 1) {
    const y1 = def.inputs === 1 ? GATE_HEIGHT / 2 : GATE_HEIGHT * 0.25;
    inputLines.push(<line key="in0" x1={0} y1={y1} x2={bodyX} y2={y1} stroke="#1f2937" strokeWidth={1.8} />);
  }
  if (def.inputs >= 2) {
    const y2 = GATE_HEIGHT * 0.75;
    inputLines.push(<line key="in1" x1={0} y1={y2} x2={bodyX} y2={y2} stroke="#1f2937" strokeWidth={1.8} />);
  }
  // Output pin stub
  const outputLine = <line x1={bodyX + bodyW} y1={GATE_HEIGHT / 2} x2={GATE_WIDTH} y2={GATE_HEIGHT / 2} stroke="#1f2937" strokeWidth={1.8} />;

  // Body shapes (drawn within bodyX..bodyX+bodyW, bodyY..bodyY+bodyH)
  let bodyShape: React.ReactNode = null;
  let bubble: React.ReactNode = null;
  let extraXnorCurve: React.ReactNode = null;

  const hasBubble = type === 'NAND' || type === 'NOR' || type === 'XNOR' || type === 'NOT';
  const hasXorCurve = type === 'XOR' || type === 'XNOR';

  // Compute body shapes. The bubble sits to the right of the body and slightly
  // overlaps the output pin line.
  const bubbleR = 4;
  const bodyRight = hasBubble ? bodyX + bodyW - bubbleR * 2 + 2 : bodyX + bodyW;

  if (type === 'AND' || type === 'NAND') {
    // D-shape: left flat side, right semicircle.
    const path = `M ${bodyX} ${bodyY} L ${bodyX + bodyW / 2} ${bodyY} A ${bodyH / 2} ${bodyH / 2} 0 0 1 ${bodyX + bodyW / 2} ${bodyY + bodyH} L ${bodyX} ${bodyY + bodyH} Z`;
    bodyShape = <path d={path} {...commonProps} />;
  } else if (type === 'OR' || type === 'NOR') {
    // Shield shape: left curve in, right curve to a point.
    const path = `M ${bodyX} ${bodyY} Q ${bodyX + bodyW * 0.3} ${bodyY + bodyH / 2} ${bodyX} ${bodyY + bodyH} Q ${bodyX + bodyW * 0.5} ${bodyY + bodyH} ${bodyRight} ${bodyY + bodyH / 2} Q ${bodyX + bodyW * 0.5} ${bodyY} ${bodyX} ${bodyY} Z`;
    bodyShape = <path d={path} {...commonProps} />;
  } else if (type === 'XOR' || type === 'XNOR') {
    // Same as OR but with an extra curve to the left.
    const path = `M ${bodyX + 6} ${bodyY} Q ${bodyX + bodyW * 0.3 + 6} ${bodyY + bodyH / 2} ${bodyX + 6} ${bodyY + bodyH} Q ${bodyX + bodyW * 0.5 + 6} ${bodyY + bodyH} ${bodyRight} ${bodyY + bodyH / 2} Q ${bodyX + bodyW * 0.5 + 6} ${bodyY} ${bodyX + 6} ${bodyY} Z`;
    bodyShape = <path d={path} {...commonProps} />;
    extraXnorCurve = (
      <path
        d={`M ${bodyX} ${bodyY} Q ${bodyX + bodyW * 0.3} ${bodyY + bodyH / 2} ${bodyX} ${bodyY + bodyH}`}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    );
  } else if (type === 'NOT') {
    // Triangle with bubble.
    const path = `M ${bodyX} ${bodyY} L ${bodyX + bodyW - bubbleR * 2} ${bodyY + bodyH / 2} L ${bodyX} ${bodyY + bodyH} Z`;
    bodyShape = <path d={path} {...commonProps} />;
  }

  if (hasBubble) {
    const bubbleX = bodyRight + bubbleR;
    bubble = (
      <circle
        cx={bubbleX}
        cy={GATE_HEIGHT / 2}
        r={bubbleR}
        fill="#ffffff"
        stroke={stroke}
        strokeWidth={strokeWidth}
      />
    );
  }

  // Signal indicator: a small dot on the body showing the gate's current output value.
  const signalDot = isOn ? (
    <circle cx={bodyX + bodyW / 2} cy={GATE_HEIGHT / 2} r={3} fill={onColor} />
  ) : null;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${GATE_WIDTH} ${GATE_HEIGHT}`}>
      {inputLines}
      {bodyShape}
      {extraXnorCurve}
      {bubble}
      {outputLine}
      {signalDot}
      {label && renderLabel(label, GATE_WIDTH / 2, GATE_HEIGHT + 14, '#374151', 11)}
      {highlighted && (
        <rect x={0} y={0} width={GATE_WIDTH} height={GATE_HEIGHT} fill="none" stroke="#f59e0b" strokeWidth={2} strokeDasharray="4 2" />
      )}
    </svg>
  );
}
