'use client';

import React from 'react';
import {
  ArrowLeft,
  ShieldCheck,
  Lightbulb,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  FlaskConical,
  ListOrdered,
  Users,
  Compass,
  FileText,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import { DemoOpportunity } from './demoData';

interface DemoOpportunityDossierProps {
  opportunity: DemoOpportunity;
  onBack: () => void;
  onOpenEvidence: (evidenceId: string) => void;
}

export const DemoOpportunityDossier: React.FC<DemoOpportunityDossierProps> = ({
  opportunity,
  onBack,
  onOpenEvidence,
}) => {
  return (
    <div className="space-y-8 max-w-6xl mx-auto animate-in fade-in duration-200">
      {/* Navigation & Header */}
      <div className="space-y-4">
        <button
          onClick={onBack}
          className="inline-flex items-center space-x-1.5 text-xs font-medium text-ink-secondary hover:text-ink-primary transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Discovery Overview</span>
        </button>

        {/* Hero Card */}
        <div className="p-6 sm:p-8 rounded-2xl bg-surface-light border border-hairline-light shadow-tactile space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-2">
              <span className="font-mono text-xs font-semibold px-2.5 py-1 rounded bg-indigo-50 text-indigo-800 border border-indigo-200">
                {opportunity.category}
              </span>
              <span className="font-mono text-xs text-ink-tertiary">
                ID: {opportunity.id.toUpperCase()}
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono text-[10px] uppercase font-semibold">
                Strategic Opportunity Hypothesis
              </span>
            </div>

            {/* Score Indicators */}
            <div className="flex items-center space-x-3 text-right">
              <div>
                <span className="font-mono text-2xl font-bold text-ink-primary">
                  {opportunity.overall_priority}
                  <span className="text-xs text-ink-tertiary font-normal">/100</span>
                </span>
                <span className="block text-[10px] font-mono uppercase tracking-wider text-ink-tertiary">
                  Synthesis Score
                </span>
              </div>
            </div>
          </div>

          <h1 className="font-serif text-3xl sm:text-4xl font-normal text-ink-primary leading-tight">
            {opportunity.title}
          </h1>

          <p className="text-base text-ink-secondary leading-relaxed font-sans max-w-4xl">
            {opportunity.summary}
          </p>

          {/* Metric Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-hairline-light text-center font-mono text-xs">
            <div className="p-2.5 rounded-lg bg-canvas-light">
              <span className="text-[10px] text-ink-tertiary uppercase block">Observed Evidence</span>
              <span className="text-sm font-semibold text-emerald-700">
                {opportunity.citations.length} Verified Spans
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-canvas-light">
              <span className="text-[10px] text-ink-tertiary uppercase block">Market Impact Potential</span>
              <span className="text-sm font-semibold text-indigo-700">
                {opportunity.market_impact}% Potential
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-canvas-light">
              <span className="text-[10px] text-ink-tertiary uppercase block">Technical Feasibility</span>
              <span className="text-sm font-semibold text-amber-700">
                {opportunity.technical_feasibility}% Feasible
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-canvas-light">
              <span className="text-[10px] text-ink-tertiary uppercase block">Pipeline Vector</span>
              <span className="text-sm font-semibold text-ink-primary">Autonomous Fleet</span>
            </div>
          </div>
        </div>
      </div>

      {/* EPISTEMIC SEPARATION: OBSERVED/ILLUSTRATIVE INPUTS vs ARGUS-GENERATED HYPOTHESES */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="font-serif text-2xl font-normal text-ink-primary">
              Epistemic Isolation: Empirical Ground Truth vs Strategic Synthesis
            </h2>
            <p className="text-xs text-ink-tertiary">
              Strict isolation separating raw verified evidence spans from synthesized architectural hypotheses.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* COLUMN A: OBSERVED / ILLUSTRATIVE INPUTS */}
          <div className="p-6 rounded-2xl bg-surface-light border-2 border-emerald-500/40 shadow-tactile space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-emerald-100">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span className="font-mono text-xs font-semibold uppercase tracking-wider text-emerald-800">
                  Observed / Illustrative Inputs
                </span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-700">
                Primary Ground Truth
              </span>
            </div>

            <p className="text-xs text-ink-tertiary leading-relaxed">
              Verbatim primary excerpts mined from issue trackers, code repositories, and cluster profiling traces. Zero artificial extrapolation.
            </p>

            <div className="space-y-3">
              {opportunity.citations.map((c) => (
                <div
                  key={c.id}
                  className="p-4 rounded-xl bg-canvas-light border border-hairline-light space-y-2 hover:border-emerald-400/80 transition"
                >
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => onOpenEvidence(c.id)}
                      className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-emerald-100/70 text-emerald-900 border border-emerald-300 hover:bg-emerald-200 transition"
                    >
                      {c.pill}
                    </button>
                    <span className="text-[10px] font-mono text-ink-tertiary">
                      Verified by SHA-256
                    </span>
                  </div>

                  <blockquote className="font-serif text-xs italic text-ink-primary leading-relaxed">
                    "{c.label}"
                  </blockquote>

                  <div className="pt-2 flex items-center justify-between text-[11px] font-mono text-ink-tertiary">
                    <span>Source: {c.source_type}</span>
                    <button
                      onClick={() => onOpenEvidence(c.id)}
                      className="text-indigo-600 hover:underline flex items-center space-x-0.5"
                    >
                      <span>Inspect Proof</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Target Users */}
            <div className="pt-3 border-t border-hairline-light space-y-2">
              <div className="flex items-center space-x-1.5 text-xs font-mono uppercase text-ink-secondary font-semibold">
                <Users className="w-3.5 h-3.5 text-ink-tertiary" />
                <span>Primary Target Users</span>
              </div>
              <ul className="text-xs text-ink-primary space-y-1 list-disc list-inside">
                {opportunity.target_users.map((u, i) => (
                  <li key={i}>{u}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* COLUMN B: ARGUS STRATEGIC OPPORTUNITY HYPOTHESES */}
          <div className="p-6 rounded-2xl bg-surface-light border-2 border-dashed border-indigo-400/50 shadow-tactile space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-indigo-100">
              <div className="flex items-center space-x-2">
                <Lightbulb className="w-4 h-4 text-indigo-600" />
                <span className="font-mono text-xs font-semibold uppercase tracking-wider text-indigo-800">
                  ARGUS Strategic Opportunity Hypotheses
                </span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-50 text-indigo-700">
                Whitespace Synthesis
              </span>
            </div>

            <p className="text-xs text-ink-tertiary leading-relaxed">
              Algorithmic opportunity formulation derived from the negative space left vacant by incumbent systems.
            </p>

            {/* Problem Statement Box */}
            <div className="p-4 rounded-xl bg-indigo-50/40 border border-indigo-100 space-y-1.5">
              <div className="text-xs font-mono font-medium text-indigo-900 uppercase tracking-wide">
                Problem Statement
              </div>
              <p className="text-xs text-ink-primary leading-relaxed font-sans">
                {opportunity.problem_statement}
              </p>
            </div>

            {/* Gap Analysis Box */}
            <div className="p-4 rounded-xl bg-surface-light border border-hairline-light space-y-1.5">
              <div className="text-xs font-mono font-medium text-ink-secondary uppercase tracking-wide">
                Structural Market Whitespace
              </div>
              <p className="text-xs text-ink-primary leading-relaxed font-sans">
                {opportunity.gap_analysis}
              </p>
            </div>

            {/* Why It Matters */}
            <div className="p-4 rounded-xl bg-emerald-50/30 border border-emerald-100 space-y-1.5">
              <div className="text-xs font-mono font-medium text-emerald-900 uppercase tracking-wide">
                Why It Might Matter
              </div>
              <p className="text-xs text-ink-primary leading-relaxed font-sans">
                {opportunity.why_it_matters}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* TECHNICAL VECTOR & STRATEGIC EXECUTION DETAILS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Technical Approach */}
        <div className="p-6 rounded-2xl bg-surface-light border border-hairline-light shadow-tactile space-y-3">
          <div className="flex items-center space-x-2 text-xs font-mono uppercase text-ink-primary font-semibold">
            <Compass className="w-4 h-4 text-indigo-600" />
            <span>Possible Technical Approach</span>
          </div>
          <ul className="text-xs text-ink-primary space-y-2 list-disc list-inside font-sans">
            {opportunity.technical_approach.map((step, idx) => (
              <li key={idx} className="leading-relaxed">
                {step}
              </li>
            ))}
          </ul>
        </div>

        {/* Competitors & Alternatives */}
        <div className="p-6 rounded-2xl bg-surface-light border border-hairline-light shadow-tactile space-y-3">
          <div className="flex items-center space-x-2 text-xs font-mono uppercase text-ink-primary font-semibold">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>Potential Competitors & Alternatives</span>
          </div>
          <ul className="text-xs text-ink-primary space-y-2 list-disc list-inside font-sans">
            {opportunity.competitors_and_alternatives.map((comp, idx) => (
              <li key={idx} className="leading-relaxed">
                {comp}
              </li>
            ))}
          </ul>
        </div>

        {/* Risks & Unknowns */}
        <div className="p-6 rounded-2xl bg-surface-light border border-hairline-light shadow-tactile space-y-3">
          <div className="flex items-center space-x-2 text-xs font-mono uppercase text-ink-primary font-semibold">
            <HelpCircle className="w-4 h-4 text-rose-600" />
            <span>Risks & Key Unknowns</span>
          </div>
          <ul className="text-xs text-ink-primary space-y-2 list-disc list-inside font-sans">
            {opportunity.risks_and_unknowns.map((risk, idx) => (
              <li key={idx} className="leading-relaxed text-ink-secondary">
                {risk}
              </li>
            ))}
          </ul>
        </div>

        {/* Validation Experiments & Next Steps */}
        <div className="p-6 rounded-2xl bg-surface-light border border-hairline-light shadow-tactile space-y-3">
          <div className="flex items-center space-x-2 text-xs font-mono uppercase text-ink-primary font-semibold">
            <FlaskConical className="w-4 h-4 text-emerald-600" />
            <span>Validation Experiments & Next Steps</span>
          </div>
          <div className="space-y-2 text-xs font-sans">
            <div>
              <span className="font-mono text-[10px] text-ink-tertiary uppercase block">
                Empirical Validation Experiments:
              </span>
              <ul className="list-disc list-inside text-ink-primary space-y-1 mt-1">
                {opportunity.validation_experiments.map((exp, idx) => (
                  <li key={idx}>{exp}</li>
                ))}
              </ul>
            </div>
            <div className="pt-2">
              <span className="font-mono text-[10px] text-ink-tertiary uppercase block">
                Recommended Engineering Milestones:
              </span>
              <ul className="list-disc list-inside text-ink-primary space-y-1 mt-1">
                {opportunity.recommended_next_steps.map((rec, idx) => (
                  <li key={idx}>{rec}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
