'use client';

import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  FastForward,
  Monitor,
  RefreshCw,
  Cpu,
  Layers,
  ChevronDown,
  Sparkles,
  Shuffle,
  Clock,
  Activity,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { DemoStage, PacingMode, PipelineComputeMetrics } from './useDemoSimulation';
import { MISSION_PRESETS } from './pipelineData';

interface DemoPresenterBarProps {
  stage: DemoStage;
  isPlaying: boolean;
  elapsedSec: number;
  totalDuration: number;
  progressPercentage: number;
  presenterMode: boolean;
  pacing: PacingMode;
  currentMissionId: string;
  computeMetrics: PipelineComputeMetrics;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onSkip: () => void;
  onReset: () => void;
  onReplay: () => void;
  onTogglePresenterMode: () => void;
  onSelectMission: (missionId: string) => void;
  onRandomizeMission: () => void;
  onChangePacing: (pacing: PacingMode) => void;
}

const STAGE_LABELS: Record<DemoStage, { name: string; desc: string }> = {
  idle: {
    name: 'Pipeline Standby',
    desc: 'Ready to execute autonomous research against tier-1 inference runtimes',
  },
  interpreting: {
    name: '1. Objective Parsing',
    desc: 'Extracting technical boundary constraints & scoping research domain',
  },
  activating_workstreams: {
    name: '2. Fleet Dispatch',
    desc: 'Spawning 8 specialist engines concurrently via Temporal workflows',
  },
  gathering_signals: {
    name: '3. Mining Runtime Signals',
    desc: 'Streaming AST trees, commit regressions & profiling traces from GitHub',
  },
  verifying_evidence: {
    name: '4. Cryptographic Provenance',
    desc: 'Validating SHA-256 span offsets & enforcing PostgreSQL RLS isolation',
  },
  clustering_patterns: {
    name: '5. Negative Space Clustering',
    desc: 'Cross-referencing memory friction points against structural market voids',
  },
  synthesizing_hypotheses: {
    name: '6. Synthesizing Hypotheses',
    desc: 'Formulating empirical opportunity hypotheses backed by primary sources',
  },
  completed: {
    name: '7. Intelligence Finalized',
    desc: 'Empirical dossiers complete · Multi-source evidence verified',
  },
};

