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
        className="fixed inset-0 bg-ink-primary/20 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="relative w-full max-w-xl bg-surface-light border-l border-hairline-light shadow-drawer h-full flex flex-col z-10 animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="px-6 py-5 border-b border-hairline-light flex items-center justify-between bg-canvas-light/50">
          <div className="flex items-center space-x-3">
            <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
              {evidence.citation_pill}
            </span>
            <span className="text-xs font-medium uppercase tracking-wider text-ink-tertiary">
              {evidence.source.source_name} Signal
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-ink-tertiary hover:text-ink-primary hover:bg-hairline-light/40 transition"
            aria-label="Close inspector"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Primary Verbatim Quote */}
          <div className="space-y-2">
            <div className="flex items-center space-x-1.5 text-xs font-medium text-ink-secondary">
              <FileText className="w-3.5 h-3.5 text-ink-tertiary" />
              <span>Verbatim Primary Excerpt</span>
            </div>
            <div className="p-4 rounded-xl bg-canvas-light border border-hairline-light">
              <blockquote className="font-serif text-sm leading-relaxed text-ink-primary italic">
                "{evidence.quote_text}"
              </blockquote>
              {evidence.section_name && (
                <div className="mt-2 text-[11px] font-mono text-ink-tertiary">
                  Section: {evidence.section_name}
                </div>
              )}
            </div>
          </div>

          {/* Canonical Source Reference */}
          <div className="space-y-3">
            <div className="text-xs font-medium text-ink-secondary uppercase tracking-wider">
              Primary Source Provenance
            </div>
            <div className="p-4 rounded-xl border border-hairline-light space-y-3 bg-surface-light">
              {meta.title && (
                <div>
                  <div className="text-xs text-ink-tertiary">Origin Context</div>
                  <div className="text-sm font-medium text-ink-primary mt-0.5">
                    {meta.title}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 pt-1 border-t border-hairline-light/60">
                {meta.author && (
                  <div>
                    <div className="text-[11px] text-ink-tertiary flex items-center space-x-1">
                      <User className="w-3 h-3" />
                      <span>Author</span>
                    </div>
                    <div className="text-xs font-mono font-medium text-ink-primary mt-0.5">
                      @{meta.author}
                    </div>
                  </div>
                )}
                {meta.repo && (
                  <div>
                    <div className="text-[11px] text-ink-tertiary">Repository</div>
                    <div className="text-xs font-mono font-medium text-ink-primary mt-0.5">
                      {meta.repo}
                    </div>
                  </div>
                )}
              </div>

              {/* External Link Pill */}
              <div className="pt-2 border-t border-hairline-light/60 flex items-center justify-between">
                <a
                  href={evidence.source.canonical_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800 hover:underline"
                >
                  <span className="truncate max-w-[280px]">
                    {evidence.source.canonical_url}
                  </span>
                  <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                </a>

                <button
                  onClick={handleCopy}
                  className="inline-flex items-center space-x-1 text-[11px] text-ink-tertiary hover:text-ink-primary px-2 py-1 rounded bg-canvas-light border border-hairline-light"
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span className="text-emerald-600">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Cryptographic Proof & Offsets */}
          <div className="space-y-3">
            <div className="text-xs font-medium text-ink-secondary uppercase tracking-wider">
              Cryptographic Integrity
            </div>
            <div className="p-4 rounded-xl border border-hairline-light bg-surface-light space-y-2.5">
              <div className="flex items-start space-x-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="text-xs font-medium text-ink-primary">
                    SHA-256 Verifiable Hash
                  </div>
                  <div className="font-mono text-[10px] break-all text-ink-tertiary bg-canvas-light px-2 py-1 rounded border border-hairline-light/60">
                    {evidence.source.content_hash}
                  </div>
                </div>
              </div>

              {evidence.offsets && (
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-hairline-light/60 text-center font-mono text-[11px]">
                  <div className="p-2 rounded bg-canvas-light">
                    <span className="text-ink-tertiary block text-[9px] uppercase">
                      Char Start
                    </span>
                    <span className="text-ink-primary font-medium">
                      {evidence.offsets.start}
                    </span>
                  </div>
                  <div className="p-2 rounded bg-canvas-light">
                    <span className="text-ink-tertiary block text-[9px] uppercase">
                      Char End
                    </span>
                    <span className="text-ink-primary font-medium">
                      {evidence.offsets.end}
                    </span>
                  </div>
                  <div className="p-2 rounded bg-canvas-light">
                    <span className="text-ink-tertiary block text-[9px] uppercase">
                      Tokens
                    </span>
                    <span className="text-ink-primary font-medium">
                      {evidence.offsets.token_count}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Citing Claims */}
          {evidence.citing_claims && evidence.citing_claims.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-medium text-ink-secondary uppercase tracking-wider">
                Synthesized Claims Citing This Source
              </div>
              <div className="space-y-2">
                {evidence.citing_claims.map((c, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-lg border border-hairline-light bg-canvas-light text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] uppercase font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">
                        {c.claim_type}
                      </span>
                      <span className="text-[10px] text-ink-tertiary font-mono">
                        {c.support_type}
                      </span>
                    </div>
                    <p className="text-ink-primary font-serif leading-snug">
                      {c.statement}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-hairline-light bg-canvas-light/40 flex justify-between items-center text-[11px] text-ink-tertiary font-mono">
          <span>ARGUS Provenance Engine</span>
          <span>Zero-Fabrication Guarantee</span>
        </div>
      </div>
    </div>
  );
};
