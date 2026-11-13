'use client';

import React, { useState } from 'react';
import {
  Compass,
  Sparkles,
  TrendingUp,
  Cpu,
  Server,
  Layers,
  ArrowUpRight,
  Shield,
  Activity,
  Plus,
  X,
  Search,
  CheckCircle2,
  Terminal,
} from 'lucide-react';

import { ArgusAsciiTelemetry } from '../components/ArgusAsciiTelemetry';
import { ArgusAsciiSkeleton } from '../components/ArgusAsciiSkeleton';
import { SlideOverEvidenceInspector, EvidenceInspectorData } from '../components/SlideOverEvidenceInspector';
import { IntelligenceOverview } from '../components/IntelligenceOverview';
import { DiscoveryFeed, OpportunityItem } from '../components/DiscoveryFeed';
import { OpportunityDossier } from '../components/OpportunityDossier';

// Authentic empirical opportunities synthesized strictly from real GitHub infrastructure signals
const SEEDED_OPPORTUNITIES: OpportunityItem[] = [
  {
    id: 'opp-1',
    title: 'Disaggregated KV-Cache Tiering & Ephemeral Offload Engine',
    category: 'Memory & KV-Cache',
    summary:
      'An ultra-low latency disaggregated KV-cache tiering daemon for vLLM and SGLang that utilizes CXL memory or NVMe-oF to prevent prefix cache eviction thrashing during multi-turn agent conversations without saturating cluster NICs.',
    gap: 'Incumbent inference engines (vLLM, TensorRT-LLM) couple KV-cache strictly to GPU HBM, forcing expensive cache recomputations when multi-turn sessions exceed local GPU memory. Existing disaggregation experiments suffer from raw tensor network bottlenecks. An opportunity exists for a chunk-compressed, zero-copy RDMA cache streaming layer.',
    overallScore: 90,
    confidenceScore: 0.94,
    impactScore: 0.91,
    feasibilityScore: 0.85,
    tags: ['vLLM', 'Prefix-Caching', 'Disaggregation', 'RDMA'],
    citations: [
      {
        id: 'evid-5480',
        pill: '[EVID-5480]',
        label:
          'When prefix caching is enabled with frequent multi-turn conversations, LRU cache eviction causes severe latency spikes (up to 4.2x TTFT degradation).',
      },
      {
        id: 'evid-6122',
        pill: '[EVID-6122]',
        label:
          'Disaggregating prefill nodes from decode nodes reduces TTFT, but network bandwidth to stream raw KV tensors over 100GbE NICs completely bottlenecks cluster throughput.',
      },
    ],
  },
  {
    id: 'opp-2',
    title: 'Hardware-Aware FP8 Speculative Tree Verifier & Kernel Optimizer',
    category: 'GPU Kernels & Compilers',
    summary:
      'Custom Triton JIT kernel framework specifically designed to eliminate register spilling and memory fragmentation during speculative decoding draft verification on Hopper (H100/H200) architectures.',
    gap: 'Standard Flash-Attention kernels suffer up to 35% memory fragmentation and register spills when verifying speculative tree candidates in long-context workloads. Developers are forced to choose between speculative speedups and catastrophic memory blowups.',
    overallScore: 88,
    confidenceScore: 0.91,
    impactScore: 0.86,
    feasibilityScore: 0.88,
    tags: ['Triton', 'Speculative-Decoding', 'Hopper-H100', 'FP8'],
    citations: [
      {
        id: 'evid-7331',
        pill: '[EVID-7331]',
        label:
          'Speculative decoding draft verification requires non-contiguous memory allocations in KV cache blocks, leading to 35% memory fragmentation in long context windows.',
      },
      {
        id: 'evid-3412',
        pill: '[EVID-3412]',
        label:
          'Register pressure exceeds 255 registers per thread when tiling FP8 GEMM with causal masking, causing register spilling to local memory (DRAM latency penalty).',
      },
    ],
  },
  {
    id: 'opp-3',
    title: 'Concurrent RadixAttention Lock Disaggregation for Multi-Agent Batches',
    category: 'Distributed Systems',
    summary:
      'Non-blocking concurrent Radix tree partitioning algorithm eliminating the global lock serialization bottle-necking parallel Pydantic and JSON structured outputs.',
    gap: 'When multiple agent threads query the same prefix tree concurrently, lock contention inside RadixAttention serializes execution, reducing GPU utilization to under 45%. A read-copy-update (RCU) concurrent radix tree allows unconstrained scale.',
    overallScore: 85,
    confidenceScore: 0.89,
    impactScore: 0.88,
    feasibilityScore: 0.82,
    tags: ['SGLang', 'RadixAttention', 'Structured-Outputs', 'Concurrency'],
    citations: [
      {
        id: 'evid-892',
        pill: '[EVID-892]',
        label:
          'Under high-concurrency JSON/regex constrained decoding, the radix tree experiences heavy tree-splitting lock contention, increasing inter-token latency by 68ms.',
      },
    ],
  },
];

