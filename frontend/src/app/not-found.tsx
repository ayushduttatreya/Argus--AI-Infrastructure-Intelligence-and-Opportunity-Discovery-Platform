import React from 'react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-canvas-light flex flex-col items-center justify-center p-4 font-mono text-xs">
      <div className="p-6 rounded-2xl bg-surface-light border border-hairline-light shadow-tactile text-center space-y-3">
        <div className="text-xl font-serif text-ink-primary">404 — Piece Not Found</div>
        <p className="text-ink-secondary">The requested route does not exist.</p>
        <Link href="/" className="inline-block px-4 py-2 rounded-lg bg-ink-primary text-white font-medium hover:bg-black transition">
          [Return Home]
        </Link>
      </div>
    </div>
  );
}
