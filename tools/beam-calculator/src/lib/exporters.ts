import { jsPDF } from 'jspdf';
import type { Diagrams, MathStep } from './beam';

export interface ExportReport {
  kind: 'simple' | 'continuous';
  title: string;
  subtitle: string;
  inputRows: [string, string][];
  resultRows: [string, string][];
  steps: MathStep[];
  diagrams: Diagrams;
  /** DOM ids of canvases: loading, shear, moment, deflection */
  canvasIds: { loading: string; shear: string; moment: string; defl: string };
}

const today = () => new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
const stamp = () => new Date().toISOString().split('T')[0];

function download(content: string | Blob, filename: string, mime = 'text/plain') {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

function canvasData(id: string): string | null {
  const c = document.getElementById(id) as HTMLCanvasElement | null;
  if (!c) return null;
  try {
    return c.toDataURL('image/png');
  } catch {
    return null;
  }
}

// ---------- convert display LaTeX to readable plain text (Word / PDF) ----------
export function latexToPlain(src: string): string {
  let t = src;
  t = t.replace(/\\text\{([^{}]*)\}/g, '$1');
  t = t.replace(/\\textbf\{([^{}]*)\}/g, '$1');
  t = t.replace(/\\mathrm\{([^{}]*)\}/g, '$1');
  t = t.replace(/\\sqrt\{([^{}]*)\}/g, '√($1)');
  t = t.replace(/\\bar\{([^{}]*)\}/g, '$1\u0304');
  const frac = /\\frac\{([^{}]*)\}\{([^{}]*)\}/;
  let guard = 0;
  while (frac.test(t) && guard++ < 40) t = t.replace(frac, '($1)/($2)');
  t = t
    .replace(/\\times/g, ' × ')
    .replace(/\\Delta/g, 'Δ')
    .replace(/\\Sigma/g, 'Σ')
    .replace(/\\theta/g, 'θ')
    .replace(/\\Omega/g, 'Ω')
    .replace(/\\Rightarrow/g, '⇒')
    .replace(/\\approx/g, '≈')
    .replace(/\\le(?![a-z])/g, '≤')
    .replace(/\\infty/g, '∞')
    .replace(/\\uparrow/g, '↑')
    .replace(/\\max/g, 'max')
    .replace(/\\min/g, 'min')
    .replace(/\\qquad|\\quad/g, '     ')
    .replace(/\\[,;!]/g, ' ')
    .replace(/\\ /g, ' ');
  t = t.replace(/_\{([^{}]*)\}/g, '_$1').replace(/\^\{([^{}]*)\}/g, '^$1');
  t = t.replace(/\\left|\\right/g, '');
  t = t.replace(/[{}]/g, '');
  t = t.replace(/\\\\/g, '  ');
  t = t.replace(/\\[a-zA-Z]+/g, '');
  return t.replace(/\s+/g, ' ').trim();
}

// downsample x/y arrays for pgfplots
function sampleCoords(x: number[], v: number[], n = 120): string {
  const N = x.length;
  const step = Math.max(1, Math.floor(N / n));
  const out: string[] = [];
  for (let i = 0; i < N; i += step) out.push(`(${x[i].toFixed(3)},${v[i].toFixed(4)})`);
  if ((N - 1) % step !== 0) out.push(`(${x[N - 1].toFixed(3)},${v[N - 1].toFixed(4)})`);
  return out.join(' ');
}

// ============================================================
// LaTeX (.tex) — fully self-contained with pgfplots diagrams
// ============================================================
export function exportLatex(r: ExportReport) {
  const d = r.diagrams;
  const plot = (vals: number[], ylabel: string, title: string) => `
\\begin{figure}[H]
\\centering
\\begin{tikzpicture}
\\begin{axis}[
  width=0.92\\textwidth, height=5.2cm,
  xlabel={$x$ (ft)}, ylabel={${ylabel}},
  title={${title}},
  grid=major, grid style={gray!20},
  axis lines=middle, axis line style={gray},
  every axis title/.append style={font=\\small},
  tick label style={font=\\scriptsize},
]
\\addplot[black, thick, fill=black, fill opacity=0.08] coordinates {
${sampleCoords(d.x, vals)}
} \\closedcycle;
\\end{axis}
\\end{tikzpicture}
\\end{figure}`;

  const stepsTex = r.steps
    .map(
      (s) => `\\subsection*{${texEscape(s.title)}}
${s.note ? `\\noindent\\textit{${texEscape(s.note)}}\\smallskip\n` : ''}
${s.latex.map((l) => `\\begin{equation*}\n${l}\n\\end{equation*}`).join('\n')}`,
    )
    .join('\n\n');

  const tex = `% ============================================================
% Beam Design Calculation Report — generated ${today()}
% Compile with pdflatex (requires amsmath, pgfplots, float, booktabs)
% ============================================================
\\documentclass[11pt]{article}
\\usepackage[margin=1in]{geometry}
\\usepackage{amsmath,amssymb}
\\usepackage{booktabs}
\\usepackage{float}
\\usepackage{pgfplots}
\\pgfplotsset{compat=1.17}

\\title{${texEscape(r.title)}}
\\author{Structural Design --- Beam Design Calculator}
\\date{${today()}}

\\begin{document}
\\maketitle

\\section*{Design Basis}
${texEscape(r.subtitle)}. Analysis per AISC \\textit{Beam Diagrams and Formulas} (Table 3-23${r.kind === 'continuous' ? ' and continuous-beam coefficient tables' : ''}); allowable-stress check per AISC ASD ($F_b = 0.66F_y$).

\\section*{Input Parameters}
\\begin{center}
\\begin{tabular}{ll}
\\toprule
\\textbf{Parameter} & \\textbf{Value} \\\\
\\midrule
${r.inputRows.map(([k, v]) => `${texEscape(k)} & ${texEscape(v)} \\\\`).join('\n')}
\\bottomrule
\\end{tabular}
\\end{center}

\\section*{Beam Diagrams}
${plot(d.V, '$V$ (kips)', 'Shear Force Diagram')}
${plot(d.M, '$M$ (kip-ft)', 'Bending Moment Diagram')}
${plot(d.y, '$\\Delta$ (in)', 'Deflection Diagram')}

\\section*{Calculations}
${stepsTex}

\\section*{Summary of Results}
\\begin{center}
\\begin{tabular}{ll}
\\toprule
\\textbf{Quantity} & \\textbf{Value} \\\\
\\midrule
${r.resultRows.map(([k, v]) => `${texEscape(k)} & ${texEscape(v)} \\\\`).join('\n')}
\\bottomrule
\\end{tabular}
\\end{center}

\\vspace{1cm}
\\noindent\\rule{\\textwidth}{0.4pt}\\\\
\\small\\textit{Generated by Structural Design --- Beam Design Calculator, ${today()}.}
\\end{document}
`;
  download(tex, `beam-calculation-${stamp()}.tex`, 'application/x-tex');
}

function texEscape(s: string): string {
  return s
    .replace(/&/g, '\\&')
    .replace(/%/g, '\\%')
    .replace(/#/g, '\\#')
    .replace(/_/g, '\\_')
    .replace(/₀/g, '$_0$')
    .replace(/Δ/g, '$\\Delta$')
    .replace(/×/g, '$\\times$')
    .replace(/⁴/g, '$^4$')
    .replace(/⁺/g, '$^+$')
    .replace(/⁻/g, '$^-$')
    .replace(/−/g, '$-$')
    .replace(/∞/g, '$\\infty$')
    .replace(/≤/g, '$\\le$')
    .replace(/[·]/g, '$\\cdot$')
    .replace(/—/g, '---')
    .replace(/–/g, '--');
}

// ============================================================
// MS Word (.doc) — HTML with embedded diagram images
// ============================================================
export function exportWord(r: ExportReport) {
  const imgs: [string, string | null][] = [
    ['Figure 1 — Beam Loading Diagram', canvasData(r.canvasIds.loading)],
    ['Figure 2 — Shear Force Diagram', canvasData(r.canvasIds.shear)],
    ['Figure 3 — Bending Moment Diagram', canvasData(r.canvasIds.moment)],
    ['Figure 4 — Deflection Diagram', canvasData(r.canvasIds.defl)],
  ];

  const stepsHtml = r.steps
    .map(
      (s) => `
  <h3>${esc(s.title)}</h3>
  ${s.note ? `<p class="note">${esc(s.note)}</p>` : ''}
  ${s.latex.map((l) => `<p class="equation">${esc(latexToPlain(l))}</p>`).join('\n')}`,
    )
    .join('\n');

  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8">
<title>${esc(r.title)}</title>
<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml><![endif]-->
<style>
  body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; color: #171717; margin: 48px; }
  h1 { font-size: 20pt; border-bottom: 2pt solid #171717; padding-bottom: 6pt; }
  h2 { font-size: 14pt; margin-top: 24pt; border-bottom: 0.5pt solid #999; padding-bottom: 3pt; }
  h3 { font-size: 12pt; margin-top: 18pt; }
  table { border-collapse: collapse; width: 100%; margin: 10pt 0; }
  td, th { border: 0.5pt solid #171717; padding: 5pt 8pt; font-size: 10.5pt; text-align: left; }
  th { background: #f2f2f2; }
  .equation { font-family: 'Cambria Math', Cambria, serif; font-style: italic; margin: 8pt 0 8pt 24pt; }
  .note { color: #555; font-size: 10pt; font-style: italic; margin: 2pt 0; }
  img { width: 640px; border: 0.5pt solid #ccc; margin: 8pt 0 2pt 0; }
  .caption { font-size: 9.5pt; color: #555; font-style: italic; margin: 0 0 12pt 0; }
  .footer { margin-top: 30pt; color: #777; font-size: 9pt; font-style: italic; }
</style>
</head>
<body>
  <h1>${esc(r.title)}</h1>
  <p><b>Project basis:</b> ${esc(r.subtitle)} — AISC Beam Diagrams &amp; Formulas; ASD allowable stress F<sub>b</sub> = 0.66F<sub>y</sub>.</p>
  <p><b>Date:</b> ${today()}</p>

  <h2>1. Input Parameters</h2>
  <table>
    <tr><th>Parameter</th><th>Value</th></tr>
    ${r.inputRows.map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join('\n    ')}
  </table>

  <h2>2. Beam Diagrams</h2>
  ${imgs
    .filter(([, dta]) => !!dta)
    .map(([cap, dta]) => `<img src="${dta}" alt="${esc(cap)}"><p class="caption">${esc(cap)}</p>`)
    .join('\n  ')}

  <h2>3. Calculations</h2>
  ${stepsHtml}

  <h2>4. Summary of Results</h2>
  <table>
    <tr><th>Quantity</th><th>Value</th></tr>
    ${r.resultRows.map(([k, v]) => `<tr><td>${esc(k)}</td><td><b>${esc(v)}</b></td></tr>`).join('\n    ')}
  </table>

  <p class="footer">Generated by Structural Design — Beam Design Calculator · ${new Date().toLocaleString()}</p>
</body>
</html>`;

  download(new Blob(['\ufeff', html], { type: 'application/msword' }), `beam-calculation-${stamp()}.doc`);
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// ============================================================
// PDF — jsPDF with diagram images
// ============================================================
// jsPDF built-in fonts only cover WinAnsi — replace unsupported glyphs
function pdfSafe(s: string): string {
  return s
    .replace(/Δ/g, 'Delta')
    .replace(/Σ/g, 'Sum ')
    .replace(/θ/g, 'theta')
    .replace(/Ω/g, 'Omega')
    .replace(/⇒/g, '=>')
    .replace(/≈/g, '~')
    .replace(/≤/g, '<=')
    .replace(/≥/g, '>=')
    .replace(/∞/g, 'inf')
    .replace(/√/g, 'sqrt')
    .replace(/↑/g, '(up)')
    .replace(/−/g, '-')
    .replace(/[–—]/g, '-')
    .replace(/⁴/g, '^4')
    .replace(/₀/g, '0')
    .replace(/\u0304/g, '_bar')
    .replace(/[“”]/g, '"')
    .replace(/’/g, "'");
}

export function exportPdf(r: ExportReport) {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const PW = doc.internal.pageSize.getWidth();
  const PH = doc.internal.pageSize.getHeight();
  const MX = 54;
  const CW = PW - 2 * MX;
  let y = 60;

  const ensure = (need: number) => {
    if (y + need > PH - 54) {
      doc.addPage();
      y = 60;
    }
  };
  const heading = (t: string, size = 13) => {
    ensure(size + 18);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(size);
    doc.setTextColor(23, 23, 23);
    doc.text(t, MX, y);
    y += 6;
    doc.setDrawColor(23, 23, 23);
    doc.setLineWidth(0.75);
    doc.line(MX, y, PW - MX, y);
    y += 16;
  };
  const textLine = (t: string, opts: { bold?: boolean; size?: number; indent?: number; gray?: boolean } = {}) => {
    doc.setFont(opts.bold ? 'helvetica' : 'helvetica', opts.bold ? 'bold' : 'normal');
    doc.setFontSize(opts.size ?? 9.5);
    doc.setTextColor(opts.gray ? 120 : 23, opts.gray ? 120 : 23, opts.gray ? 120 : 23);
    const lines = doc.splitTextToSize(pdfSafe(t), CW - (opts.indent ?? 0));
    for (const ln of lines) {
      ensure(14);
      doc.text(ln, MX + (opts.indent ?? 0), y);
      y += (opts.size ?? 9.5) * 1.35;
    }
  };
  const kvTable = (rows: [string, string][]) => {
    doc.setFontSize(9.5);
    for (const [k, v] of rows) {
      ensure(18);
      doc.setDrawColor(200);
      doc.setLineWidth(0.5);
      doc.rect(MX, y - 11, CW * 0.55, 17);
      doc.rect(MX + CW * 0.55, y - 11, CW * 0.45, 17);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60);
      doc.text(pdfSafe(k), MX + 6, y);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(23, 23, 23);
      doc.text(pdfSafe(v), MX + CW * 0.55 + 6, y);
      y += 17;
    }
    y += 10;
  };
  const image = (id: string, caption: string) => {
    const dta = canvasData(id);
    if (!dta) return;
    const c = document.getElementById(id) as HTMLCanvasElement;
    const ratio = c.height / c.width;
    const w = CW;
    const h = w * ratio;
    ensure(h + 30);
    doc.addImage(dta, 'PNG', MX, y, w, h);
    y += h + 12;
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(110);
    doc.text(pdfSafe(caption), MX, y);
    y += 20;
  };

  // Title block
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(19);
  doc.setTextColor(23, 23, 23);
  doc.text(pdfSafe(r.title), MX, y);
  y += 20;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(pdfSafe(`${r.subtitle}  -  ${today()}`), MX, y);
  y += 8;
  doc.setDrawColor(23, 23, 23);
  doc.setLineWidth(1.2);
  doc.line(MX, y, PW - MX, y);
  y += 24;

  heading('1.  Input Parameters');
  kvTable(r.inputRows);

  heading('2.  Beam Diagrams');
  image(r.canvasIds.loading, 'Figure 1 — Beam loading diagram');
  image(r.canvasIds.shear, 'Figure 2 — Shear force diagram, V (kips)');
  image(r.canvasIds.moment, 'Figure 3 — Bending moment diagram, M (kip-ft)');
  image(r.canvasIds.defl, 'Figure 4 — Deflection diagram, Δ (in)');

  heading('3.  Calculations');
  for (const s of r.steps) {
    ensure(40);
    textLine(s.title, { bold: true, size: 10.5 });
    if (s.note) textLine(s.note, { gray: true, size: 8.5, indent: 12 });
    y += 2;
    for (const l of s.latex) textLine(l, { indent: 18 });
    y += 8;
  }

  heading('4.  Summary of Results');
  kvTable(r.resultRows);

  ensure(30);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(130);
  doc.text(pdfSafe(`Generated by Structural Design — Beam Design Calculator · ${new Date().toLocaleString()}`), MX, y + 8);

  doc.save(`beam-calculation-${stamp()}.pdf`);
}
