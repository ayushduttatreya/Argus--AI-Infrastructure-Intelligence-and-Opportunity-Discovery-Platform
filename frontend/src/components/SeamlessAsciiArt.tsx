'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, RotateCcw, Sparkles } from 'lucide-react';

const W = 200;
const H = 100;
const DOTS = ' ·•●';
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => v / 16 - 0.47);

// ==========================================
// PALETTES (Exact from ascii.rest)
// ==========================================
export const SATURN_PALETTE = [
  '#0b0d14',
  '#161922',
  '#252935',
  '#3a3f4c',
  '#3b2a1a',
  '#5c4027',
  '#7f5a35',
  '#a37645',
  '#c4925a',
  '#dcae74',
  '#ecc893',
  '#f6e0b8',
  '#6b6a6c',
  '#8a8070',
  '#b3a892',
  '#d8cfba',
  '#7f8a96',
  '#0e1a2e',
  '#15284a',
  '#1f3a66',
  '#2c5085',
  '#3f6aa3',
  '#5e8bbf',
  '#89afd6',
  '#b6d0ea',
  '#ddebf8',
  '#2a7fb0',
  '#56b3dc',
  '#ffffff',
  '#fff0c8',
];

export const KYOTO_PALETTE = [
  '#1c1d4a',
  '#262759',
  '#33316b',
  '#433d7c',
  '#574a8c',
  '#6e5a9a',
  '#8a5a92',
  '#a8668f',
  '#c4748f',
  '#db8a95',
  '#ec9f9c',
  '#f6b8a8',
  '#fbd0b8',
  '#fff1d8',
  '#fffaf0',
  '#7e5f9e',
  '#f9d3dc',
  '#f2b2c4',
  '#e28fab',
  '#c66e92',
  '#9c5279',
  '#74405f',
  '#ffd9a0',
  '#ffbb6a',
  '#f29a4a',
  '#d0763a',
  '#a35a35',
  '#2a2240',
  '#3a2c50',
  '#4a3860',
  '#5b4f86',
  '#7a6aa0',
  '#2c3a3a',
  '#3d4c46',
  '#56604f',
  '#9a6aa0',
  '#b47ea6',
  '#4a3038',
  '#6a4448',
  '#2b3a6a',
  '#3e4f86',
];

// Color & math helpers
const clamp = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (a: number, b: number, v: number): number => {
  const k = clamp((v - a) / (b - a));
  return k * k * (3 - 2 * k);
};
const mix = (a: number, b: number, k: number): number => a + (b - a) * k;
const hex = (s: string): [number, number, number] => [
  parseInt(s.slice(1, 3), 16) / 255,
  parseInt(s.slice(3, 5), 16) / 255,
  parseInt(s.slice(5, 7), 16) / 255,
];

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

const norm = (v: number[]): number[] => {
  const l = Math.hypot(...v);
  return v.map((c) => c / l);
};

