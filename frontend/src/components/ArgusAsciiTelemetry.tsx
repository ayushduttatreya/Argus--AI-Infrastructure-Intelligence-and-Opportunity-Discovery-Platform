'use client';

import React, { useEffect, useState } from 'react';

interface ArgusAsciiTelemetryProps {
  statusText?: string;
  activeAgents?: number;
}

const BRAILLE_SPINNER = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

export const ArgusAsciiTelemetry: React.FC<ArgusAsciiTelemetryProps> = ({
  statusText = 'Fleet online · PostgreSQL RLS enforced',
  activeAgents = 8,
}) => {
  const [spinnerIndex, setSpinnerIndex] = useState(0);

  useEffect(() => {
    // 15 FPS cadence (~66ms)
    const timer = setInterval(() => {
      setSpinnerIndex((prev) => (prev + 1) % BRAILLE_SPINNER.length);
    }, 66);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-full bg-surface-light border border-hairline-light shadow-tactile text-xs font-mono text-ink-secondary">
      <span className="text-emerald-600 font-semibold text-xs">
        {BRAILLE_SPINNER[spinnerIndex]}
      </span>
      <span className="text-[11px] font-medium tracking-tight">
        {activeAgents} engines active
      </span>
      <span className="text-hairline-light">|</span>
      <span className="text-[11px] text-ink-tertiary truncate max-w-[220px]">
        {statusText}
      </span>
    </div>
  );
};
