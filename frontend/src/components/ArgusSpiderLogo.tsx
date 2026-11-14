'use client';

import React from 'react';

interface ArgusSpiderLogoProps {
  className?: string;
  size?: number;
  glow?: boolean;
}

/**
 * Modern geometric 8-limbed Spider Logo representing ARGUS's 8 Autonomous Intelligence Engines:
 * 1. Company Scanner
 * 2. Open-Source Intel
 * 3. Research Scanner
 * 4. Community Scanner
 * 5. Hiring Intelligence
 * 6. Market Intelligence
 * 7. Architecture Extractor
 * 8. Negative Space Engine
 */
export const ArgusSpiderLogo: React.FC<ArgusSpiderLogoProps> = ({
  className = 'w-7 h-7',
  size = 28,
  glow = true,
}) => {
  return (
    <div className={`relative flex items-center justify-center shrink-0 ${className}`}>
      {glow && (
        <div
          className="absolute inset-0 rounded-full bg-indigo-500/25 blur-md -z-10 pointer-events-none"
          style={{ width: size, height: size }}
        />
      )}
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="transition-transform duration-300 group-hover:scale-105"
      >
        <defs>
          <linearGradient id="spiderBodyGrad" x1="16" y1="6" x2="16" y2="26" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#A5B4FC" />
            <stop offset="50%" stopColor="#818CF8" />
            <stop offset="100%" stopColor="#4F46E5" />
          </linearGradient>
          <linearGradient id="legGrad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#E0E7FF" />
            <stop offset="50%" stopColor="#A5B4FC" />
            <stop offset="100%" stopColor="#6366F1" />
          </linearGradient>
        </defs>

        {/* 8 Autonomous Agent Limbs (Symmetric Cybernetic Articulations) */}
        {/* Left Side (Engines 1 - 4) */}
        {/* Leg 1: Top-Forward (Research Scanner) */}
        <path
          d="M13.5 12.5 L8.5 7 L4 8.5"
          stroke="url(#legGrad)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Leg 2: Mid-Upper (OSINT Engine) */}
        <path
          d="M13 15 L6.5 13.5 L2.5 16.5"
          stroke="url(#legGrad)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Leg 3: Mid-Lower (Community Scanner) */}
        <path
          d="M13 17.5 L7 19.5 L3.5 24"
          stroke="url(#legGrad)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Leg 4: Bottom-Rear (Company Scanner) */}
        <path
          d="M13.5 20 L9 24.5 L6.5 28"
          stroke="url(#legGrad)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Right Side (Engines 5 - 8) */}
        {/* Leg 5: Top-Forward (Architecture Extractor) */}
        <path
          d="M18.5 12.5 L23.5 7 L28 8.5"
          stroke="url(#legGrad)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Leg 6: Mid-Upper (Hiring Intelligence) */}
        <path
          d="M19 15 L25.5 13.5 L29.5 16.5"
          stroke="url(#legGrad)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Leg 7: Mid-Lower (Market Intelligence) */}
        <path
          d="M19 17.5 L25 19.5 L28.5 24"
          stroke="url(#legGrad)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Leg 8: Bottom-Rear (Negative Space Engine) */}
        <path
          d="M18.5 20 L23 24.5 L25.5 28"
          stroke="url(#legGrad)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Central Geometric Cephalothorax (Body Core) */}
        <path
          d="M16 9 L18.8 13.2 L18.8 19 L16 23 L13.2 19 L13.2 13.2 Z"
          fill="url(#spiderBodyGrad)"
          stroke="#FFFFFF"
          strokeWidth="0.8"
          strokeLinejoin="round"
        />

        {/* Head Segment */}
        <path
          d="M16 6 L18 8.8 L14 8.8 Z"
          fill="#E0E7FF"
        />

        {/* Central Provenance Beacon (Coordinator Core) */}
        <circle cx="16" cy="15.5" r="1.6" fill="#34D399" />
        <circle cx="16" cy="15.5" r="2.6" stroke="#34D399" strokeWidth="0.6" strokeOpacity="0.7" />
      </svg>
    </div>
  );
};