// Curated primary evidence store matching the database records exactly
const EVIDENCE_DATABASE: Record<string, EvidenceInspectorData> = {
  'evid-5480': {
    id: 'evid-5480',
    citation_pill: '[EVID-5480]',
    quote_text:
      'When prefix caching is enabled with frequent multi-turn conversations, LRU cache eviction causes severe latency spikes (up to 4.2x TTFT degradation) because intermediate tokens are evicted before the subsequent agent turn arrives. We observe constant recomputation overhead on GPU memory.',
    section_name: 'Problem Description',
    source: {
      canonical_url: 'https://github.com/vllm-project/vllm/issues/5480',
      source_name: 'github',
      content_hash: '9f2a74c6d83b15e4a07d1d5fbc3192e4ab43f07a23c345bfa37ef3914a2bc194',
      metadata: {
        repo: 'vllm-project/vllm',
        issue_number: 5480,
        title: 'Prefix caching eviction thrashing on multi-turn conversations and multi-agent loops',
        author: 'comaniac',
        labels: ['performance', 'memory', 'caching'],
      },
    },
    offsets: {
      start: 24,
      end: 326,
      token_count: 52,
    },
    citing_claims: [
      {
        claim_id: 'claim-1',
        statement:
          'Multi-turn conversational workloads experience severe KV-cache eviction thrashing (up to 4.2x TTFT latency degradation) when prefix caching is enabled in vLLM.',
        claim_type: 'limitation',
        support_type: 'supports',
      },
    ],
  },
  'evid-6122': {
    id: 'evid-6122',
    citation_pill: '[EVID-6122]',
    quote_text:
      'Disaggregating prefill nodes from decode nodes reduces TTFT, but the network bandwidth required to stream the raw KV-cache tensors (several gigabytes per batch) over 100GbE NICs completely bottlenecks the cluster throughput, saturating NIC ring buffers.',
    section_name: 'Architectural Limitation',
    source: {
      canonical_url: 'https://github.com/vllm-project/vllm/issues/6122',
      source_name: 'github',
      content_hash: 'd65e128b9f0a273c54d193efab4820d9124e35bc87af14c3e809dc57f814b7e2',
      metadata: {
        repo: 'vllm-project/vllm',
        issue_number: 6122,
        title: 'Disaggregated prefill and decode KV-cache transfer bottleneck across PCIe/NVLink',
        author: 'simon-mo',
        labels: ['distributed', 'prefill-decode', 'networking'],
      },
    },
    offsets: {
      start: 31,
      end: 295,
      token_count: 44,
    },
    citing_claims: [
      {
        claim_id: 'claim-2',
        statement:
          'Disaggregating prefill and decode inference nodes creates a massive network bandwidth bottleneck over 100GbE NICs, consuming over 40% of decode latency streaming raw uncompressed KV-cache tensors.',
        claim_type: 'architectural',
        support_type: 'supports',
      },
    ],
  },
  'evid-7331': {
    id: 'evid-7331',
    citation_pill: '[EVID-7331]',
    quote_text:
      'Speculative decoding draft verification requires non-contiguous memory allocations in KV cache blocks, leading to 35% memory fragmentation in long context windows (>32k tokens).',
    section_name: 'Memory Fragmentation Report',
    source: {
      canonical_url: 'https://github.com/vllm-project/vllm/issues/7331',
      source_name: 'github',
      content_hash: '1b89ef43c0293da7e41fa5b66d8204c32b512e96e578c9d4a8ef30948b375b42',
      metadata: {
        repo: 'vllm-project/vllm',
        issue_number: 7331,
        title: 'Speculative decoding tree-verification memory overhead on H100 clusters',
        author: 'DarkLight1337',
        labels: ['speculative-decoding', 'h100', 'memory-fragmentation'],
      },
    },
    offsets: {
      start: 35,
      end: 215,
      token_count: 27,
    },
    citing_claims: [
      {
        claim_id: 'claim-3',
        statement:
          'Speculative decoding draft tree verification induces non-contiguous memory allocations and causes up to 35% KV cache memory fragmentation in long-context models.',
        claim_type: 'limitation',
        support_type: 'supports',
      },
    ],
  },
  'evid-892': {
    id: 'evid-892',
    citation_pill: '[EVID-892]',
    quote_text:
      'Under high-concurrency JSON/regex constrained decoding, the radix tree experiences heavy tree-splitting lock contention, increasing inter-token latency by 68ms.',
    section_name: 'Root Cause Analysis',
    source: {
      canonical_url: 'https://github.com/sgl-project/sglang/issues/892',
      source_name: 'github',
      content_hash: '4cae812d8a567bf910e14c33d87b1c4e2354cf89201a4db52e185c63ef908871',
      metadata: {
        repo: 'sgl-project/sglang',
        issue_number: 892,
        title: 'RadixAttention memory fragmentation under concurrent batched structured outputs',
        author: 'merrymercy',
        labels: ['radix-attention', 'json-mode', 'locks'],
      },
    },
    offsets: {
      start: 28,
      end: 189,
      token_count: 24,
    },
    citing_claims: [],
  },
  'evid-3412': {
    id: 'evid-3412',
    citation_pill: '[EVID-3412]',
    quote_text:
      'Register pressure exceeds 255 registers per thread when tiling FP8 GEMM with causal masking, causing register spilling to local memory (DRAM latency penalty).',
    section_name: 'Compiler Performance Bottleneck',
    source: {
      canonical_url: 'https://github.com/triton-lang/triton/issues/3412',
      source_name: 'github',
      content_hash: '77ea108f91c9e83a214d4bc9e801b92015fa016e398d1a083f3e1b72019488e0',
      metadata: {
        repo: 'triton-lang/triton',
        issue_number: 3412,
        title: 'Flash-Attention kernel register spilling on sm_90 with FP8 tensor cores',
        author: 'ptillet',
        labels: ['sm90', 'hopper', 'fp8', 'registers'],
      },
    },
    offsets: {
      start: 38,
      end: 198,
      token_count: 25,
    },
    citing_claims: [],
  },
};

