import { useEffect, useRef } from 'react';
import type { BeamType, ContPattern, Load } from '../lib/beam';
import { fmt } from '../lib/beam';

const INK = '#171717';
const GRAY = '#8a8a8a';
const LIGHT = '#e5e5e5';

// logical drawing size (canvas rendered at 2x for crisp export images)
const W = 760;

function setup(canvas: HTMLCanvasElement, h: number) {
  canvas.width = W * 2;
  canvas.height = h * 2;
  const ctx = canvas.getContext('2d')!;
  ctx.setTransform(2, 0, 0, 2, 0, 0);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, h);
  ctx.font = '11px "JetBrains Mono", monospace';
  return ctx;
}

// ---------------- support glyphs ----------------
function drawPin(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.strokeStyle = INK;
  ctx.fillStyle = INK;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x - 11, y + 18);
  ctx.lineTo(x + 11, y + 18);
  ctx.closePath();
  ctx.fill();
  hatch(ctx, x - 16, x + 16, y + 18);
}

function drawRoller(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.strokeStyle = INK;
  ctx.fillStyle = INK;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x - 11, y + 14);
  ctx.lineTo(x + 11, y + 14);
  ctx.closePath();
  ctx.fill();
  for (const dx of [-6, 6]) {
    ctx.beginPath();
    ctx.arc(x + dx, y + 18, 3.5, 0, Math.PI * 2);
    ctx.stroke();
  }
  hatch(ctx, x - 16, x + 16, y + 22);
}

function hatch(ctx: CanvasRenderingContext2D, x1: number, x2: number, y: number) {
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x1, y);
  ctx.lineTo(x2, y);
  ctx.stroke();
  for (let x = x1; x < x2; x += 6) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - 5, y + 6);
    ctx.stroke();
  }
}

function drawFixed(ctx: CanvasRenderingContext2D, x: number, y: number, side: 'left' | 'right') {
  const s = side === 'left' ? -1 : 1;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y - 26);
  ctx.lineTo(x, y + 26);
  ctx.stroke();
  ctx.lineWidth = 1;
  for (let yy = y - 26; yy <= y + 22; yy += 8) {
    ctx.beginPath();
    ctx.moveTo(x, yy);
    ctx.lineTo(x + s * 8, yy + 8);
    ctx.stroke();
  }
}

// ---------------- load glyphs ----------------
function arrow(ctx: CanvasRenderingContext2D, x: number, yTop: number, yBot: number) {
  ctx.strokeStyle = INK;
  ctx.fillStyle = INK;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x, yTop);
  ctx.lineTo(x, yBot - 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x, yBot);
  ctx.lineTo(x - 4.5, yBot - 8);
  ctx.lineTo(x + 4.5, yBot - 8);
  ctx.closePath();
  ctx.fill();
}

function drawUdl(ctx: CanvasRenderingContext2D, x1: number, x2: number, beamY: number, label: string) {
  const top = beamY - 42;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x1, top);
  ctx.lineTo(x2, top);
  ctx.stroke();
  const n = Math.max(2, Math.floor((x2 - x1) / 26));
  for (let i = 0; i <= n; i++) {
    arrow(ctx, x1 + ((x2 - x1) * i) / n, top, beamY - 3);
  }
  ctx.fillStyle = INK;
  ctx.textAlign = 'center';
  ctx.fillText(label, (x1 + x2) / 2, top - 8);
}

function drawMomentArrow(ctx: CanvasRenderingContext2D, x: number, y: number, label: string, ccw: boolean) {
  ctx.strokeStyle = INK;
  ctx.fillStyle = INK;
  ctx.lineWidth = 1.5;
  const r = 16;
  ctx.beginPath();
  ctx.arc(x, y, r, -Math.PI * 0.75, Math.PI * 0.6, false);
  ctx.stroke();
  const endA = ccw ? -Math.PI * 0.75 : Math.PI * 0.6;
  const ex = x + r * Math.cos(endA);
  const ey = y + r * Math.sin(endA);
  ctx.beginPath();
  ctx.moveTo(ex, ey);
  ctx.lineTo(ex + 7, ey - 2);
  ctx.lineTo(ex + 1, ey + 7);
  ctx.closePath();
  ctx.fill();
  ctx.textAlign = 'center';
  ctx.fillText(label, x, y - r - 10);
}

function dimLine(ctx: CanvasRenderingContext2D, x1: number, x2: number, y: number, label: string) {
  ctx.strokeStyle = GRAY;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x1, y);
  ctx.lineTo(x2, y);
  ctx.stroke();
  for (const x of [x1, x2]) {
    ctx.beginPath();
    ctx.moveTo(x, y - 5);
    ctx.lineTo(x, y + 5);
    ctx.stroke();
  }
  ctx.fillStyle = GRAY;
  ctx.textAlign = 'center';
  ctx.fillText(label, (x1 + x2) / 2, y - 6);
}