// ==========================================
// 1. SATURN RISE ENGINE (30-Color Palette)
// ==========================================
export function buildSaturnRiseEngine() {
  const HZ = 70;
  const FG = 60;
  const CAM = 8;
  const SC = [84, 33];
  const SR = 25;
  const INC = 0.34;
  const ROLL = 0.14;
  const SUN = [173, 55];
  const STRIPES = [25, 46, 92];
  const COVER = [0, 0.3, 0.6, 1];

  const NR = [-Math.sin(ROLL) * Math.cos(INC), Math.cos(ROLL) * Math.cos(INC), Math.sin(INC)];
  const E1 = norm([NR[1], -NR[0], 0]);
  const E2 = [-NR[2] * E1[1], NR[2] * E1[0], NR[0] * E1[1] - NR[1] * E1[0]];
  const LS = norm([0.6, 0.28, 0.72]);
  const LG = norm([0.78, 0.42, 0.3]);

  const P = SATURN_PALETTE.map(hex);
  const N = W * H;
  const lut = new Uint8Array(32768).fill(255);
  const nearest = (r: number, g: number, b: number): number => {
    const k =
      (Math.min(31, (r * 31.99) | 0) << 10) |
      (Math.min(31, (g * 31.99) | 0) << 5) |
      Math.min(31, (b * 31.99) | 0);
    if (lut[k] !== 255) return lut[k];
    let best = 0,
      bd = 1e9;
    for (let i = 0; i < P.length; i++) {
      const dr = P[i][0] - r,
        dg = P[i][1] - g,
        db = P[i][2] - b;
      const d = 0.3 * dr * dr + 0.5 * dg * dg + 0.2 * db * db;
      if (d < bd) {
        bd = d;
        best = i;
      }
    }
    return (lut[k] = best);
  };

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
    const cr = 1 - Math.abs(2 * noise(X * 0.016 + w * 2.5, Z * 0.045 + w * 3, 0) - 1);
    h += 4.5 * Math.pow(cr, 8) * smooth(0.45, 0.65, fbm(X * 0.02 + 3, Z * 0.02, 2, 0));
    for (const zc of STRIPES) {
      const zs = zc + 0.08 * X + zc * 0.12 * (fbm(X * 0.01, zc, 2, 0) - 0.5);
      const wd = zc * 0.07,
        d = Math.abs(Z - zs) / wd;
      h += wd * (-0.45 * Math.exp(-d * d) + 0.25 * Math.exp(-Math.pow((d - 1.8) / 0.7, 2)));
    }
    return h;
  }

  function plates(X: number, Z: number): [number, number] {
    const xi = Math.floor(X),
      zi = Math.floor(Z);
    let d1 = 9,
      d2 = 9,
      id = 0;
    for (let j = -1; j <= 1; j++) {
      for (let i = -1; i <= 1; i++) {
        const cx = xi + i,
          cz = zi + j;
        const dx = cx + hash(cx, cz + 41) - X,
          dz = cz + hash(cx + 43, cz) - Z;
        const d = Math.sqrt(dx * dx + dz * dz);
        if (d < d1) {
          d2 = d1;
          d1 = d;
          id = hash(cx + 7, cz + 9);
        } else if (d < d2) d2 = d;
      }
    }
    return [d2 - d1, id];
  }

  const chars: string[] = new Array(N).fill(' ');
  const cols = new Uint8Array(N);

  const dot = (k: number, cr: number, cg: number, cb: number, floor: number, cap: number) => {
    const x = k % W,
      r = (k / W) | 0;
    const peak = Math.max(cr, cg, cb, 1e-4);
    const level = clamp(floor + (1 - floor) * Math.pow(peak, 0.85) * 0.95);
    const step = Math.max(0, Math.min(3, Math.round(level * 3 + BAYER[(r & 3) * 4 + (x & 3)])));
    chars[k] = DOTS[step];
    const want = step ? Math.min(1, (level + 0.06) / COVER[step]) : 0;
    const s = Math.min(cap, 0.3 + 0.7 * want) / peak;
    cols[k] = nearest(clamp(cr * s), clamp(cg * s), clamp(cb * s));
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
          Z = gz[k];
        const e = 0.1 + Z * 0.006;
        const hx = (ice(X + e, Z) - ice(X - e, Z)) / (2 * e),
          hz = (ice(X, Z + e) - ice(X, Z - e)) / (2 * e);
        const nl = Math.hypot(hx, 1, hz);
        const nx = -hx / nl,
          ny = 1 / nl,
          nz = -hz / nl;
        let lam = Math.max(0, nx * LG[0] + ny * LG[1] + nz * LG[2]);
        const [edge] = plates(X * 0.14, Z * 0.14);
        const near = smooth(130, 30, Z);
        const crack = smooth(0.05 + 0.6 / Z, 0.01, edge) * near;
        let deep = 0;
        for (const zc of STRIPES) {
          const zs = zc + 0.08 * X + zc * 0.12 * (fbm(X * 0.01, zc, 2, 0) - 0.5);
          deep = Math.max(deep, Math.exp(-Math.pow(Math.abs(Z - zs) / (zc * 0.07), 2) * 1.6));
        }
        const albedo = 0.85 + 0.25 * (fbm(X * 0.2, Z * 0.2, 2, 0) - 0.5);
        const sunLight = Math.max(0, 2.2 * lam - 0.25);
        cr = albedo * (sunLight * 1.0 + 0.06);
        cg = albedo * (sunLight * 0.98 + 0.12);
        cb = albedo * (sunLight * 0.95 + 0.28);
        cr = mix(cr, 0.08, deep * 0.9);
        cg = mix(cg, 0.36, deep * 0.9);
        cb = mix(cb, 0.62, deep * 0.9);
        cr = mix(cr, 0, crack);
        cg = mix(cg, 0.02, crack);
        cb = mix(cb, 0.06, crack);

        const far = smooth(35, 260, Z) * 0.8;
        const toward = Math.exp(-Math.abs(x - SUN[0]) / 28) * smooth(150, 600, Z);
        cr = mix(cr, 0.22 + 0.6 * toward, far);
        cg = mix(cg, 0.3 + 0.55 * toward, far);
        cb = mix(cb, 0.48 + 0.4 * toward, far);
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
          cr = 0.8;
          cg = 0.85;
          cb = 1.0;
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
        const [a, c_r, c_g, c_b] = ring(rr);
        if (a <= 0) continue;
        const d = px * LS[0] + py * LS[1] + zr * LS[2];
        const perp = Math.sqrt(Math.max(0, rr * rr - d * d));
        const lit = d < 0 ? smooth(0.98, 1.03, perp) : 1;
        const b = 0.92 * (0.08 + 0.92 * lit);
        acov += a * 0.25;
        ar += a * c_r * b * 0.25;
        ag += a * c_g * b * 0.25;
        ab += a * c_b * b * 0.25;
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

  const fr = new Float32Array(N),
    fg = new Float32Array(N),
    fb = new Float32Array(N),
    ff = new Float32Array(N),
    fc = new Float32Array(N);

  return function render(t: number, outChars: string[], outColors: Uint8Array) {
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
        fr[k] = mix(fr[k], 0.95 * l, pa[k]);
        fg[k] = mix(fg[k], 0.85 * l, pa[k]);
        fb[k] = mix(fb[k], 0.65 * l, pa[k]);
        fc[k] = 0.35 + 0.7 * clamp(Math.max(fr[k], fg[k], fb[k]));
      }
      if (ringOver) drawRing();
    }

    for (const k of cells) dot(k, fr[k], fg[k], fb[k], ff[k], fc[k]);

    for (let i = 0; i < N; i++) {
      outChars[i] = chars[i];
      outColors[i] = cols[i];
    }
  };
}

