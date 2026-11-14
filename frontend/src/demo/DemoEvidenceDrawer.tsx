'use client';

import React, { useState } from 'react';
import {
  X,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  Copy,
  Check,
  Hash,
  FileText,
  User,
  Calendar,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { DemoEvidenceItem } from './demoData';

interface DemoEvidenceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  evidence: DemoEvidenceItem | null;
  onSelectOpportunity?: (oppId: string) => void;
}

export const DemoEvidenceDrawer: React.FC<DemoEvidenceDrawerProps> = ({
  isOpen,
  onClose,
  evidence,
  onSelectOpportunity,
}) => {
  const [copied, setCopied] = useState<boolean>(false);

  if (!isOpen || !evidence) return null;

  const handleCopyHash = () => {
    navigator.clipboard.writeText(evidence.content_hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-ink-primary/20 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Slide-over Container */}
      <div className="relative w-full max-w-xl bg-surface-light border-l border-hairline-light shadow-2xl h-full flex flex-col z-10 animate-in slide-in-from-right duration-200">
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-hairline-light flex items-center justify-between bg-canvas-light/60">
          <div className="flex items-center space-x-3">
            <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
              {evidence.citation_pill}
            </span>
            <span className="text-xs font-medium uppercase tracking-wider text-ink-tertiary">
              Evidence Inspector
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-ink-tertiary hover:text-ink-primary hover:bg-hairline-light/40 transition"
            aria-label="Close evidence drawer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Provenance & Ground Truth Verification Bar */}
        <div className="px-6 py-2.5 bg-emerald-500/10 border-b border-emerald-500/20 text-emerald-950 text-xs font-mono flex items-center space-x-2">
          <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
          <span className="font-medium">
            Cryptographically verified primary repository snapshot · SHA-256 indexed
          </span>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm">
          {/* Source Title & Header */}
          <div className="space-y-1.5">
            <div className="flex items-center space-x-2 text-xs font-mono text-ink-tertiary">
              <span>{evidence.source_name}</span>
              <span>•</span>
              <span>{evidence.source_type}</span>
            </div>
            <h3 className="font-serif text-xl font-normal text-ink-primary">
              {evidence.source_title}
            </h3>
          </div>

          {/* Primary Verbatim Excerpt */}
          <div className="space-y-2">
            <div className="flex items-center space-x-1.5 text-xs font-medium text-ink-secondary">
              <FileText className="w-3.5 h-3.5 text-ink-tertiary" />
              <span>Primary Verbatim Text Span</span>
            </div>
            <div className="p-4 rounded-xl bg-canvas-light border border-hairline-light space-y-2">
              <blockquote className="font-serif text-sm leading-relaxed text-ink-primary italic">
                "{evidence.verbatim_excerpt}"
              </blockquote>
              {evidence.section_name && (
                <div className="text-[11px] font-mono text-ink-tertiary">
                  Target: {evidence.section_name}
                </div>
              )}
            </div>
          </div>

          {/* Source Link / Canonical URL */}
          <div className="space-y-2">
            <span className="text-xs font-mono uppercase text-ink-tertiary block">
              Origin Location
            </span>
            <div className="p-3 rounded-xl border border-hairline-light bg-surface-light flex items-center justify-between text-xs font-mono">
              <div className="truncate mr-3 text-ink-secondary">
                {evidence.canonical_url}
              </div>
              {evidence.is_verified_link ? (
                <a
                  href={evidence.canonical_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center space-x-1 text-indigo-600 hover:text-indigo-800 transition font-medium shrink-0"
                >
                  <span>Open Repo</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              ) : (
                <span className="text-[11px] text-emerald-800 px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 shrink-0 font-medium">
                  Verified Index
                </span>
              )}
            </div>
          </div>

          {/* Cryptographic SHA-256 Provenance Box */}
          <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-50/20 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-xs font-mono text-emerald-800 font-semibold">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>SHA-256 Provenance Hash</span>
              </div>
              <button
                onClick={handleCopyHash}
                className="text-[11px] font-mono text-emerald-700 hover:text-emerald-900 inline-flex items-center space-x-1"
                title="Copy cryptographic content hash"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <div className="font-mono text-[11px] text-ink-secondary bg-surface-light p-2.5 rounded-lg border border-hairline-light break-all select-all">
              {evidence.content_hash}
            </div>

            {/* Character Offsets & Token Count */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono text-ink-tertiary pt-1">
              <div className="p-1.5 rounded bg-surface-light border border-hairline-light">
                <span className="block text-[10px] uppercase">Byte Offset</span>
                <span className="text-ink-primary font-semibold">
                  {evidence.offsets.start}:{evidence.offsets.end}
                </span>
              </div>
              <div className="p-1.5 rounded bg-surface-light border border-hairline-light">
                <span className="block text-[10px] uppercase">Span Tokens</span>
                <span className="text-ink-primary font-semibold">
                  {evidence.offsets.token_count}
                </span>
              </div>
              <div className="p-1.5 rounded bg-surface-light border border-hairline-light">
                <span className="block text-[10px] uppercase">Status</span>
                <span className="text-emerald-700 font-semibold">
                  Verified
                </span>
              </div>
            </div>
          </div>

          {/* Metadata Breakdown */}
          <div className="space-y-2 border-t border-hairline-light pt-4 text-xs font-mono">
            <div className="flex items-center justify-between text-ink-secondary">
              <span className="text-ink-tertiary flex items-center space-x-1.5">
                <User className="w-3.5 h-3.5" />
                <span>Author / Attribution:</span>
              </span>
              <span>{evidence.author || 'Platform Core Contributor'}</span>
            </div>
            <div className="flex items-center justify-between text-ink-secondary">
              <span className="text-ink-tertiary flex items-center space-x-1.5">
                <Calendar className="w-3.5 h-3.5" />
                <span>Published Timestamp:</span>
              </span>
              <span>{evidence.published_at || '2024-09-01'}</span>
            </div>
            <div className="flex items-center justify-between text-ink-secondary">
              <span className="text-ink-tertiary flex items-center space-x-1.5">
                <Hash className="w-3.5 h-3.5" />
                <span>Storage Tier:</span>
              </span>
              <span className="text-emerald-800 font-semibold">SHA-256 Document Store</span>
            </div>
          </div>

          {/* Citing Opportunity Link */}
          {evidence.citing_opportunity_ids.length > 0 && onSelectOpportunity && (
            <div className="border-t border-hairline-light pt-4 space-y-2">
              <span className="text-xs font-mono uppercase text-ink-tertiary block">
                Citing Opportunity Dossier
              </span>
              {evidence.citing_opportunity_ids.map((oppId) => (
                <button
                  key={oppId}
                  onClick={() => {
                    onSelectOpportunity(oppId);
                    onClose();
                  }}
                  className="w-full p-3 rounded-xl border border-indigo-200/80 bg-indigo-50/40 hover:bg-indigo-50 text-left transition flex items-center justify-between group"
                >
                  <div className="space-y-0.5">
                    <span className="font-mono text-[10px] uppercase text-indigo-700 font-semibold">
                      {oppId.toUpperCase()}
                    </span>
                    <div className="font-serif text-xs text-ink-primary group-hover:text-indigo-950 font-medium">
                      {oppId === 'opp-inf-01'
                        ? 'Disaggregated KV-Cache Tiering Engine'
                        : 'FP8 Speculative Tree Verifier & Kernel Optimizer'}
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-indigo-600 group-hover:translate-x-1 transition shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
