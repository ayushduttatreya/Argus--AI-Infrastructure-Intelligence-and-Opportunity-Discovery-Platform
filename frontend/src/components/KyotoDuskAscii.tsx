'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, RotateCcw, Maximize2, Sparkles, Terminal } from 'lucide-react';

const W = 200;
const H = 100;
const SHORE = 80;
const PX = 141;
const MOON = [176, 17];
const LX = 53;
const LB = 98;
const LS = 1.8;
const LAMP = [LX, LB - (LB - 83) * LS];
const DOTS = ' ·•●';
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => v / 16 - 0.47);

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

const clamp = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (a: number, b: number, v: number) => {
  const k = clamp((v - a) / (b - a));
  return k * k * (3 - 2 * k);
};
const mix = (a: number, b: number, k: number) => a + (b - a) * k;

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

function initKyotoDuskRenderer() {
  const N = W * H;
  const out = new Array<string>(N);

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

  const hillA = (x: number) => 77.5 - (3 + 13 * smooth(70, 175, x)) * (0.3 + 1.1 * fbm(x * 0.022 + 3, 1, 4, 0));
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
      branches.push([sx, sy, sx + Math.cos(a2) * len, sy + Math.sin(a2) * len, mix(w0, w1, k) * 0.55, 0.3]);
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
        cr: number | undefined,
        cg: number | undefined,
        cb: number | undefined,
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
      R[k] = cr || 0;
      G[k] = cg || 0;
      B[k] = cb || 0;
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

  // Blossom and branches
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
  for (let k = 0; k < N; k++) dith[k] = BAYER[((Math.floor(k / W)) & 3) * 4 + ((k % W) & 3)] * 0.4 + (hash(k, 77) - 0.5) * 0.5;

  const tone = new Float32Array(1025);
  for (let i = 0; i <= 1024; i++) {
    const v = i / 256;
    tone[i] = v < 0.75 ? v : 0.75 + 0.25 * (1 - Math.exp(-(v - 0.75) * 4));
  }

  const petals: { x: number; y: number; vx: number; vy: number; sw: number; sf: number; ph: number; tum: number }[] = [];
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

  return function renderFrame(t: number): string {
    const flick = 0.82 + 0.1 * Math.sin(t * 7.3) * Math.sin(t * 3.1 + 1);

    pmask.fill(0);
    for (const p of petals) {
      const xx = ((((p.x + p.vx * t + p.sw * Math.sin(t * p.sf + p.ph)) % (W + 40)) + W + 40) % (W + 40)) - 20;
      const yy = ((((p.y + p.vy * t + 0.6 * Math.sin(t * p.sf * 1.7 + p.ph)) % (H + 20)) + H + 20) % (H + 20)) - 10;
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
          const wob = Math.sin(y * 1.7 - t * 2 + Math.sin(x * 0.13 + t * 0.6) * 1.4) * (0.05 + 0.8 * depth);
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
        out[k] = DOTS[step];
      }
    }

    // Moon
    for (let r = MOON[1] - 6; r <= MOON[1] + 6; r++) {
      for (let x = MOON[0] - 6; x <= MOON[0] + 6; x++) {
        const dx = x + 0.5 - MOON[0],
          dy = r + 0.5 - MOON[1];
        const inside = dx * dx + dy * dy < 5.2 * 5.2;
        const ex = dx - 2.2,
          ey = dy + 1.6;
        if (inside && ex * ex + ey * ey > 4.9 * 4.9) {
          out[r * W + x] = '●';
        }
      }
    }

    const lines: string[] = [];
    for (let r = 0; r < H; r++) {
      lines.push(out.slice(r * W, (r + 1) * W).join(''));
    }
    return lines.join('\n');
  };
}

export const KyotoDuskAscii: React.FC<{ className?: string }> = ({ className = '' }) => {
  const [frameText, setFrameText] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [timeVal, setTimeVal] = useState<number>(0);
  const rendererRef = useRef<((t: number) => string) | null>(null);

  useEffect(() => {
    rendererRef.current = initKyotoDuskRenderer();
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
    <div className={`relative rounded-2xl overflow-hidden border border-hairline-light bg-[#0b0a16] shadow-2xl ${className}`}>
      {/* Top ASCII Rest Meta Bar */}
      <div className="px-4 py-2.5 bg-[#121124] border-b border-[#252245] flex items-center justify-between text-xs font-mono text-[#a39ec4]">
        <div className="flex items-center space-x-3">
          <span className="font-semibold text-[#f9d3dc]">kyoto dusk</span>
          <span className="text-[#5b4f86]">|</span>
          <span className="text-[11px] text-[#7a6aa0]">200×100 • 15 fps • halftone dither</span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-1 rounded hover:bg-[#252245] text-[#d0763a] hover:text-white transition"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => {
              setTimeVal(0);
              if (rendererRef.current) setFrameText(rendererRef.current(0));
            }}
            className="p-1 rounded hover:bg-[#252245] text-[#7a6aa0] hover:text-white transition"
            title="Reset scene"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <span className="text-[10px] text-[#5b4f86] px-1.5 py-0.5 rounded border border-[#3a2c50]">
            ascii.rest
          </span>
        </div>
      </div>

      {/* Render Canvas / Monospace Stream */}
      <div className="p-3 sm:p-5 overflow-x-auto flex justify-center items-center bg-[#0b0a16]">
        <pre
          className="font-mono text-[4.5px] sm:text-[6px] md:text-[7px] leading-[1] tracking-[0.05em] text-[#ec9f9c] select-none whitespace-pre"
          style={{
            fontFamily: '"JetBrains Mono", "SFMono-Regular", Menlo, monospace',
            textShadow: '0 0 2px rgba(236, 159, 156, 0.25)',
          }}
        >
          {frameText || 'Rendering Kyoto Dusk halftone scene...'}
        </pre>
      </div>

      {/* Bottom Scene Note */}
      <div className="px-4 py-2 bg-[#121124]/90 border-t border-[#252245] flex items-center justify-between text-[11px] font-mono text-[#7a6aa0]">
        <span>Pagoda at dusk behind cherry bloom lit by stone lantern · Falling petals & pond reflections</span>
        <span className="text-[#a8668f] font-sans italic">Scene by @Shubham · ascii.rest</span>
      </div>
    </div>
  );
};
