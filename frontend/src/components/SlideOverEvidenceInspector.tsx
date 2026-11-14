'use client';

import React from 'react';
import { X, ExternalLink, ShieldCheck, Copy, Check, Hash, FileText, User } from 'lucide-react';

export interface EvidenceInspectorData {
  id: string;
  citation_pill: string;
  quote_text: string;
  section_name?: string;
  source: {
    canonical_url: string;
    source_name: string;
    content_hash: string;
    metadata?: Record<string, any>;
  };
  offsets?: {
    start: number;
    end: number;
    token_count: number;
  };
  citing_claims?: Array<{
    claim_id: string;
    statement: string;
    claim_type: string;
    support_type: string;
  }>;
  created_at?: string;
}

interface SlideOverEvidenceInspectorProps {
  isOpen: boolean;
  onClose: () => void;
  evidence: EvidenceInspectorData | null;
}

export const SlideOverEvidenceInspector: React.FC<SlideOverEvidenceInspectorProps> = ({
  isOpen,
  onClose,
  evidence,
}) => {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen || !evidence) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(evidence.source.canonical_url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const meta = evidence.source.metadata || {};

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="relative w-full max-w-xl bg-[#090C16] border-l border-white/15 shadow-2xl h-full flex flex-col z-10 animate-in slide-in-from-right duration-200 text-zinc-100">
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between bg-zinc-950/80">
          <div className="flex items-center space-x-3">
            <span className="font-mono text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-500/40">
              {evidence.citation_pill}
            </span>
            <span className="text-xs font-mono uppercase tracking-wider text-zinc-400">
              Evidence Inspector
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Epistemic Provenance Shield */}
          <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 flex items-start space-x-3">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="text-xs font-mono font-semibold text-emerald-300 block">
                Cryptographically Anchored Span
              </span>
              <p className="text-xs text-emerald-200/80 font-sans leading-relaxed">
                This evidence object is bound to an exact character-offset span from the raw source document,
                verified by SHA-256 and protected under PostgreSQL Row-Level Security. Zero LLM hallucinations.
              </p>
            </div>
          </div>

          {/* Verbatim Quote */}
          <div className="space-y-2">
            <span className="text-xs font-mono uppercase text-zinc-400 block font-semibold">
              Verbatim Text Span:
            </span>
            <blockquote className="p-4 rounded-2xl bg-[#05060A] border-l-4 border-emerald-400 border-y border-r border-white/10 font-mono text-xs text-zinc-200 leading-relaxed shadow-inner">
              "{evidence.quote_text}"
            </blockquote>
          </div>

          {/* Offsets & Token details */}
          {evidence.offsets && (
            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-3 rounded-xl bg-zinc-900/80 border border-white/10 space-y-1">
                <span className="text-zinc-500 block text-[10px] uppercase">Character Offsets</span>
                <span className="text-zinc-200 block font-mono">
                  [{evidence.offsets.start}..{evidence.offsets.end}]
                </span>
              </div>
              <div className="p-3 rounded-xl bg-zinc-900/80 border border-white/10 space-y-1">
                <span className="text-zinc-500 block text-[10px] uppercase">Token Count</span>
                <span className="text-zinc-200 block font-mono">
                  {evidence.offsets.token_count} tokens
                </span>
              </div>
            </div>
          )}

          {/* Source Document Details */}
          <div className="space-y-3 p-4 rounded-2xl bg-[#0B0E1B] border border-white/10">
            <span className="text-xs font-mono uppercase text-zinc-400 block font-semibold">
              Source Document Metadata:
            </span>

            <div className="space-y-2 font-mono text-xs">
              <div>
                <span className="text-zinc-500 block text-[10px]">Title:</span>
                <span className="text-white font-serif text-sm font-medium">
                  {meta.title || evidence.section_name || 'Primary Document'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5">
                <div>
                  <span className="text-zinc-500 block text-[10px]">Repository:</span>
                  <span className="text-indigo-300">{meta.repo || 'github.com'}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[10px]">Author:</span>
                  <span className="text-zinc-300">@{meta.author || 'contributor'}</span>
                </div>
              </div>

              <div className="pt-2">
                <a
                  href={evidence.source.canonical_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center space-x-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-mono"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="truncate max-w-sm">Open Primary Source</span>
                </a>
              </div>
            </div>
          </div>

          {/* Cryptographic Hash */}
          <div className="space-y-2 p-4 rounded-2xl bg-zinc-950 border border-white/10 font-mono text-xs">
            <div className="flex items-center justify-between">
              <span className="text-zinc-400 text-[10px] uppercase font-semibold flex items-center space-x-1">
                <Hash className="w-3 h-3 text-indigo-400" />
                <span>SHA-256 Digest:</span>
              </span>
              <button
                onClick={handleCopy}
                className="text-indigo-400 hover:text-indigo-300 text-[11px] flex items-center space-x-1"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <code className="block text-[11px] text-zinc-300 break-all bg-black/60 p-2.5 rounded-xl border border-white/5 select-all">
              {evidence.source.content_hash}
            </code>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-zinc-950/80 flex items-center justify-between text-xs font-mono">
          <span className="text-zinc-400 text-[11px]">PostgreSQL RLS Protected</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-full bg-white text-zinc-950 font-medium hover:bg-zinc-200 transition text-xs shadow-sm"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
