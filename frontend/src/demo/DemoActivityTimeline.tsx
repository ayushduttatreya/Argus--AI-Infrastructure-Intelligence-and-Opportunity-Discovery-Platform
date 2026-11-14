'use client';

import React, { useEffect, useRef } from 'react';
import { Terminal, Shield, GitCommit, FileText, Lightbulb, Clock } from 'lucide-react';
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
    badge: 'bg-slate-100 text-slate-800 border-slate-300',
    icon: <Terminal className="w-3 h-3 text-slate-600" />,
    text: 'text-ink-primary',
  },
  workstream: {
    badge: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    icon: <GitCommit className="w-3 h-3 text-indigo-600" />,
    text: 'text-indigo-950',
  },
  evidence: {
    badge: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    icon: <FileText className="w-3 h-3 text-emerald-600" />,
    text: 'text-emerald-950 font-medium',
  },
  hypothesis: {
    badge: 'bg-amber-50 text-amber-800 border-amber-200',
    icon: <Lightbulb className="w-3 h-3 text-amber-600" />,
    text: 'text-amber-950 font-semibold',
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
    <div className="rounded-xl border border-hairline-light bg-surface-light overflow-hidden shadow-tactile">
      {/* Header */}
      <div className="px-4 py-2.5 bg-canvas-light/60 border-b border-hairline-light flex items-center justify-between text-xs font-mono text-ink-secondary">
        <div className="flex items-center space-x-2">
          <Terminal className="w-3.5 h-3.5 text-indigo-600" />
          <span className="font-semibold text-ink-primary">Deterministic Event Sequence</span>
          <span className="text-hairline-light">|</span>
          <span className="text-[11px] text-ink-tertiary">Real-time execution audit log</span>
        </div>
        <span className="text-[11px] text-ink-tertiary">
          {logs.length} events logged
        </span>
      </div>

      {/* Scrollable Log Stream */}
      <div
        ref={containerRef}
        className={`p-3 space-y-2 overflow-y-auto font-mono text-xs ${maxHeight} divide-y divide-hairline-light/30`}
      >
        {logs.length === 0 ? (
          <div className="py-8 text-center text-ink-tertiary text-xs">
            <Clock className="w-5 h-5 mx-auto mb-1.5 opacity-40" />
            <span>Pipeline standby. Press "Execute Mission" or [Space] to initiate.</span>
          </div>
        ) : (
          logs.map((log) => {
            const style = CATEGORY_STYLES[log.category];

            return (
              <div
                key={log.id}
                className="pt-2 first:pt-0 flex items-start space-x-2.5 text-[11px] leading-relaxed animate-in fade-in duration-200"
              >
                {/* Time Badge */}
                <span className="px-1.5 py-0.5 rounded bg-canvas-light border border-hairline-light text-ink-tertiary text-[10px] shrink-0 font-medium">
                  {log.timeStr}
                </span>

                {/* Category Pill */}
                <span
                  className={`inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] uppercase font-semibold border shrink-0 ${style.badge}`}
                >
                  {style.icon}
                  <span>{log.category}</span>
                </span>

                {/* Log Message */}
                <span className={`flex-1 break-words ${style.text}`}>
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
