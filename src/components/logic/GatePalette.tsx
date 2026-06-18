'use client';

import { PALETTE_ORDER, GATE_DEFINITIONS } from '@/lib/logic/gates';
import { GateType } from '@/lib/logic/types';
import { useCircuitStore } from '@/store/circuitStore';
import { GateSymbol } from './GateSymbol';
import { CIRCUIT_EXAMPLES } from '@/lib/logic/booleanLaws';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';

const CATEGORY_LABELS: Record<string, string> = {
  input: 'Inputs & Sources',
  gate: 'Logic Gates',
  output: 'Outputs',
};

export function GatePalette() {
  const addGate = useCircuitStore((s) => s.addGate);
  const loadCircuit = useCircuitStore((s) => s.loadCircuit);
  const clearCircuit = useCircuitStore((s) => s.clearCircuit);
  const circuit = useCircuitStore((s) => s.circuit);

  const handleAdd = (type: GateType) => {
    // Add at a random-ish offset so gates don't all stack.
    const offset = (circuit.gates.length % 8) * 30;
    addGate(type, 160 + offset, 160 + offset);
  };

  const handleLoadExample = (id: string) => {
    const example = CIRCUIT_EXAMPLES.find((e) => e.id === id);
    if (!example) return;
    try {
      const parsed = JSON.parse(example.circuit);
      loadCircuit(parsed);
    } catch {
      // ignore
    }
  };

  // Group by category.
  const groups: { category: string; types: GateType[] }[] = [
    { category: 'input', types: [] },
    { category: 'gate', types: [] },
    { category: 'output', types: [] },
  ];
  for (const type of PALETTE_ORDER) {
    const def = GATE_DEFINITIONS[type];
    const g = groups.find((g) => g.category === def.category);
    if (g) g.types.push(type);
  }

  return (
    <div className="flex flex-col gap-3">
      <Accordion type="multiple" defaultValue={['palette', 'examples']} className="w-full">
        <AccordionItem value="palette">
          <AccordionTrigger className="text-sm font-semibold px-2">Gate Palette</AccordionTrigger>
          <AccordionContent className="px-2">
            <div className="flex flex-col gap-3">
              {groups.map((group) => (
                <div key={group.category}>
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">
                    {CATEGORY_LABELS[group.category]}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {group.types.map((type) => {
                      const def = GATE_DEFINITIONS[type];
                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => handleAdd(type)}
                          className="group flex flex-col items-center gap-1 p-2 rounded-md border border-border bg-card hover:bg-accent hover:border-primary/40 transition-colors cursor-pointer"
                          title={def.description}
                        >
                          <div className="flex items-center justify-center h-[60px]">
                            <GateSymbol type={type} width={70} height={50} />
                          </div>
                          <span className="text-[11px] font-medium">{def.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="examples">
          <AccordionTrigger className="text-sm font-semibold px-2">Examples</AccordionTrigger>
          <AccordionContent className="px-2">
            <div className="flex flex-col gap-2">
              {CIRCUIT_EXAMPLES.map((ex) => (
                <button
                  key={ex.id}
                  type="button"
                  onClick={() => handleLoadExample(ex.id)}
                  className="text-left p-2.5 rounded-md border border-border bg-card hover:bg-accent transition-colors"
                >
                  <div className="text-sm font-semibold">{ex.name}</div>
                  <div className="text-[11px] text-muted-foreground">{ex.description}</div>
                </button>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => clearCircuit()}
                className="mt-1 text-destructive border-destructive/30 hover:bg-destructive/5"
              >
                Clear Canvas
              </Button>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
