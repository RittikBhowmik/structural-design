import { useMemo, type ReactNode } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import type { MathStep } from '../lib/beam';

// ---------------- KaTeX ----------------
export function Tex({ tex, block = true }: { tex: string; block?: boolean }) {
  const html = useMemo(
    () =>
      katex.renderToString(tex, {
        displayMode: block,
        throwOnError: false,
        strict: false,
      }),
    [tex, block],
  );
  return (
    <span
      className={block ? 'block overflow-x-auto py-1 text-[15px]' : ''}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export function MathSteps({ steps }: { steps: MathStep[] }) {
  return (
    <div className="space-y-5">
      {steps.map((s, i) => (
        <div key={i} className="rounded-md border border-neutral-200 bg-neutral-50 px-5 py-4">
          <h4 className="text-sm font-semibold text-neutral-900">{s.title}</h4>
          {s.note && <p className="mt-0.5 text-xs italic text-neutral-500">{s.note}</p>}
          <div className="mt-2 space-y-1">
            {s.latex.map((l, j) => (
              <Tex key={j} tex={l} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------- layout primitives ----------------
export function Card({ title, children, actions }: { title?: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <section className="rounded-md border border-neutral-200 bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
      {(title || actions) && (
        <div className="mb-5 flex items-center justify-between gap-4">
          {title && <h2 className="text-lg font-medium text-neutral-900">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function Field({
  label, value, onChange, hint, step = 1, min, unit,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  hint?: string;
  step?: number;
  min?: number;
  unit?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[13px] font-medium text-neutral-900">
        {label}
        {unit && <span className="ml-1 font-normal text-neutral-400">({unit})</span>}
      </label>
      <input
        type="number"
        value={Number.isFinite(value) ? value : ''}
        step={step}
        min={min}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="w-full rounded border border-neutral-200 bg-white px-3.5 py-2.5 font-mono text-sm text-neutral-900 outline-none transition focus:border-neutral-900 focus:ring-[3px] focus:ring-neutral-900/10"
      />
      {hint && <span className="text-xs text-neutral-400">{hint}</span>}
    </div>
  );
}

export function ResultTile({
  label, value, unit, warn,
}: { label: string; value: string; unit?: string; warn?: boolean }) {
  return (
    <div className={`rounded border px-4 py-3 ${warn ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-200 bg-neutral-50'}`}>
      <div className={`text-xs ${warn ? 'text-neutral-300' : 'text-neutral-500'}`}>{label}</div>
      <div className="mt-0.5 font-mono text-xl font-medium">
        {value}
        {unit && <span className={`ml-1 text-sm font-normal ${warn ? 'text-neutral-300' : 'text-neutral-400'}`}>{unit}</span>}
      </div>
    </div>
  );
}

export function DiagramPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-md border border-neutral-200 bg-white p-4">
      <h4 className="mb-2 text-[13px] font-medium text-neutral-700">{title}</h4>
      <div className="overflow-hidden rounded border border-neutral-100">{children}</div>
    </div>
  );
}

export function ExportButtons({ onLatex, onWord, onPdf }: { onLatex: () => void; onWord: () => void; onPdf: () => void }) {
  const base =
    'inline-flex items-center gap-2 rounded border border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium text-neutral-900 shadow-sm transition hover:bg-neutral-50 hover:border-neutral-400';
  return (
    <div className="flex flex-wrap gap-2.5">
      <button className={base} onClick={onLatex} title="Download a self-contained .tex file with pgfplots diagrams">
        <TexIcon /> LaTeX (.tex)
      </button>
      <button className={base} onClick={onWord} title="Download an MS Word document with diagrams and calculations">
        <DocIcon /> Word (.doc)
      </button>
      <button className={base} onClick={onPdf} title="Download a PDF report with diagrams and calculations">
        <PdfIcon /> PDF (.pdf)
      </button>
    </div>
  );
}

const TexIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4 5h16M12 5v14M7 19h10" strokeLinecap="round" />
  </svg>
);
const DocIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
    <path d="M14 3v6h6" />
  </svg>
);
const PdfIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
    <path d="M14 3v6h6M8 13h8M8 17h5" strokeLinecap="round" />
  </svg>
);
