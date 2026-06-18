'use client';

import { useMemo } from 'react';
import { useCircuitStore } from '@/store/circuitStore';
import { generateTruthTable, deriveBooleanExpression } from '@/lib/logic/simulator';
import { GATE_DEFINITIONS } from '@/lib/logic/gates';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';

export function InspectorPanel() {
  const circuit = useCircuitStore((s) => s.circuit);
  const selectedGateId = useCircuitStore((s) => s.selectedGateId);
  const setGateLabel = useCircuitStore((s) => s.setGateLabel);
  const setGateValue = useCircuitStore((s) => s.setGateValue);
  const removeGate = useCircuitStore((s) => s.removeGate);
  const signalValues = useCircuitStore((s) => s.signalValues);

  const selectedGate = useMemo(
    () => circuit.gates.find((g) => g.id === selectedGateId) ?? null,
    [circuit.gates, selectedGateId],
  );

  const truthTable = useMemo(() => generateTruthTable(circuit), [circuit]);

  const expressions = useMemo(() => {
    return circuit.gates
      .filter((g) => g.type === 'OUTPUT')
      .map((g) => ({
        id: g.id,
        label: g.label || 'OUT',
        expr: deriveBooleanExpression(circuit, g.id),
      }));
  }, [circuit]);

  return (
    <Accordion type="multiple" defaultValue={['selected', 'truth', 'expr']} className="w-full">
      <AccordionItem value="selected">
        <AccordionTrigger className="text-sm font-semibold px-2">Selected Gate</AccordionTrigger>
        <AccordionContent className="px-2">
          {!selectedGate ? (
            <div className="text-xs text-muted-foreground italic p-2">
              Click a gate on the canvas to inspect or edit it.
            </div>
          ) : (
            <div className="flex flex-col gap-3 p-1">
              <div>
                <div className="text-xs text-muted-foreground mb-1">Type</div>
                <div className="text-sm font-semibold">
                  {GATE_DEFINITIONS[selectedGate.type].label}
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  {GATE_DEFINITIONS[selectedGate.type].description}
                </div>
              </div>

              <div>
                <Label htmlFor="label" className="text-xs">Label</Label>
                <Input
                  id="label"
                  value={selectedGate.label ?? ''}
                  onChange={(e) => setGateLabel(selectedGate.id, e.target.value)}
                  placeholder="Optional label"
                  className="h-8 text-sm"
                />
              </div>

              {selectedGate.type === 'INPUT' && (
                <div>
                  <Label className="text-xs">Value</Label>
                  <div className="flex gap-2 mt-1">
                    <Button
                      type="button"
                      size="sm"
                      variant={(selectedGate.inputValue ?? 0) === 0 ? 'default' : 'outline'}
                      onClick={() => setGateValue(selectedGate.id, 0)}
                      className="h-7"
                    >
                      0
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={(selectedGate.inputValue ?? 0) === 1 ? 'default' : 'outline'}
                      onClick={() => setGateValue(selectedGate.id, 1)}
                      className="h-7"
                    >
                      1
                    </Button>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Output</span>
                <span className="font-mono font-semibold">
                  {signalValues.get(selectedGate.id) ?? 0}
                </span>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => removeGate(selectedGate.id)}
                className="text-destructive border-destructive/30 hover:bg-destructive/5"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                Delete Gate
              </Button>
            </div>
          )}
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="truth">
        <AccordionTrigger className="text-sm font-semibold px-2">
          Truth Table
          {truthTable.rows.length > 0 && (
            <span className="ml-auto text-[10px] text-muted-foreground mr-2">
              {truthTable.inputLabels.length} in · {truthTable.outputLabels.length} out
            </span>
          )}
        </AccordionTrigger>
        <AccordionContent className="px-2">
          {truthTable.inputLabels.length === 0 && truthTable.outputLabels.length === 0 ? (
            <div className="text-xs text-muted-foreground italic p-2">
              Add at least one Input gate and one Output gate to see a truth table.
            </div>
          ) : (
            <div className="overflow-auto max-h-72 rounded-md border border-border">
              <table className="w-full text-xs font-mono">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    {truthTable.inputLabels.map((l, i) => (
                      <th key={`in-${i}`} className="px-2 py-1 text-center font-semibold border-b border-border">
                        {l}
                      </th>
                    ))}
                    {truthTable.outputLabels.length > 0 && (
                      <th className="px-1 border-b border-border bg-border/30"></th>
                    )}
                    {truthTable.outputLabels.map((l, i) => (
                      <th key={`out-${i}`} className="px-2 py-1 text-center font-semibold border-b border-border text-primary">
                        {l}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {truthTable.rows.map((row, i) => {
                    const nIn = truthTable.inputLabels.length;
                    return (
                      <tr key={i} className="even:bg-muted/30">
                        {row.slice(0, nIn).map((v, j) => (
                          <td key={j} className="px-2 py-1 text-center">{v}</td>
                        ))}
                        {nIn > 0 && truthTable.outputLabels.length > 0 && (
                          <td className="px-1 text-muted-foreground/40">·</td>
                        )}
                        {row.slice(nIn).map((v, j) => (
                          <td key={j} className="px-2 py-1 text-center font-semibold text-primary">
                            {v}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="expr">
        <AccordionTrigger className="text-sm font-semibold px-2">Boolean Expressions</AccordionTrigger>
        <AccordionContent className="px-2">
          {expressions.length === 0 ? (
            <div className="text-xs text-muted-foreground italic p-2">
              Add an Output gate to derive its boolean expression.
            </div>
          ) : (
            <div className="flex flex-col gap-2 p-1">
              {expressions.map((e) => (
                <div key={e.id} className="rounded-md border border-border bg-muted/30 p-2">
                  <div className="text-[11px] font-semibold text-primary mb-0.5">{e.label} =</div>
                  <div className="text-xs font-mono break-words">{e.expr}</div>
                </div>
              ))}
            </div>
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
