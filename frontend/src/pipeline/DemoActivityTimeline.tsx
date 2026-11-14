'use client';

import React, { useEffect, useRef } from 'react';
import {
  Terminal,
  Activity,
  ShieldCheck,
  Cpu,
  Layers,
  Sparkles,
  Clock,
  GitBranch,
  Lightbulb,
} from 'lucide-react';
import { TimelineLogEntry } from './useDemoSimulation';

interface DemoActivityTimelineProps {
  logs: TimelineLogEntry[];
  maxHeight?: string;
}

const CATEGORY_STYLES: Record<
  TimelineLogEntry['category'],
  { badge: string; icon: React.ReactNode; text: string }
> = {
  system: {
    badge: 'bg-zinc-800 text-zinc-300 border-zinc-700',
    icon: <Terminal className="w-3 h-3 text-zinc-400" />,
    text: 'text-zinc-300',
  },
  workstream: {
    badge: 'bg-indigo-950/80 text-indigo-300 border-indigo-700/60',
    icon: <Cpu className="w-3 h-3 text-indigo-400" />,
    text: 'text-indigo-200',
  },
  evidence: {
    badge: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40',
    icon: <ShieldCheck className="w-3 h-3 text-emerald-400" />,
    text: 'text-emerald-300 font-semibold',
  },
  hypothesis: {
    badge: 'bg-amber-950/80 text-amber-300 border-amber-600/50',
    icon: <Lightbulb className="w-3 h-3 text-amber-400" />,
    text: 'text-amber-200 font-semibold',
  },
};

export const DemoActivityTimeline: React.FC<DemoActivityTimelineProps> = ({
  logs,
  maxHeight = 'max-h-64',
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div id="timeline" className="rounded-2xl border border-white/10 bg-[#090C16]/90 backdrop-blur-xl overflow-hidden shadow-2xl scroll-mt-28">
      {/* Header */}
      <div className="px-4 py-2.5 bg-zinc-950/80 border-b border-white/10 flex items-center justify-between text-xs font-mono text-zinc-400">
        <div className="flex items-center space-x-2">
          <Terminal className="w-3.5 h-3.5 text-indigo-400" />
          <span className="font-semibold text-white">Deterministic Event Sequence</span>
          <span className="text-zinc-600">|</span>
          <span className="text-[11px] text-zinc-400">Real-time execution audit log</span>
        </div>
        <span className="text-[11px] text-zinc-400">
          {logs.length} events logged
        </span>
      </div>

      {/* Scrollable Log Stream */}
      <div
        ref={containerRef}
        className={`p-3 space-y-2 overflow-y-auto font-mono text-xs ${maxHeight} divide-y divide-white/5`}
      >
        {logs.length === 0 ? (
          <div className="py-8 text-center text-zinc-500 text-xs">
            <Clock className="w-5 h-5 mx-auto mb-1.5 opacity-40 text-zinc-400" />
            <span>Pipeline standby. Press "Execute Mission" or [Space] to initiate.</span>
          </div>
        ) : (
          logs.map((log) => {
            const style = CATEGORY_STYLES[log.category];

            return (
              <div
                key={log.id}
                className="pt-2 first:pt-0 flex items-start space-x-3 text-xs animate-in fade-in duration-150"
              >
                {/* Timestamp */}
                <span className="text-[10px] text-zinc-500 shrink-0 font-mono mt-0.5 w-12 text-right">
                  +{log.timeSec.toFixed(1)}s
                </span>

                {/* Category Pill */}
                <span
                  className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] uppercase font-semibold border shrink-0 ${style.badge}`}
                >
                  {style.icon}
                  <span>{log.category}</span>
                </span>

                {/* Message Content */}
                <span className={`flex-1 font-mono text-xs leading-relaxed ${style.text}`}>
                  {log.message}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