export const DemoPresenterBar: React.FC<DemoPresenterBarProps> = ({
  stage,
  isPlaying,
  elapsedSec,
  totalDuration,
  progressPercentage,
  presenterMode,
  pacing,
  currentMissionId,
  computeMetrics,
  onStart,
  onPause,
  onResume,
  onSkip,
  onReset,
  onReplay,
  onTogglePresenterMode,
  onSelectMission,
  onRandomizeMission,
  onChangePacing,
}) => {
  const [isMissionDropdownOpen, setIsMissionDropdownOpen] = useState(false);

  // Global presentation hotkeys: Space to Play/Pause, S to Skip, R to Reset, P to Presenter
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) return;

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
  const activeMission = MISSION_PRESETS.find((m) => m.id === currentMissionId) || MISSION_PRESETS[0];

  return (
    <div className="sticky top-0 z-40 bg-[#080B14]/90 backdrop-blur-2xl border-b border-white/10 shadow-2xl transition-all duration-200">
      {/* Top Banner: Authentic Production Status Bar with Live Telemetry */}
      <div className="px-4 py-1.5 bg-emerald-950/40 border-b border-emerald-500/20 text-emerald-300 flex flex-wrap items-center justify-between text-xs font-mono gap-2">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0 shadow-[0_0_8px_#34d399]" />
          <span className="font-semibold tracking-wide uppercase text-[11px] text-emerald-200">
            ARGUS MISSION CONTROL · AUTONOMOUS RESEARCH PIPELINE
          </span>
          <span className="hidden lg:inline text-zinc-400 text-[11px]">
            — 8 Temporal Engines · SHA-256 Ground Truth Verification Active
          </span>
        </div>

        {/* Live Computational Telemetry Ticker */}
        <div className="flex items-center space-x-4 text-[11px]">
          <div className="hidden sm:flex items-center space-x-3 text-zinc-300">
            <span>
              Ingested: <strong className="font-mono text-emerald-400">{computeMetrics.bytesIngestedMB} MB</strong>
            </span>
            <span>•</span>
            <span>
              Commits: <strong className="font-mono text-indigo-300">{computeMetrics.commitsParsed.toLocaleString()}</strong>
            </span>
            <span>•</span>
            <span>
              AST Nodes: <strong className="font-mono text-cyan-300">{computeMetrics.astNodesResolved.toLocaleString()}</strong>
            </span>
            <span>•</span>
            <span>
              Verified Hashes: <strong className="font-mono text-emerald-400">{computeMetrics.sha256Count}</strong>
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 font-semibold text-emerald-300 text-[10px]">
              {stage === 'completed' ? 'Execution Complete' : isPlaying ? 'Computing Live' : 'Session Ready'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Controls Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-4">
        {/* Left: Mission Selector Dropdown & Status */}
        <div className="flex items-center space-x-4">
          {/* Mission Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsMissionDropdownOpen(!isMissionDropdownOpen)}
              disabled={isPlaying}
              className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full border border-white/10 bg-zinc-900/90 text-white hover:bg-zinc-800 text-xs font-mono transition disabled:opacity-50 shadow-sm"
            >
              <Cpu className="w-3.5 h-3.5 text-indigo-400" />
              <span className="font-semibold truncate max-w-[200px] sm:max-w-xs">
                {activeMission.title}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
            </button>

            {/* Dropdown Menu */}
            {isMissionDropdownOpen && (
              <div className="absolute left-0 mt-2 w-80 sm:w-96 rounded-2xl bg-[#0B0E1B] border border-white/15 shadow-2xl p-2.5 z-50 text-xs font-mono space-y-1 backdrop-blur-2xl">
                <div className="px-2 py-1 text-[10px] uppercase text-zinc-400 font-semibold">
                  Select Research Mission Preset
                </div>
                {MISSION_PRESETS.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => {
                      onSelectMission(m.id);
                      setIsMissionDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl transition space-y-0.5 ${
                      m.id === currentMissionId
                        ? 'bg-indigo-950/80 text-white font-semibold border border-indigo-700/60'
                        : 'hover:bg-zinc-800/60 text-zinc-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-indigo-400">{m.id}</span>
                      <span className="text-[10px] text-zinc-400 truncate max-w-[140px]">
                        {m.target_repos[0]}
                      </span>
                    </div>
                    <div className="text-[11px] truncate font-sans text-zinc-200">{m.title}</div>
                  </button>
                ))}

                <div className="pt-1.5 border-t border-white/10">
                  <button
                    onClick={() => {
                      onRandomizeMission();
                      setIsMissionDropdownOpen(false);
                    }}
                    className="w-full inline-flex items-center space-x-2 px-3 py-2 rounded-xl text-indigo-300 hover:bg-indigo-950/50 font-sans transition text-xs font-medium"
                  >
                    <Shuffle className="w-3.5 h-3.5" />
                    <span>Randomize Mission Scope</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Current Stage Indicator */}
          <div className="space-y-0.5 hidden md:block">
            <div className="flex items-center space-x-2">
              <span className="font-mono text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-950/80 text-indigo-300 border border-indigo-700/50">
                {currentStageInfo.name}
              </span>
              <span className="font-mono text-xs text-zinc-400">
                T+{elapsedSec.toFixed(1)}s / T+{totalDuration}s
              </span>
            </div>
            <p className="text-xs text-zinc-400 truncate max-w-sm hidden lg:block font-sans">
              {currentStageInfo.desc}
            </p>
          </div>
        </div>

        {/* Right: Interactive Presenter Controls & Pacing */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Computation Pacing Switcher */}
          <div className="hidden sm:flex items-center p-0.5 rounded-full bg-zinc-900 border border-white/10 text-xs font-mono">
            <button
              onClick={() => onChangePacing('realistic')}
              disabled={isPlaying}
              className={`px-3 py-1 rounded-full transition text-[11px] ${
                pacing === 'realistic'
                  ? 'bg-white text-zinc-950 font-semibold shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
              title="Deliberate 48-second deep computational pipeline"
            >
              Realistic (48s)
            </button>
            <button
              onClick={() => onChangePacing('turbo')}
              disabled={isPlaying}
              className={`px-3 py-1 rounded-full transition text-[11px] ${
                pacing === 'turbo'
                  ? 'bg-white text-zinc-950 font-semibold shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
              title="Fast 24-second computational pipeline"
            >
              Turbo (24s)
            </button>
          </div>

          {/* Randomize Quick Button */}
          <button
            onClick={onRandomizeMission}
            disabled={isPlaying}
            className="p-2 rounded-full bg-zinc-900 border border-white/10 hover:bg-zinc-800 text-zinc-300 hover:text-white transition shadow-sm disabled:opacity-50"
            title="Switch to another random research target"
          >
            <Shuffle className="w-3.5 h-3.5 text-indigo-400" />
          </button>

          {/* Play/Pause/Resume Button */}
          {stage === 'idle' ? (
            <button
              onClick={onStart}
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-white text-zinc-950 text-xs font-medium hover:bg-zinc-200 transition shadow-[0_0_15px_rgba(255,255,255,0.25)]"
              title="Execute research pipeline (Space)"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Execute Mission</span>
            </button>
          ) : isPlaying ? (
            <button
              onClick={onPause}
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-amber-500 text-zinc-950 text-xs font-medium hover:bg-amber-400 transition shadow-sm"
              title="Pause computation (Space)"
            >
              <Pause className="w-3.5 h-3.5 fill-current" />
              <span>Pause</span>
            </button>
          ) : stage === 'completed' ? (
            <button
              onClick={onReplay}
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-emerald-400 text-zinc-950 text-xs font-medium hover:bg-emerald-300 transition shadow-[0_0_15px_rgba(52,211,153,0.3)]"
              title="Re-run research mission"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Re-run Mission</span>
            </button>
          ) : (
            <button
              onClick={onResume}
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-white text-zinc-950 text-xs font-medium hover:bg-zinc-200 transition shadow-sm"
              title="Resume computation (Space)"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Resume</span>
            </button>
          )}

          {/* Fast-Forward to Finished Opportunities */}
          {stage !== 'completed' && (
            <button
              onClick={onSkip}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-full bg-zinc-900 border border-white/10 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs font-mono transition shadow-sm"
              title="Fast-forward to finished opportunity hypotheses (S)"
            >
              <FastForward className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">Fast-Forward</span>
            </button>
          )}

          {/* Reset Pipeline */}
          <button
            onClick={onReset}
            className="p-2 rounded-full bg-zinc-900 border border-white/10 hover:bg-zinc-800 text-zinc-400 hover:text-white transition shadow-sm"
            title="Reset pipeline (R)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Presenter Mode Toggle */}
          <button
            onClick={onTogglePresenterMode}
            className={`p-2 rounded-full border transition shadow-sm ${
              presenterMode
                ? 'bg-indigo-600 border-indigo-400 text-white shadow-[0_0_12px_rgba(99,102,241,0.5)]'
                : 'bg-zinc-900 border-white/10 text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
            title="Toggle Presenter Talking Points (P)"
          >
            <Monitor className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Progress Bar with Real-Time Stages */}
      <div className="w-full bg-zinc-900 h-1 relative overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${
            stage === 'completed'
              ? 'bg-emerald-400'
              : isPlaying
              ? 'bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400'
              : 'bg-indigo-500'
          }`}
          style={{ width: `${progressPercentage}%` }}
        />
      </div>
    </div>
  );
};
