import { useMemo, useState } from 'react';
import {
  analyzeContinuousBeam, fmt, PATTERN_LABELS,
  type ContinuousInputs, type ContPattern,
} from '../lib/beam';
import { exportLatex, exportPdf, exportWord, type ExportReport } from '../lib/exporters';
import { Card, DiagramPanel, ExportButtons, Field, MathSteps, ResultTile } from './ui';
import { ContinuousLoadingDiagram, CurveDiagram } from './diagrams';

export default function ContinuousBeamTab() {
  const [numSpans, setNumSpans] = useState(3);
  const [spans, setSpans] = useState<number[]>([20, 20, 20, 20, 20]);
  const [E, setE] = useState(29000);
  const [Fy, setFy] = useState(50);
  const [I, setI] = useState(500);
  const [d, setD] = useState(16);
  const [pattern, setPattern] = useState<ContPattern>('uniform-all');
  const [magnitude, setMagnitude] = useState(2);

  const activeSpans = spans.slice(0, numSpans);

  const results = useMemo(() => {
    if (activeSpans.some((s) => s <= 0) || E <= 0 || I <= 0 || magnitude === 0) return null;
    const inputs: ContinuousInputs = { spans: activeSpans, E, Fy, I, d, pattern, magnitude };
    try {
      return analyzeContinuousBeam(inputs);
    } catch {
      return null;
    }
  }, [numSpans, spans, E, Fy, I, d, pattern, magnitude]); // eslint-disable-line react-hooks/exhaustive-deps

  const supportsX = useMemo(() => {
    let acc = 0;
    return [0, ...activeSpans.map((s) => (acc += s))];
  }, [activeSpans]);

  const isPoint = pattern === 'point-center';

  const buildReport = (): ExportReport | null => {
    if (!results) return null;
    return {
      kind: 'continuous',
      title: 'Continuous Beam Calculation Report',
      subtitle: `${numSpans}-span continuous beam — ${PATTERN_LABELS[pattern]}`,
      inputRows: [
        ['Number of spans', `${numSpans}`],
        ...activeSpans.map((s, i): [string, string] => [`Span ${i + 1} length`, `${fmt(s)} ft`]),
        ['Modulus of elasticity, E', `${fmt(E, 0)} ksi`],
        ['Yield strength, Fy', `${fmt(Fy, 0)} ksi`],
        ['Moment of inertia, I', `${fmt(I, 1)} in⁴`],
        ['Section depth, d', `${fmt(d, 2)} in`],
        ['Load pattern', PATTERN_LABELS[pattern]],
        ['Load magnitude', `${fmt(magnitude)} ${isPoint ? 'kips' : 'kip/ft'}`],
      ],
      resultRows: [
        ...results.reactions.map((r, i): [string, string] => [
          `Reaction R${String.fromCharCode(65 + i)}`, `${fmt(r)} kips`,
        ]),
        ...results.supportMoments
          .map((m, i): [string, string] => [`Support moment M${String.fromCharCode(65 + i)}`, `${fmt(m)} kip-ft`])
          .filter((_, i) => i > 0 && i < results.supportMoments.length - 1),
        ['Max positive moment, M+', `${fmt(results.maxMpos)} kip-ft`],
        ['Max negative moment, M−', `${fmt(results.maxMneg)} kip-ft`],
        ['Max shear, Vmax', `${fmt(Math.abs(results.maxV))} kips`],
        ['Max deflection, Δmax', `${fmt(results.maxDefl, 4)} in  (L/${isFinite(results.deflRatio) ? fmt(results.deflRatio, 0) : '∞'})`],
        ['Bending stress, fb', `${fmt(results.fb)} ksi`],
        ['Allowable stress, Fb = 0.66Fy', `${fmt(results.Fb)} ksi`],
        ['Utilization ratio, fb/Fb', `${fmt(results.UR, 3)} — ${results.UR <= 1 ? 'OK' : 'NG'}`],
      ],
      steps: results.steps,
      diagrams: results.diagrams,
      canvasIds: { loading: 'cb-loading', shear: 'cb-shear', moment: 'cb-moment', defl: 'cb-defl' },
    };
  };

  const doExport = (fn: (r: ExportReport) => void) => {
    const r = buildReport();
    if (r) fn(r);
  };

  return (
    <div className="space-y-6">
      <Card title="Continuous Beam Configuration">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-neutral-900">Number of Spans</label>
            <select
              value={numSpans}
              onChange={(e) => setNumSpans(parseInt(e.target.value))}
              className="rounded border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none transition focus:border-neutral-900 focus:ring-[3px] focus:ring-neutral-900/10"
            >
              {[2, 3, 4, 5].map((n) => <option key={n} value={n}>{n} spans</option>)}
            </select>
          </div>
          <Field label="Elastic Modulus, E" unit="ksi" value={E} step={100} onChange={setE} hint="29,000 ksi for steel" />
          <Field label="Yield Strength, Fy" unit="ksi" value={Fy} step={1} onChange={setFy} hint="50 ksi for A992" />
          <Field label="Moment of Inertia, I" unit="in⁴" value={I} step={10} onChange={setI} />
          <Field label="Section Depth, d" unit="in" value={d} step={0.1} onChange={setD} />
        </div>

        <div className="mt-5">
          <div className="mb-2 text-[13px] font-medium text-neutral-900">
            Span Lengths <span className="font-normal text-neutral-400">(ft)</span>
          </div>
          <div className="flex flex-wrap gap-3">
            {activeSpans.map((s, i) => (
              <div key={i} className="flex flex-col gap-1">
                <span className="text-xs text-neutral-400">Span {i + 1}</span>
                <input
                  type="number"
                  value={s}
                  step={0.5}
                  min={1}
                  onChange={(e) =>
                    setSpans((prev) => prev.map((v, j) => (j === i ? parseFloat(e.target.value) || 0 : v)))
                  }
                  className="w-24 rounded border border-neutral-200 bg-white px-3 py-2 font-mono text-sm text-neutral-900 outline-none transition focus:border-neutral-900 focus:ring-[3px] focus:ring-neutral-900/10"
                />
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-neutral-400">
            Equal spans reproduce the AISC continuous-beam coefficients (e.g., M⁻ = 0.100wL² for three equal spans);
            unequal spans are solved with the three-moment equation.
          </p>
        </div>
      </Card>

      <Card title="Loading (AISC Continuous-Beam Cases)">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-neutral-900">Load Pattern</label>
            <select
              value={pattern}
              onChange={(e) => setPattern(e.target.value as ContPattern)}
              className="rounded border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none transition focus:border-neutral-900 focus:ring-[3px] focus:ring-neutral-900/10"
            >
              {(Object.keys(PATTERN_LABELS) as ContPattern[]).map((p) => (
                <option key={p} value={p}>{PATTERN_LABELS[p]}</option>
              ))}
            </select>
          </div>
          <Field
            label="Load Magnitude"
            unit={isPoint ? 'kips' : 'kip/ft'}
            value={magnitude}
            step={0.5}
            onChange={setMagnitude}
            hint={isPoint ? 'Concentrated load at midspan of each loaded span' : 'Uniform load intensity on loaded spans'}
          />
        </div>
      </Card>

      {results ? (
        <>
          <Card title="Results" actions={<ExportButtons onLatex={() => doExport(exportLatex)} onWord={() => doExport(exportWord)} onPdf={() => doExport(exportPdf)} />}>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              <ResultTile label="Max +Moment" value={fmt(results.maxMpos)} unit="k-ft" />
              <ResultTile label="Max −Moment (support)" value={fmt(results.maxMneg)} unit="k-ft" />
              <ResultTile label="Max Shear Vmax" value={fmt(Math.abs(results.maxV))} unit="kips" />
              <ResultTile
                label="Max Deflection"
                value={fmt(results.maxDefl, 4)}
                unit={`in (L/${isFinite(results.deflRatio) ? fmt(results.deflRatio, 0) : '∞'})`}
              />
              <ResultTile label="Bending Stress fb" value={fmt(results.fb)} unit="ksi" />
              <ResultTile label="Allowable Fb = 0.66Fy" value={fmt(results.Fb)} unit="ksi" />
              <ResultTile
                label="Reactions"
                value={results.reactions.map((r) => fmt(r, 1)).join(' / ')}
                unit="kips"
              />
              <ResultTile
                label={`Utilization fb/Fb — ${results.UR <= 1 ? 'OK' : 'NG'}`}
                value={fmt(results.UR, 3)}
                warn={results.UR > 1}
              />
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
              <DiagramPanel title="Beam Loading Diagram">
                <ContinuousLoadingDiagram
                  id="cb-loading"
                  spans={activeSpans}
                  pattern={pattern}
                  magnitude={magnitude}
                  loaded={results.spanLoaded}
                />
              </DiagramPanel>
              <DiagramPanel title="Shear Force Diagram, V (kips)">
                <CurveDiagram id="cb-shear" x={results.diagrams.x} values={results.diagrams.V} unit="V (kips)" supports={supportsX} />
              </DiagramPanel>
              <DiagramPanel title="Bending Moment Diagram, M (kip-ft)">
                <CurveDiagram id="cb-moment" x={results.diagrams.x} values={results.diagrams.M} unit="M (k-ft)" supports={supportsX} />
              </DiagramPanel>
              <DiagramPanel title="Deflection Diagram, Δ (in)">
                <CurveDiagram id="cb-defl" x={results.diagrams.x} values={results.diagrams.y} unit="Δ (in)" digits={4} supports={supportsX} />
              </DiagramPanel>
            </div>
          </Card>

          <Card title="Calculation Details — Three-Moment Method & AISC Coefficients">
            <MathSteps steps={results.steps} />
          </Card>
        </>
      ) : (
        <Card>
          <p className="py-4 text-center text-sm text-neutral-400">
            Enter positive span lengths, section properties, and a non-zero load magnitude to see results.
          </p>
        </Card>
      )}
    </div>
  );
}
