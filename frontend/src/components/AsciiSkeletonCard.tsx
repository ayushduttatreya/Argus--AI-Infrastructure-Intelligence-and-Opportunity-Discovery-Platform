'use client';

import React, { useEffect, useState } from 'react';

export interface SkeletonOptions {
  lines?: number;
  image?: boolean;
  avatar?: boolean;
  paper?: boolean;
  className?: string;
}

const PERIOD = 1.8;
const START = 0.3;
const SLANT = 0.8;
const LEFT = 3,
  RIGHT = 48;
const COLS = 52,
  ROWS = 23;

function initSkeletonRenderer({
  lines = 3,
  image = true,
  avatar = true,
}: {
  lines?: number;
  image?: boolean;
  avatar?: boolean;
} = {}) {
  const full = RIGHT - LEFT + 1;
  const blocks: { h: number; runs: [number, number, number][] }[] = [];

  if (avatar) {
    const runs: [number, number, number][] = [];
    const ax = LEFT + 6,
      R = 3;
    for (let r = 0; r < 6; r++) {
      let c0 = -1,
        c1 = -1;
      for (let c = LEFT; c < LEFT + 12; c++) {
        let hit = 0;
        for (let j = 0; j < 4; j++)
          for (let i = 0; i < 4; i++) {
            const x = (c + 0.125 + i * 0.25 - ax) / 2,
              y = r + 0.125 + j * 0.25 - R;
            if (x * x + y * y < R * R) hit++;
          }
        if (hit >= 8) {
          if (c0 < 0) c0 = c;
          c1 = c;
        }
      }
      runs.push([r, c0, c1]);
    }
    runs.push([1, LEFT + 15, LEFT + 32], [4, LEFT + 15, LEFT + 26]);
    blocks.push({ h: 6, runs });
  } else {
    blocks.push({
      h: 3,
      runs: [
        [0, LEFT, LEFT + 17],
        [2, LEFT, LEFT + 10],
      ],
    });
  }

  if (image) {
    blocks.push({
      h: 6,
      runs: [0, 1, 2, 3, 4, 5].map((r): [number, number, number] => [r, LEFT, RIGHT]),
    });
  }

  const used = blocks.reduce((a, b) => a + b.h + 1, 0);
  const n = Math.max(0, Math.min(Math.floor(lines) || 0, Math.floor((ROWS - 4 - used + 1) / 2)));
  if (n) {
    const runs: [number, number, number][] = [];
    for (let i = 0; i < n; i++) {
      const f = i === n - 1 ? (n === 1 ? 0.72 : 0.58) : [1, 0.91, 0.96, 0.87][i % 4];
      runs.push([i * 2, LEFT, LEFT + Math.round(full * f) - 1]);
    }
    blocks.push({ h: n * 2 - 1, runs });
  }

  const inner = blocks.reduce((a, b) => a + b.h, 0) + blocks.length - 1;
  const H = inner + 4;
  const top = Math.floor((ROWS - H) / 2);
  const mask = new Uint8Array(COLS * ROWS);
  let y = top + 2;
  for (const b of blocks) {
    for (const [r, c0, c1] of b.runs)
      for (let c = c0; c <= c1; c++) mask[(y + r) * COLS + c] = 1;
    y += b.h + 1;
  }

  const base = new Array<string>(COLS * ROWS).fill(' ');
  const bot = top + H - 1;
  for (let c = 1; c < COLS - 1; c++) base[top * COLS + c] = base[bot * COLS + c] = '─';
  for (let r = top + 1; r < bot; r++) base[r * COLS] = base[r * COLS + COLS - 1] = '│';
  base[top * COLS] = '╭';
  base[top * COLS + COLS - 1] = '╮';
  base[bot * COLS] = '╰';
  base[bot * COLS + COLS - 1] = '╯';

  const mid = top + H / 2;
  const out: string[] = new Array(COLS * ROWS);

  return function render(t: number, paper = false): string {
    const shade = paper ? ['▒', '░', '·'] : ['░', '▒', '▓'];
    const x = -12 + (((t / PERIOD + START) % 1) * (COLS + 24));
    for (let k = 0; k < COLS * ROWS; k++) {
      if (!mask[k]) {
        out[k] = base[k];
        continue;
      }
      const r = (k / COLS) | 0,
        c = k % COLS;
      const d = Math.abs(c + 0.5 - x - (mid - r) * SLANT);
      out[k] = shade[d < 0.5 ? 2 : d < 4.5 ? 1 : 0];
    }
    const text: string[] = [];
    for (let r = 0; r < ROWS; r++) text.push(out.slice(r * COLS, (r + 1) * COLS).join(''));
    return text.join('\n');
  };
}

export const AsciiSkeletonCard: React.FC<SkeletonOptions> = ({
  lines = 3,
  image = true,
  avatar = true,
  paper = false,
  className = '',
}) => {
  const [frame, setFrame] = useState<string>('');

  useEffect(() => {
    const render = initSkeletonRenderer({ lines, image, avatar });
    let t = 0;
    // 24 FPS (~41ms)
    const interval = setInterval(() => {
      t += 0.041;
      setFrame(render(t, paper));
    }, 41);

    return () => clearInterval(interval);
  }, [lines, image, avatar, paper]);

  return (
    <div
      className={`font-mono text-[10px] sm:text-xs leading-[1.1] select-none text-ink-secondary/90 bg-surface-light border border-hairline-light rounded-xl p-3 shadow-tactile ${className}`}
      role="status"
      aria-label="Loading card placeholder with 24 FPS ASCII shimmer"
    >
      <pre className="whitespace-pre font-mono overflow-x-auto">{frame}</pre>
    </div>
  );
};