// ==========================================
// 2. KYOTO DUSK ENGINE (41-Color Palette)
// ==========================================
export function buildKyotoDuskEngine() {
  const SHORE = 80;
  const PX = 141;
  const MOON = [176, 17];
  const LX = 53;
  const LB = 98;
  const LS = 1.8;
  const LAMP = [LX, LB - (LB - 83) * LS];

  const SKY = 0,
    HILL = 1,
    TOWN = 2,
    PAGODA = 3,
    POND = 4,
    BANK = 5,
    TREE = 6,
    BLOOM = 7,
    STONE = 8,
    FLAME = 9;

  const P = KYOTO_PALETTE.map(hex);
  const N = W * H;
  const lut = new Uint8Array(32768).fill(255);
  const nearest = (r: number, g: number, b: number): number => {
    const k =
      (Math.min(31, (r * 31.99) | 0) << 10) |
      (Math.min(31, (g * 31.99) | 0) << 5) |
      Math.min(31, (b * 31.99) | 0);
    if (lut[k] !== 255) return lut[k];
    let best = 0,
      bd = 1e9;
    for (let i = 0; i < P.length; i++) {
      const dr = P[i][0] - r,
        dg = P[i][1] - g,
        db = P[i][2] - b;
      const d = 0.3 * dr * dr + 0.5 * dg * dg + 0.2 * db * db;
      if (d < bd) {
        bd = d;
        best = i;
      }
    }
    return (lut[k] = best);
  };

  function seg(px: number, py: number, ax: number, ay: number, bx: number, by: number): [number, number] {
    const dx = bx - ax,
      dy = by - ay;
    const k = clamp(((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy));
    const ex = ax + dx * k - px,
      ey = ay + dy * k - py;
    return [Math.sqrt(ex * ex + ey * ey), k];
  }

  const EAVE = [68.5, 58, 48.5, 40, 32.5];
  const ROOF = [14.5, 13.4, 12.3, 11.2, 10.1];
  const BODY = [6.4, 5.9, 5.4, 4.9, 4.4];

  function pagoda(dx: number, y: number): number {
    const ax = Math.abs(dx);
    if (y >= 76 && y < SHORE + 0.5) return ax <= 9.5 - (y < 77 ? 1 : 0) ? 1 : 0;
    for (let i = 0; i < 5; i++) {
      const e = EAVE[i],
        R = ROOF[i];
      const u = ax / R;
      if (u <= 1) {
        const lift = 3.5 * u * u * u * u;
        const bottom = e - lift + 0.6;
        const top = e - lift - 1.2 - 3.6 * Math.pow(1 - u, 1.7);
        if (y >= top && y < bottom) {
          if (y < top + 0.9) return 4;
          if (y > bottom - 1.0) return 3;
          return 2;
        }
      }
      const floor = i === 0 ? 76 : EAVE[i - 1] - 3.6;
      if (y >= e + 0.6 && y < floor && ax <= BODY[i]) {
        if (i === 0 && ax <= 1 && y > 72 && y < 75.5) return 6;
        if (y < e + 2 && ax <= BODY[i] + 1.2) return 3;
        return 1;
      }
      if (i > 0 && y >= e + 0.6 && y < e + 2 && ax <= BODY[i] + 1.2) return 3;
    }
    const top = EAVE[4] - 1.2 - 3.6 - 0.2;
    if (y < top && y >= 9) {
      if (y >= top - 1.5) return ax <= 2.4 ? 3 : 0;
      if (y >= 15 && y < top - 1.5) {
        const ring = Math.floor((y - 15) / 1.2) & 1;
        return ax <= (ring ? 1.4 : 0.55) ? 5 : 0;
      }
      if (y >= 12) return ax <= 1.3 - (y - 12) * 0.2 ? 5 : 0;
      return ax <= 0.6 ? 5 : 0;
    }
    return 0;
  }

  const mat = new Uint8Array(N);
  const R = new Float32Array(N),
    G = new Float32Array(N),
    B = new Float32Array(N);
  const floorA = new Float32Array(N).fill(0.12);
  const warmth = new Float32Array(N);

  const skyAt = (x: number, y: number): [number, number, number] => {
    const v = clamp(y / SHORE);
    const west = Math.exp(-Math.abs(x - 80) / 120);
    let a = smooth(0, 0.5, v);
    let r = mix(0.07, 0.22, a),
      g = mix(0.07, 0.14, a),
      b = mix(0.25, 0.38, a);
    a = smooth(0.42, 0.86, v);
    r = mix(r, 0.52, a);
    g = mix(g, 0.32, a);
    b = mix(b, 0.58, a);
    a = smooth(0.78, 0.98, v) * (0.55 + 0.45 * west);
    r = mix(r, 1.0, a);
    g = mix(g, 0.62, a);
    b = mix(b, 0.48, a);
    const band = Math.exp(-Math.abs(y - 74) / 4) * west * 0.18;
    r += band;
    g += band * 0.66;
    b += band * 0.45;
    const veil = 0.86 + 0.28 * fbm(x * 0.035, y * 0.09, 3, 0);
    r *= veil;
    g *= veil;
    b *= veil;
    const dx = x - MOON[0],
      dy = y - MOON[1];
    const d = Math.sqrt(dx * dx + dy * dy);
    const halo = Math.exp(-d / 5) * 0.24 + Math.exp(-d / 16) * 0.07;
    r += halo * 0.75;
    g += halo * 0.72;
    b += halo;
    return [r, g, b];
  };

  const hillA = (x: number) =>
    77.5 - (3 + 13 * smooth(70, 175, x)) * (0.3 + 1.1 * fbm(x * 0.022 + 3, 1, 4, 0));
  const hillB = (x: number) => 77 - 2.5 * fbm(x * 0.04 + 9, 2, 4, 0);
  const town = (x: number) => {
    const i = Math.floor((x + 3) / 11);
    const f = (x + 3) / 11 - i;
    const h = 2 + hash(i, 5) * 2.5;
    const e = Math.abs(f - 0.5) * 2;
    return e > 0.86 ? SHORE : SHORE - 1 - h + Math.max(0, e - 0.35) * 6;
  };

  const branches: number[][] = [
    [16, 101, 20, 86, 5.2, 4.4],
    [20, 86, 27, 70, 4.4, 3.6],
    [27, 70, 31, 58, 3.6, 3],
    [31, 58, 50, 46, 3, 2.1],
    [50, 46, 74, 37, 2.1, 1.4],
    [74, 37, 98, 31, 1.4, 0.9],
    [98, 31, 116, 30, 0.9, 0.5],
    [31, 58, 24, 40, 2.6, 1.8],
    [24, 40, 12, 26, 1.8, 1.1],
    [12, 26, 0, 18, 1.1, 0.7],
    [29, 50, 42, 30, 2, 1.3],
    [42, 30, 52, 19, 1.3, 0.8],
    [52, 19, 70, 13, 0.8, 0.5],
    [50, 46, 60, 52, 1.2, 0.7],
    [74, 37, 86, 44, 1, 0.5],
    [42, 30, 66, 24, 1, 0.6],
    [66, 24, 90, 21, 0.6, 0.4],
    [24, 40, 34, 25, 1, 0.6],
    [12, 26, 6, 16, 0.7, 0.4],
    [98, 31, 104, 40, 0.6, 0.35],
    [40, 51, 44, 58, 1.1, 0.4],
    [58, 43, 62, 55, 0.9, 0.35],
    [70, 38, 76, 47, 0.7, 0.3],
  ];

  const limbs = branches.length;
  for (let b = 3; b < limbs; b++) {
    const [ax, ay, bx, by, w0, w1] = branches[b];
    const ang = Math.atan2(by - ay, bx - ax);
    for (let j = 0; j < 3; j++) {
      const k = 0.25 + 0.65 * hash(b * 7 + j, 31);
      const sx = mix(ax, bx, k),
        sy = mix(ay, by, k);
      const turn = (j & 1 ? 1 : -1) * (0.5 + 0.6 * hash(b, j + 40));
      const len = 4 + 7 * hash(b + j, 41);
      const a2 = ang + turn - 0.25;
      branches.push([
        sx,
        sy,
        sx + Math.cos(a2) * len,
        sy + Math.sin(a2) * len,
        mix(w0, w1, k) * 0.55,
        0.3,
      ]);
    }
  }

  const clusters: [number, number, number][] = [];
  for (let b = 3; b < branches.length; b++) {
    const [ax, ay, bx, by, w0] = branches[b];
    const len = Math.hypot(bx - ax, by - ay);
    const n = 1 + Math.round(len / 1.7);
    for (let i = 0; i <= n; i++) {
      const k = i / n;
      if (k < 0.3 && w0 > 2) continue;
      const h1 = hash(b * 13 + i, 7),
        h2 = hash(b * 5 + i, 11),
        h3 = hash(b * 3 + i, 17);
      const cx = mix(ax, bx, k) + (h1 - 0.5) * 6,
        cy = mix(ay, by, k) + (h2 - 0.5) * 4.5 - 1;
      const spray = (b >= limbs - 3 && b < limbs) || b >= limbs + 3 * (limbs - 6);
      const dome = 9 + 10 * Math.pow(clamp(Math.abs(cx - 52) / 70), 1.6);
      if (cx > 122 || cy < dome || cy > (spray ? 55 : 47)) continue;
      clusters.push([cx, cy, 1.4 + 1.6 * h3 + 0.8 * k]);
    }
  }

  const bankX = (y: number) => 38 + (y - SHORE) * 2.3 + 4 * fbm(y * 0.2, 4, 2, 0);

  for (let r = 0; r < H; r++) {
    for (let x = 0; x < W; x++) {
      const k = r * W + x;
      const y = r + 0.5,
        xc = x + 0.5;
      let m = SKY,
        cr = 0,
        cg = 0,
        cb = 0,
        fl = 0.12,
        warm = 0;
      if (y < SHORE) {
        [cr, cg, cb] = skyAt(xc, y);
        fl = 0.04;
        if (y >= hillA(xc)) {
          m = HILL;
          const s = skyAt(xc, hillA(xc));
          const d = smooth(hillA(xc), hillA(xc) + 8, y);
          const tex = fbm(xc * 0.3, y * 0.45, 3, 0);
          const a = 0.6 + 0.2 * d + 0.25 * (tex - 0.5);
          cr = mix(s[0], 0.14, a);
          cg = mix(s[1], 0.08, a);
          cb = mix(s[2], 0.24, a);
          const lip = smooth(hillA(xc) + 1.4, hillA(xc), y) * 0.3;
          cr = mix(cr, s[0] * 1.1, lip);
          cg = mix(cg, s[1] * 1.05, lip);
          cb = mix(cb, s[2], lip);
        }
        if (y >= hillB(xc)) {
          m = HILL;
          const tex = fbm(xc * 0.3, y * 0.3, 3, 0);
          cr = 0.1 + 0.05 * tex;
          cg = 0.07 + 0.03 * tex;
          cb = 0.17 + 0.05 * tex;
          const mist = smooth(hillB(xc) + 1, SHORE, y) * 0.5;
          cr = mix(cr, 0.7, mist);
          cg = mix(cg, 0.44, mist);
          cb = mix(cb, 0.58, mist);
        }
        if (y >= town(xc) && xc > 70) {
          m = TOWN;
          cr = 0.08;
          cg = 0.06;
          cb = 0.14;
          const tf = Math.abs((((xc + 3) / 11) % 1) - 0.5) * 2;
          if (y < town(xc) + 0.9 && tf < 0.45) {
            cr = 0.5;
            cg = 0.31;
            cb = 0.44;
            fl = 0.06;
          }
        }
        const p = pagoda(xc - PX, y);
        if (p) {
          m = PAGODA;
          const dx = xc - PX;
          const rim = Math.exp(-Math.abs(dx + 4) / 30);
          if (p === 1) {
            cr = 0.07;
            cg = 0.05;
            cb = 0.12;
          } else if (p === 2) {
            cr = 0.2 + 0.08 * rim;
            cg = 0.13 + 0.03 * rim;
            cb = 0.27 + 0.04 * rim;
          } else if (p === 3) {
            cr = 0.05;
            cg = 0.04;
            cb = 0.1;
          } else if (p === 4) {
            cr = 0.9 * rim + 0.25;
            cg = 0.5 * rim + 0.15;
            cb = 0.5 * rim + 0.3;
          } else if (p === 5) {
            cr = 0.3 + 0.2 * (dx < 0 ? 1 : 0);
            cg = 0.22;
            cb = 0.32;
          } else if (p === 6) {
            cr = 0.7;
            cg = 0.42;
            cb = 0.24;
            fl = 0.2;
          }
        }
      } else {
        if (xc < bankX(y)) {
          m = BANK;
          const tex = fbm(xc * 0.3, y * 0.5, 3, 0);
          cr = 0.08 + 0.05 * tex;
          cg = 0.08 + 0.05 * tex;
          cb = 0.1 + 0.05 * tex;
          warm = 1;
        } else m = POND;
      }
      mat[k] = m;
      R[k] = cr;
      G[k] = cg;
      B[k] = cb;
      floorA[k] = fl;
      warmth[k] = warm;
    }
  }

  const RR = R.slice(),
    RG = G.slice(),
    RB = B.slice();

  const lantern = (dx: number, y: number): number => {
    const ax = Math.abs(dx);
    if (y >= 93.5 && y < LB) return ax <= 4.2 - (y < 94.5 ? 0.8 : 0) ? 1 : 0;
    if (y >= 87 && y < 93.5) return ax <= 1.4 ? 1 : 0;
    if (y >= 85.5 && y < 87) return ax <= 3.6 - (y < 86.2 ? 0.6 : 0) ? 1 : 0;
    if (y >= 80 && y < 85.5) {
      if (ax <= 1.7 && y >= 80.8 && y < 84.8) return 2;
      return ax <= 2.9 ? 1 : 0;
    }
    if (y >= 76.5 && y < 80) {
      const u = (80 - y) / 3.5;
      const hw = 5.6 - 4.1 * Math.pow(u, 0.8) + (y > 79.2 ? 0.6 : 0);
      return ax <= hw ? 3 : 0;
    }
    if (y >= 73.5 && y < 76.5) return ax <= 1.3 - Math.abs(y - 75) * 0.25 ? 3 : ax <= 0.5 ? 3 : 0;
    return 0;
  };

  const at = (xc: number, y: number) => lantern((xc - LX) / LS, LB - (LB - y) / LS);
  for (let r = 45; r < H; r++) {
    for (let x = LX - 14; x <= LX + 14; x++) {
      const y = r + 0.5,
        xc = x + 0.5;
      const l = at(xc, y);
      if (!l) continue;
      const k = r * W + x;
      const py = LB - (LB - y) / LS,
        pdx = (xc - LX) / LS;
      if (l === 2) {
        mat[k] = FLAME;
        const c = Math.exp(-(pdx * pdx * 0.5 + (py - 82.8) * (py - 82.8) * 0.35));
        R[k] = 0.85 + 0.15 * c;
        G[k] = 0.5 + 0.38 * c;
        B[k] = 0.2 + 0.4 * c * c;
        floorA[k] = 0.35;
      } else {
        mat[k] = STONE;
        const g = 0.8 + 0.4 * hash(x * 5, r * 3);
        const edge = !at(xc, y - 1) ? 1 : 0;
        R[k] = (0.05 + 0.22 * edge) * g;
        G[k] = (0.04 + 0.14 * edge) * g;
        B[k] = (0.08 + 0.2 * edge) * g;
        floorA[k] = 0.02;
      }
      warmth[k] = l === 2 ? 0 : 0.75;
    }
  }

  // Blossom & branches
  for (let r = 0; r < H; r++) {
    for (let x = 0; x < 130; x++) {
      const k = r * W + x;
      const y = r + 0.5,
        xc = x + 0.5;
      let d = 0,
        best = 0,
        up = 0;
      for (const [cx, cy, rad] of clusters) {
        const dx = xc - cx,
          dy = (y - cy) * 1.15;
        const q = (dx * dx + dy * dy) / (rad * rad);
        if (q < 3) {
          const c = Math.exp(-q * 1.4);
          d += c;
          if (c > best) {
            best = c;
            up = (dy + dx * 0.4) / rad;
          }
        }
      }
      const n = fbm(xc * 0.11, y * 0.15, 3, 0),
        n2 = noise(xc * 0.5, y * 0.6, 0);
      const bloom = (1 - Math.exp(-d * 1.5)) * (0.15 + 1.35 * n) * (0.75 + 0.5 * n2);
      let onBranch = false,
        bw = 0;
      for (const [ax, ay, bx, by, w0, w1] of branches) {
        const [dist, kk] = seg(xc, y, ax, ay, bx, by);
        const w = mix(w0, w1, kk) * 0.5 + 0.15;
        if (dist < w) {
          onBranch = true;
          bw = Math.max(bw, (dist / w) * (xc < ax + (bx - ax) * kk ? -1 : 1));
        }
      }
      if (onBranch && bloom < 0.85) {
        mat[k] = TREE;
        const lit = smooth(0.35, 1, bw);
        R[k] = 0.05 + 0.03 * lit;
        G[k] = 0.035 + 0.01 * lit;
        B[k] = 0.07;
        floorA[k] = 0;
        warmth[k] = 0.8;
      } else if (bloom > 0.5) {
        mat[k] = BLOOM;
        const inner = hash(x * 3, r * 7);
        let b = clamp(0.62 - 0.6 * up + 0.26 * (inner - 0.5) - 0.3 * smooth(0.75, 0.5, bloom));
        b = mix(b, 0.12, smooth(0.3, 1.1, up));
        b *= 1 - 0.3 * smooth(28, 48, y);
        R[k] = 0.34 + 0.64 * b;
        G[k] = 0.08 + 0.62 * b * b;
        B[k] = 0.2 + 0.5 * b;
        floorA[k] = 0.1;
        warmth[k] = 1;
      }
    }
  }

  const glow = new Float32Array(N);
  for (let r = 0; r < H; r++)
    for (let x = 0; x < W; x++) {
      const dx = x + 0.5 - LAMP[0],
        dy = (r + 0.5 - LAMP[1]) * 1.1;
      const d = Math.sqrt(dx * dx + dy * dy);
      glow[r * W + x] = Math.exp(-d / 4) * 0.6 + Math.exp(-d / 11) * 0.32 + Math.exp(-d / 32) * 0.1;
      const m = mat[r * W + x];
      if (m === BLOOM || m === TREE) glow[r * W + x] += Math.exp(-d / 11) * 1.6;
    }

  const dith = new Float32Array(N);
  for (let k = 0; k < N; k++)
    dith[k] =
      BAYER[((Math.floor(k / W)) & 3) * 4 + ((k % W) & 3)] * 0.4 +
      (hash(k, 77) - 0.5) * 0.5;

  const tone = new Float32Array(1025);
  for (let i = 0; i <= 1024; i++) {
    const v = i / 256;
    tone[i] = v < 0.75 ? v : 0.75 + 0.25 * (1 - Math.exp(-(v - 0.75) * 4));
  }

  const petals: {
    x: number;
    y: number;
    vx: number;
    vy: number;
    sw: number;
    sf: number;
    ph: number;
    tum: number;
  }[] = [];
  for (let i = 0; i < 40; i++)
    petals.push({
      x: Math.pow(hash(i, 101), 2.2) * 140,
      y: hash(i, 102) * (H + 20),
      vx: 3 + hash(i, 103) * 4,
      vy: 1.6 + hash(i, 104) * 2.2,
      sw: 1 + hash(i, 105) * 2,
      sf: 0.6 + hash(i, 106) * 1.2,
      ph: hash(i, 107) * 6.28,
      tum: 2 + hash(i, 108) * 4,
    });

  const pr = new Float32Array(N),
    pg = new Float32Array(N),
    pb = new Float32Array(N);
  const pmask = new Uint8Array(N);

  return function render(t: number, outChars: string[], outColors: Uint8Array) {
    const flick = 0.82 + 0.1 * Math.sin(t * 7.3) * Math.sin(t * 3.1 + 1);

    pmask.fill(0);
    for (const p of petals) {
      const xx =
        ((((p.x + p.vx * t + p.sw * Math.sin(t * p.sf + p.ph)) % (W + 40)) + W + 40) % (W + 40)) - 20;
      const yy =
        ((((p.y + p.vy * t + 0.6 * Math.sin(t * p.sf * 1.7 + p.ph)) % (H + 20)) + H + 20) % (H + 20)) - 10;
      const x = Math.round(xx),
        r = Math.round(yy);
      if (x < 0 || x >= W || r < 0 || r >= H) continue;
      const k = r * W + x;
      const face = 0.55 + 0.45 * Math.abs(Math.sin(t * p.tum + p.ph));
      pr[k] = 1.0 * face;
      pg[k] = 0.76 * face;
      pb[k] = 0.84 * face;
      pmask[k] = 1;
    }

    for (let r = 0; r < H; r++) {
      const y = r + 0.5;
      for (let x = 0; x < W; x++) {
        const k = r * W + x;
        const m = mat[k];
        let cr: number,
          cg: number,
          cb: number,
          fl = floorA[k],
          fade = 1;

        if (m === POND) {
          const depth = (y - SHORE) / (H - SHORE);
          const wob =
            Math.sin(y * 1.7 - t * 2 + Math.sin(x * 0.13 + t * 0.6) * 1.4) * (0.05 + 0.8 * depth);
          let sx = Math.round(x + wob);
          sx = sx < 0 ? 0 : sx > W - 1 ? W - 1 : sx;
          const w = noise(x * 0.14 + t * 0.2, y * 1.1 - t * 0.8, 0);
          let sr = Math.round(SHORE - 1 - (r - SHORE) * 1.35 + (w - 0.5) * 3 * depth);
          sr = sr < 0 ? 0 : sr > SHORE - 1 ? SHORE - 1 : sr;
          const j = sr * W + sx;
          const lit = mix(0.95, 0.6, smooth(SHORE + 1, SHORE + 6, y)) * (0.8 + 0.4 * w);
          cr = RR[j] * lit * 0.9;
          cg = RG[j] * lit * 0.92;
          cb = RB[j] * lit + 0.03;
          fade = smooth(H + 2, H - 9, y);
        } else {
          cr = R[k];
          cg = G[k];
          cb = B[k];
        }

        const wm = warmth[k];
        if (wm > 0) {
          const g = glow[k] * flick * wm;
          cr += g * 1.0;
          cg += g * 0.58;
          cb += g * 0.22;
        }

        if (pmask[k] && m !== FLAME) {
          cr = pr[k];
          cg = pg[k];
          cb = pb[k];
          fl = 0.3;
        }

        cr = tone[Math.min(1024, (cr * 256) | 0)];
        cg = tone[Math.min(1024, (cg * 256) | 0)];
        cb = tone[Math.min(1024, (cb * 256) | 0)];
        const peak = Math.max(cr, cg, cb, 1e-4);
        const level = clamp(fl + (1 - fl) * Math.pow(peak, 1.1) * 1.02) * fade;
        const step = Math.max(0, Math.min(3, Math.round(level * 3 + dith[k])));
        outChars[k] = DOTS[step];
        outColors[k] = nearest(clamp(cr), clamp(cg), clamp(cb));
      }
    }

    // Moon rendering
    for (let r = MOON[1] - 6; r <= MOON[1] + 6; r++) {
      for (let x = MOON[0] - 6; x <= MOON[0] + 6; x++) {
        const dx = x + 0.5 - MOON[0],
          dy = r + 0.5 - MOON[1];
        const inside = dx * dx + dy * dy < 5.2 * 5.2;
        const ex = dx - 2.2,
          ey = dy + 1.6;
        if (inside && ex * ex + ey * ey > 4.9 * 4.9) {
          const k = r * W + x;
          outChars[k] = '●';
          outColors[k] = 14; // #fffaf0
        }
      }
    }
  };
}

// ==========================================
// SEAMLESS FRAMELESS COMPONENT
// ==========================================
export const SeamlessAsciiArt: React.FC<{
  scene?: 'saturn' | 'kyoto';
  className?: string;
}> = ({ scene = 'saturn', className = '' }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const timeRef = useRef<number>(0);
  const engineRef = useRef<any>(null);
  const activeSceneRef = useRef<'saturn' | 'kyoto'>(scene);

  useEffect(() => {
    activeSceneRef.current = scene;
    timeRef.current = 0;
    if (scene === 'kyoto') {
      engineRef.current = buildKyotoDuskEngine();
    } else {
      engineRef.current = buildSaturnRiseEngine();
    }
  }, [scene]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const charsArr = new Array<string>(W * H);
    const colorsArr = new Uint8Array(W * H);

    let animationFrameId: number;

    const renderLoop = () => {
      if (isPlaying) {
        timeRef.current += 0.066; // 15 FPS cadence
      }

      if (engineRef.current) {
        engineRef.current(timeRef.current, charsArr, colorsArr);

        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
          canvas.width = rect.width * dpr;
          canvas.height = rect.height * dpr;
        }

        ctx.save();
        ctx.scale(dpr, dpr);
        ctx.clearRect(0, 0, rect.width, rect.height);

        const cellW = rect.width / W;
        const cellH = rect.height / H;

        ctx.font = `600 ${Math.max(6, cellH * 0.95)}px "JetBrains Mono", monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const palette = activeSceneRef.current === 'kyoto' ? KYOTO_PALETTE : SATURN_PALETTE;

        for (let r = 0; r < H; r++) {
          const y = r * cellH + cellH / 2;
          for (let c = 0; c < W; c++) {
            const k = r * W + c;
            const ch = charsArr[k];
            if (!ch || ch === ' ') continue;

            const colIdx = colorsArr[k];
            const color = palette[colIdx] || '#ffffff';

            ctx.fillStyle = color;
            ctx.fillText(ch, c * cellW + cellW / 2, y);
          }
        }
        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(renderLoop);
    };

    animationFrameId = requestAnimationFrame(renderLoop);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isPlaying]);

  return (
    <div className={`relative w-full overflow-hidden select-none ${className}`}>
      {/* 
        NO FRAMES, NO HEAVY BOXES:
        We apply an elliptical radial vignette plus linear fade masks on all sides
        so the ASCII characters dissolve seamlessly into the page background with zero sharp borders.
      */}
      <div
        className="w-full h-[340px] sm:h-[480px] md:h-[580px] flex items-center justify-center pointer-events-none"
        style={{
          maskImage:
            'radial-gradient(ellipse 80% 75% at 50% 50%, black 40%, transparent 95%)',
          WebkitMaskImage:
            'radial-gradient(ellipse 80% 75% at 50% 50%, black 40%, transparent 95%)',
        }}
      >
        <canvas ref={canvasRef} className="w-full h-full object-contain" />
      </div>

      {/* Floating Minimalist Controller (Translucent glassy pill, completely unobtrusive) */}
      <div className="absolute bottom-2 right-4 flex items-center space-x-2 font-mono text-[11px] text-ink-tertiary">
        <span className="hidden sm:inline text-ink-secondary bg-surface-light/70 backdrop-blur-md px-2.5 py-1 rounded-full border border-hairline-light/60 shadow-sm">
          {scene === 'kyoto' ? 'Kyoto Dusk · 41 Palette Colours' : 'Saturn Rise · 30 Palette Colours'}
        </span>
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="p-1.5 rounded-full bg-surface-light/80 backdrop-blur-md border border-hairline-light hover:text-ink-primary shadow-sm transition pointer-events-auto"
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
        </button>
        <button
          onClick={() => {
            timeRef.current = 0;
          }}
          className="p-1.5 rounded-full bg-surface-light/80 backdrop-blur-md border border-hairline-light hover:text-ink-primary shadow-sm transition pointer-events-auto"
          title="Reset"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
