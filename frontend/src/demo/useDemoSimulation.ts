'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  DEMO_WORKSTREAMS,
  DEMO_EVIDENCE_ITEMS,
  DEMO_OPPORTUNITIES,
  DemoWorkstream,
  DemoEvidenceItem,
  DemoOpportunity,
} from './demoData';

export type DemoStage =
  | 'idle'
  | 'interpreting'
  | 'activating_workstreams'
  | 'gathering_signals'
  | 'verifying_evidence'
  | 'clustering_patterns'
  | 'synthesizing_hypotheses'
  | 'completed';

export interface TimelineLogEntry {
  id: string;
  timeSec: number;
  timeStr: string;
  stage: DemoStage;
  message: string;
  category: 'system' | 'workstream' | 'evidence' | 'hypothesis';
}

export interface WorkstreamLiveState extends DemoWorkstream {
  status: 'pending' | 'active' | 'completed';
  progress: number;
  activeLog: string;
}

const STAGE_DURATIONS = {
  interpreting: 3,          // T: 0 -> 3s
  activating_workstreams: 4,// T: 3 -> 7s
  gathering_signals: 5,     // T: 7 -> 12s
  verifying_evidence: 4,    // T: 12 -> 16s
  clustering_patterns: 4,   // T: 16 -> 20s
  synthesizing_hypotheses: 4,// T: 20 -> 24s
};

export const TOTAL_DEMO_DURATION = 24;

