'use client';

import { useState, useCallback } from 'react';
import { generateQuestionSet, Question } from '@/lib/logic/questions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dices, RefreshCw, Lightbulb, ChevronDown, ChevronUp } from 'lucide-react';

const TYPE_LABELS: Record<Question['type'], { label: string; color: string }> = {
  'design-circuit': { label: 'Design Circuit', color: 'bg-sky-100 text-sky-900 border-sky-200' },
  'truth-table': { label: 'Truth Table', color: 'bg-emerald-100 text-emerald-900 border-emerald-200' },
  'simplify-kmap': { label: 'K-Map Simplify', color: 'bg-violet-100 text-violet-900 border-violet-200' },
  'identify-gate': { label: 'Identify Gate', color: 'bg-amber-100 text-amber-900 border-amber-200' },
  'write-expression': { label: 'Write Expression', color: 'bg-rose-100 text-rose-900 border-rose-200' },
};

function QuestionCard({ question, number }: { question: Question; number: number }) {
  const [showHint, setShowHint] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const typeInfo = TYPE_LABELS[question.type];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="font-mono font-bold text-sm text-muted-foreground">#{number}</span>
            <Badge variant="outline" className={`text-[10px] ${typeInfo.color}`}>
              {typeInfo.label}
            </Badge>
          </div>
        </div>
        <CardTitle className="text-sm font-semibold leading-snug mt-1">
          {question.section}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-sm text-foreground/90">{question.prompt}</p>

        {question.expression && (
          <div className="font-mono text-sm bg-muted/40 border border-border rounded-md p-3 whitespace-pre-wrap break-words">
            {question.expression}
          </div>
        )}

        {/* For truth-table type, show a small table preview */}
        {question.type === 'truth-table' && question.truthTable && question.variables && (
          <TruthTablePreview
            truthTable={question.truthTable}
            variables={question.variables}
            hideOutput
          />
        )}

        {/* For write-expression type, show the full truth table */}
        {question.type === 'write-expression' && question.truthTable && question.variables && (
          <TruthTablePreview
            truthTable={question.truthTable}
            variables={question.variables}
            hideOutput
          />
        )}

        {/* Hint */}
        <div className="flex flex-col gap-1.5">
          <button
            type="button"
            onClick={() => setShowHint((s) => !s)}
            className="text-xs text-amber-700 dark:text-amber-400 flex items-center gap-1 self-start hover:underline"
          >
            <Lightbulb className="h-3.5 w-3.5" />
            {showHint ? 'Hide hint' : 'Show hint'}
            {showHint ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
          {showHint && question.hint && (
            <div className="text-xs p-2 rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 text-amber-900 dark:text-amber-200">
              {question.hint}
            </div>
          )}
        </div>

        {/* Reveal answer (only for identify-gate and write-expression) */}
        {question.expectedAnswer && (
          <div className="flex flex-col gap-1.5">
            <button
              type="button"
              onClick={() => setShowAnswer((s) => !s)}
              className="text-xs text-primary flex items-center gap-1 self-start hover:underline"
            >
              {showAnswer ? 'Hide answer' : 'Reveal answer'}
              {showAnswer ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
            {showAnswer && (
              <div className="text-sm p-2 rounded-md border border-primary/30 bg-primary/5 font-mono font-bold">
                {question.expectedAnswer}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TruthTablePreview({
  truthTable,
  variables,
  hideOutput,
}: {
  truthTable: number[];
  variables: string[];
  hideOutput?: boolean;
}) {
  const n = variables.length;
  const rows = 1 << n;
  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full text-xs font-mono">
        <thead className="bg-muted">
          <tr>
            {variables.map((v) => (
              <th key={v} className="px-2 py-1 text-center font-semibold border-b border-border">
                {v}
              </th>
            ))}
            {!hideOutput && (
              <th className="px-2 py-1 text-center font-semibold border-b border-border text-primary">F</th>
            )}
            <th className="px-2 py-1 text-center font-semibold border-b border-border text-muted-foreground">m</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }, (_, combo) => {
            const bits = combo
              .toString(2)
              .padStart(n, '0')
              .split('')
              .map((b) => parseInt(b, 10));
            return (
              <tr key={combo} className={combo % 2 === 0 ? 'bg-card' : 'bg-muted/30'}>
                {bits.map((b, i) => (
                  <td key={i} className="px-2 py-1 text-center">{b}</td>
                ))}
                {!hideOutput && (
                  <td className="px-2 py-1 text-center font-bold text-primary">
                    {truthTable[combo]}
                  </td>
                )}
                <td className="px-2 py-1 text-center text-muted-foreground">m{combo}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function QuestionGenerator() {
  const [questions, setQuestions] = useState<Question[]>(() => generateQuestionSet(6));

  const regenerate = useCallback(() => {
    setQuestions(generateQuestionSet(6));
  }, []);

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Header card */}
      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3 sm:items-center">
          <div className="flex-1">
            <div className="text-sm font-semibold flex items-center gap-2">
              <Dices className="h-4 w-4 text-primary" />
              Practice Problem Set
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Auto-generated questions covering circuit design, truth tables, K-map simplification, and more.
              Click <strong>Generate new set</strong> for fresh questions.
            </div>
          </div>
          <Button type="button" onClick={regenerate} className="self-start sm:self-auto">
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Generate new set
          </Button>
        </CardContent>
      </Card>

      {/* Question list */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {questions.map((q, i) => (
          <QuestionCard key={q.id} question={q} number={i + 1} />
        ))}
      </div>

      {/* Tip card */}
      <Card>
        <CardContent className="p-4 text-xs text-muted-foreground">
          <strong className="text-foreground">💡 How to use:</strong> Try solving each problem on paper
          or directly in the Circuit Simulator tab. For K-map problems, switch to the K-Map tab, set
          the matching variables, click the cells at the listed minterms, then click <strong>Solve</strong>
          to verify your answer. For circuit-design problems, build the circuit on the canvas and check
          the auto-generated truth table against your expected output.
        </CardContent>
      </Card>
    </div>
  );
}
