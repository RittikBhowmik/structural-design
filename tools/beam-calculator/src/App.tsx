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
          <div className="flex items-center gap-3">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#171717">
              <path d="M12 2L2 22h20L12 2zm0 3.5L18.5 20H5.5L12 5.5z" />
            </svg>
            <span className="text-[15px] font-medium">Structural Design</span>
          </div>
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