export function useDemoSimulation() {
  const [stage, setStage] = useState<DemoStage>('idle');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [elapsedSec, setElapsedSec] = useState<number>(0);
  const [presenterMode, setPresenterMode] = useState<boolean>(false);

  // Inspector & selection state
  const [selectedEvidenceId, setSelectedEvidenceId] = useState<string | null>(null);
  const [selectedOpportunityId, setSelectedOpportunityId] = useState<string | null>(null);

  // Logs and live states
  const [timelineLogs, setTimelineLogs] = useState<TimelineLogEntry[]>([]);
  const [workstreams, setWorkstreams] = useState<WorkstreamLiveState[]>(
    DEMO_WORKSTREAMS.map((ws) => ({
      ...ws,
      status: 'pending',
      progress: 0,
      activeLog: 'Awaiting mission initialization...',
    }))
  );

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSecRef = useRef<number>(0);

  const formatTime = (sec: number): string => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `T+${m > 0 ? `${m}m ` : ''}${s < 10 ? '0' : ''}${s}s`;
  };

  const addLog = useCallback(
    (sec: number, currentStage: DemoStage, message: string, category: TimelineLogEntry['category']) => {
      setTimelineLogs((prev) => [
        ...prev,
        {
          id: `log-${Date.now()}-${Math.random()}`,
          timeSec: sec,
          timeStr: formatTime(sec),
          stage: currentStage,
          message,
          category,
        },
      ]);
    },
    []
  );

  // Calculate stage from elapsed seconds
  const getStageForTime = (sec: number): DemoStage => {
    if (sec <= 0) return 'idle';
    if (sec < 3) return 'interpreting';
    if (sec < 7) return 'activating_workstreams';
    if (sec < 12) return 'gathering_signals';
    if (sec < 16) return 'verifying_evidence';
    if (sec < 20) return 'clustering_patterns';
    if (sec < 24) return 'synthesizing_hypotheses';
    return 'completed';
  };

  // Compute live workstream progress
  const updateWorkstreamStates = useCallback((sec: number) => {
    setWorkstreams((prev) =>
      prev.map((ws, idx) => {
        if (sec < 3) {
          return {
            ...ws,
            status: 'pending',
            progress: 0,
            activeLog: 'Awaiting execution coordination...',
          };
        }

        // Stagger activation across workstreams
        const startOffset = 3 + idx * 0.4;
        if (sec < startOffset) {
          return {
            ...ws,
            status: 'pending',
            progress: 5,
            activeLog: 'Registering engine hooks & sandbox...',
          };
        }

        if (sec < 20) {
          const prog = Math.min(95, Math.floor(((sec - startOffset) / (20 - startOffset)) * 90) + 10);
          return {
            ...ws,
            status: 'active',
            progress: prog,
            activeLog: ws.current_activity,
          };
        }

        return {
          ...ws,
          status: 'completed',
          progress: 100,
          activeLog: `Investigation finished · ${ws.findings_count} findings synthesized.`,
        };
      })
    );
  }, []);

  // Dispatch events on deterministic milestones
  const processMilestones = useCallback(
    (curSec: number, prevSec: number) => {
      if (prevSec < 1 && curSec >= 1) {
        addLog(1, 'interpreting', 'Research mission objective registered: AI Inference Infrastructure', 'system');
      }
      if (prevSec < 3 && curSec >= 3) {
        addLog(3, 'activating_workstreams', 'Temporal dispatcher spawned 8 specialized research workstreams', 'system');
      }
      if (prevSec < 5 && curSec >= 5) {
        addLog(5, 'activating_workstreams', 'Company Scanner & Open Source Intelligence initiating live sweeps', 'workstream');
      }
      if (prevSec < 8 && curSec >= 8) {
        addLog(8, 'gathering_signals', 'Harvested vLLM Issue #5480: Prefix cache eviction causing 4.2x TTFT spike', 'evidence');
      }
      if (prevSec < 10 && curSec >= 10) {
        addLog(10, 'gathering_signals', 'Harvested SGLang Issue #6122: Uncompressed KV streaming bottlenecks 100GbE NICs', 'evidence');
      }
      if (prevSec < 13 && curSec >= 13) {
        addLog(13, 'verifying_evidence', 'SHA-256 cryptographic provenance verified for 5 primary verbatim spans', 'evidence');
      }
      if (prevSec < 15 && curSec >= 15) {
        addLog(15, 'verifying_evidence', 'Harvested Triton Issue #3412: Register pressure >255 causing DRAM spills on SM90a', 'evidence');
      }
      if (prevSec < 17 && curSec >= 17) {
        addLog(17, 'clustering_patterns', 'Architecture Extractor mapped PagedAttention memory layouts vs cluster CXL limits', 'workstream');
      }
      if (prevSec < 19 && curSec >= 19) {
        addLog(19, 'clustering_patterns', 'Negative Space Engine identified structural gap: Disaggregated KV-Cache Tiering', 'workstream');
      }
      if (prevSec < 21 && curSec >= 21) {
        addLog(21, 'synthesizing_hypotheses', 'Synthesized Opportunity OPP-2024-001: Disaggregated KV-Cache Tiering Engine', 'hypothesis');
      }
      if (prevSec < 23 && curSec >= 23) {
        addLog(23, 'synthesizing_hypotheses', 'Synthesized Opportunity OPP-2024-002: Hardware-Aware FP8 Speculative Tree Verifier', 'hypothesis');
      }
      if (prevSec < 24 && curSec >= 24) {
        addLog(24, 'completed', 'Mission complete: Research dossier finalized with 2 empirical opportunity hypotheses', 'system');
      }
    },
    [addLog]
  );

  // Tick loop
  useEffect(() => {
    if (!isPlaying) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    timerRef.current = setInterval(() => {
      setElapsedSec((prev) => {
        const next = Math.min(TOTAL_DEMO_DURATION, Number((prev + 0.25).toFixed(2)));
        const currentStage = getStageForTime(next);
        setStage(currentStage);

        updateWorkstreamStates(next);
        processMilestones(next, lastSecRef.current);
        lastSecRef.current = next;

        if (next >= TOTAL_DEMO_DURATION) {
          setIsPlaying(false);
          if (timerRef.current) clearInterval(timerRef.current);
        }
        return next;
      });
    }, 250);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isPlaying, updateWorkstreamStates, processMilestones]);

  // Public presenter actions
  const startDemo = useCallback(() => {
    if (stage === 'idle') {
      setTimelineLogs([]);
      lastSecRef.current = 0;
      setElapsedSec(0);
      addLog(0, 'interpreting', 'Initiating autonomous research pipeline...', 'system');
    }
    setIsPlaying(true);
  }, [stage, addLog]);

  const pauseDemo = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const resumeDemo = useCallback(() => {
    if (elapsedSec < TOTAL_DEMO_DURATION) {
      setIsPlaying(true);
    }
  }, [elapsedSec]);

  const resetDemo = useCallback(() => {
    setIsPlaying(false);
    if (timerRef.current) clearInterval(timerRef.current);
    setElapsedSec(0);
    lastSecRef.current = 0;
    setStage('idle');
    setTimelineLogs([]);
    setSelectedEvidenceId(null);
    setSelectedOpportunityId(null);
    updateWorkstreamStates(0);
  }, [updateWorkstreamStates]);

  const skipToResults = useCallback(() => {
    setIsPlaying(false);
    if (timerRef.current) clearInterval(timerRef.current);
    setElapsedSec(TOTAL_DEMO_DURATION);
    lastSecRef.current = TOTAL_DEMO_DURATION;
    setStage('completed');
    updateWorkstreamStates(TOTAL_DEMO_DURATION);
    setTimelineLogs([
      {
        id: 'log-skip-1',
        timeSec: 0,
        timeStr: 'T+00s',
        stage: 'interpreting',
        message: 'Research mission objective registered: AI Inference Infrastructure',
        category: 'system',
      },
      {
        id: 'log-skip-2',
        timeSec: 3,
        timeStr: 'T+03s',
        stage: 'activating_workstreams',
        message: '8 Specialized research workstreams deployed',
        category: 'system',
      },
      {
        id: 'log-skip-3',
        timeSec: 8,
        timeStr: 'T+08s',
        stage: 'gathering_signals',
        message: 'Harvested vLLM Issue #5480, SGLang Issue #6122, and Triton Issue #3412',
        category: 'evidence',
      },
      {
        id: 'log-skip-4',
        timeSec: 14,
        timeStr: 'T+14s',
        stage: 'verifying_evidence',
        message: 'Cryptographic SHA-256 validation complete across all verbatim evidence spans',
        category: 'evidence',
      },
      {
        id: 'log-skip-5',
        timeSec: 18,
        timeStr: 'T+18s',
        stage: 'clustering_patterns',
        message: 'Structural whitespace identified between local GPU HBM coupling and cluster CXL tiers',
        category: 'workstream',
      },
      {
        id: 'log-skip-6',
        timeSec: 22,
        timeStr: 'T+22s',
        stage: 'synthesizing_hypotheses',
        message: 'Synthesized Opportunity OPP-2024-001 (KV-Cache Tiering) & OPP-2024-002 (Speculative Verifier)',
        category: 'hypothesis',
      },
      {
        id: 'log-skip-7',
        timeSec: 24,
        timeStr: 'T+24s',
        stage: 'completed',
        message: 'Dossier ready for evaluation. All verification criteria satisfied.',
        category: 'system',
      },
    ]);
  }, [updateWorkstreamStates]);

  const replayDemo = useCallback(() => {
    resetDemo();
    setTimeout(() => {
      setTimelineLogs([]);
      lastSecRef.current = 0;
      setElapsedSec(0);
      addLog(0, 'interpreting', 'Re-running autonomous research pipeline...', 'system');
      setIsPlaying(true);
    }, 100);
  }, [resetDemo, addLog]);

  // Visible evidence items based on time
  const visibleEvidence = Object.values(DEMO_EVIDENCE_ITEMS).filter((_, idx) => {
    if (stage === 'idle' || stage === 'interpreting') return false;
    if (stage === 'activating_workstreams') return idx === 0;
    if (stage === 'gathering_signals') return idx <= 2;
    return true; // 3+ on verifying and beyond
  });

  // Visible opportunities based on time
  const visibleOpportunities = DEMO_OPPORTUNITIES.filter((_, idx) => {
    if (stage === 'synthesizing_hypotheses') return idx === 0;
    if (stage === 'completed') return true;
    return false;
  });

  return {
    stage,
    isPlaying,
    elapsedSec,
    totalDuration: TOTAL_DEMO_DURATION,
    progressPercentage: Math.min(100, Math.floor((elapsedSec / TOTAL_DEMO_DURATION) * 100)),
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
  };
}
