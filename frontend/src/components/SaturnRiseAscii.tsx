'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';

const W = 200,
  H = 100;
const HZ = 70;
const FG = 60;
const CAM = 8;
const SC = [84, 33],
  SR = 25;
const INC = 0.34,
  ROLL = 0.14;
const SUN = [173, 55];
const MOON_R = 2.85,
  MOON_T = 140;
const DOTS = ' ·•●';
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => v / 16 - 0.47);

const BRIGHT = [
  [176, 12, 1, 4.4],
  [12, 9, 0.85, 3.6],
  [194, 33, 0.8, 5.2],
  [150, 5, 0.75, 4.9],
  [7, 44, 0.7, 3.9],
];

const PLUMES = [
  [146, 72, 40, 0.2, 0.9],
  [162, 75, 58, 0.22, 1.1],
  [124, 71, 26, 0.18, 0.8],
  [22, 77, 38, 0.2, 0.85],
];

const STRIPES = [25, 46, 92];

const norm = (v: number[]): number[] => {
  const l = Math.hypot(...v);
  return v.map((c) => c / l);
};

const NR = [-Math.sin(ROLL) * Math.cos(INC), Math.cos(ROLL) * Math.cos(INC), Math.sin(INC)];
const E1 = norm([NR[1], -NR[0], 0]);
const E2 = [-NR[2] * E1[1], NR[2] * E1[0], NR[0] * E1[1] - NR[1] * E1[0]];
const LS = norm([0.6, 0.28, 0.72]);
const LG = norm([0.78, 0.42, 0.3]);

