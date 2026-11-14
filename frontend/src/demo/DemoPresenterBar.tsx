'use client';

import React, { useEffect } from 'react';
import {
  Play,
  Pause,
  FastForward,
  RotateCcw,
  RefreshCw,
  Monitor,
  CheckCircle2,
  Sparkles,
  ShieldAlert,
} from 'lucide-react';
import { DemoStage } from './useDemoSimulation';

interface DemoPresenterBarProps {
  stage: DemoStage;
  isPlaying: boolean;
  elapsedSec: number;
  totalDuration: number;
  progressPercentage: number;
  presenterMode: boolean;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onSkip: () => void;
  onReset: () => void;
  onReplay: () => void;
  onTogglePresenterMode: () => void;
}

const STAGE_LABELS: Record<DemoStage, { name: string; desc: string }> = {
  idle: {
    name: 'Pipeline Ready',
    desc: 'Ready to execute autonomous research pipeline',
  },
  interpreting: {
    name: '1. Interpreting Objective',
    desc: 'Parsing domain boundary: AI inference engines & KV cache systems',
  },
  activating_workstreams: {
    name: '2. Activating Workstreams',
    desc: 'Deploying 8 specialist intelligence engines in parallel',
  },
  gathering_signals: {
    name: '3. Gathering Research Signals',
    desc: 'Mining repository regressions, issue trackers, and preprints',
  },
  verifying_evidence: {
    name: '4. Verifying Evidence Provenance',
    desc: 'Extracting verbatim spans with SHA-256 cryptographic hashes',
  },
  clustering_patterns: {
    name: '5. Connecting Architectural Patterns',
    desc: 'Cross-referencing GPU HBM capacity vs agent cache thrashing',
  },
  synthesizing_hypotheses: {
    name: '6. Synthesizing Opportunities',
    desc: 'Isolating structural negative space & market gap hypotheses',
  },
  completed: {
    name: '7. Dossier Finalized',
    desc: 'All 8 workstreams complete · Interactive exploration ready',
  },
};

export const DemoPresenterBar: React.FC<DemoPresenterBarProps> = ({
  stage,
  isPlaying,
  elapsedSec,
  totalDuration,
  progressPercentage,
  presenterMode,
  onStart,
  onPause,
  onResume,
  onSkip,
  onReset,
  onReplay,
  onTogglePresenterMode,
}) => {
  // Global presentation hotkeys: Space to Play/Pause, S to Skip, R to Reset
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.code === 'Space') {
        e.preventDefault();
        if (stage === 'idle') onStart();
        else if (isPlaying) onPause();
        else onResume();
      } else if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        onSkip();
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        onReset();
      } else if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        onTogglePresenterMode();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [stage, isPlaying, onStart, onPause, onResume, onSkip, onReset, onTogglePresenterMode]);

  const currentStageInfo = STAGE_LABELS[stage];

  return (
    <div className="sticky top-0 z-40 bg-surface-light/95 backdrop-blur-md border-b border-hairline-light shadow-sm transition-all duration-200">
      {/* Top Banner: Authentic Production Status Bar */}
      <div className="px-4 py-1.5 bg-emerald-500/10 border-b border-emerald-500/20 text-emerald-950 flex items-center justify-between text-xs font-mono">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <span className="font-semibold tracking-wide uppercase text-[11px] text-emerald-900">
            ARGUS MISSION CONTROL · AUTONOMOUS RESEARCH PIPELINE
          </span>
          <span className="hidden md:inline text-emerald-800/80 text-[11px]">
            — Multi-agent intelligence execution engine. SHA-256 ground truth verification active.
          </span>
        </div>
        <div className="flex items-center space-x-3 text-[11px]">
          <span className="hidden sm:inline text-emerald-800/70">Hotkeys: [Space] Play/Pause • [S] Fast-Forward • [R] Reset • [P] Presenter</span>
          <span className="px-2 py-0.5 rounded bg-emerald-200/60 font-semibold text-emerald-950 text-[10px]">
            Live Session
          </span>
        </div>
      </div>

      {/* Main Controls Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-4">
        {/* Left: Stage & Status Indicator */}
        <div className="flex items-center space-x-4">
          <div className="space-y-0.5">
            <div className="flex items-center space-x-2">
              <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                {currentStageInfo.name}
              </span>
              <span className="font-mono text-xs text-ink-tertiary">
                T+{elapsedSec.toFixed(1)}s / T+{totalDuration}s
              </span>
            </div>
            <p className="text-xs text-ink-secondary truncate max-w-md sm:max-w-lg hidden sm:block">
              {currentStageInfo.desc}
            </p>
          </div>
        </div>

        {/* Right: Interactive Presenter Controls */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Play/Pause/Resume Button */}
          {stage === 'idle' ? (
            <button
              onClick={onStart}
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-ink-primary text-white text-xs font-medium hover:bg-black transition shadow-sm"
              title="Execute research pipeline (Space)"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Execute Mission</span>
            </button>
          ) : isPlaying ? (
            <button
              onClick={onPause}
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-amber-600 text-white text-xs font-medium hover:bg-amber-700 transition shadow-sm"
              title="Pause execution (Space)"
            >
              <Pause className="w-3.5 h-3.5 fill-white" />
              <span>Pause</span>
            </button>
          ) : stage === 'completed' ? (
            <button
              onClick={onReplay}
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-emerald-700 text-white text-xs font-medium hover:bg-emerald-800 transition shadow-sm"
              title="Re-run research mission"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Re-run Mission</span>
            </button>
          ) : (
            <button
              onClick={onResume}
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-ink-primary text-white text-xs font-medium hover:bg-black transition shadow-sm"
              title="Resume execution (Space)"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Resume</span>
            </button>
          )}

          {/* Skip to Results */}
          {stage !== 'completed' && (
            <button
              onClick={onSkip}
              className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-surface-light border border-hairline-light hover:bg-canvas-light text-ink-secondary hover:text-ink-primary text-xs font-mono transition shadow-sm"
              title="Fast-forward to finished opportunity hypotheses (S)"
            >
              <FastForward className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden sm:inline">Fast-Forward</span>
              <span className="sm:hidden">Skip</span>
            </button>
          )}

          {/* Reset Pipeline */}
          <button
            onClick={onReset}
            className="p-2 rounded-xl bg-surface-light border border-hairline-light hover:bg-canvas-light text-ink-tertiary hover:text-ink-primary transition shadow-sm"
            title="Reset pipeline session (R)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Presenter Mode Toggle */}
          <button
            onClick={onTogglePresenterMode}
            className={`inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-mono border transition shadow-sm ${
              presenterMode
                ? 'bg-indigo-600 text-white border-indigo-700 font-semibold'
                : 'bg-surface-light border-hairline-light text-ink-secondary hover:text-ink-primary hover:bg-canvas-light'
            }`}
            title="Toggle 16:9 Projector Presentation Mode (P)"
          >
            <Monitor className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Presenter View</span>
          </button>
        </div>
      </div>

      {/* Persistent Deterministic Progress Bar */}
      <div className="w-full h-1 bg-hairline-light/50 overflow-hidden">
        <div
          className="h-full bg-indigo-600 transition-all duration-300 ease-out"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>
    </div>
  );
};
