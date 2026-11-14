'use client';

import React, { useState } from 'react';
import {
  Building2,
  BookOpen,
  MessageSquare,
  Users,
  GitBranch,
  TrendingUp,
  Cpu,
  Layers,
  ChevronDown,
  ChevronUp,
  Activity,
  CheckCircle2,
  Clock,
  Sparkles,
} from 'lucide-react';
import { WorkstreamLiveState } from './useDemoSimulation';

interface DemoWorkstreamsGridProps {
  workstreams: WorkstreamLiveState[];
  presenterMode?: boolean;
}

const WORKSTREAM_ICONS: Record<string, React.ReactNode> = {
  'ws-company': <Building2 className="w-4 h-4 text-amber-700" />,
  'ws-research': <BookOpen className="w-4 h-4 text-blue-700" />,
  'ws-community': <MessageSquare className="w-4 h-4 text-emerald-700" />,
  'ws-hiring': <Users className="w-4 h-4 text-purple-700" />,
  'ws-osint': <GitBranch className="w-4 h-4 text-rose-700" />,
  'ws-market': <TrendingUp className="w-4 h-4 text-cyan-700" />,
  'ws-architecture': <Cpu className="w-4 h-4 text-indigo-700" />,
  'ws-negspace': <Layers className="w-4 h-4 text-violet-700" />,
};

export const DemoWorkstreamsGrid: React.FC<DemoWorkstreamsGridProps> = ({
  workstreams,
  presenterMode = false,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const activeCount = workstreams.filter((ws) => ws.status === 'active').length;
  const completedCount = workstreams.filter((ws) => ws.status === 'completed').length;

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-hairline-light pb-3">
        <div className="flex items-center space-x-3">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center">
            <Cpu className="w-4 h-4 text-indigo-700" />
          </div>
          <div>
            <h3 className="font-serif text-lg font-normal text-ink-primary">
              Eight Specialist Intelligence Engines
            </h3>
            <p className="text-xs text-ink-tertiary">
              Coordinated multi-agent investigation workstreams · Autonomous execution timeline
            </p>
          </div>
        </div>

        {/* Live Counters */}
        <div className="flex items-center space-x-2 font-mono text-xs">
          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
            {completedCount}/8 Finished
          </span>
          {activeCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 flex items-center space-x-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              <span>{activeCount} Scanning</span>
            </span>
          )}
        </div>
      </div>

      {/* Grid of 8 Workstream Cards */}
      <div className={`grid grid-cols-1 md:grid-cols-2 ${presenterMode ? 'lg:grid-cols-2 xl:grid-cols-4' : 'lg:grid-cols-4'} gap-3.5`}>
        {workstreams.map((ws) => {
          const isExpanded = expandedId === ws.id;

          return (
            <div
              key={ws.id}
              className={`rounded-xl border transition-all duration-200 bg-surface-light flex flex-col justify-between ${
                ws.status === 'active'
                  ? 'border-indigo-500/50 shadow-sm ring-1 ring-indigo-500/20'
                  : ws.status === 'completed'
                  ? 'border-emerald-500/30 bg-surface-light/80'
                  : 'border-hairline-light/80 opacity-75'
              }`}
            >
              {/* Card Body */}
              <div className="p-4 space-y-3">
                {/* Top Row: Icon, Title, Status */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <div className="p-1.5 rounded-lg bg-canvas-light border border-hairline-light shrink-0">
                      {WORKSTREAM_ICONS[ws.id] || <Activity className="w-4 h-4" />}
                    </div>
                    <div>
                      <h4 className="font-sans text-xs font-semibold text-ink-primary tracking-tight">
                        {ws.name}
                      </h4>
                      <span className="text-[10px] font-mono text-ink-tertiary block">
                        {ws.role}
                      </span>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div>
                    {ws.status === 'completed' ? (
                      <span className="inline-flex items-center space-x-1 text-[10px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Done</span>
                      </span>
                    ) : ws.status === 'active' ? (
                      <span className="inline-flex items-center space-x-1 text-[10px] font-mono text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" />
                        <span>{ws.progress}%</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1 text-[10px] font-mono text-ink-tertiary bg-canvas-light px-1.5 py-0.5 rounded border border-hairline-light">
                        <Clock className="w-3 h-3" />
                        <span>Queued</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-canvas-light h-1 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      ws.status === 'completed'
                        ? 'bg-emerald-600'
                        : ws.status === 'active'
                        ? 'bg-indigo-600'
                        : 'bg-transparent'
                    }`}
                    style={{ width: `${ws.progress}%` }}
                  />
                </div>

                {/* Live Activity Text */}
                <p className="text-[11px] font-mono text-ink-secondary leading-snug line-clamp-2 min-h-[32px]">
                  {ws.activeLog}
                </p>

                {/* Expandable Details Drawer */}
                {isExpanded && (
                  <div className="pt-2 border-t border-hairline-light space-y-2 text-xs animate-in fade-in duration-150">
                    <div>
                      <span className="text-[10px] font-mono uppercase text-ink-tertiary block">
                        Mandate & Purpose
                      </span>
                      <p className="text-[11px] text-ink-secondary leading-relaxed mt-0.5">
                        {ws.purpose}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-1 pt-1">
                      {ws.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-canvas-light text-ink-tertiary border border-hairline-light"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Card Footer */}
              <div className="px-4 py-2 border-t border-hairline-light/60 bg-canvas-light/40 flex items-center justify-between text-[10px] font-mono text-ink-tertiary">
                <span>
                  {ws.status === 'completed' ? (
                    <span className="text-ink-secondary font-medium">
                      {ws.findings_count} signals parsed
                    </span>
                  ) : (
                    <span>Parsing sources...</span>
                  )}
                </span>
                <button
                  onClick={() => toggleExpand(ws.id)}
                  className="hover:text-ink-primary flex items-center space-x-0.5"
                >
                  <span>{isExpanded ? 'Less' : 'Details'}</span>
                  {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
