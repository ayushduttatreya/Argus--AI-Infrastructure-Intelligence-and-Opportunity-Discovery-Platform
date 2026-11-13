import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ARGUS — AI Infrastructure Intelligence & Opportunity Discovery',
  description: 'Evidence-driven AI research platform discovering structural market whitespaces with cryptographic provenance.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full bg-canvas-light text-ink-primary font-sans antialiased selection:bg-indigo-100 selection:text-indigo-900">
        {children}
      </body>
    </html>
  );
}
