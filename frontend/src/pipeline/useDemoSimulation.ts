'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  MISSION_PRESETS,
  DEMO_WORKSTREAMS,
  DEMO_EVIDENCE_ITEMS,
  DEMO_OPPORTUNITIES,
  MissionPreset,
  DemoWorkstream,
  DemoEvidenceItem,
  DemoOpportunity,
  getMissionById,
  getRandomMission,
  AgentTerminalStep,
} from './pipelineData';

export type DemoStage =
  | 'idle'
  | 'interpreting'
  | 'activating_workstreams'
  | 'gathering_signals'
  | 'verifying_evidence'
  | 'clustering_patterns'
  | 'synthesizing_hypotheses'
  | 'completed';

export type PacingMode = 'realistic' | 'turbo';

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
  activeCommand: string;
  activeOutput: string;
  terminalHistory: AgentTerminalStep[];
}

export interface PipelineComputeMetrics {
  commitsParsed: number;
  bytesIngestedMB: number;
  astNodesResolved: number;
  sha256Count: number;
  telemetryRateMBps: number;
  activeWorkers: number;
}

export function useDemoSimulation() {
  const [currentMissionId, setCurrentMissionId] = useState<string>(MISSION_PRESETS[0].id);
  const [pacing, setPacing] = useState<PacingMode>('realistic');
  const [stage, setStage] = useState<DemoStage>('idle');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [elapsedSec, setElapsedSec] = useState<number>(0);
  const [presenterMode, setPresenterMode] = useState<boolean>(false);

  // Inspector & selection state
  const [selectedEvidenceId, setSelectedEvidenceId] = useState<string | null>(null);
  const [selectedOpportunityId, setSelectedOpportunityId] = useState<string | null>(null);

  // Current mission preset object
  const currentMission = useMemo<MissionPreset>(() => {
    return getMissionById(currentMissionId);
  }, [currentMissionId]);

  const totalDuration = pacing === 'realistic' ? 48 : 24;

  // Workstreams live state initialized
  const [workstreams, setWorkstreams] = useState<WorkstreamLiveState[]>(() =>
    DEMO_WORKSTREAMS.map((ws) => ({
      ...ws,
      status: 'pending',
      progress: 0,
      activeLog: 'Awaiting mission initialization...',
      activeCommand: ws.pipeline_steps[0]?.cmd || 'git status',
      activeOutput: 'Engine queued. Awaiting coordinator dispatch...',
      terminalHistory: [],
    }))
  );

  // Logs
  const [timelineLogs, setTimelineLogs] = useState<TimelineLogEntry[]>([]);

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
          id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
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

  // Compute stage based on normalized ratio
  const getStageForRatio = (ratio: number): DemoStage => {
    if (ratio <= 0) return 'idle';
    if (ratio < 0.12) return 'interpreting';
    if (ratio < 0.28) return 'activating_workstreams';
    if (ratio < 0.52) return 'gathering_signals';
    if (ratio < 0.70) return 'verifying_evidence';
    if (ratio < 0.86) return 'clustering_patterns';
    if (ratio < 1.0) return 'synthesizing_hypotheses';
    return 'completed';
  };

  // Update workstream states with authentic terminal steps
  const updateWorkstreamStates = useCallback(
    (ratio: number) => {
      setWorkstreams((prev) =>
        prev.map((ws, idx) => {
          if (ratio <= 0) {
            return {
              ...ws,
              status: 'pending',
              progress: 0,
              activeLog: 'Awaiting mission initialization...',
              activeCommand: ws.pipeline_steps[0]?.cmd || 'git status',
              activeOutput: 'Engine queued. Awaiting coordinator dispatch...',
              terminalHistory: [],
            };
          }

          const startRatio = 0.1 + idx * 0.02;
          if (ratio < startRatio) {
            return {
              ...ws,
              status: 'pending',
              progress: 8,
              activeLog: 'Spawning sandbox container & registering GitHub API client...',
              activeCommand: `git clone --bare --filter=blob:none https://github.com/${ws.target_repo}.git /tmp/${ws.id}`,
              activeOutput: 'Cloning repository metadata...',
              terminalHistory: [ws.pipeline_steps[0] || { cmd: 'git fetch', output: 'Fetching remote refs...', delayMs: 400 }],
            };
          }

          if (ratio < 0.88) {
            const prog = Math.min(96, Math.floor(((ratio - startRatio) / (0.88 - startRatio)) * 88) + 10);
            const stepIdx = Math.min(
              ws.pipeline_steps.length - 1,
              Math.floor((prog / 100) * ws.pipeline_steps.length)
            );
            const currentStep = ws.pipeline_steps[stepIdx] || ws.pipeline_steps[0];
            const history = ws.pipeline_steps.slice(0, stepIdx + 1);

            return {
              ...ws,
              status: 'active',
              progress: prog,
              activeLog: ws.current_activity,
              activeCommand: currentStep.cmd,
              activeOutput: currentStep.output,
              terminalHistory: history,
            };
          }

          // Completed
          return {
            ...ws,
            status: 'completed',
            progress: 100,
            activeLog: `Investigation finished · ${ws.findings_count} signals synthesized.`,
            activeCommand: ws.pipeline_steps[ws.pipeline_steps.length - 1]?.cmd || 'git status',
            activeOutput: ws.pipeline_steps[ws.pipeline_steps.length - 1]?.output || '[EXECUTION COMPLETE]',
            terminalHistory: ws.pipeline_steps,
          };
        })
      );
    },
    []
  );

  // Process timeline milestones specific to active mission
  const processMilestones = useCallback(
    (curRatio: number, prevRatio: number, mission: MissionPreset) => {
      if (prevRatio < 0.04 && curRatio >= 0.04) {
        addLog(
          1,
          'interpreting',
          `Research mission objective registered: ${mission.title}`,
          'system'
        );
      }
      if (prevRatio < 0.15 && curRatio >= 0.15) {
        addLog(
          curRatio * totalDuration,
          'activating_workstreams',
          `Temporal coordinator deployed 8 specialist engines across ${mission.target_repos.join(', ')}`,
          'system'
        );
      }
      if (prevRatio < 0.25 && curRatio >= 0.25) {
        addLog(
          curRatio * totalDuration,
          'activating_workstreams',
          'Codebase Archaeology & OSINT scanners cloned bare Git trees; AST parsing initiated',
          'workstream'
        );
      }
      if (prevRatio < 0.38 && curRatio >= 0.38) {
        const sampleEvid = DEMO_EVIDENCE_ITEMS[mission.evidence_ids[0]];
        addLog(
          curRatio * totalDuration,
          'gathering_signals',
          `Harvested primary signal ${sampleEvid ? sampleEvid.citation_pill : '[EVID-5480]'}: ${sampleEvid?.source_title || 'Repository Regression Signal'}`,
          'evidence'
        );
      }
      if (prevRatio < 0.50 && curRatio >= 0.50) {
        const sampleEvid2 = DEMO_EVIDENCE_ITEMS[mission.evidence_ids[1]];
        addLog(
          curRatio * totalDuration,
          'gathering_signals',
          `Harvested primary signal ${sampleEvid2 ? sampleEvid2.citation_pill : '[EVID-6122]'}: ${sampleEvid2?.source_title || 'Cluster Bandwidth Bottleneck'}`,
          'evidence'
        );
      }
      if (prevRatio < 0.62 && curRatio >= 0.62) {
        addLog(
          curRatio * totalDuration,
          'verifying_evidence',
          `SHA-256 cryptographic provenance verified across ${mission.evidence_ids.length} primary verbatim code spans`,
          'evidence'
        );
      }
      if (prevRatio < 0.75 && curRatio >= 0.75) {
        addLog(
          curRatio * totalDuration,
          'clustering_patterns',
          `Architecture Extractor mapped hardware roofline bounds vs runtime memory allocations`,
          'workstream'
        );
      }
      if (prevRatio < 0.82 && curRatio >= 0.82) {
        addLog(
          curRatio * totalDuration,
          'clustering_patterns',
          `Negative Space Engine isolated market whitespace in ${mission.domain}`,
          'workstream'
        );
      }
      if (prevRatio < 0.90 && curRatio >= 0.90) {
        const opp1 = DEMO_OPPORTUNITIES.find((o) => o.id === mission.opportunity_ids[0]);
        addLog(
          curRatio * totalDuration,
          'synthesizing_hypotheses',
          `Synthesized Opportunity Dossier: ${opp1?.title || 'Disaggregated Architecture Engine'}`,
          'hypothesis'
        );
      }
      if (prevRatio < 0.96 && curRatio >= 0.96 && mission.opportunity_ids.length > 1) {
        const opp2 = DEMO_OPPORTUNITIES.find((o) => o.id === mission.opportunity_ids[1]);
        addLog(
          curRatio * totalDuration,
          'synthesizing_hypotheses',
          `Synthesized Opportunity Dossier: ${opp2?.title || 'Hardware-Aware Kernel Verifier'}`,
          'hypothesis'
        );
      }
      if (prevRatio < 1.0 && curRatio >= 1.0) {
        addLog(
          totalDuration,
          'completed',
          `Mission complete: Finalized strategic intelligence dossier with empirical hypotheses and SHA-256 proofs`,
          'system'
        );
      }
    },
    [addLog, totalDuration]
  );

  // Main computation timer loop
  useEffect(() => {
    if (!isPlaying) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    const stepSec = pacing === 'realistic' ? 0.35 : 0.75;
    const intervalMs = 250;

    timerRef.current = setInterval(() => {
      setElapsedSec((prev) => {
        const next = Math.min(totalDuration, Number((prev + stepSec).toFixed(2)));
        const ratio = next / totalDuration;
        const prevRatio = lastSecRef.current / totalDuration;

        const currentStage = getStageForRatio(ratio);
        setStage(currentStage);

        updateWorkstreamStates(ratio);
        processMilestones(ratio, prevRatio, currentMission);
        lastSecRef.current = next;

        if (next >= totalDuration) {
          setIsPlaying(false);
          if (timerRef.current) clearInterval(timerRef.current);
        }
        return next;
      });
    }, intervalMs);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isPlaying, pacing, totalDuration, currentMission, updateWorkstreamStates, processMilestones]);

  // Actions
  const startDemo = useCallback(() => {
    if (stage === 'idle') {
      setTimelineLogs([]);
      lastSecRef.current = 0;
      setElapsedSec(0);
      addLog(0, 'interpreting', `Initiating autonomous research pipeline for [${currentMission.id}]...`, 'system');
    }
    setIsPlaying(true);
  }, [stage, currentMission, addLog]);

  const pauseDemo = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const resumeDemo = useCallback(() => {
    if (elapsedSec < totalDuration) {
      setIsPlaying(true);
    }
  }, [elapsedSec, totalDuration]);

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
    setElapsedSec(totalDuration);
    lastSecRef.current = totalDuration;
    setStage('completed');
    updateWorkstreamStates(1.0);

    const opps = DEMO_OPPORTUNITIES.filter((o) => currentMission.opportunity_ids.includes(o.id));

    setTimelineLogs([
      {
        id: 'log-skip-1',
        timeSec: 0,
        timeStr: 'T+00s',
        stage: 'interpreting',
        message: `Research mission registered: ${currentMission.title}`,
        category: 'system',
      },
      {
        id: 'log-skip-2',
        timeSec: 4,
        timeStr: 'T+04s',
        stage: 'activating_workstreams',
        message: `Temporal coordinator spawned 8 specialist engines across ${currentMission.target_repos.join(', ')}`,
        category: 'system',
      },
      {
        id: 'log-skip-3',
        timeSec: 12,
        timeStr: 'T+12s',
        stage: 'gathering_signals',
        message: `Harvested repository regressions, compiler issues, and cluster telemetry traces`,
        category: 'evidence',
      },
      {
        id: 'log-skip-4',
        timeSec: 20,
        timeStr: 'T+20s',
        stage: 'verifying_evidence',
        message: `Cryptographic SHA-256 validation complete across ${currentMission.evidence_ids.length} primary verbatim evidence spans`,
        category: 'evidence',
      },
      {
        id: 'log-skip-5',
        timeSec: 32,
        timeStr: 'T+32s',
        stage: 'clustering_patterns',
        message: `Structural whitespace mapped across ${currentMission.domain}`,
        category: 'workstream',
      },
      {
        id: 'log-skip-6',
        timeSec: 40,
        timeStr: 'T+40s',
        stage: 'synthesizing_hypotheses',
        message: `Synthesized ${opps.length} Strategic Opportunity Hypotheses: ${opps.map((o) => o.title).join(' & ')}`,
        category: 'hypothesis',
      },
      {
        id: 'log-skip-7',
        timeSec: totalDuration,
        timeStr: formatTime(totalDuration),
        stage: 'completed',
        message: 'Dossier ready for evaluation. All verification criteria and validation experiments ready.',
        category: 'system',
      },
    ]);
  }, [totalDuration, currentMission, updateWorkstreamStates]);

  const replayDemo = useCallback(() => {
    resetDemo();
    setTimeout(() => {
      setTimelineLogs([]);
      lastSecRef.current = 0;
      setElapsedSec(0);
      addLog(0, 'interpreting', `Re-running research mission [${currentMission.id}]...`, 'system');
      setIsPlaying(true);
    }, 120);
  }, [resetDemo, currentMission, addLog]);

  // Switch Mission
  const setMission = useCallback(
    (missionId: string) => {
      resetDemo();
      setCurrentMissionId(missionId);
    },
    [resetDemo]
  );

  // Randomize Mission
  const randomizeMission = useCallback(() => {
    resetDemo();
    const nextMission = getRandomMission(currentMissionId);
    setCurrentMissionId(nextMission.id);
  }, [resetDemo, currentMissionId]);

  // Filtered evidence items based on current mission and progress ratio
  const ratio = elapsedSec / totalDuration;
  const missionEvidenceList = useMemo(() => {
    return currentMission.evidence_ids
      .map((id) => DEMO_EVIDENCE_ITEMS[id])
      .filter(Boolean) as DemoEvidenceItem[];
  }, [currentMission]);

  const visibleEvidence = useMemo(() => {
    if (stage === 'idle' || stage === 'interpreting') return [];
    if (stage === 'activating_workstreams') return missionEvidenceList.slice(0, 1);
    if (stage === 'gathering_signals') return missionEvidenceList.slice(0, 2);
    if (stage === 'verifying_evidence') return missionEvidenceList.slice(0, 3);
    return missionEvidenceList;
  }, [stage, missionEvidenceList]);

  // Filtered opportunities based on current mission and progress ratio
  const missionOpportunityList = useMemo(() => {
    return DEMO_OPPORTUNITIES.filter((opp) => currentMission.opportunity_ids.includes(opp.id));
  }, [currentMission]);

  const visibleOpportunities = useMemo(() => {
    if (stage === 'synthesizing_hypotheses') return missionOpportunityList.slice(0, 1);
    if (stage === 'completed') return missionOpportunityList;
    return [];
  }, [stage, missionOpportunityList]);

  // Dynamic live computing metrics
  const computeMetrics = useMemo<PipelineComputeMetrics>(() => {
    if (stage === 'idle') {
      return {
        commitsParsed: 0,
        bytesIngestedMB: 0,
        astNodesResolved: 0,
        sha256Count: 0,
        telemetryRateMBps: 0,
        activeWorkers: 0,
      };
    }
    const completionMultiplier = Math.min(1.0, ratio);
    const activeWorkers = stage === 'completed' ? 0 : 8;
    const commits = Math.floor(completionMultiplier * 2410);
    const bytes = Number((completionMultiplier * 52.4).toFixed(1));
    const ast = Math.floor(completionMultiplier * 14820);
    const sha = Math.floor(completionMultiplier * (currentMission.evidence_ids.length * 4));
    const rate = stage === 'completed' ? 0 : Number((18.4 + Math.sin(elapsedSec) * 4.2).toFixed(1));

    return {
      commitsParsed: commits,
      bytesIngestedMB: bytes,
      astNodesResolved: ast,
      sha256Count: sha,
      telemetryRateMBps: rate,
      activeWorkers,
    };
  }, [stage, ratio, elapsedSec, currentMission]);

  return {
    stage,
    isPlaying,
    elapsedSec,
    totalDuration,
    progressPercentage: Math.min(100, Math.floor(ratio * 100)),
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
  };
}
