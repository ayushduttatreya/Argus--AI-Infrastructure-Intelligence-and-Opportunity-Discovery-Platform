'use client';

import React, { useState } from 'react';
import {
  Cpu,
  Building2,
  BookOpen,
  MessageSquare,
  Users,
  GitBranch,
  TrendingUp,
  Layers,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Terminal,
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
  'ws-company': <Building2 className="w-4 h-4 text-amber-400" />,
  'ws-research': <BookOpen className="w-4 h-4 text-blue-400" />,
  'ws-community': <MessageSquare className="w-4 h-4 text-emerald-400" />,
  'ws-hiring': <Users className="w-4 h-4 text-purple-400" />,
  'ws-osint': <GitBranch className="w-4 h-4 text-rose-400" />,
  'ws-market': <TrendingUp className="w-4 h-4 text-cyan-400" />,
  'ws-architecture': <Cpu className="w-4 h-4 text-indigo-400" />,
  'ws-negspace': <Layers className="w-4 h-4 text-violet-400" />,
};

export const DemoWorkstreamsGrid: React.FC<DemoWorkstreamsGridProps> = ({
  workstreams,
  presenterMode = false,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'cards' | 'terminals'>('cards');

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const activeCount = workstreams.filter((ws) => ws.status === 'active').length;
  const completedCount = workstreams.filter((ws) => ws.status === 'completed').length;

  return (
    <div id="workstreams" className="space-y-4 scroll-mt-28">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full bg-indigo-950/80 border border-indigo-700/60 flex items-center justify-center shadow-[0_0_12px_rgba(99,102,241,0.3)]">
            <Cpu className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <h3 className="font-serif text-lg font-normal text-white">
              Eight Specialist Intelligence Engines
            </h3>
            <p className="text-xs text-zinc-400 font-sans">
              Coordinated multi-agent execution pipeline · Live GitHub & runtime OSINT telemetry
            </p>
          </div>
        </div>

        {/* Status Counter Pills */}
        <div className="flex items-center space-x-2 font-mono text-xs">
          <span className="px-2.5 py-1 rounded-full bg-emerald-950/60 text-emerald-300 border border-emerald-500/30">
            {completedCount}/8 Finalized
          </span>
          {activeCount > 0 && (
            <span className="px-2.5 py-1 rounded-full bg-indigo-950/80 text-indigo-300 border border-indigo-700/60 flex items-center space-x-1.5 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
              <span>{activeCount} Active</span>
            </span>
          )}
        </div>
      </div>

      {/* Grid of 8 Workstream Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {workstreams.map((ws) => {
          const isExpanded = expandedId === ws.id;
          const icon = WORKSTREAM_ICONS[ws.id] || <Cpu className="w-4 h-4 text-zinc-400" />;

          return (
            <div
              key={ws.id}
              className={`rounded-2xl transition-all duration-200 border flex flex-col justify-between backdrop-blur-xl ${
                ws.status === 'completed'
                  ? 'bg-[#090C16]/90 border-emerald-500/30 shadow-[0_4px_20px_rgba(16,185,129,0.06)]'
                  : ws.status === 'active'
                  ? 'bg-[#0E1324] border-indigo-500/50 shadow-[0_4px_20px_rgba(99,102,241,0.15)] ring-1 ring-indigo-500/30'
                  : 'bg-[#090C16]/60 border-white/5 opacity-70 hover:opacity-100'
              }`}
            >
              {/* Card Body */}
              <div className="p-4 space-y-3">
                {/* Header Row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="p-1.5 rounded-lg bg-zinc-900 border border-white/10">{icon}</div>
                    <div>
                      <span className="text-[10px] font-mono text-zinc-400 block uppercase">
                        {ws.role}
                      </span>
                      <h4 className="font-serif text-sm font-medium text-white truncate max-w-[130px]">
                        {ws.name}
                      </h4>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div>
                    {ws.status === 'completed' ? (
                      <span className="inline-flex items-center space-x-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-500/30">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span>Done</span>
                      </span>
                    ) : ws.status === 'active' ? (
                      <span className="inline-flex items-center space-x-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-700/60 animate-pulse">
                        <Activity className="w-3 h-3 text-indigo-400" />
                        <span>Mining</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-900 text-zinc-500 border border-white/5">
                        <Clock className="w-3 h-3" />
                        <span>Queued</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Focus Target */}
                <p className="text-[11px] text-zinc-400 font-sans leading-relaxed line-clamp-2">
                  {ws.purpose}
                </p>

                {/* Progress Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-mono text-zinc-400">
                    <span>Signal Integrity</span>
                    <span>{ws.progress}%</span>
                  </div>
                  <div className="w-full bg-zinc-900 rounded-full h-1 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        ws.status === 'completed'
                          ? 'bg-emerald-400'
                          : ws.status === 'active'
                          ? 'bg-indigo-400'
                          : 'bg-zinc-700'
                      }`}
                      style={{ width: `${ws.progress}%` }}
                    />
                  </div>
                </div>

                {/* Micro Metric Counters */}
                <div className="pt-2 border-t border-white/5 grid grid-cols-2 gap-2 text-[10px] font-mono text-zinc-400">
                  <div>
                    <span className="text-zinc-500 block">Findings:</span>
                    <strong className="text-zinc-200">{ws.findings_count} signals</strong>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">Target Repo:</span>
                    <strong className="text-emerald-400 truncate block">{ws.target_repo}</strong>
                  </div>
                </div>

                {/* Current Activity Tag */}
                <div className="text-[10px] font-mono text-zinc-400 truncate">
                  <span className="text-zinc-500">Scan: </span>
                  <code className="text-indigo-300 font-semibold">{ws.current_activity}</code>
                </div>

                {/* Expand Terminal Log Toggle */}
                {ws.terminalHistory && ws.terminalHistory.length > 0 && (
                  <button
                    onClick={() => toggleExpand(ws.id)}
                    className="w-full pt-1.5 flex items-center justify-between text-[10px] font-mono text-indigo-400 hover:text-indigo-300 transition"
                  >
                    <span className="flex items-center space-x-1">
                      <Terminal className="w-3 h-3" />
                      <span>{isExpanded ? 'Hide stream' : 'Inspect live AST stream'}</span>
                    </span>
                    {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                )}
              </div>

              {/* Collapsible Mini Terminal Output */}
              {isExpanded && ws.terminalHistory && (
                <div className="p-3 bg-[#05060A] border-t border-white/10 rounded-b-2xl font-mono text-[10px] space-y-1 text-zinc-300 max-h-32 overflow-y-auto">
                  <div className="text-zinc-500 text-[9px] uppercase tracking-wider pb-1 border-b border-white/5">
                    Live OSINT Execution Pipe:
                  </div>
                  {ws.terminalHistory.map((step, idx) => (
                    <div key={idx} className="truncate text-emerald-400/90 leading-tight">
                      › {step.cmd}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
