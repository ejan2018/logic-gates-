'use client';

import { useMemo, useState } from 'react';
import {
  KMapSize,
  getKMapConfig,
  truthTableToKMap,
  simplifyKMap,
  cellToMinterm,
  mintermToTerm,
} from '@/lib/logic/kmap';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Sparkles, RotateCcw, Lightbulb } from 'lucide-react';

const GROUP_COLORS = [
  '#0ea5e9', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#14b8a6', '#f97316',
];

export function KarnaughMap() {
  const [size, setSize] = useState<KMapSize>(3);
  const [grid, setGrid] = useState<number[][]>(() => {
    const cfg = getKMapConfig(3);
    return Array.from({ length: cfg.rows }, () => Array(cfg.cols).fill(0));
  });
  const [expression, setExpression] = useState('A·B + B̄·C');
  const [showSolution, setShowSolution] = useState(false);

  const cfg = useMemo(() => getKMapConfig(size), [size]);

  // Regenerate grid when size changes
  const handleSizeChange = (newSize: KMapSize) => {
    newSize = Number(newSize) as KMapSize;
    setSize(newSize);
    const newCfg = getKMapConfig(newSize);
    setGrid(Array.from({ length: newCfg.rows }, () => Array(newCfg.cols).fill(0)));
    setShowSolution(false);
  };

  const toggleCell = (r: number, c: number) => {
    setGrid((g) => {
      const ng = g.map((row) => [...row]);
      ng[r][c] = ng[r][c] === 1 ? 0 : 1;
      return ng;
    });
    setShowSolution(false);
  };

  const handleClear = () => {
    setGrid(Array.from({ length: cfg.rows }, () => Array(cfg.cols).fill(0)));
    setShowSolution(false);
  };

  const handleFillRandom = () => {
    setGrid(
      Array.from({ length: cfg.rows }, () =>
        Array.from({ length: cfg.cols }, () => (Math.random() > 0.5 ? 1 : 0)),
      ),
    );
    setShowSolution(false);
  };

  const solution = useMemo(() => {
    if (!showSolution) return null;
    return simplifyKMap(size, grid, cfg.variables);
  }, [showSolution, size, grid, cfg.variables]);

  const handleLoadFromExpression = () => {
    try {
      const n = 1 << size;
      const truthTable: number[] = [];
      // Reuse the eval function from kmap.ts via dynamic import would be async; instead inline simple parser
      const vars = cfg.variables;
      const normalize = (s: string) => {
        let out = s
          .replace(/·/g, '&&')
          .replace(/\*/g, '&&')
          .replace(/\+/g, '||')
          .replace(/¬/g, '!')
          .replace(/\s/g, '');
        const overbarMap: Record<string, string> = {
          Ā: '!A', B̄: '!B', C̄: '!C', D̄: '!D',
        };
        for (const [k, v] of Object.entries(overbarMap)) {
          out = out.split(k).join(v);
        }
        return out;
      };
      const normalized = normalize(expression);
      for (let combo = 0; combo < n; combo++) {
        const scope: Record<string, boolean> = {};
        for (let i = 0; i < vars.length; i++) {
          const bit = (combo >> (vars.length - 1 - i)) & 1;
          scope[vars[i]] = bit === 1;
        }
        let jsExpr = normalized;
        for (const v of vars) {
          jsExpr = jsExpr.replace(new RegExp(`\\b${v}\\b`, 'g'), `scope.${v}`);
        }
         
        const val = new Function('scope', `return (${jsExpr}) ? 1 : 0;`)(scope);
        truthTable.push(val);
      }
      setGrid(truthTableToKMap(size, truthTable));
      setShowSolution(false);
    } catch {
      // ignore
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 w-full">
      {/* Main K-map */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <span className="w-6 h-6 rounded-md bg-primary/15 text-primary flex items-center justify-center text-xs font-bold">K</span>
            Karnaugh Map — {size} variables ({cfg.variables.join(', ')})
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {/* Controls */}
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <Label className="text-xs">Variables</Label>
              <Select value={String(size)} onValueChange={(v) => handleSizeChange(Number(v) as KMapSize)}>
                <SelectTrigger className="h-8 w-32 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">2 variables (A,B)</SelectItem>
                  <SelectItem value="3">3 variables (A,B,C)</SelectItem>
                  <SelectItem value="4">4 variables (A,B,C,D)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="button" size="sm" variant="outline" onClick={handleFillRandom}>
              <Sparkles className="h-3.5 w-3.5 mr-1" />
              Random
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={handleClear}>
              <RotateCcw className="h-3.5 w-3.5 mr-1" />
              Clear
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => setShowSolution(true)}
              className="bg-primary"
            >
              <Lightbulb className="h-3.5 w-3.5 mr-1" />
              Solve
            </Button>
          </div>

          {/* The K-map grid */}
          <div className="overflow-x-auto">
            <div className="inline-block">
              {/* Column header */}
              <div
                className="grid items-end gap-1 mb-1"
                style={{ gridTemplateColumns: `60px repeat(${cfg.cols}, minmax(56px, 1fr))` }}
              >
                <div className="text-[11px] text-muted-foreground text-right pr-2 font-mono">
                  {cfg.variables.slice(0, size === 2 ? 1 : 2).join('')} ↓ /{' '}
                  {cfg.variables.slice(size === 2 ? 1 : 2).join('')} →
                </div>
                {cfg.colLabels.map((c) => (
                  <div
                    key={c}
                    className="text-center text-xs font-mono font-semibold py-1.5 bg-muted/40 rounded"
                  >
                    {c}
                  </div>
                ))}
              </div>

              {/* Rows */}
              {cfg.rowLabels.map((rowLabel, r) => (
                <div
                  key={r}
                  className="grid items-stretch gap-1 mb-1"
                  style={{ gridTemplateColumns: `60px repeat(${cfg.cols}, minmax(56px, 1fr))` }}
                >
                  <div className="text-center text-xs font-mono font-semibold py-2 bg-muted/40 rounded">
                    {rowLabel}
                  </div>
                  {cfg.colLabels.map((_, c) => {
                    const minterm = cellToMinterm(size, r, c);
                    const val = grid[r]?.[c] ?? 0;
                    // Find which group this cell belongs to (if solving)
                    let groupColor = '';
                    let groupIdx = -1;
                    if (solution) {
                      for (let gi = 0; gi < solution.groups.length; gi++) {
                        const g = solution.groups[gi];
                        if (g.cells.some((cell) => cell.row === r && cell.col === c)) {
                          groupColor = GROUP_COLORS[gi % GROUP_COLORS.length];
                          groupIdx = gi;
                          break;
                        }
                      }
                    }
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => toggleCell(r, c)}
                        title={`Minterm m${minterm} = ${mintermToTerm(size, minterm, cfg.variables)}`}
                        className="aspect-square min-h-[56px] flex flex-col items-center justify-center rounded-md border-2 transition-all hover:scale-[1.04] hover:z-10 relative"
                        style={{
                          background: val
                            ? groupColor
                              ? `${groupColor}30`
                              : '#10b98120'
                            : 'white',
                          borderColor: groupColor || (val ? '#10b98180' : '#e5e7eb'),
                          borderWidth: groupColor ? 2.5 : 1.5,
                        }}
                      >
                        <span className={`text-2xl font-bold ${val ? 'text-primary' : 'text-muted-foreground'}`}>
                          {val}
                        </span>
                        <span className="text-[9px] text-muted-foreground font-mono mt-0.5">
                          m{minterm}
                        </span>
                        {groupIdx >= 0 && (
                          <span
                            className="absolute top-0.5 right-1 text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center text-white"
                            style={{ background: groupColor }}
                          >
                            {groupIdx + 1}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          <div className="text-[11px] text-muted-foreground">
            💡 Click any cell to toggle between 0 and 1. The minterm number is shown in the corner.
            Adjacent cells (including wrap-around) differ by exactly one variable.
          </div>
        </CardContent>
      </Card>

      {/* Solution + expression input */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Solver</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div>
            <Label className="text-xs">Load from expression</Label>
            <div className="flex gap-2 mt-1">
              <Input
                value={expression}
                onChange={(e) => setExpression(e.target.value)}
                placeholder="e.g. A·B + B̄·C"
                className="font-mono text-sm h-8"
                onKeyDown={(e) => e.key === 'Enter' && handleLoadFromExpression()}
              />
              <Button type="button" size="sm" onClick={handleLoadFromExpression} className="h-8">
                Load
              </Button>
            </div>
            <div className="text-[10px] text-muted-foreground mt-1">
              Use · or * for AND, + for OR, and Ā / ¬A for NOT
            </div>
          </div>

          <Separator />

          {solution ? (
            <div className="flex flex-col gap-3">
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">
                  Simplified Expression
                </div>
                <div className="font-mono text-base font-bold text-primary p-3 rounded-md bg-primary/8 border border-primary/20 break-words">
                  F = {solution.expression}
                </div>
              </div>

              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">
                  Groups ({solution.groups.length})
                </div>
                <div className="flex flex-col gap-1.5">
                  {solution.groups.map((g, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 p-2 rounded-md border border-border bg-muted/30"
                    >
                      <span
                        className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                        style={{ background: GROUP_COLORS[i % GROUP_COLORS.length] }}
                      >
                        {i + 1}
                      </span>
                      <div className="text-xs">
                        <div className="font-mono font-semibold">{g.term || '1'}</div>
                        <div className="text-muted-foreground">Group of {g.size}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-xs text-muted-foreground italic">
              Click <strong>Solve</strong> to simplify the current K-map configuration.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
