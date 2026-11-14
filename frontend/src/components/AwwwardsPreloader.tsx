'use client';

import React, { useEffect, useState } from 'react';

interface AwwwardsPreloaderProps {
  onComplete: () => void;
}

const BOOT_STAGES = [
  'INITIALIZING ARGUS DISTRIBUTED CORE',
  'ESTABLISHING POSTGRESQL 16 RLS CONTEXT',
  'SYNCING 8 SPECIALIST TEMPORAL ACTIVITIES',
  'ENGAGING LITELLM AI GATEWAY VIRTUAL KEYS',
  'PROVENANCE ENGINE READY · NO MOCK DATA',
];

export const AwwwardsPreloader: React.FC<AwwwardsPreloaderProps> = ({ onComplete }) => {
  const [percent, setPercent] = useState<number>(0);
  const [stageIdx, setStageIdx] = useState<number>(0);
  const [isExiting, setIsExiting] = useState<boolean>(false);

  useEffect(() => {
    // Smooth, calibrated progress counter (approx 1.8s total duration)
    const interval = setInterval(() => {
      setPercent((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setIsExiting(true);
            setTimeout(onComplete, 650); // wait for curtain transition
          }, 250);
          return 100;
        }

        // Variable increments to feel natural
        const step = Math.floor(Math.random() * 4) + 2;
        const next = Math.min(100, prev + step);

        // Update technical message at thresholds
        const stage = Math.min(
          BOOT_STAGES.length - 1,
          Math.floor((next / 100) * BOOT_STAGES.length)
        );
        setStageIdx(stage);

        return next;
      });
    }, 35);

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-50 bg-[#0E1015] text-[#FAF9F6] flex flex-col justify-between p-6 sm:p-12 transition-transform duration-700 ease-[cubic-bezier(0.85,0,0.15,1)] ${
        isExiting ? '-translate-y-full opacity-90' : 'translate-y-0 opacity-100'
      }`}
    >
      {/* Top Header Information */}
      <div className="flex items-center justify-between font-mono text-xs text-[#8C8F96] tracking-wider uppercase">
        <div className="flex items-center space-x-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-[#FAF9F6] font-semibold">ARGUS</span>
          <span>/</span>
          <span>RESEARCH PLATFORM</span>
        </div>
        <div className="hidden sm:block">
          AWWWARDS PRELOADER · SPASOJE PEROVIC STYLE
        </div>
        <button
          onClick={() => {
            setIsExiting(true);
            setTimeout(onComplete, 200);
          }}
          className="text-xs font-mono text-[#8C8F96] hover:text-white transition uppercase border border-[#2A3042] px-2 py-0.5 rounded"
        >
          [SKIP ↵]
        </button>
      </div>

      {/* Center Giant Counter & Stage Telemetry */}
      <div className="max-w-4xl w-full mx-auto my-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-[#2A3042] pb-6">
          <div className="font-serif text-7xl sm:text-9xl font-normal tracking-tighter text-[#FAF9F6] select-none">
            {percent < 10 ? `0${percent}` : percent}
            <span className="text-2xl sm:text-4xl text-[#5A5D63] font-mono ml-2">%</span>
          </div>

          <div className="font-mono text-xs sm:text-sm text-emerald-400 font-medium">
            ● {BOOT_STAGES[stageIdx]}
          </div>
        </div>

        {/* ASCII & Hairline Progress Bar */}
        <div className="space-y-2">
          <div className="w-full bg-[#1A1D26] h-[2px] rounded-full overflow-hidden">
            <div
              className="bg-emerald-400 h-full transition-all duration-75 ease-out"
              style={{ width: `${percent}%` }}
            />
          </div>

          <div className="flex items-center justify-between font-mono text-[11px] text-[#5A5D63]">
            <span>SYSTEM INTEGRITY: 100% PROVENANCE VERIFIED</span>
            <span>62/62 SUITES PASSING</span>
          </div>
        </div>
      </div>

      {/* Bottom Editorial Details */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between font-mono text-xs text-[#5A5D63] border-t border-[#1C202C] pt-4 gap-2">
        <span>EPIC: AI INFRASTRUCTURE INTELLIGENCE & OPPORTUNITY DISCOVERY</span>
        <span className="text-[#8C8F96]">CHIAROSCURO DAYLIGHT · REVEALING WORKSPACE</span>
      </div>
    </div>
  );
};
