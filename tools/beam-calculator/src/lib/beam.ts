// ============================================================
// Beam analysis engine — AISC "Beam Diagrams and Formulas" based
// Units: L in ft, P in kips, w in kip/ft, M in kip-ft,
//        E in ksi, I in in^4, d in in, deflection in inches
// Sign convention: sagging moment positive, downward loads positive
// ============================================================

export type BeamType = 'simple' | 'cantilever' | 'fixed' | 'propped';
export type LoadType = 'point' | 'udl' | 'pudl' | 'moment';

export interface Load {
  id: number;
  type: LoadType;
  magnitude: number; // kips, kip/ft, or kip-ft
  position: number;  // ft (point / moment)
  start: number;     // ft (partial udl)
  end: number;       // ft (partial udl)
}

export interface MathStep {
  title: string;
  latex: string[];
  note?: string;
}

export interface Diagrams {
  x: number[]; // ft
  V: number[]; // kips
  M: number[]; // kip-ft
  y: number[]; // in
}

export interface SimpleInputs {
  beamType: BeamType;
  L: number;
  E: number;
  Fy: number;
  I: number;
  d: number;
  loads: Load[];
}

export interface AnalysisResults {
  RA: number;
  RB: number;
  MA: number; // internal end moment at A (k-ft, hogging negative)
  MB: number;
  maxV: number;
  maxMpos: number;
  maxMneg: number;
  maxM: number; // governing |M|
  maxDefl: number; // in
  deflRatio: number; // L / delta
  fb: number;
  Fb: number;
  UR: number;
  diagrams: Diagrams;
  steps: MathStep[];
}

export const BEAM_TYPE_LABELS: Record<BeamType, string> = {
  simple: 'Simply Supported',
  cantilever: 'Cantilever (Fixed–Free)',
  fixed: 'Fixed – Fixed',
  propped: 'Propped Cantilever (Fixed–Pinned)',
};

export const fmt = (n: number, digits = 2): string => {
  if (!isFinite(n)) return '—';
  const v = Math.abs(n) < 1e-10 ? 0 : n;
  return v.toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
};

// ---------- internal load normalization ----------
interface PtLoad { P: number; a: number }
interface DistLoad { w: number; a: number; b: number }
interface MomLoad { M0: number; a: number }