// ============================================================
// Simple-beam loading diagram
// ============================================================
export function SimpleLoadingDiagram({
  id, beamType, L, loads,
}: { id: string; beamType: BeamType; L: number; loads: Load[] }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || L <= 0) return;
    const H = 230;
    const ctx = setup(canvas, H);
    const mx = 70;
    const bw = W - 2 * mx;
    const beamY = 132;
    const sx = (v: number) => mx + (Math.min(Math.max(v, 0), L) / L) * bw;

    // beam
    ctx.strokeStyle = INK;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(mx, beamY);
    ctx.lineTo(mx + bw, beamY);
    ctx.stroke();

    // supports
    if (beamType === 'simple') {
      drawPin(ctx, mx, beamY + 2);
      drawRoller(ctx, mx + bw, beamY + 2);
    } else if (beamType === 'cantilever') {
      drawFixed(ctx, mx, beamY, 'left');
    } else if (beamType === 'fixed') {
      drawFixed(ctx, mx, beamY, 'left');
      drawFixed(ctx, mx + bw, beamY, 'right');
    } else {
      drawFixed(ctx, mx, beamY, 'left');
      drawRoller(ctx, mx + bw, beamY + 2);
    }

    // loads
    for (const ld of loads) {
      if (!ld.magnitude) continue;
      if (ld.type === 'point') {
        const x = sx(ld.position);
        arrow(ctx, x, beamY - 52, beamY - 3);
        ctx.fillStyle = INK;
        ctx.textAlign = 'center';
        ctx.fillText(`${fmt(ld.magnitude, 1)} k`, x, beamY - 60);
      } else if (ld.type === 'udl') {
        drawUdl(ctx, mx, mx + bw, beamY, `${fmt(ld.magnitude, 2)} k/ft`);
      } else if (ld.type === 'pudl') {
        drawUdl(ctx, sx(Math.min(ld.start, ld.end)), sx(Math.max(ld.start, ld.end)), beamY, `${fmt(ld.magnitude, 2)} k/ft`);
      } else if (ld.type === 'moment') {
        drawMomentArrow(ctx, sx(ld.position), beamY - 26, `${fmt(ld.magnitude, 1)} k-ft`, ld.magnitude >= 0);
      }
    }

    dimLine(ctx, mx, mx + bw, beamY + 52, `L = ${fmt(L, 2)} ft`);

    // support labels
    ctx.fillStyle = GRAY;
    ctx.textAlign = 'center';
    ctx.fillText('A', mx, beamY + 78);
    ctx.fillText('B', mx + bw, beamY + 78);
  }, [id, beamType, L, loads]);

  return <canvas id={id} ref={ref} className="w-full h-auto" />;
}

// ============================================================
// Continuous-beam loading diagram
// ============================================================
export function ContinuousLoadingDiagram({
  id, spans, pattern, magnitude, loaded,
}: { id: string; spans: number[]; pattern: ContPattern; magnitude: number; loaded: boolean[] }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const H = 230;
    const ctx = setup(canvas, H);
    const mx = 60;
    const bw = W - 2 * mx;
    const beamY = 132;
    const total = spans.reduce((a, b) => a + b, 0);
    if (total <= 0) return;
    const sx = (v: number) => mx + (v / total) * bw;

    ctx.strokeStyle = INK;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(mx, beamY);
    ctx.lineTo(mx + bw, beamY);
    ctx.stroke();

    // supports & labels
    let acc = 0;
    const positions = [0, ...spans.map((s) => (acc += s))];
    positions.forEach((p, i) => {
      const x = sx(p);
      if (i === 0) drawPin(ctx, x, beamY + 2);
      else drawRoller(ctx, x, beamY + 2);
      ctx.fillStyle = GRAY;
      ctx.textAlign = 'center';
      ctx.fillText(String.fromCharCode(65 + i), x, beamY + 78);
    });

    // loads
    let x0 = 0;
    spans.forEach((s, i) => {
      if (loaded[i]) {
        if (pattern === 'point-center') {
          const x = sx(x0 + s / 2);
          arrow(ctx, x, beamY - 50, beamY - 3);
          ctx.fillStyle = INK;
          ctx.textAlign = 'center';
          ctx.fillText(`${fmt(magnitude, 1)} k`, x, beamY - 58);
        } else {
          drawUdl(ctx, sx(x0) + (i === 0 ? 0 : 2), sx(x0 + s) - 2, beamY, i === 0 ? `${fmt(magnitude, 2)} k/ft` : '');
        }
      }
      dimLine(ctx, sx(x0), sx(x0 + s), beamY + 52, `${fmt(s, 1)} ft`);
      x0 += s;
    });
  }, [id, spans, pattern, magnitude, loaded]);

  return <canvas id={id} ref={ref} className="w-full h-auto" />;
}