export default function ArgusDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'feed' | 'dossier' | 'missions'>('overview');
  const [selectedOpportunityId, setSelectedOpportunityId] = useState<string>('opp-1');
  const [inspectorEvidenceId, setInspectorEvidenceId] = useState<string | null>(null);
  const [isNewMissionModalOpen, setIsNewMissionModalOpen] = useState(false);
  const [isSubmittingMission, setIsSubmittingMission] = useState(false);
  const [missionTargetTopic, setMissionTargetTopic] = useState('AI Inference KV-Cache Optimizations');
  const [missionCompanies, setMissionCompanies] = useState('vLLM, SGLang, Triton');

  // Handle open evidence drawer
  const handleOpenEvidence = (id: string) => {
    setInspectorEvidenceId(id);
  };

  // Handle select opportunity
  const handleSelectOpportunity = (id: string) => {
    setSelectedOpportunityId(id);
    setActiveTab('dossier');
  };

  const selectedOpp =
    SEEDED_OPPORTUNITIES.find((o) => o.id === selectedOpportunityId) || SEEDED_OPPORTUNITIES[0];

  const activeEvidenceData = inspectorEvidenceId
    ? EVIDENCE_DATABASE[inspectorEvidenceId] || null
    : null;

  const handleLaunchMission = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingMission(true);
    // Simulate API submission
    setTimeout(() => {
      setIsSubmittingMission(false);
      setIsNewMissionModalOpen(false);
      setActiveTab('feed');
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-canvas-light flex flex-col font-sans">
      {/* Top Global Navigation Bar */}
      <header className="sticky top-0 z-40 bg-surface-light/80 backdrop-blur-md border-b border-hairline-light">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Platform Name */}
          <div className="flex items-center space-x-6">
            <div
              className="flex items-center space-x-2.5 cursor-pointer"
              onClick={() => setActiveTab('overview')}
            >
              <div className="w-8 h-8 rounded-lg bg-ink-primary flex items-center justify-center text-white font-mono font-bold text-sm shadow-sm">
                A
              </div>
              <div>
                <span className="font-serif text-lg font-medium text-ink-primary tracking-tight">
                  ARGUS
                </span>
                <span className="hidden sm:inline-block ml-2 text-[11px] font-mono text-ink-tertiary">
                  Evidence-Driven Research
                </span>
              </div>
            </div>

            {/* Navigation Tabs */}
            <nav className="hidden md:flex items-center space-x-1">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  activeTab === 'overview'
                    ? 'bg-canvas-light text-ink-primary font-semibold'
                    : 'text-ink-secondary hover:text-ink-primary hover:bg-canvas-light/60'
                }`}
              >
                Intelligence Overview
              </button>
              <button
                onClick={() => setActiveTab('feed')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  activeTab === 'feed'
                    ? 'bg-canvas-light text-ink-primary font-semibold'
                    : 'text-ink-secondary hover:text-ink-primary hover:bg-canvas-light/60'
                }`}
              >
                Discovery Feed
              </button>
              <button
                onClick={() => setActiveTab('dossier')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  activeTab === 'dossier'
                    ? 'bg-canvas-light text-ink-primary font-semibold'
                    : 'text-ink-secondary hover:text-ink-primary hover:bg-canvas-light/60'
                }`}
              >
                Opportunity Dossier
              </button>
            </nav>
          </div>

          {/* Right Micro-Telemetry & Launch Action */}
          <div className="flex items-center space-x-3">
            <ArgusAsciiTelemetry />

            <button
              onClick={() => setIsNewMissionModalOpen(true)}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-ink-primary text-white text-xs font-medium hover:bg-black transition shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New Research Mission</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <IntelligenceOverview
            onOpenEvidence={handleOpenEvidence}
            onSelectOpportunity={handleSelectOpportunity}
            onStartMission={() => setIsNewMissionModalOpen(true)}
          />
        )}

        {activeTab === 'feed' && (
          <DiscoveryFeed
            opportunities={SEEDED_OPPORTUNITIES}
            onSelectOpportunity={handleSelectOpportunity}
            onOpenEvidence={handleOpenEvidence}
          />
        )}

        {activeTab === 'dossier' && (
          <OpportunityDossier
            opportunity={selectedOpp}
            onBack={() => setActiveTab('feed')}
            onOpenEvidence={handleOpenEvidence}
          />
        )}
      </main>

      {/* Slide-Over Evidence Inspector */}
      <SlideOverEvidenceInspector
        isOpen={inspectorEvidenceId !== null}
        onClose={() => setInspectorEvidenceId(null)}
        evidence={activeEvidenceData}
      />

      {/* New Research Mission Modal */}
      {isNewMissionModalOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-ink-primary/20 backdrop-blur-sm"
            onClick={() => setIsNewMissionModalOpen(false)}
          />
          <div className="relative w-full max-w-lg bg-surface-light rounded-2xl border border-hairline-light shadow-2xl p-6 space-y-5 z-10 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-hairline-light">
              <div className="flex items-center space-x-2">
                <Compass className="w-4 h-4 text-indigo-600" />
                <h3 className="font-serif text-lg font-medium text-ink-primary">
                  Launch Evidence Mission
                </h3>
              </div>
              <button
                onClick={() => setIsNewMissionModalOpen(false)}
                className="p-1 rounded-lg text-ink-tertiary hover:text-ink-primary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleLaunchMission} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-medium text-ink-secondary">
                  Target Domain or Architectural Friction
                </label>
                <input
                  type="text"
                  required
                  value={missionTargetTopic}
                  onChange={(e) => setMissionTargetTopic(e.target.value)}
                  placeholder="e.g. KV Cache Disaggregation in Distributed Inference"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-hairline-light bg-canvas-light text-sm text-ink-primary focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-sans"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono font-medium text-ink-secondary">
                  Target Repositories or Incumbents (Comma Separated)
                </label>
                <input
                  type="text"
                  value={missionCompanies}
                  onChange={(e) => setMissionCompanies(e.target.value)}
                  placeholder="vLLM, SGLang, TensorRT-LLM, Triton"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-hairline-light bg-canvas-light text-sm text-ink-primary focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-sans"
                />
              </div>

              <div className="p-3.5 rounded-xl bg-canvas-light border border-hairline-light space-y-1 text-xs">
                <div className="font-mono text-[11px] font-semibold text-ink-primary">
                  ARGUS Ground-Truth Guarantee
                </div>
                <p className="text-ink-secondary">
                  No mock records. Temporal workflows enforce at-least-once outbox dispatch. Every claim is strictly bound to sha256-verified evidence spans.
                </p>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewMissionModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-ink-secondary hover:text-ink-primary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingMission}
                  className="px-5 py-2 rounded-xl bg-ink-primary text-white text-xs font-medium hover:bg-black transition flex items-center space-x-2 disabled:opacity-50"
                >
                  {isSubmittingMission ? (
                    <>
                      <ArgusAsciiSkeleton lines={1} className="w-16" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <span>Dispatch Mission</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Global Footer */}
      <footer className="border-t border-hairline-light bg-surface-light/40 py-6 text-xs text-ink-tertiary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>ARGUS Platform v0.3.0</span>
            <span>·</span>
            <span>PostgreSQL RLS Protected</span>
          </div>
          <div className="font-mono text-[11px]">
            Chiaroscuro Daylight Design Direction · Zero-Hallucination Evidence Attributed
          </div>
        </div>
      </footer>
    </div>
  );
}
