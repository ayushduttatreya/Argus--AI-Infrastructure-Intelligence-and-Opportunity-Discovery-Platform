'use client';

import React, { useEffect, useState } from 'react';

interface ArgusAsciiSkeletonProps {
  lines?: number;
  pattern?: 'density' | 'braille';
  className?: string;
}

const DENSITY_FRAMES = [
  '░░▒▒▓▓▒▒░░',
  '▒▒▓▓██▓▓▒▒',
  '▓▓██░░██▓▓',
  '██░░▒▒░░██',
  '▒▒░░▓▓░░▒▒',
];

const BRAILLE_FRAMES = [
  '⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏',
  '⠙⠹⠸⠼⠴⠦⠧⠇⠏⠋',
  '⠹⠸⠼⠴⠦⠧⠇⠏⠋⠙',
  '⠸⠼⠴⠦⠧⠇⠏⠋⠙⠹',
  '⠼⠴⠦⠧⠇⠏⠋⠙⠹⠸',
];

export const ArgusAsciiSkeleton: React.FC<ArgusAsciiSkeletonProps> = ({
  lines = 3,
  pattern = 'density',
  className = '',
}) => {
  const [frameIdx, setFrameIdx] = useState(0);

  useEffect(() => {
    // 15 FPS = ~66ms per tick
    const interval = setInterval(() => {
      setFrameIdx((prev) => (prev + 1) % 5);
    }, 66);
    return () => clearInterval(interval);
  }, []);

  const frames = pattern === 'density' ? DENSITY_FRAMES : BRAILLE_FRAMES;
  const currentGlyph = frames[frameIdx];

  return (
    <div
      className={`font-mono text-xs select-none space-y-1.5 opacity-60 text-ink-tertiary ${className}`}
      role="status"
      aria-label="Loading synthesized evidence stream..."
    >
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="flex items-center space-x-2">
          <span className="text-[10px] tracking-widest text-ink-secondary/70">
            {currentGlyph}
          </span>
          <div
            className="h-2 rounded bg-hairline-light/80 animate-pulse"
            style={{ width: `${85 - i * 15}%` }}
          />
        </div>
      ))}
    </div>
  );
};
