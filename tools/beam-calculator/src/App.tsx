import { useState } from 'react';
import SimpleBeamTab from './components/SimpleBeamTab';
import ContinuousBeamTab from './components/ContinuousBeamTab';

type Tab = 'simple' | 'continuous';

export default function App() {
  const [tab, setTab] = useState<Tab>('simple');

  return (
    <div className="min-h-screen bg-neutral-50 font-sans text-neutral-900 antialiased">
      {/* header */}
      <header className="sticky top-0 z-50 border-b border-neutral-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <a href="../../../index.html" className="flex items-center gap-3 text-neutral-900 no-underline">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-[#0070F3]">
              <svg width="18" height="18" viewBox="0 0 512 512" fill="white" aria-hidden="true">
                <path d="M.2 468.9C2.7 493.1 23.1 512 48 512l96 0 320 0c26.5 0 48-21.5 48-48l0-96c0-26.5-21.5-48-48-48l-48 0 0 80c0 8.8-7.2 16-16 16s-16-7.2-16-16l0-80-64 0 0 80c0 8.8-7.2 16-16 16s-16-7.2-16-16l0-80-80 0c-8.8 0-16-7.2-16-16s7.2-16 16-16l80 0 0-64-80 0c-8.8 0-16-7.2-16-16s7.2-16 16-16l80 0 0-64-80 0c-8.8 0-16-7.2-16-16s7.2-16 16-16l80 0 0-48c0-26.5-21.5-48-48-48L48 0C21.5 0 0 21.5 0 48L0 368l0 96c0 1.7 .1 3.3 .2 4.9z" />
              </svg>
            </div>
            <span className="text-[15px] font-medium">Beam Calculator</span>
          </a>
          <span className="hidden text-xs text-neutral-400 sm:block">
            AISC Beam Diagrams &amp; Formulas · ASD
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-24 pt-12">
        <h1 className="text-4xl font-medium tracking-tight">Beam Design Calculator</h1>
        <p className="mt-2 max-w-2xl text-[15px] text-neutral-500">
          AISC-based beam analysis with shear, moment and deflection diagrams, continuous-beam
          tables, and calculation exports to LaTeX, MS Word, and PDF.
        </p>

        {/* tabs */}
        <div className="mt-8 flex gap-1 border-b border-neutral-200">
          {(
            [
              ['simple', 'Simple Beam'],
              ['continuous', 'Continuous Beam'],
            ] as [Tab, string][]
          ).map(([t, label]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`-mb-px px-5 py-3 text-sm transition ${
                tab === t
                  ? 'border-b-2 border-neutral-900 font-medium text-neutral-900'
                  : 'border-b-2 border-transparent text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-8">
          <div className={tab === 'simple' ? '' : 'hidden'}>
            <SimpleBeamTab />
          </div>
          <div className={tab === 'continuous' ? '' : 'hidden'}>
            <ContinuousBeamTab />
          </div>
        </div>

        <footer className="mt-16 border-t border-neutral-200 pt-6 text-xs leading-relaxed text-neutral-400">
          <p>
            References: AISC <em>Steel Construction Manual</em>, Table 3-23 “Beam Diagrams and
            Formulas” and continuous-beam coefficient tables; three-moment (Clapeyron) equation for
            unequal spans. Allowable bending stress F<sub>b</sub> = 0.66F<sub>y</sub> (ASD, compact
            laterally-braced sections). Deflections by double integration of M/EI.
          </p>
          <p className="mt-2">
            For preliminary design use only — verify with a licensed structural engineer.
          </p>
        </footer>
      </main>
    </div>
  );
}
