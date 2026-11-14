'use client';

import React from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Compass,
  Sparkles,
  ShieldAlert,
  Play,
  RotateCcw,
  FastForward,
  ChevronRight,
  ExternalLink,
  Cpu,
  Layers,
  FileText,
  Lightbulb,
  CheckCircle2,
  Info,
  Maximize2,
  Minimize2,
} from 'lucide-react';

import { useDemoSimulation } from '../../demo/useDemoSimulation';
import { DemoPresenterBar } from '../../demo/DemoPresenterBar';
import { DemoWorkstreamsGrid } from '../../demo/DemoWorkstreamsGrid';
import { DemoActivityTimeline } from '../../demo/DemoActivityTimeline';
import { DemoEvidenceDrawer } from '../../demo/DemoEvidenceDrawer';
import { DemoOpportunityDossier } from '../../demo/DemoOpportunityDossier';
import {
  DEMO_MISSION_META,
  DEMO_EVIDENCE_ITEMS,
  DEMO_OPPORTUNITIES,
  DemoOpportunity,
} from '../../demo/demoData';

export default function DemoPage() {
  const {
    stage,
    isPlaying,
    elapsedSec,
    totalDuration,
    progressPercentage,
    presenterMode,
    setPresenterMode,
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
    idle: 'Intro: Welcome the evaluators. State the mission objective: Discovering emerging opportunities in AI inference infrastructure.',
    interpreting: 'Stage 1: Explain how ARGUS parses unstructured objectives into boundary constraints (HBM memory, KV cache, speculative decoding).',
    activating_workstreams: 'Stage 2: Highlight the 8 specialist intelligence engines activated in parallel to inspect codebases, preprints, and market telemetry.',
    gathering_signals: 'Stage 3: Point out real runtime signals arriving from GitHub repositories (vLLM #5480, SGLang #6122, Triton #3412).',
    verifying_evidence: 'Stage 4: Emphasize cryptographic provenance: every claim links to verbatim text spans hashed with SHA-256 (Zero Hallucination).',
    clustering_patterns: 'Stage 5: Showcase the Negative Space Engine cross-referencing capabilities against developer complaints to isolate unmet needs.',
    synthesizing_hypotheses: 'Stage 6: Reveal the 2 synthesized opportunity dossiers: Disaggregated KV Tiering & FP8 Speculative Tree Verifier.',
    completed: 'Conclusion: Click into an Opportunity Dossier or Evidence Inspector to demonstrate complete epistemic rigor and validation plans.',
  };

  return (
    <div className={`min-h-screen bg-canvas-light text-ink-primary font-sans flex flex-col selection:bg-indigo-100 selection:text-indigo-900 ${
      presenterMode ? 'text-base' : ''
    }`}>
      {/* Interactive Presenter Control Bar */}
      <DemoPresenterBar
        stage={stage}
        isPlaying={isPlaying}
        elapsedSec={elapsedSec}
        totalDuration={totalDuration}
        progressPercentage={progressPercentage}
        presenterMode={presenterMode}
        onStart={startDemo}
        onPause={pauseDemo}
        onResume={resumeDemo}
        onSkip={skipToResults}
        onReset={resetDemo}
        onReplay={replayDemo}
        onTogglePresenterMode={() => setPresenterMode(!presenterMode)}
      />

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">
        {/* Presenter Cue Floating Card (Visible in Presenter Mode) */}
        {presenterMode && (
          <div className="p-4 rounded-xl bg-indigo-900 text-white shadow-tactile border border-indigo-700 flex items-start space-x-3 animate-in fade-in duration-200">
            <Info className="w-5 h-5 text-indigo-300 shrink-0 mt-0.5" />
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
            <div className="p-6 sm:p-8 rounded-2xl bg-surface-light border border-hairline-light shadow-tactile space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-xs font-semibold px-2.5 py-1 rounded bg-indigo-50 text-indigo-800 border border-indigo-200">
                    ACTIVE RESEARCH MISSION
                  </span>
                  <span className="font-mono text-xs text-ink-tertiary">
                    {DEMO_MISSION_META.id.toUpperCase()}
                  </span>
                </div>

                <div className="flex items-center space-x-4 font-mono text-xs">
                  <div>
                    <span className="text-ink-tertiary uppercase text-[10px] block">Target Domain</span>
                    <span className="text-ink-primary font-medium">{DEMO_MISSION_META.target_domain}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h1 className="font-serif text-3xl sm:text-4xl font-normal text-ink-primary leading-tight">
                  {DEMO_MISSION_META.title}
                </h1>
                <p className="text-base text-ink-secondary leading-relaxed font-sans max-w-4xl">
                  {DEMO_MISSION_META.objective}
                </p>
              </div>

              {/* Investigation Scope Tags */}
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-hairline-light">
                <span className="text-xs font-mono text-ink-tertiary">Scope:</span>
                {DEMO_MISSION_META.investigation_scope.map((scope, idx) => (
                  <span
                    key={idx}
                    className="text-xs font-mono px-2 py-0.5 rounded bg-canvas-light text-ink-secondary border border-hairline-light"
                  >
                    {scope}
                  </span>
                ))}
              </div>
            </div>

            {/* 8 Specialist Workstreams Section */}
            <section className="space-y-4">
              <DemoWorkstreamsGrid workstreams={workstreams} presenterMode={presenterMode} />
            </section>

            {/* Two-Column Telemetry & Evidence Split */}
            <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Live Deterministic Activity Stream (5 Cols) */}
              <div className="lg:col-span-5 space-y-4">
                <DemoActivityTimeline logs={timelineLogs} maxHeight="max-h-[380px]" />

                {/* Cryptographic Execution Guarantee Box */}
                <div className="p-4 rounded-xl border border-hairline-light bg-surface-light space-y-2 text-xs">
                  <div className="flex items-center space-x-2 font-mono text-ink-primary font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Cryptographic Verification Guarantee</span>
                  </div>
                  <p className="text-ink-secondary leading-relaxed font-sans">
                    All harvested code excerpts, runtime issues, and technical claims are validated
                    against primary repository snapshots using immutable SHA-256 content hashes.
                    Zero hallucinated scores.
                  </p>
                </div>
              </div>

              {/* Right Column: Progressive Research Evidence Feed (7 Cols) */}
              <div className="lg:col-span-7 space-y-4">
                <div className="flex items-center justify-between border-b border-hairline-light pb-3">
                  <div className="flex items-center space-x-2">
                    <FileText className="w-4 h-4 text-emerald-700" />
                    <h3 className="font-serif text-lg font-normal text-ink-primary">
                      Primary Evidence Repository
                    </h3>
                  </div>
                  <span className="font-mono text-xs text-emerald-700 font-semibold px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200">
                    {visibleEvidence.length} Spans Verified
                  </span>
                </div>

                {visibleEvidence.length === 0 ? (
                  <div className="p-10 rounded-xl border border-dashed border-hairline-light bg-surface-light/50 text-center space-y-2 font-mono text-xs text-ink-tertiary">
                    <FileText className="w-6 h-6 mx-auto opacity-40" />
                    <span>Awaiting signal harvesting from active scanners...</span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {visibleEvidence.map((ev) => (
                      <div
                        key={ev.id}
                        onClick={() => setSelectedEvidenceId(ev.id)}
                        className="p-4 rounded-xl bg-surface-light border border-hairline-light hover:border-emerald-500/60 shadow-sm transition cursor-pointer space-y-2.5 group"
                      >
                        <div className="flex items-center justify-between text-xs font-mono">
                          <div className="flex items-center space-x-2">
                            <span className="font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                              {ev.citation_pill}
                            </span>
                            <span className="text-ink-tertiary">{ev.source_name}</span>
                          </div>
                          <span className="text-[11px] text-indigo-600 group-hover:underline flex items-center space-x-0.5">
                            <span>Inspect Span</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </span>
                        </div>

                        <blockquote className="font-serif text-xs italic text-ink-primary leading-relaxed">
                          "{ev.verbatim_excerpt}"
                        </blockquote>

                        <div className="flex items-center justify-between text-[11px] font-mono text-ink-tertiary pt-1 border-t border-hairline-light/50">
                          <span className="truncate max-w-xs">{ev.source_title}</span>
                          <span className="text-emerald-700 font-medium">SHA-256 Validated</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* Synthesized Opportunity Dossiers Reveal Section */}
            <section className="space-y-4 pt-4 border-t border-hairline-light">
              <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
                <div className="flex items-center space-x-2">
                  <Lightbulb className="w-5 h-5 text-indigo-600" />
                  <h2 className="font-serif text-2xl font-normal text-ink-primary">
                    Synthesized Opportunity Hypotheses
                  </h2>
                </div>
                <span className="text-xs font-mono text-ink-tertiary">
                  Derived from Negative Space & Incumbent Blindspot Analysis
                </span>
              </div>

              {visibleOpportunities.length === 0 ? (
                <div className="p-12 rounded-2xl border-2 border-dashed border-hairline-light bg-surface-light/40 text-center space-y-3 font-mono text-xs text-ink-tertiary">
                  <Lightbulb className="w-8 h-8 mx-auto opacity-30 text-indigo-400" />
                  <div>
                    <span className="font-semibold text-ink-secondary block">
                      Opportunity Synthesis in Progress
                    </span>
                    <span>
                      Specialist engines are connecting architectural bottlenecks and formulating whitespaces.
                    </span>
                  </div>
                  <button
                    onClick={skipToResults}
                    className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition mt-2 text-xs font-mono"
                  >
                    <FastForward className="w-3.5 h-3.5" />
                    <span>Fast-Forward to Synthesized Dossiers</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {visibleOpportunities.map((opp) => (
                    <div
                      key={opp.id}
                      onClick={() => setSelectedOpportunityId(opp.id)}
                      className="p-6 rounded-2xl bg-surface-light border-2 border-indigo-200/80 hover:border-indigo-500 shadow-tactile transition cursor-pointer space-y-4 flex flex-col justify-between group"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="font-semibold px-2 py-0.5 rounded bg-indigo-50 text-indigo-800 border border-indigo-200">
                            {opp.category}
                          </span>
                          <span className="text-indigo-600 font-bold text-sm">
                            Score: {opp.overall_priority}/100
                          </span>
                        </div>

                        <h3 className="font-serif text-xl font-normal text-ink-primary group-hover:text-indigo-950 transition leading-snug">
                          {opp.title}
                        </h3>

                        <p className="text-xs text-ink-secondary leading-relaxed font-sans line-clamp-3">
                          {opp.summary}
                        </p>

                        {/* Structural Whitespace Snippet */}
                        <div className="p-3 rounded-xl bg-canvas-light border border-hairline-light space-y-1 text-xs">
                          <span className="text-[10px] font-mono text-indigo-700 uppercase font-semibold block">
                            Market Whitespace
                          </span>
                          <p className="text-ink-primary font-sans leading-relaxed line-clamp-2">
                            {opp.gap_analysis}
                          </p>
                        </div>
                      </div>

                      {/* Footer Link */}
                      <div className="pt-3 border-t border-hairline-light flex items-center justify-between text-xs font-mono text-ink-tertiary">
                        <span>{opp.citations.length} Supporting Signals</span>
                        <span className="text-indigo-600 group-hover:translate-x-1 transition flex items-center space-x-1 font-medium">
                          <span>Open Full Dossier</span>
                          <ChevronRight className="w-4 h-4" />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>

      {/* Slide-Over Evidence Inspector Drawer */}
      <DemoEvidenceDrawer
        isOpen={Boolean(selectedEvidence)}
        onClose={() => setSelectedEvidenceId(null)}
        evidence={selectedEvidence}
        onSelectOpportunity={(oppId) => setSelectedOpportunityId(oppId)}
      />
    </div>
  );
}