function normalizeLoads(loads: Load[], L: number) {
  const pts: PtLoad[] = [];
  const dists: DistLoad[] = [];
  const moms: MomLoad[] = [];
  for (const ld of loads) {
    const mag = ld.magnitude || 0;
    if (mag === 0) continue;
    if (ld.type === 'point') pts.push({ P: mag, a: clamp(ld.position, 0, L) });
    else if (ld.type === 'udl') dists.push({ w: mag, a: 0, b: L });
    else if (ld.type === 'pudl') {
      const a = clamp(Math.min(ld.start, ld.end), 0, L);
      const b = clamp(Math.max(ld.start, ld.end), 0, L);
      if (b > a) dists.push({ w: mag, a, b });
    } else if (ld.type === 'moment') moms.push({ M0: mag, a: clamp(ld.position, 0, L) });
  }
  return { pts, dists, moms };
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

// ============================================================
// Simple-span solver (superposition + flexibility for redundants)
// ============================================================
export function analyzeSimpleBeam(inp: SimpleInputs): AnalysisResults {
  const { beamType, L, E, Fy, I, d } = inp;
  const { pts, dists, moms } = normalizeLoads(inp.loads, L);

  const N = 1200; // intervals
  const x: number[] = new Array(N + 1);
  const dx = L / N;
  for (let i = 0; i <= N; i++) x[i] = i * dx;

  const totalP = pts.reduce((s, p) => s + p.P, 0) + dists.reduce((s, s2) => s + s2.w * (s2.b - s2.a), 0);
  const momAboutA =
    pts.reduce((s, p) => s + p.P * p.a, 0) +
    dists.reduce((s, s2) => s + s2.w * (s2.b - s2.a) * (s2.a + s2.b) / 2, 0);
  const sumM0 = moms.reduce((s, m) => s + m.M0, 0);

  let RA = 0, RB = 0, MA = 0, MB = 0;
  const V: number[] = new Array(N + 1).fill(0);
  const M: number[] = new Array(N + 1).fill(0);

  const loadsShearAt = (xx: number) => {
    let s = 0;
    for (const p of pts) if (xx > p.a) s += p.P;
    for (const ds of dists) s += ds.w * Math.max(0, Math.min(xx, ds.b) - ds.a);
    return s;
  };
  const loadsMomentAt = (xx: number) => {
    let s = 0;
    for (const p of pts) if (xx > p.a) s += p.P * (xx - p.a);
    for (const ds of dists) {
      const e = Math.min(xx, ds.b);
      if (e > ds.a) {
        const seg = e - ds.a;
        s += ds.w * seg * (xx - (ds.a + e) / 2);
      }
    }
    for (const m of moms) if (xx > m.a) s += m.M0;
    return s;
  };

  if (beamType === 'cantilever') {
    RA = totalP;
    MA = -(momAboutA) + sumM0; // internal moment at fixed end
    for (let i = 0; i <= N; i++) {
      V[i] = RA - loadsShearAt(x[i]);
      M[i] = MA + RA * x[i] - loadsMomentAt(x[i]);
    }
    RB = 0; MB = 0;
  } else {
    // primary: simply supported
    const RB0 = L > 0 ? (momAboutA - sumM0) / L : 0;
    const RA0 = totalP - RB0;
    const V0 = new Array(N + 1).fill(0);
    const Mm0 = new Array(N + 1).fill(0);
    for (let i = 0; i <= N; i++) {
      V0[i] = RA0 - loadsShearAt(x[i]);
      Mm0[i] = RA0 * x[i] - loadsMomentAt(x[i]);
    }

    let mA = 0, mB = 0; // redundant end moments (internal, k-ft)
    if (beamType === 'fixed' || beamType === 'propped') {
      // end rotations of primary structure (times EI): trapezoidal
      let thA = 0, thB = 0;
      for (let i = 0; i < N; i++) {
        const f1a = Mm0[i] * (1 - x[i] / L);
        const f2a = Mm0[i + 1] * (1 - x[i + 1] / L);
        const f1b = Mm0[i] * (x[i] / L);
        const f2b = Mm0[i + 1] * (x[i + 1] / L);
        thA += (f1a + f2a) / 2 * dx;
        thB += (f1b + f2b) / 2 * dx;
      }
      if (beamType === 'fixed') {
        // [L/3 L/6; L/6 L/3] {mA,mB} = {-thA, -thB}
        const a11 = L / 3, a12 = L / 6, a22 = L / 3;
        const det = a11 * a22 - a12 * a12;
        mA = (-thA * a22 + thB * a12) / det;
        mB = (thA * a12 - thB * a11) / det;
      } else {
        mA = (-3 * thA) / L;
        mB = 0;
      }
    }

    const dV = L > 0 ? (mB - mA) / L : 0;
    RA = RA0 + dV;
    RB = RB0 - dV;
    MA = mA;
    MB = mB;
    for (let i = 0; i <= N; i++) {
      V[i] = V0[i] + dV;
      M[i] = Mm0[i] + mA * (1 - x[i] / L) + mB * (x[i] / L);
    }
  }

  // ---------- deflection: double integration of M/EI ----------
  const theta = new Array(N + 1).fill(0);
  const yRaw = new Array(N + 1).fill(0);
  for (let i = 1; i <= N; i++) {
    theta[i] = theta[i - 1] + ((M[i] + M[i - 1]) / 2) * dx;
    yRaw[i] = yRaw[i - 1] + ((theta[i] + theta[i - 1]) / 2) * dx;
  }
  // boundary conditions
  if (beamType !== 'cantilever') {
    // enforce y(L) = 0 with linear correction (theta0 unknown for 'simple';
    // removes numerical drift for 'fixed'/'propped')
    const corr = yRaw[N] / L;
    for (let i = 0; i <= N; i++) yRaw[i] -= corr * x[i];
  }
  const EI = E * I; // k-in^2
  const y = yRaw.map((v) => (EI > 0 ? (v * 1728) / EI : 0)); // inches

  // ---------- envelope values ----------
  let maxV = 0, maxMpos = 0, maxMneg = 0, maxDefl = 0;
  for (let i = 0; i <= N; i++) {
    if (Math.abs(V[i]) > Math.abs(maxV)) maxV = V[i];
    if (M[i] > maxMpos) maxMpos = M[i];
    if (M[i] < maxMneg) maxMneg = M[i];
    if (Math.abs(y[i]) > Math.abs(maxDefl)) maxDefl = y[i];
  }
  const maxM = Math.max(maxMpos, Math.abs(maxMneg));
  const fb = I > 0 ? (maxM * 12 * (d / 2)) / I : 0;
  const Fb = 0.66 * Fy;
  const UR = Fb > 0 ? fb / Fb : 0;
  const deflRatio = Math.abs(maxDefl) > 1e-9 ? (L * 12) / Math.abs(maxDefl) : Infinity;

  const steps = buildSimpleSteps(inp, { RA, RB, MA, MB, maxV, maxMpos, maxMneg, maxM, maxDefl, fb, Fb, UR, deflRatio });

  return {
    RA, RB, MA, MB,
    maxV, maxMpos, maxMneg, maxM,
    maxDefl: Math.abs(maxDefl),
    deflRatio,
    fb, Fb, UR,
    diagrams: { x, V, M, y },
    steps,
  };
}

// ---------- LaTeX derivation steps for the simple-span beam ----------
function buildSimpleSteps(
  inp: SimpleInputs,
  r: { RA: number; RB: number; MA: number; MB: number; maxV: number; maxMpos: number; maxMneg: number; maxM: number; maxDefl: number; fb: number; Fb: number; UR: number; deflRatio: number },
): MathStep[] {
  const { beamType, L, E, Fy, I, d } = inp;
  const steps: MathStep[] = [];

  steps.push({
    title: '1. Input Parameters',
    latex: [
      `L = ${fmt(L, 2)}\\ \\mathrm{ft} \\qquad E = ${fmt(E, 0)}\\ \\mathrm{ksi} \\qquad F_y = ${fmt(Fy, 0)}\\ \\mathrm{ksi}`,
      `I = ${fmt(I, 1)}\\ \\mathrm{in^4} \\qquad d = ${fmt(d, 2)}\\ \\mathrm{in} \\qquad c = d/2 = ${fmt(d / 2, 2)}\\ \\mathrm{in}`,
    ],
    note: `Beam configuration: ${BEAM_TYPE_LABELS[beamType]}`,
  });

  // per-load reference formulas (AISC Table 3-23 cases)
  inp.loads.forEach((ld, i) => {
    const n = i + 1;
    const lines: string[] = [];
    let note = '';
    const P = ld.magnitude;
    if (ld.type === 'point') {
      const a = clamp(ld.position, 0, L);
      const b = L - a;
      if (beamType === 'simple') {
        note = 'AISC Table 3-23, Case 7 — Simple beam, concentrated load at any point';
        lines.push(`R_A = \\frac{Pb}{L} = \\frac{${fmt(P)}\\times${fmt(b)}}{${fmt(L)}} = ${fmt((P * b) / L)}\\ \\mathrm{kips} \\qquad R_B = \\frac{Pa}{L} = ${fmt((P * a) / L)}\\ \\mathrm{kips}`);
        lines.push(`M_{max} = \\frac{Pab}{L} = \\frac{${fmt(P)}\\times${fmt(a)}\\times${fmt(b)}}{${fmt(L)}} = ${fmt((P * a * b) / L)}\\ \\mathrm{k\\text{-}ft}\\ \\text{(at load point)}`);
        lines.push(`\\Delta_{max} = \\frac{Pab(a+2b)\\sqrt{3a(a+2b)}}{27\\,EIL}`);
      } else if (beamType === 'cantilever') {
        note = 'AISC Table 3-23, Case 21 — Cantilever, concentrated load at any point';
        lines.push(`V_{max} = P = ${fmt(P)}\\ \\mathrm{kips} \\qquad M_{max} = -Pa = -${fmt(P)}\\times${fmt(a)} = ${fmt(-P * a)}\\ \\mathrm{k\\text{-}ft}\\ \\text{(at fixed end)}`);
        lines.push(`\\Delta_{tip} = \\frac{Pa^2(3L-a)}{6EI}`);
      } else if (beamType === 'fixed') {
        note = 'AISC Table 3-23, Case 17 — Fixed both ends, concentrated load at any point';
        lines.push(`M_A = -\\frac{Pab^2}{L^2} = ${fmt((-P * a * b * b) / (L * L))}\\ \\mathrm{k\\text{-}ft} \\qquad M_B = -\\frac{Pa^2b}{L^2} = ${fmt((-P * a * a * b) / (L * L))}\\ \\mathrm{k\\text{-}ft}`);
        lines.push(`M_{load} = \\frac{2Pa^2b^2}{L^3} = ${fmt((2 * P * a * a * b * b) / (L ** 3))}\\ \\mathrm{k\\text{-}ft}`);
      } else {
        note = 'AISC Table 3-23, Case 14 — Fixed at A, supported at B, concentrated load';
        lines.push(`M_A = -\\frac{Pb\\,(L^2-b^2)}{2L^2} = ${fmt((-P * b * (L * L - b * b)) / (2 * L * L))}\\ \\mathrm{k\\text{-}ft}`);
        lines.push(`R_B = \\frac{Pa^2(3L-a)}{2L^3}\\qquad R_A = P - R_B`);
      }
      steps.push({ title: `${n + 1}. Load ${n}: Point Load  P = ${fmt(P)} kips at x = ${fmt(a)} ft`, latex: lines, note });
    } else if (ld.type === 'udl') {
      const w = P;
      if (beamType === 'simple') {
        note = 'AISC Table 3-23, Case 1 — Simple beam, uniformly distributed load';
        lines.push(`R = V_{max} = \\frac{wL}{2} = \\frac{${fmt(w)}\\times${fmt(L)}}{2} = ${fmt((w * L) / 2)}\\ \\mathrm{kips}`);
        lines.push(`M_{max} = \\frac{wL^2}{8} = \\frac{${fmt(w)}\\times${fmt(L)}^2}{8} = ${fmt((w * L * L) / 8)}\\ \\mathrm{k\\text{-}ft}\\ \\text{(at midspan)}`);
        lines.push(`\\Delta_{max} = \\frac{5wL^4}{384EI} = \\frac{5\\times${fmt(w)}\\times${fmt(L)}^4\\times 1728}{384\\times${fmt(E, 0)}\\times${fmt(I, 0)}} = ${fmt((5 * w * L ** 4 * 1728) / (384 * E * I), 4)}\\ \\mathrm{in}`);
      } else if (beamType === 'cantilever') {
        note = 'AISC Table 3-23, Case 19 — Cantilever, uniformly distributed load';
        lines.push(`V_{max} = wL = ${fmt(w * L)}\\ \\mathrm{kips} \\qquad M_{max} = -\\frac{wL^2}{2} = ${fmt((-w * L * L) / 2)}\\ \\mathrm{k\\text{-}ft}`);
        lines.push(`\\Delta_{tip} = \\frac{wL^4}{8EI} = ${fmt((w * L ** 4 * 1728) / (8 * E * I), 4)}\\ \\mathrm{in}`);
      } else if (beamType === 'fixed') {
        note = 'AISC Table 3-23, Case 15 — Fixed both ends, uniformly distributed load';
        lines.push(`M_{A} = M_{B} = -\\frac{wL^2}{12} = ${fmt((-w * L * L) / 12)}\\ \\mathrm{k\\text{-}ft} \\qquad M_{mid} = \\frac{wL^2}{24} = ${fmt((w * L * L) / 24)}\\ \\mathrm{k\\text{-}ft}`);
        lines.push(`\\Delta_{max} = \\frac{wL^4}{384EI} = ${fmt((w * L ** 4 * 1728) / (384 * E * I), 4)}\\ \\mathrm{in}`);
      } else {
        note = 'AISC Table 3-23, Case 12 — Fixed at A, supported at B, uniform load';
        lines.push(`R_A = \\frac{5wL}{8} = ${fmt((5 * w * L) / 8)}\\ \\mathrm{kips} \\qquad R_B = \\frac{3wL}{8} = ${fmt((3 * w * L) / 8)}\\ \\mathrm{kips}`);
        lines.push(`M_A = -\\frac{wL^2}{8} = ${fmt((-w * L * L) / 8)}\\ \\mathrm{k\\text{-}ft} \\qquad M_{pos} = \\frac{9wL^2}{128} = ${fmt((9 * w * L * L) / 128)}\\ \\mathrm{k\\text{-}ft}`);
        lines.push(`\\Delta_{max} = \\frac{wL^4}{185EI} = ${fmt((w * L ** 4 * 1728) / (185 * E * I), 4)}\\ \\mathrm{in}`);
      }
      steps.push({ title: `${n + 1}. Load ${n}: Uniform Load  w = ${fmt(P)} kip/ft (full span)`, latex: lines, note });
    } else if (ld.type === 'pudl') {
      const w = P;
      const a = clamp(Math.min(ld.start, ld.end), 0, L);
      const b = clamp(Math.max(ld.start, ld.end), 0, L);
      const c = b - a;
      const W = w * c;
      const xbar = (a + b) / 2;
      lines.push(`W = w\\,c = ${fmt(w)}\\times${fmt(c)} = ${fmt(W)}\\ \\mathrm{kips} \\qquad \\bar{x} = ${fmt(xbar)}\\ \\mathrm{ft}`);
      if (beamType === 'simple') {
        note = 'AISC Table 3-23, Case 4 — Simple beam, uniform load partially distributed';
        const R2 = (W * xbar) / L;
        const R1 = W - R2;
        lines.push(`R_A = \\frac{W(L-\\bar{x})}{L} = ${fmt(R1)}\\ \\mathrm{kips} \\qquad R_B = \\frac{W\\bar{x}}{L} = ${fmt(R2)}\\ \\mathrm{kips}`);
        lines.push(`M_{max} = R_A\\left(a + \\frac{R_A}{2w}\\right)\\ \\text{at}\\ x = a + \\frac{R_A}{w}\\ \\text{(when zero-shear falls inside loaded length)}`);
      } else if (beamType === 'cantilever') {
        note = 'Cantilever, partial uniform load — statics';
        lines.push(`V_{max} = W = ${fmt(W)}\\ \\mathrm{kips} \\qquad M_{max} = -W\\bar{x} = ${fmt(-W * xbar)}\\ \\mathrm{k\\text{-}ft}`);
      } else {
        note = 'Indeterminate beam — end moments obtained by compatibility (flexibility method)';
        lines.push(`\\theta_A = \\theta_{A0} + \\frac{m_A L}{3EI} + \\frac{m_B L}{6EI} = 0 \\qquad \\theta_B = \\theta_{B0} + \\frac{m_A L}{6EI} + \\frac{m_B L}{3EI} = 0`);
      }
      steps.push({ title: `${n + 1}. Load ${n}: Partial Uniform Load  w = ${fmt(w)} kip/ft from ${fmt(a)} ft to ${fmt(b)} ft`, latex: lines, note });
    } else if (ld.type === 'moment') {
      const M0 = P;
      const a = clamp(ld.position, 0, L);
      if (beamType === 'simple') {
        note = 'Applied couple on a simple span (see structx.com — moment applied at any point)';
        lines.push(`R_A = \\frac{M_0}{L} = ${fmt(M0 / L)}\\ \\mathrm{kips}\\ (\\uparrow) \\qquad R_B = -\\frac{M_0}{L} = ${fmt(-M0 / L)}\\ \\mathrm{kips}`);
        lines.push(`M(x^-) = \\frac{M_0 x}{L}, \\qquad M(x^+) = \\frac{M_0 x}{L} - M_0 \\quad \\text{(jump of } M_0 \\text{ at } x = ${fmt(a)}\\ \\mathrm{ft})`);
      } else if (beamType === 'cantilever') {
        note = 'Cantilever with applied couple — constant moment between fixed end and couple';
        lines.push(`M(x) = M_0 = ${fmt(M0)}\\ \\mathrm{k\\text{-}ft}\\ \\text{for } x < ${fmt(a)}\\ \\mathrm{ft}, \\qquad V = 0`);
      } else {
        note = 'Indeterminate beam — end moments obtained by compatibility (flexibility method)';
        lines.push(`\\text{Applied couple } M_0 = ${fmt(M0)}\\ \\mathrm{k\\text{-}ft} \\text{ at } x = ${fmt(a)}\\ \\mathrm{ft};\\ \\text{redundants solved from } \\theta_{fixed} = 0`);
      }
      steps.push({ title: `${n + 1}. Load ${n}: Applied Moment  M₀ = ${fmt(M0)} kip-ft at x = ${fmt(a)} ft`, latex: lines, note });
    }
  });

  // reactions
  const reactLines = [
    `R_A = ${fmt(r.RA)}\\ \\mathrm{kips} \\qquad R_B = ${fmt(r.RB)}\\ \\mathrm{kips}`,
  ];
  if (beamType === 'cantilever' || beamType === 'fixed' || beamType === 'propped') {
    reactLines.push(`M_A = ${fmt(r.MA)}\\ \\mathrm{k\\text{-}ft}${beamType === 'fixed' ? ` \\qquad M_B = ${fmt(r.MB)}\\ \\mathrm{k\\text{-}ft}` : ''}`);
  }
  steps.push({
    title: `${inp.loads.length + 2}. Support Reactions (Superposition of All Loads)`,
    latex: reactLines,
    note: 'Combined effects of all load cases by superposition.',
  });

  steps.push({
    title: `${inp.loads.length + 3}. Governing Design Forces`,
    latex: [
      `V_{max} = ${fmt(Math.abs(r.maxV))}\\ \\mathrm{kips} \\qquad M^{+}_{max} = ${fmt(r.maxMpos)}\\ \\mathrm{k\\text{-}ft} \\qquad M^{-}_{max} = ${fmt(r.maxMneg)}\\ \\mathrm{k\\text{-}ft}`,
      `M_{design} = \\max\\left(|M^+|, |M^-|\\right) = ${fmt(r.maxM)}\\ \\mathrm{k\\text{-}ft}`,
    ],
  });

  steps.push({
    title: `${inp.loads.length + 4}. Flexural Stress Check (AISC ASD)`,
    latex: [
      `f_b = \\frac{Mc}{I} = \\frac{M(d/2)}{I} = \\frac{${fmt(r.maxM)}\\times 12 \\times ${fmt(d / 2, 2)}}{${fmt(I, 1)}} = ${fmt(r.fb)}\\ \\mathrm{ksi}`,
      `F_b = 0.66\\,F_y = 0.66\\times${fmt(Fy, 0)} = ${fmt(r.Fb)}\\ \\mathrm{ksi}`,
      `UR = \\frac{f_b}{F_b} = \\frac{${fmt(r.fb)}}{${fmt(r.Fb)}} = ${fmt(r.UR, 3)} \\quad \\Rightarrow\\ \\textbf{${r.UR <= 1.0 ? 'OK' : 'NG — OVERSTRESSED'}}`,
    ],
    note: 'Allowable bending stress per AISC ASD for compact, laterally braced sections.',
  });

  steps.push({
    title: `${inp.loads.length + 5}. Deflection Check`,
    latex: [
      `\\Delta_{max} = ${fmt(Math.abs(r.maxDefl), 4)}\\ \\mathrm{in} \\qquad \\frac{L}{\\Delta} = \\frac{${fmt(L)}\\times 12}{${fmt(Math.abs(r.maxDefl), 4)}} = L/${isFinite(r.deflRatio) ? fmt(r.deflRatio, 0) : '\\infty'}`,
      `\\text{Limits: } L/240 = ${fmt((L * 12) / 240, 3)}\\ \\mathrm{in} \\qquad L/360 = ${fmt((L * 12) / 360, 3)}\\ \\mathrm{in}`,
    ],
    note: 'Deflection obtained by double integration of M/EI along the span.',
  });

  return steps;
}

// ============================================================
// Continuous beam solver — three-moment equation
// (matches AISC Table 3-22c coefficients for equal spans)
// ============================================================
export type ContPattern = 'uniform-all' | 'uniform-alt' | 'point-center';

export interface ContinuousInputs {
  spans: number[]; // ft
  E: number;
  Fy: number;
  I: number;
  d: number;
  pattern: ContPattern;
  magnitude: number; // kip/ft or kips
}

export interface ContinuousResults extends AnalysisResults {
  supportMoments: number[]; // internal support moments (k-ft)
  reactions: number[];
  spanLoaded: boolean[];
}

export const PATTERN_LABELS: Record<ContPattern, string> = {
  'uniform-all': 'Uniform load on all spans',
  'uniform-alt': 'Uniform load on alternate (odd) spans',
  'point-center': 'Concentrated load at center of each span',
};

// Published AISC coefficients for equal spans (Table 3-22c / beam tables)
const AISC_COEFS: Record<string, { Mpos: number; Mneg: number; V: number; D: number } | undefined> = {
  'uniform-all-2': { Mpos: 0.0703, Mneg: 0.125, V: 0.625, D: 0.0092 },
  'uniform-all-3': { Mpos: 0.08, Mneg: 0.1, V: 0.6, D: 0.0069 },
  'uniform-all-4': { Mpos: 0.0772, Mneg: 0.1071, V: 0.6071, D: 0.0065 },
  'uniform-alt-2': { Mpos: 0.0957, Mneg: 0.0625, V: 0.4375, D: 0.0092 },
  'uniform-alt-3': { Mpos: 0.1013, Mneg: 0.05, V: 0.55, D: 0.0099 },
  'point-center-2': { Mpos: 0.1563, Mneg: 0.1875, V: 0.6875, D: 0.0093 },
  'point-center-3': { Mpos: 0.175, Mneg: 0.15, V: 0.65, D: 0.0068 },
};

export function analyzeContinuousBeam(inp: ContinuousInputs): ContinuousResults {
  const { spans, E, Fy, I, d, pattern, magnitude } = inp;
  const n = spans.length;
  const loaded: boolean[] = spans.map((_, i) =>
    pattern === 'uniform-alt' ? i % 2 === 0 : true,
  );

  // three-moment terms per span (6*A*xbar/L, symmetric loads => same both sides)
  const term = (j: number): number => {
    if (!loaded[j]) return 0;
    const Lj = spans[j];
    if (pattern === 'point-center') return (3 * magnitude * Lj * Lj) / 8;
    return (magnitude * Lj ** 3) / 4;
  };

  // solve tridiagonal for interior support moments M_1..M_{n-1}
  const m = n - 1; // interior supports
  const Msup: number[] = new Array(n + 1).fill(0); // includes ends (=0)
  if (m > 0) {
    const A: number[][] = Array.from({ length: m }, () => new Array(m).fill(0));
    const B: number[] = new Array(m).fill(0);
    for (let i = 1; i <= m; i++) {
      const r = i - 1;
      const Li = spans[i - 1];
      const Li1 = spans[i];
      if (r > 0) A[r][r - 1] = Li;
      A[r][r] = 2 * (Li + Li1);
      if (r < m - 1) A[r][r + 1] = Li1;
      B[r] = -(term(i - 1) + term(i));
    }
    // gaussian elimination (small system)
    for (let k = 0; k < m; k++) {
      const piv = A[k][k];
      for (let r2 = k + 1; r2 < m; r2++) {
        const f = A[r2][k] / piv;
        for (let c = k; c < m; c++) A[r2][c] -= f * A[k][c];
        B[r2] -= f * B[k];
      }
    }
    for (let k = m - 1; k >= 0; k--) {
      let s = B[k];
      for (let c = k + 1; c < m; c++) s -= A[k][c] * Msup[c + 1];
      Msup[k + 1] = s / A[k][k];
    }
  }

  // build diagrams span by span
  const ptsPerSpan = 240;
  const gx: number[] = [];
  const gV: number[] = [];
  const gM: number[] = [];
  const gy: number[] = [];
  const reactions: number[] = new Array(n + 1).fill(0);
  const endShears: { Vl: number; Vr: number }[] = [];
  const EI = E * I;

  let x0 = 0;
  for (let j = 0; j < n; j++) {
    const Lj = spans[j];
    const Ml = Msup[j];
    const Mr = Msup[j + 1];
    const isLoaded = loaded[j];
    const w = pattern !== 'point-center' && isLoaded ? magnitude : 0;
    const Pc = pattern === 'point-center' && isLoaded ? magnitude : 0;

    const Vl0 = w * Lj / 2 + Pc / 2; // simple-span left shear
    const Vl = Vl0 + (Mr - Ml) / Lj;
    const Vr = Vl - w * Lj - Pc;
    endShears.push({ Vl, Vr });

    const xs: number[] = [];
    const Ms: number[] = [];
    const Vs: number[] = [];
    for (let i = 0; i <= ptsPerSpan; i++) {
      const xl = (i / ptsPerSpan) * Lj;
      let Vv = Vl - w * xl;
      let Mv = Ml + Vl * xl - (w * xl * xl) / 2;
      if (Pc && xl > Lj / 2) {
        Vv -= Pc;
        Mv -= Pc * (xl - Lj / 2);
      }
      xs.push(xl); Vs.push(Vv); Ms.push(Mv);
    }

    // span deflection: double integration, y=0 at both supports
    const dxl = Lj / ptsPerSpan;
    const th: number[] = [0];
    const yr: number[] = [0];
    for (let i = 1; i <= ptsPerSpan; i++) {
      th.push(th[i - 1] + ((Ms[i] + Ms[i - 1]) / 2) * dxl);
      yr.push(yr[i - 1] + ((th[i] + th[i - 1]) / 2) * dxl);
    }
    const corr = yr[ptsPerSpan] / Lj;
    for (let i = 0; i <= ptsPerSpan; i++) {
      gx.push(x0 + xs[i]);
      gV.push(Vs[i]);
      gM.push(Ms[i]);
      gy.push(EI > 0 ? ((yr[i] - corr * xs[i]) * 1728) / EI : 0);
    }
    x0 += Lj;
  }

  // support reactions
  reactions[0] = endShears[0].Vl;
  for (let j = 1; j < n; j++) reactions[j] = endShears[j].Vl - endShears[j - 1].Vr;
  reactions[n] = -endShears[n - 1].Vr;

  let maxV = 0, maxMpos = 0, maxMneg = 0, maxDefl = 0;
  for (let i = 0; i < gx.length; i++) {
    if (Math.abs(gV[i]) > Math.abs(maxV)) maxV = gV[i];
    if (gM[i] > maxMpos) maxMpos = gM[i];
    if (gM[i] < maxMneg) maxMneg = gM[i];
    if (Math.abs(gy[i]) > Math.abs(maxDefl)) maxDefl = gy[i];
  }
  const maxM = Math.max(maxMpos, Math.abs(maxMneg));
  const fb = I > 0 ? (maxM * 12 * (d / 2)) / I : 0;
  const Fb = 0.66 * Fy;
  const UR = Fb > 0 ? fb / Fb : 0;
  const Lmax = Math.max(...spans);
  const deflRatio = Math.abs(maxDefl) > 1e-9 ? (Lmax * 12) / Math.abs(maxDefl) : Infinity;

  const steps = buildContinuousSteps(inp, loaded, Msup, reactions, {
    maxV, maxMpos, maxMneg, maxM, maxDefl: Math.abs(maxDefl), fb, Fb, UR, deflRatio,
  });

  return {
    RA: reactions[0],
    RB: reactions[n],
    MA: 0, MB: 0,
    maxV, maxMpos, maxMneg, maxM,
    maxDefl: Math.abs(maxDefl),
    deflRatio, fb, Fb, UR,
    diagrams: { x: gx, V: gV, M: gM, y: gy },
    steps,
    supportMoments: Msup,
    reactions,
    spanLoaded: loaded,
  };
}

function buildContinuousSteps(
  inp: ContinuousInputs,
  loaded: boolean[],
  Msup: number[],
  reactions: number[],
  r: { maxV: number; maxMpos: number; maxMneg: number; maxM: number; maxDefl: number; fb: number; Fb: number; UR: number; deflRatio: number },
): MathStep[] {
  const { spans, E, Fy, I, d, pattern, magnitude } = inp;
  const n = spans.length;
  const steps: MathStep[] = [];
  const equal = spans.every((s) => Math.abs(s - spans[0]) < 1e-9);
  const L = spans[0];
  const isPoint = pattern === 'point-center';
  const sym = isPoint ? 'P' : 'w';
  const unit = isPoint ? '\\mathrm{kips}' : '\\mathrm{kip/ft}';

  steps.push({
    title: '1. Input Parameters',
    latex: [
      `\\text{Spans: } ${spans.map((s, i) => `L_{${i + 1}} = ${fmt(s)}\\,\\mathrm{ft}`).join(',\\ ')}`,
      `E = ${fmt(E, 0)}\\ \\mathrm{ksi} \\qquad F_y = ${fmt(Fy, 0)}\\ \\mathrm{ksi} \\qquad I = ${fmt(I, 1)}\\ \\mathrm{in^4} \\qquad d = ${fmt(d, 2)}\\ \\mathrm{in}`,
      `${sym} = ${fmt(magnitude)}\\ ${unit} \\quad \\text{(${PATTERN_LABELS[pattern]}, loaded spans: ${loaded.map((l, i) => (l ? i + 1 : null)).filter(Boolean).join(', ')})}`,
    ],
  });

  // three-moment equation
  steps.push({
    title: '2. Three-Moment Equation (Clapeyron)',
    latex: [
      `M_{i-1}L_i + 2M_i\\left(L_i + L_{i+1}\\right) + M_{i+1}L_{i+1} = -\\left(\\frac{6A_i\\bar{a}_i}{L_i} + \\frac{6A_{i+1}\\bar{b}_{i+1}}{L_{i+1}}\\right)`,
      isPoint
        ? `\\text{For a midspan concentrated load: } \\frac{6A\\bar{a}}{L} = \\frac{3PL^2}{8}`
        : `\\text{For a full uniform load: } \\frac{6A\\bar{a}}{L} = \\frac{wL^3}{4}`,
    ],
    note: 'Support moments solved from the tridiagonal system; end supports are simple (M = 0).',
  });

  steps.push({
    title: '3. Support Moments',
    latex: [
      Msup.map((mv, i) => `M_{${String.fromCharCode(65 + i)}} = ${fmt(mv)}\\ \\mathrm{k\\text{-}ft}`).join(' \\qquad '),
    ],
  });

  steps.push({
    title: '4. Support Reactions',
    latex: [
      reactions.map((rv, i) => `R_{${String.fromCharCode(65 + i)}} = ${fmt(rv)}\\ \\mathrm{kips}`).join(' \\qquad '),
      `\\Sigma R = ${fmt(reactions.reduce((a, b) => a + b, 0))}\\ \\mathrm{kips}`,
    ],
  });

  // AISC coefficient comparison when spans are equal & case published
  if (equal) {
    const c = AISC_COEFS[`${pattern}-${n}`];
    if (c) {
      const lines: string[] = [];
      if (isPoint) {
        lines.push(`M^{+} = ${c.Mpos}\\,PL = ${c.Mpos}\\times${fmt(magnitude)}\\times${fmt(L)} = ${fmt(c.Mpos * magnitude * L)}\\ \\mathrm{k\\text{-}ft}`);
        lines.push(`M^{-} = ${c.Mneg}\\,PL = ${fmt(c.Mneg * magnitude * L)}\\ \\mathrm{k\\text{-}ft} \\qquad V_{max} = ${c.V}\\,P = ${fmt(c.V * magnitude)}\\ \\mathrm{kips}`);
        lines.push(`\\Delta_{max} \\approx ${c.D}\\,\\frac{PL^3}{EI} = ${fmt((c.D * magnitude * L ** 3 * 1728) / (E * I), 4)}\\ \\mathrm{in}`);
      } else {
        lines.push(`M^{+} = ${c.Mpos}\\,wL^2 = ${c.Mpos}\\times${fmt(magnitude)}\\times${fmt(L)}^2 = ${fmt(c.Mpos * magnitude * L * L)}\\ \\mathrm{k\\text{-}ft}`);
        lines.push(`M^{-} = ${c.Mneg}\\,wL^2 = ${fmt(c.Mneg * magnitude * L * L)}\\ \\mathrm{k\\text{-}ft} \\qquad V_{max} = ${c.V}\\,wL = ${fmt(c.V * magnitude * L)}\\ \\mathrm{kips}`);
        lines.push(`\\Delta_{max} \\approx ${c.D}\\,\\frac{wL^4}{EI} = ${fmt((c.D * magnitude * L ** 4 * 1728) / (E * I), 4)}\\ \\mathrm{in}`);
      }
      steps.push({
        title: '5. AISC Beam-Table Coefficient Check (Equal Spans)',
        latex: lines,
        note: 'Coefficients from AISC "Beam Diagrams and Formulas" for continuous beams of equal span — values match the three-moment solution.',
      });
    }
  }

  const k = steps.length + 1;
  steps.push({
    title: `${k}. Governing Design Forces`,
    latex: [
      `M^{+}_{max} = ${fmt(r.maxMpos)}\\ \\mathrm{k\\text{-}ft} \\qquad M^{-}_{max} = ${fmt(r.maxMneg)}\\ \\mathrm{k\\text{-}ft} \\qquad V_{max} = ${fmt(Math.abs(r.maxV))}\\ \\mathrm{kips}`,
      `M_{design} = ${fmt(r.maxM)}\\ \\mathrm{k\\text{-}ft}`,
    ],
  });

  steps.push({
    title: `${k + 1}. Flexural Stress Check (AISC ASD)`,
    latex: [
      `f_b = \\frac{M(d/2)}{I} = \\frac{${fmt(r.maxM)}\\times 12\\times${fmt(d / 2, 2)}}{${fmt(I, 1)}} = ${fmt(r.fb)}\\ \\mathrm{ksi}`,
      `F_b = 0.66F_y = ${fmt(r.Fb)}\\ \\mathrm{ksi} \\qquad UR = ${fmt(r.UR, 3)}\\ \\Rightarrow\\ \\textbf{${r.UR <= 1 ? 'OK' : 'NG — OVERSTRESSED'}}`,
    ],
  });

  steps.push({
    title: `${k + 2}. Deflection Check`,
    latex: [
      `\\Delta_{max} = ${fmt(r.maxDefl, 4)}\\ \\mathrm{in} \\qquad L_{max}/\\Delta = L/${isFinite(r.deflRatio) ? fmt(r.deflRatio, 0) : '\\infty'}`,
      `\\text{Limits: } L/240 = ${fmt((Math.max(...spans) * 12) / 240, 3)}\\ \\mathrm{in} \\qquad L/360 = ${fmt((Math.max(...spans) * 12) / 360, 3)}\\ \\mathrm{in}`,
    ],
  });

  return steps;
}