// ============================================================
// Generic result-curve diagram (V, M, deflection)
// ============================================================
export function CurveDiagram({
  id, x, values, unit, digits = 2, supports,
}: {
  id: string;
  x: number[];
  values: number[];
  unit: string;
  digits?: number;
  /** x-locations of supports (for tick marks) */
  supports?: number[];
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || x.length < 2) return;
    const H = 220;
    const ctx = setup(canvas, H);
    const mL = 70, mR = 30, mT = 26, mB = 30;
    const pw = W - mL - mR;
    const ph = H - mT - mB;
    const L = x[x.length - 1];

    let vMin = Math.min(0, ...values);
    let vMax = Math.max(0, ...values);
    if (vMax - vMin < 1e-9) { vMax = 1; vMin = -1; }
    const pad = (vMax - vMin) * 0.12;
    vMax += pad; vMin -= pad;

    const px = (v: number) => mL + (v / L) * pw;
    const py = (v: number) => mT + ((vMax - v) / (vMax - vMin)) * ph;

    // grid
    ctx.strokeStyle = LIGHT;
    ctx.lineWidth = 1;
    for (let i = 0; i <= 8; i++) {
      const gx = mL + (pw * i) / 8;
      ctx.beginPath(); ctx.moveTo(gx, mT); ctx.lineTo(gx, mT + ph); ctx.stroke();
    }
    for (let i = 0; i <= 4; i++) {
      const gy = mT + (ph * i) / 4;
      ctx.beginPath(); ctx.moveTo(mL, gy); ctx.lineTo(mL + pw, gy); ctx.stroke();
    }

    // support ticks
    if (supports) {
      ctx.strokeStyle = '#c9c9c9';
      ctx.setLineDash([4, 3]);
      for (const s of supports) {
        ctx.beginPath(); ctx.moveTo(px(s), mT); ctx.lineTo(px(s), mT + ph); ctx.stroke();
      }
      ctx.setLineDash([]);
    }

    // zero axis
    const y0 = py(0);
    ctx.strokeStyle = GRAY;
    ctx.lineWidth = 1.25;
    ctx.beginPath(); ctx.moveTo(mL, y0); ctx.lineTo(mL + pw, y0); ctx.stroke();

    // filled curve
    ctx.beginPath();
    ctx.moveTo(px(x[0]), y0);
    for (let i = 0; i < x.length; i++) ctx.lineTo(px(x[i]), py(values[i]));
    ctx.lineTo(px(x[x.length - 1]), y0);
    ctx.closePath();
    ctx.fillStyle = 'rgba(23,23,23,0.09)';
    ctx.fill();

    ctx.beginPath();
    for (let i = 0; i < x.length; i++) {
      const X = px(x[i]), Y = py(values[i]);
      if (i === 0) ctx.moveTo(X, Y); else ctx.lineTo(X, Y);
    }
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.stroke();

    // extreme annotations
    let iMax = 0, iMin = 0;
    values.forEach((v, i) => {
      if (v > values[iMax]) iMax = i;
      if (v < values[iMin]) iMin = i;
    });
    ctx.font = '11px "JetBrains Mono", monospace';
    const annotate = (i: number, above: boolean) => {
      const X = px(x[i]), Y = py(values[i]);
      ctx.fillStyle = INK;
      ctx.beginPath();
      ctx.arc(X, Y, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.textAlign = X > W - 150 ? 'right' : X < mL + 90 ? 'left' : 'center';
      ctx.fillText(
        `${fmt(values[i], digits)} @ ${fmt(x[i], 1)} ft`,
        X,
        above ? Math.max(Y - 9, mT + 10) : Math.min(Y + 16, mT + ph - 4),
      );
    };
    if (Math.abs(values[iMax]) > 1e-9) annotate(iMax, true);
    if (Math.abs(values[iMin]) > 1e-9 && iMin !== iMax) annotate(iMin, false);

    // axis labels
    ctx.fillStyle = GRAY;
    ctx.textAlign = 'left';
    ctx.fillText(unit, 8, mT + 4);
    ctx.textAlign = 'right';
    ctx.fillText(`${fmt(L, 1)} ft`, mL + pw, mT + ph + 16);
    ctx.textAlign = 'left';
    ctx.fillText('0', mL, mT + ph + 16);
  }, [id, x, values, unit, digits, supports]);

  return <canvas id={id} ref={ref} className="w-full h-auto" />;
}