function hash(x: number, y: number): number {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function noise(x: number, y: number, period: number): number {
  const xi = Math.floor(x),
    yi = Math.floor(y);
  const fx = x - xi,
    fy = y - yi;
  const u = fx * fx * (3 - 2 * fx),
    v = fy * fy * (3 - 2 * fy);
  let x0 = xi,
    x1 = xi + 1;
  if (period) {
    x0 = ((xi % period) + period) % period;
    x1 = (x0 + 1) % period;
  }
  const a = hash(x0, yi),
    b = hash(x1, yi),
    c = hash(x0, yi + 1),
    d = hash(x1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

function fbm(x: number, y: number, octaves: number, period: number): number {
  let s = 0,
    n = 0,
    amp = 0.5,
    f = 1;
  for (let i = 0; i < octaves; i++) {
    s += amp * noise(x * f, y * f, period * f);
    n += amp;
    amp *= 0.5;
    f *= 2;
  }
  return s / n;
}

const clamp = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (a: number, b: number, v: number): number => {
  const k = clamp((v - a) / (b - a));
  return k * k * (3 - 2 * k);
};
const mix = (a: number, b: number, k: number): number => a + (b - a) * k;

function ring(r: number): [number, number, number, number] {
  const fine = 0.88 + 0.24 * fbm(r * 90, 3.3, 2, 0);
  let a = 0,
    c = [0, 0, 0];
  if (r > 1.24 && r < 1.53) {
    a = 0.2 * fine;
    c = [0.55, 0.52, 0.48];
  } else if (r >= 1.53 && r < 1.95) {
    a = Math.min(1, (0.7 + 0.4 * smooth(1.53, 1.7, r)) * fine);
    c = [1, 0.9, 0.72];
  } else if (r >= 1.95 && r < 2.03) {
    a = 0.02;
    c = [0.5, 0.48, 0.45];
  } else if (r >= 2.03 && r < 2.27) {
    a = r > 2.2 && r < 2.23 ? 0.04 : 0.55 * fine;
    c = [0.78, 0.74, 0.68];
  } else if (r > 2.315 && r < 2.335) {
    a = 0.4;
    c = [0.85, 0.82, 0.76];
  }
  return [clamp(a), c[0], c[1], c[2]];
}

function ice(X: number, Z: number): number {
  let h = 0.9 * fbm(X * 0.03 + 11, Z * 0.03, 3, 0);
  const w = fbm(X * 0.012, Z * 0.012 + 5, 2, 0);
  const crest = 1 - Math.abs(2 * noise(X * 0.016 + w * 2.5, Z * 0.045 + w * 3, 0) - 1);
  h += 4.5 * Math.pow(crest, 8) * smooth(0.45, 0.65, fbm(X * 0.02 + 3, Z * 0.02, 2, 0));
  for (const zc of STRIPES) {
    const zs = zc + 0.08 * X + zc * 0.12 * (fbm(X * 0.01, zc, 2, 0) - 0.5);
    const wd = zc * 0.07,
      d = Math.abs(Z - zs) / wd;
    h += wd * (-0.45 * Math.exp(-d * d) + 0.25 * Math.exp(-Math.pow((d - 1.8) / 0.7, 2)));
  }
  return h;
}

function initSaturnRiseRenderer() {
  const N = W * H;
  const chars: string[] = new Array(N).fill(' ');

  const dot = (k: number, cr: number, cg: number, cb: number, floor: number, cap: number) => {
    const x = k % W,
      r = (k / W) | 0;
    const peak = Math.max(cr, cg, cb, 1e-4);
    const level = clamp(floor + (1 - floor) * Math.pow(peak, 0.85) * 0.95);
    const step = Math.max(0, Math.min(3, Math.round(level * 3 + BAYER[(r & 3) * 4 + (x & 3)])));
    chars[k] = DOTS[step];
  };

  const sr = new Float32Array(N),
    sg = new Float32Array(N),
    sb = new Float32Array(N),
    sf = new Float32Array(N),
    scap = new Float32Array(N).fill(1);
  const solid = new Uint8Array(N);

  const crest = new Float32Array(W + 2);
  for (let x = -1; x <= W; x++) {
    const m = 1 - Math.abs(2 * fbm(x * 0.035 + 4, 1.5, 3, 0) - 1);
    crest[x + 1] =
      HZ -
      0.5 -
      (1.2 +
        4.5 * m * m +
        6 * Math.exp(-Math.pow((x - 38) / 30, 2)) +
        3 * Math.exp(-Math.pow((x - 190) / 14, 2)) +
        0.8 * hash(x, 7));
  }

  const gnd = new Uint8Array(N);
  const gx = new Float32Array(N),
    gz = new Float32Array(N),
    gy = new Float32Array(N);
  for (let c = 0; c < W; c++) {
    const dir = (c + 0.5 - 100) / FG;
    let topR = H,
      Z = 10,
      prevF = 1e9,
      prevZ = 0,
      prevY = 0;
    while (Z < 3000 && topR > 0) {
      const hy = ice(dir * Z, Z);
      const yf = HZ + (FG * (CAM - hy)) / Z;
      const r0 = Math.max(0, Math.ceil(yf - 0.5));
      for (let r = r0; r < topR; r++) {
        const a = prevF > yf + 1e-6 ? clamp((prevF - (r + 0.5)) / (prevF - yf)) : 1;
        const k = r * W + c;
        gnd[k] = 1;
        gz[k] = prevZ ? mix(prevZ, Z, a) : Z;
        gx[k] = dir * gz[k];
        gy[k] = prevZ ? mix(prevY, hy, a) : hy;
      }
      if (r0 < topR) topR = r0;
      prevF = yf;
      prevY = hy;
      prevZ = Z;
      Z += 0.05 + Z * 0.012;
    }
  }

  for (let r = 0; r < H; r++) {
    for (let x = 0; x < W; x++) {
      const k = r * W + x;
      const y = r + 0.5;
      let cr = 0,
        cg = 0,
        cb = 0,
        floor = 0,
        cap = 1;
      const ds = Math.hypot(x + 0.5 - SUN[0], y - SUN[1]);
      if (gnd[k]) {
        solid[k] = 1;
        const X = gx[k],
          Z = gz[k],
          Y = gy[k];
        const e = 0.1 + Z * 0.006;
        const hx = (ice(X + e, Z) - ice(X - e, Z)) / (2 * e),
          hz = (ice(X, Z + e) - ice(X, Z - e)) / (2 * e);
        const nl = Math.hypot(hx, 1, hz);
        const nx = -hx / nl,
          ny = 1 / nl,
          nz = -hz / nl;
        let lam = Math.max(0, nx * LG[0] + ny * LG[1] + nz * LG[2]);
        const sunLight = Math.max(0, 2.2 * lam - 0.25);
        cr = sunLight * 1.0 + 0.06;
        cg = sunLight * 0.98 + 0.12;
        cb = sunLight * 0.95 + 0.28;
        floor = 0.02;
        cap = 0.5 + 0.6 * clamp(Math.max(cr, cg, cb));
      } else if (y >= crest[x + 1]) {
        solid[k] = 1;
        const below = y - crest[x + 1];
        const rim = Math.exp(-below / 0.9) * (0.25 + 0.9 * Math.exp(-Math.abs(x - SUN[0]) / 30));
        cr = rim * 1.0;
        cg = rim * 0.97;
        cb = rim * 0.9;
        cr += 0.3 * Math.exp(-ds / 7);
        cg += 0.26 * Math.exp(-ds / 7);
        cb += 0.2 * Math.exp(-ds / 7);
        floor = 0.03;
        cap = 0.22 + 0.85 * clamp(Math.max(cr, cg, cb));
      } else {
        const hs = hash(x * 3 + 1, r * 7 + 2);
        if (hs > 0.992) {
          cr = 0.6;
          cg = 0.6;
          cb = 0.7;
        }
      }
      sr[k] = cr;
      sg[k] = cg;
      sb[k] = cb;
      sf[k] = floor;
      scap[k] = cap;
    }
  }

  for (let k = 0; k < N; k++) dot(k, sr[k], sg[k], sb[k], sf[k], scap[k]);

  // Rings and Saturn setup
  const RB = 520,
    TB = 720,
    R0 = 1.1,
    R1 = 2.4;
  const rt = new Float32Array(RB * TB);
  const omega = new Float32Array(RB);
  for (let i = 0; i < RB; i++) {
    const rr = R0 + ((R1 - R0) * (i + 0.5)) / RB;
    omega[i] = 0.05 * Math.pow(rr, -1.5);
    for (let j = 0; j < TB; j++) rt[i * TB + j] = 0.8 + 0.4 * fbm(j / 16, i * 0.3, 3, 45);
  }

  const sat: number[] = [];
  const pa = new Float32Array(N),
    pl = new Float32Array(N),
    pz = new Float32Array(N).fill(-9);
  const ra = new Float32Array(N),
    rcr = new Float32Array(N),
    rcg = new Float32Array(N),
    rcb = new Float32Array(N),
    rz = new Float32Array(N),
    rbin = new Int16Array(N),
    rth = new Float32Array(N);

  const SUB = [
    [0.25, 0.25],
    [0.75, 0.25],
    [0.25, 0.75],
    [0.75, 0.75],
  ];

  for (let r = 0; r < HZ; r++) {
    for (let x = 0; x < W; x++) {
      const k = r * W + x;
      if (solid[k]) continue;
      let acov = 0,
        ar = 0,
        ag = 0,
        ab = 0,
        pcov = 0;
      for (const [ox, oy] of SUB) {
        const px = (x + ox - SC[0]) / SR,
          py = -(r + oy - SC[1]) / SR;
        const q2 = px * px + py * py;
        const zs = q2 < 1 ? Math.sqrt(1 - q2) : -9;
        if (q2 < 1) pcov += 0.25;
        const zr = -(NR[0] * px + NR[1] * py) / NR[2];
        const rr = Math.sqrt(q2 + zr * zr);
        if (rr < R0 || rr > R1 || zr < zs) continue;
        const [a, cr, cg, cb] = ring(rr);
        if (a <= 0) continue;
        const d = px * LS[0] + py * LS[1] + zr * LS[2];
        const perp = Math.sqrt(Math.max(0, rr * rr - d * d));
        const lit = d < 0 ? smooth(0.98, 1.03, perp) : 1;
        const b = 0.92 * (0.08 + 0.92 * lit);
        acov += a * 0.25;
        ar += a * cr * b * 0.25;
        ag += a * cg * b * 0.25;
        ab += a * cb * b * 0.25;
      }
      const px = (x + 0.5 - SC[0]) / SR,
        py = -(r + 0.5 - SC[1]) / SR;
      const q2 = px * px + py * py;
      if (pcov > 0) {
        const qc = Math.min(0.999, Math.sqrt(q2));
        const nz = Math.sqrt(1 - qc * qc),
          nx = q2 > 0.998 ? (px / Math.sqrt(q2)) * qc : px,
          ny = q2 > 0.998 ? (py / Math.sqrt(q2)) * qc : py;
        const ndl = nx * LS[0] + ny * LS[1] + nz * LS[2];
        const day = smooth(-0.03, 0.14, ndl) * (0.3 + 0.85 * Math.sqrt(clamp(ndl)));
        const limb = 0.5 + 0.5 * Math.sqrt(nz);
        pl[k] = day * limb + 0.05 * limb;
        pa[k] = pcov;
        pz[k] = nz;
      }
      const zr = -(NR[0] * px + NR[1] * py) / NR[2];
      const rr = Math.sqrt(q2 + zr * zr);
      if (acov > 0.002) {
        ra[k] = acov;
        rcr[k] = ar;
        rcg[k] = ag;
        rcb[k] = ab;
        rz[k] = zr;
        rbin[k] = Math.max(0, Math.min(RB - 1, Math.floor(((rr - R0) / (R1 - R0)) * RB)));
        rth[k] = Math.atan2(px * E2[0] + py * E2[1] + zr * E2[2], px * E1[0] + py * E1[1] + zr * E1[2]);
      }
      if (pcov > 0 || acov > 0.002) sat.push(k);
    }
  }

  const live = new Uint8Array(N);
  for (const k of sat) live[k] = 1;

  const cells: number[] = [];
  for (let k = 0; k < N; k++) if (live[k]) cells.push(k);
  const dirty = new Uint8Array(H);
  for (const k of cells) dirty[(k / W) | 0] = 1;

  const fr = new Float32Array(N),
    fg = new Float32Array(N),
    fb = new Float32Array(N),
    ff = new Float32Array(N),
    fc = new Float32Array(N);
  const lines: string[] = [];
  for (let r = 0; r < H; r++) lines.push(chars.slice(r * W, (r + 1) * W).join(''));

  return function renderSaturnFrame(t: number): string {
    for (const k of cells) {
      fr[k] = sr[k];
      fg[k] = sg[k];
      fb[k] = sb[k];
      ff[k] = sf[k];
      fc[k] = scap[k];
    }

    for (const k of sat) {
      const ringOver = ra[k] > 0 && (pa[k] === 0 || rz[k] > pz[k] - 1e-3);
      const drawRing = () => {
        const b = rbin[k];
        let th = (rth[k] - omega[b] * t) / (Math.PI * 2);
        th = (((th % 1) + 1) % 1) * TB;
        const j0 = th | 0,
          j1 = (j0 + 1) % TB,
          aj = th - j0;
        let s = rt[b * TB + j0] * (1 - aj) + rt[b * TB + j1] * aj;
        const a = ra[k];
        fr[k] = fr[k] * (1 - a) + rcr[k] * s;
        fg[k] = fg[k] * (1 - a) + rcg[k] * s;
        fb[k] = fb[k] * (1 - a) + rcb[k] * s;
        fc[k] = 1;
      };

      if (ra[k] > 0 && !ringOver) drawRing();
      if (pa[k] > 0) {
        const l = pl[k];
        fr[k] = mix(fr[k], 0.9 * l, pa[k]);
        fg[k] = mix(fg[k], 0.8 * l, pa[k]);
        fb[k] = mix(fb[k], 0.65 * l, pa[k]);
        fc[k] = 0.35 + 0.7 * clamp(Math.max(fr[k], fg[k], fb[k]));
      }
      if (ringOver) drawRing();
    }

    for (const k of cells) dot(k, fr[k], fg[k], fb[k], ff[k], fc[k]);
    for (let r = 0; r < H; r++) if (dirty[r]) lines[r] = chars.slice(r * W, (r + 1) * W).join('');
    return lines.join('\n');
  };
}

export const SaturnRiseAscii: React.FC<{ className?: string }> = ({ className = '' }) => {
  const [frameText, setFrameText] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [timeVal, setTimeVal] = useState<number>(0);
  const rendererRef = useRef<((t: number) => string) | null>(null);

  useEffect(() => {
    rendererRef.current = initSaturnRiseRenderer();
    setFrameText(rendererRef.current(0));
  }, []);

  useEffect(() => {
    if (!isPlaying) return;
    let t = timeVal;
    const interval = setInterval(() => {
      t += 0.066; // 15 FPS cadence
      setTimeVal(t);
      if (rendererRef.current) {
        setFrameText(rendererRef.current(t));
      }
    }, 66);

    return () => clearInterval(interval);
  }, [isPlaying, timeVal]);

  return (
    <div className={`relative rounded-2xl overflow-hidden border border-[#252935] bg-[#04050a] shadow-2xl ${className}`}>
      {/* Top Meta Header */}
      <div className="px-4 py-2.5 bg-[#0b0d14] border-b border-[#161922] flex items-center justify-between text-xs font-mono text-[#8a8070]">
        <div className="flex items-center space-x-3">
          <span className="font-semibold text-[#f6e0b8]">saturn rise</span>
          <span className="text-[#3a3f4c]">|</span>
          <span className="text-[11px] text-[#7f8a96]">200×100 • 15 fps • halftone dither</span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-1 rounded hover:bg-[#161922] text-[#dcae74] hover:text-white transition"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => {
              setTimeVal(0);
              if (rendererRef.current) setFrameText(rendererRef.current(0));
            }}
            className="p-1 rounded hover:bg-[#161922] text-[#7f8a96] hover:text-white transition"
            title="Reset scene"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <span className="text-[10px] text-[#5e8bbf] px-1.5 py-0.5 rounded border border-[#1f3a66]">
            ascii.rest
          </span>
        </div>
      </div>

      {/* Render Output */}
      <div className="p-3 sm:p-5 overflow-x-auto flex justify-center items-center bg-[#04050a]">
        <pre
          className="font-mono text-[4.5px] sm:text-[6px] md:text-[7px] leading-[1] tracking-[0.05em] text-[#ddebf8] select-none whitespace-pre"
          style={{
            fontFamily: '"JetBrains Mono", "SFMono-Regular", Menlo, monospace',
            textShadow: '0 0 3px rgba(86, 179, 220, 0.25)',
          }}
        >
          {frameText || 'Tracer calculating Saturn and ring planes...'}
        </pre>
      </div>

      {/* Bottom Scene Note */}
      <div className="px-4 py-2 bg-[#0b0d14]/90 border-t border-[#161922] flex items-center justify-between text-[11px] font-mono text-[#7f8a96]">
        <span>Saturn and rings hanging over cracked ice plain · Orbital shadow & sun glare</span>
        <span className="text-[#c4925a] font-sans italic">Scene by @Shubham · ascii.rest</span>
      </div>
    </div>
  );
};
