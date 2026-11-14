'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  FileText,
  Lightbulb,
  TrendingUp,
  Cpu,
  Layers,
  Terminal,
  FastForward,
  ExternalLink,
  Info,
  GitBranch,
  LayoutDashboard,
  Home,
  Compass,
} from 'lucide-react';

import { useDemoSimulation } from '../../pipeline/useDemoSimulation';
import { DemoPresenterBar } from '../../pipeline/DemoPresenterBar';
import { DemoWorkstreamsGrid } from '../../pipeline/DemoWorkstreamsGrid';
import { DemoActivityTimeline } from '../../pipeline/DemoActivityTimeline';
import { DemoEvidenceDrawer } from '../../pipeline/DemoEvidenceDrawer';
import { DemoOpportunityDossier } from '../../pipeline/DemoOpportunityDossier';
import { SupasteNavbar } from '../../components/SupasteNavbar';
import {
  DEMO_EVIDENCE_ITEMS,
  DEMO_OPPORTUNITIES,
  DemoOpportunity,
} from '../../pipeline/pipelineData';

export default function MissionControlPage() {
  const {
    stage,
    isPlaying,
    elapsedSec,
    totalDuration,
    progressPercentage,
    presenterMode,
    setPresenterMode,
    pacing,
    setPacing,
    currentMission,
    currentMissionId,
    setMission,
    randomizeMission,
    computeMetrics,
    workstreams,
    visibleEvidence,
    visibleOpportunities,
    timelineLogs,
    selectedEvidenceId,
    setSelectedEvidenceId,
    selectedOpportunityId,
    setSelectedOpportunityId,
    startDemo,
    pauseDemo,
    resumeDemo,
    resetDemo,
    skipToResults,
    replayDemo,
  } = useDemoSimulation();

  const selectedEvidence = selectedEvidenceId ? DEMO_EVIDENCE_ITEMS[selectedEvidenceId] || null : null;
  const selectedOpportunity = selectedOpportunityId
    ? DEMO_OPPORTUNITIES.find((o) => o.id === selectedOpportunityId) || null
    : null;

  // Presenter talking points for each stage
  const PRESENTER_CUES: Record<string, string> = {
    idle: `Intro: Welcome the evaluators. State the mission objective: ${currentMission.title}.`,
    interpreting: `Stage 1: Explain how ARGUS parses unstructured objectives into boundary constraints (${currentMission.domain}).`,
    activating_workstreams: `Stage 2: Highlight the 8 specialist intelligence engines activated in parallel across ${currentMission.target_repos.join(', ')}.`,
    gathering_signals: 'Stage 3: Point out real runtime signals arriving from GitHub repositories, bare Git clones, and kernel profiling logs.',
    verifying_evidence: 'Stage 4: Emphasize cryptographic provenance: every claim links to verbatim text spans hashed with SHA-256 (Zero Hallucination).',
    clustering_patterns: 'Stage 5: Showcase the Negative Space Engine cross-referencing capabilities against developer complaints to isolate unmet needs.',
    synthesizing_hypotheses: 'Stage 6: Reveal the synthesized strategic opportunity hypotheses formulated from empirical signals.',
    completed: 'Conclusion: Click into an Opportunity Dossier or Evidence Inspector to verify complete epistemic rigor and empirical validation plans.',
  };

  return (
    <div
      className={`min-h-screen bg-[#07080F] text-zinc-100 font-sans flex flex-col selection:bg-indigo-500/30 selection:text-indigo-200 relative overflow-x-hidden ${
        presenterMode ? 'text-base' : ''
      }`}
    >
      {/* 1. Supaste Floating Pill Navbar */}
      <SupasteNavbar currentPath="/mission" />

      {/* Atmospheric Ambient Glow behind Hero */}
      <div
        className="absolute top-0 inset-x-0 h-96 pointer-events-none select-none z-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(120, 80, 180, 0.25) 0%, rgba(99, 102, 241, 0.12) 40%, transparent 75%)',
        }}
      />

      {/* 2. Top Interactive Presenter Control Bar */}
      <div className="pt-20 sm:pt-24 relative z-30">
        <DemoPresenterBar
          stage={stage}
          isPlaying={isPlaying}
          elapsedSec={elapsedSec}
          totalDuration={totalDuration}
          progressPercentage={progressPercentage}
          presenterMode={presenterMode}
          pacing={pacing}
          currentMissionId={currentMissionId}
          computeMetrics={computeMetrics}
          onStart={startDemo}
          onPause={pauseDemo}
          onResume={resumeDemo}
          onSkip={skipToResults}
          onReset={resetDemo}
          onReplay={replayDemo}
          onTogglePresenterMode={() => setPresenterMode(!presenterMode)}
          onSelectMission={setMission}
          onRandomizeMission={randomizeMission}
          onChangePacing={setPacing}
        />
      </div>

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8 relative z-10">
        {/* Presenter Cue Floating Card (Visible in Presenter Mode) */}
        {presenterMode && (
          <div className="p-4 rounded-2xl bg-indigo-950/80 text-white shadow-2xl border border-indigo-700/60 flex items-start space-x-3 backdrop-blur-xl animate-in fade-in duration-200">
            <Info className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="text-[11px] font-mono uppercase tracking-wider text-indigo-300 font-semibold block">
                Mission Telemetry & Pipeline Overview
              </span>
              <p className="text-sm font-sans text-indigo-100 leading-snug">
                {PRESENTER_CUES[stage]}
              </p>
            </div>
          </div>
        )}

        {/* If an opportunity is selected, show its full Dossier View */}
        {selectedOpportunity ? (
          <DemoOpportunityDossier
            opportunity={selectedOpportunity}
            onBack={() => setSelectedOpportunityId(null)}
            onOpenEvidence={(evId) => setSelectedEvidenceId(evId)}
          />
        ) : (
          <>
            {/* Mission Hero Brief */}
            <div id="mission-brief" className="p-6 sm:p-8 rounded-3xl bg-[#090C16]/90 border border-white/10 shadow-2xl backdrop-blur-xl space-y-5 scroll-mt-28">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-950/80 text-indigo-300 border border-indigo-700/60">
                    ACTIVE RESEARCH MISSION
                  </span>
                  <span className="font-mono text-xs text-zinc-400">
                    {currentMission.id.toUpperCase()}
                  </span>
                </div>

                <div className="flex items-center space-x-4 font-mono text-xs">
                  <div>
                    <span className="text-zinc-500 uppercase text-[10px] block">Target Domain</span>
                    <span className="text-white font-medium">{currentMission.domain}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h1 className="font-serif text-3xl sm:text-4xl font-normal text-white leading-tight">
                  {currentMission.title}
                </h1>
                <p className="text-base text-zinc-300 leading-relaxed font-sans max-w-4xl">
                  {currentMission.objective}
                </p>
              </div>

              {/* Target Repositories */}
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/5">
                <span className="text-xs font-mono text-zinc-400 flex items-center space-x-1">
                  <GitBranch className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Target Repositories:</span>
                </span>
                {currentMission.target_repos.map((repo) => (
                  <a
                    key={repo}
                    href={`https://github.com/${repo}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center space-x-1 text-xs font-mono px-2.5 py-1 rounded-full bg-zinc-900 text-zinc-300 hover:text-white border border-white/10 transition"
                  >
                    <span>{repo}</span>
                    <ExternalLink className="w-3 h-3 text-zinc-500" />
                  </a>
                ))}
              </div>

              {/* Investigation Scope Tags */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-xs font-mono text-zinc-500">Scope:</span>
                {currentMission.scope.map((scope, idx) => (
                  <span
                    key={idx}
                    className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-zinc-900 border border-white/10 text-zinc-400"
                  >
                    #{scope}
                  </span>
                ))}
              </div>
            </div>

            {/* Eight Specialist Engines Grid */}
            <DemoWorkstreamsGrid workstreams={workstreams} presenterMode={presenterMode} />

            {/* Two-Column Telemetry Stream: Real-time Event Log + Emerging Signals */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column: Activity Log Timeline */}
              <div className="space-y-3">
                <h4 className="font-serif text-lg font-normal text-white">
                  Real-Time Computation Log
                </h4>
                <DemoActivityTimeline logs={timelineLogs} maxHeight="max-h-[380px]" />
              </div>

              {/* Right Column: Emerging Verified Evidence Items */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-serif text-lg font-normal text-white">
                    Verified Cryptographic Ground Truth
                  </h4>
                  <span className="font-mono text-xs text-zinc-400">
                    {visibleEvidence.length} Evidence Spans
                  </span>
                </div>

                <div className="rounded-2xl border border-white/10 bg-[#090C16]/90 backdrop-blur-xl p-4 max-h-[380px] overflow-y-auto space-y-3 shadow-2xl">
                  {visibleEvidence.length === 0 ? (
                    <div className="py-12 text-center text-xs font-mono text-zinc-500">
                      <ShieldCheck className="w-6 h-6 mx-auto mb-2 opacity-40 text-zinc-400" />
                      <span>Evidence verification in progress. Spans appear as AST trees resolve.</span>
                    </div>
                  ) : (
                    visibleEvidence.map((ev) => (
                      <div
                        key={ev.id}
                        onClick={() => setSelectedEvidenceId(ev.id)}
                        className="p-3.5 rounded-xl border border-white/10 bg-[#0B0E1B] hover:border-emerald-500/40 hover:bg-[#0E1324] transition cursor-pointer space-y-2 group"
                      >
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="font-semibold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-500/40">
                            {ev.citation_pill}
                          </span>
                          <span className="text-zinc-500 text-[10px] truncate max-w-[150px]">
                            {ev.source_title}
                          </span>
                        </div>

                        <p className="text-xs font-mono text-zinc-300 line-clamp-2 italic">
                          "{ev.verbatim_excerpt}"
                        </p>

                        <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 pt-1">
                          <span className="truncate max-w-[180px] text-zinc-500">{ev.section_name}</span>
                          <span className="text-indigo-400 group-hover:translate-x-0.5 transition flex items-center space-x-0.5">
                            <span>Inspect</span>
                            <ChevronRight className="w-3 h-3" />
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Synthesized Strategic Opportunity Hypotheses */}
            <div className="space-y-4 pt-4">
              <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-white/10 pb-3">
                <div>
                  <span className="font-mono text-xs font-semibold uppercase text-emerald-400">
                    Synthesized Opportunity Dossiers
                  </span>
                  <h3 className="font-serif text-2xl font-normal text-white mt-1">
                    Discovered Market Whitespaces
                  </h3>
                </div>
                <span className="font-mono text-xs text-zinc-400">
                  {visibleOpportunities.length} Hypotheses Formulated
                </span>
              </div>

              {visibleOpportunities.length === 0 ? (
                <div className="p-12 rounded-3xl border border-white/10 bg-[#090C16]/90 backdrop-blur-xl text-center space-y-2 shadow-2xl">
                  <Sparkles className="w-8 h-8 mx-auto text-indigo-400 opacity-60 animate-pulse" />
                  <p className="font-serif text-base text-zinc-300">
                    Formulating opportunity hypotheses from primary evidence signals...
                  </p>
                  <p className="text-xs font-mono text-zinc-500">
                    Hypotheses synthesize automatically at Stage 6 (T+35s) or immediately on Fast-Forward.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {visibleOpportunities.map((opp) => (
                    <div
                      key={opp.id}
                      onClick={() => setSelectedOpportunityId(opp.id)}
                      className="p-6 rounded-3xl border border-white/10 bg-[#090C16]/90 backdrop-blur-xl hover:border-indigo-400/50 hover:bg-[#0E1324] transition shadow-2xl cursor-pointer flex flex-col justify-between space-y-4 group"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="text-[10px] uppercase font-semibold text-indigo-300 bg-indigo-950/80 px-2.5 py-0.5 rounded-full border border-indigo-700/50">
                            {opp.category}
                          </span>
                          <span className="text-emerald-400 font-semibold">
                            {Math.round(opp.evidence_confidence * 100)}% Conf
                          </span>
                        </div>

                        <h4 className="font-serif text-xl font-normal text-white group-hover:text-indigo-300 transition leading-snug">
                          {opp.title}
                        </h4>

                        <p className="text-xs font-sans text-zinc-400 line-clamp-3 leading-relaxed">
                          {opp.summary}
                        </p>
                      </div>

                      <div className="space-y-3 pt-3 border-t border-white/5">
                        <div className="flex flex-wrap gap-1.5">
                          {opp.tags.slice(0, 3).map((t) => (
                            <span
                              key={t}
                              className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-900 border border-white/5 text-zinc-400"
                            >
                              #{t}
                            </span>
                          ))}
                        </div>

                        <div className="flex items-center justify-between text-xs font-mono text-indigo-400 pt-1">
                          <span className="text-zinc-500">{opp.citations.length} Ground Citations</span>
                          <span className="group-hover:translate-x-1 transition font-medium flex items-center space-x-1">
                            <span>Open Dossier</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* Slide-over Evidence Inspector */}
      <DemoEvidenceDrawer
        isOpen={!!selectedEvidence}
        evidence={selectedEvidence}
        onClose={() => setSelectedEvidenceId(null)}
        onSelectOpportunity={(oppId) => {
          setSelectedEvidenceId(null);
          setSelectedOpportunityId(oppId);
        }}
      />
    </div>
  );
}
