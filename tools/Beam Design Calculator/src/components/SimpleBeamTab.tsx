import { useMemo, useState } from 'react';
import {
  analyzeSimpleBeam, BEAM_TYPE_LABELS, fmt,
  type BeamType, type Load, type LoadType, type SimpleInputs,
} from '../lib/beam';
import { exportLatex, exportPdf, exportWord, type ExportReport } from '../lib/exporters';
import { Card, DiagramPanel, ExportButtons, Field, MathSteps, ResultTile } from './ui';
import { CurveDiagram, SimpleLoadingDiagram } from './diagrams';

const LOAD_TYPE_LABELS: Record<LoadType, string> = {
  point: 'Point Load',
  udl: 'Uniform Load (full span)',
  pudl: 'Partial Uniform Load',
  moment: 'Applied Moment',
};

const LOAD_UNITS: Record<LoadType, string> = {
  point: 'kips',
  udl: 'kip/ft',
  pudl: 'kip/ft',
  moment: 'kip-ft',
};

let nextId = 100;

export default function SimpleBeamTab() {
  const [beamType, setBeamType] = useState<BeamType>('simple');
  const [L, setL] = useState(20);
  const [E, setE] = useState(29000);
  const [Fy, setFy] = useState(50);
  const [I, setI] = useState(500);
  const [d, setD] = useState(16);
  const [loads, setLoads] = useState<Load[]>([
    { id: 1, type: 'udl', magnitude: 1.5, position: 10, start: 0, end: 20 },
  ]);

  const results = useMemo(() => {
    if (L <= 0 || E <= 0 || I <= 0) return null;
    const inputs: SimpleInputs = { beamType, L, E, Fy, I, d, loads };
    try {
      return analyzeSimpleBeam(inputs);
    } catch {
      return null;
    }
  }, [beamType, L, E, Fy, I, d, loads]);

  const updateLoad = (id: number, patch: Partial<Load>) =>
    setLoads((ls) => ls.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  const removeLoad = (id: number) => setLoads((ls) => (ls.length > 1 ? ls.filter((l) => l.id !== id) : ls));
  const addLoad = () =>
    setLoads((ls) => [
      ...ls,
      { id: nextId++, type: 'point', magnitude: 10, position: L / 2, start: 0, end: L },
    ]);

  const hasLoad = loads.some((l) => l.magnitude !== 0);

  const buildReport = (): ExportReport | null => {
    if (!results) return null;
    return {
      kind: 'simple',
      title: 'Beam Design Calculation Report',
      subtitle: `${BEAM_TYPE_LABELS[beamType]} beam, L = ${fmt(L)} ft`,
      inputRows: [
        ['Beam configuration', BEAM_TYPE_LABELS[beamType]],
        ['Span length, L', `${fmt(L)} ft`],
        ['Modulus of elasticity, E', `${fmt(E, 0)} ksi`],
        ['Yield strength, Fy', `${fmt(Fy, 0)} ksi`],
        ['Moment of inertia, I', `${fmt(I, 1)} in⁴`],
        ['Section depth, d', `${fmt(d, 2)} in`],
        ...loads.map((l, i): [string, string] => [
          `Load ${i + 1} — ${LOAD_TYPE_LABELS[l.type]}`,
          l.type === 'pudl'
            ? `${fmt(l.magnitude)} kip/ft from ${fmt(l.start)} ft to ${fmt(l.end)} ft`
            : l.type === 'udl'
              ? `${fmt(l.magnitude)} kip/ft over full span`
              : `${fmt(l.magnitude)} ${LOAD_UNITS[l.type]} at x = ${fmt(l.position)} ft`,
        ]),
      ],
      resultRows: [
        ['Reaction RA', `${fmt(results.RA)} kips`],
        ['Reaction RB', `${fmt(results.RB)} kips`],
        ...(beamType !== 'simple' ? [['Fixed-end moment MA', `${fmt(results.MA)} kip-ft`] as [string, string]] : []),
        ...(beamType === 'fixed' ? [['Fixed-end moment MB', `${fmt(results.MB)} kip-ft`] as [string, string]] : []),
        ['Max shear, Vmax', `${fmt(Math.abs(results.maxV))} kips`],
        ['Max positive moment, M+', `${fmt(results.maxMpos)} kip-ft`],
        ['Max negative moment, M−', `${fmt(results.maxMneg)} kip-ft`],
        ['Max deflection, Δmax', `${fmt(results.maxDefl, 4)} in  (L/${isFinite(results.deflRatio) ? fmt(results.deflRatio, 0) : '∞'})`],
        ['Bending stress, fb', `${fmt(results.fb)} ksi`],
        ['Allowable stress, Fb = 0.66Fy', `${fmt(results.Fb)} ksi`],
        ['Utilization ratio, fb/Fb', `${fmt(results.UR, 3)} — ${results.UR <= 1 ? 'OK' : 'NG'}`],
      ],
      steps: results.steps,
      diagrams: results.diagrams,
      canvasIds: { loading: 'sb-loading', shear: 'sb-shear', moment: 'sb-moment', defl: 'sb-defl' },
    };
  };

  const doExport = (fn: (r: ExportReport) => void) => {
    const r = buildReport();
    if (r) fn(r);
  };

  return (
    <div className="space-y-6">
      {/* configuration */}
      <Card title="Beam Configuration">
        <div className="mb-5">
          <div className="mb-2 text-[13px] font-medium text-neutral-900">Support Condition</div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(Object.keys(BEAM_TYPE_LABELS) as BeamType[]).map((bt) => (
              <button
                key={bt}
                onClick={() => setBeamType(bt)}
                className={`flex flex-col items-center gap-1.5 rounded border px-3 py-3 text-xs font-medium transition ${
                  beamType === bt
                    ? 'border-neutral-900 bg-neutral-900 text-white'
                    : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400'
                }`}
              >
                <BeamGlyph type={bt} active={beamType === bt} />
                {BEAM_TYPE_LABELS[bt]}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Field label="Span Length, L" unit="ft" value={L} step={0.5} min={0.5} onChange={setL} />
          <Field label="Elastic Modulus, E" unit="ksi" value={E} step={100} onChange={setE} hint="29,000 ksi for steel" />
          <Field label="Yield Strength, Fy" unit="ksi" value={Fy} step={1} onChange={setFy} hint="50 ksi for A992" />
          <Field label="Moment of Inertia, I" unit="in⁴" value={I} step={10} onChange={setI} hint="Strong-axis Ix" />
          <Field label="Section Depth, d" unit="in" value={d} step={0.1} onChange={setD} hint="For fb = M(d/2)/I" />
        </div>
      </Card>

      {/* loads */}
      <Card
        title="Loads"
        actions={
          <button
            onClick={addLoad}
            className="rounded border border-neutral-200 bg-white px-3 py-1.5 text-sm font-medium text-neutral-900 transition hover:border-neutral-400 hover:bg-neutral-50"
          >
            + Add Load
          </button>
        }
      >
        <div className="space-y-3">
          {loads.map((ld, i) => (
            <div key={ld.id} className="rounded border border-neutral-200 bg-neutral-50 p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[13px] font-medium text-neutral-900">Load {i + 1}</span>
                <button
                  onClick={() => removeLoad(ld.id)}
                  disabled={loads.length === 1}
                  className="text-xs text-neutral-400 transition hover:text-neutral-900 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Remove
                </button>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-medium text-neutral-900">Type</label>
                  <select
                    value={ld.type}
                    onChange={(e) => updateLoad(ld.id, { type: e.target.value as LoadType })}
                    className="rounded border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none transition focus:border-neutral-900 focus:ring-[3px] focus:ring-neutral-900/10"
                  >
                    {(Object.keys(LOAD_TYPE_LABELS) as LoadType[]).map((t) => (
                      <option key={t} value={t}>{LOAD_TYPE_LABELS[t]}</option>
                    ))}
                  </select>
                </div>
                <Field
                  label="Magnitude"
                  unit={LOAD_UNITS[ld.type]}
                  value={ld.magnitude}
                  step={0.5}
                  onChange={(v) => updateLoad(ld.id, { magnitude: v })}
                />
                {(ld.type === 'point' || ld.type === 'moment') && (
                  <Field
                    label="Position from A"
                    unit="ft"
                    value={ld.position}
                    step={0.5}
                    min={0}
                    onChange={(v) => updateLoad(ld.id, { position: Math.min(Math.max(v, 0), L) })}
                  />
                )}
                {ld.type === 'pudl' && (
                  <>
                    <Field label="Start" unit="ft" value={ld.start} step={0.5} min={0}
                      onChange={(v) => updateLoad(ld.id, { start: Math.min(Math.max(v, 0), L) })} />
                    <Field label="End" unit="ft" value={ld.end} step={0.5} min={0}
                      onChange={(v) => updateLoad(ld.id, { end: Math.min(Math.max(v, 0), L) })} />
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
        {beamType === 'cantilever' && (
          <p className="mt-3 text-xs text-neutral-400">
            Cantilever is fixed at A (left) and free at B (right). Positions are measured from the fixed end.
          </p>
        )}
      </Card>

      {/* results */}
      {results && hasLoad ? (
        <>
          <Card title="Results" actions={<ExportButtons onLatex={() => doExport(exportLatex)} onWord={() => doExport(exportWord)} onPdf={() => doExport(exportPdf)} />}>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              <ResultTile label="Max Shear Vmax" value={fmt(Math.abs(results.maxV))} unit="kips" />
              <ResultTile label="Max +Moment" value={fmt(results.maxMpos)} unit="k-ft" />
              <ResultTile label="Max −Moment" value={fmt(results.maxMneg)} unit="k-ft" />
              <ResultTile
                label="Max Deflection"
                value={fmt(results.maxDefl, 4)}
                unit={`in (L/${isFinite(results.deflRatio) ? fmt(results.deflRatio, 0) : '∞'})`}
              />
              <ResultTile label="Bending Stress fb" value={fmt(results.fb)} unit="ksi" />
              <ResultTile label="Allowable Fb = 0.66Fy" value={fmt(results.Fb)} unit="ksi" />
              <ResultTile label="Reactions RA / RB" value={`${fmt(results.RA)} / ${fmt(results.RB)}`} unit="kips" />
              <ResultTile
                label={`Utilization fb/Fb — ${results.UR <= 1 ? 'OK' : 'NG'}`}
                value={fmt(results.UR, 3)}
                warn={results.UR > 1}
              />
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
              <DiagramPanel title="Beam Loading Diagram">
                <SimpleLoadingDiagram id="sb-loading" beamType={beamType} L={L} loads={loads} />
              </DiagramPanel>
              <DiagramPanel title="Shear Force Diagram, V (kips)">
                <CurveDiagram id="sb-shear" x={results.diagrams.x} values={results.diagrams.V} unit="V (kips)" />
              </DiagramPanel>
              <DiagramPanel title="Bending Moment Diagram, M (kip-ft)">
                <CurveDiagram id="sb-moment" x={results.diagrams.x} values={results.diagrams.M} unit="M (k-ft)" />
              </DiagramPanel>
              <DiagramPanel title="Deflection Diagram, Δ (in)">
                <CurveDiagram id="sb-defl" x={results.diagrams.x} values={results.diagrams.y} unit="Δ (in)" digits={4} />
              </DiagramPanel>
            </div>
          </Card>

          <Card title="Calculation Details — AISC Beam Formulas">
            <MathSteps steps={results.steps} />
          </Card>
        </>
      ) : (
        <Card>
          <p className="py-4 text-center text-sm text-neutral-400">
            Enter a positive span, section properties, and at least one non-zero load to see results.
          </p>
        </Card>
      )}
    </div>
  );
}

// small support glyphs for the selector
function BeamGlyph({ type, active }: { type: BeamType; active: boolean }) {
  const s = active ? '#fff' : '#171717';
  return (
    <svg width="64" height="26" viewBox="0 0 64 26" fill="none" stroke={s} strokeWidth="2">
      <line x1="6" y1="8" x2="58" y2="8" strokeWidth="3" />
      {type === 'simple' && (
        <>
          <path d="M6 8 L1 18 L11 18 Z" fill={s} stroke="none" />
          <circle cx="58" cy="14" r="4" />
          <line x1="52" y1="19" x2="64" y2="19" strokeWidth="1.5" />
        </>
      )}
      {type === 'cantilever' && <path d="M6 1 L6 17 M6 3 l-5 4 M6 8 l-5 4 M6 13 l-5 4" strokeWidth="1.5" />}
      {type === 'fixed' && (
        <>
          <path d="M6 1 L6 17 M6 3 l-5 4 M6 8 l-5 4 M6 13 l-5 4" strokeWidth="1.5" />
          <path d="M58 1 L58 17 M58 3 l5 4 M58 8 l5 4 M58 13 l5 4" strokeWidth="1.5" />
        </>
      )}
      {type === 'propped' && (
        <>
          <path d="M6 1 L6 17 M6 3 l-5 4 M6 8 l-5 4 M6 13 l-5 4" strokeWidth="1.5" />
          <circle cx="58" cy="14" r="4" />
          <line x1="52" y1="19" x2="64" y2="19" strokeWidth="1.5" />
        </>
      )}
    </svg>
  );
}
